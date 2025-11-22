import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Shield, Send, User, MapPin, Calendar, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { AdminAnalytics } from "./AdminAnalytics";
import { SubAdminManagement } from "./SubAdminManagement";
import { ContactManagement } from "./ContactManagement";
import { ApiSettings } from "./ApiSettings";
import { MessageTemplates } from "./MessageTemplates";
import { ForwardingStats } from "./ForwardingStats";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { NotificationBell } from "./NotificationBell";

interface Ticket {
  id: string;
  nim: string;
  kategori: string;
  lokasi: string;
  subjek: string;
  deskripsi: string;
  status: string;
  waktu: string;
  assigned_to: string | null;
  assigned_at: string | null;
  notes: string | null;
  auto_forwarded: boolean | null;
}

interface ForwardingContact {
  id: string;
  name: string;
  contact_type: string;
  contact_value: string;
  category: string;
  is_active: boolean;
}

const categoryConfig: Record<string, { color: string; label: string }> = {
  fasilitas: { color: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "FASILITAS" },
  akademik: { color: "bg-green-500/20 text-green-300 border-green-500/30", label: "AKADEMIK" },
  administrasi: { color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", label: "ADMINISTRASI" },
  keuangan: { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "KEUANGAN" },
  pelanggaran: { color: "bg-red-500/20 text-red-300 border-red-500/30", label: "PELANGGARAN" },
  ppid: { color: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "PPID" },
};

const authorityOptions = [
  { value: "bagian_umum", label: "Bagian Umum & Perlengkapan" },
  { value: "bak", label: "Biro Administrasi Akademik (BAK)" },
  { value: "bauk", label: "Biro Administrasi Umum & Keuangan (BAUK)" },
  { value: "spi", label: "Satuan Pengawasan Internal (SPI)" },
  { value: "ppid", label: "PPID" },
  { value: "lainnya", label: "Lainnya" },
];

interface AdminDashboardProps {
  activeTab: "tickets" | "stats" | "analytics" | "templates" | "contacts" | "api" | "admins";
  hideNotification?: boolean;
}

export const AdminDashboard = ({ activeTab, hideNotification = false }: AdminDashboardProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [forwardingContacts, setForwardingContacts] = useState<ForwardingContact[]>([]);
  const [isBulkForwarding, setIsBulkForwarding] = useState(false);

  useEffect(() => {
    loadTickets();
    loadForwardingContacts();

    // Set up realtime subscription for new tickets
    const channel: RealtimeChannel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          console.log('New ticket received:', payload);
          toast.success(`🔔 Tiket Baru Masuk!`, {
            description: `Kategori: ${payload.new.kategori} - ${payload.new.subjek}`,
            duration: 5000,
          });
          loadTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.error("Gagal memuat data tiket");
    } finally {
      setIsLoading(false);
    }
  };

  const loadForwardingContacts = async () => {
    try {
      const { data, error } = await supabase
        .from("forwarding_contacts")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;
      setForwardingContacts(data || []);
    } catch (error) {
      console.error("Error loading contacts:", error);
    }
  };

  const toggleAutoForward = async (ticketId: string, currentValue: boolean | null) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ auto_forwarded: !currentValue })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success(!currentValue ? "Auto-forward diaktifkan" : "Auto-forward dinonaktifkan");
      loadTickets();
    } catch (error) {
      console.error("Error toggling auto-forward:", error);
      toast.error("Gagal mengubah status auto-forward");
    }
  };

  const getSuggestedContacts = (category: string) => {
    return forwardingContacts.filter(contact => contact.category === category);
  };

  const handleBulkForward = async () => {
    const unforwardedTickets = tickets.filter(t => !t.auto_forwarded);
    
    if (unforwardedTickets.length === 0) {
      toast.info("Semua tiket sudah diteruskan");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin meneruskan ${unforwardedTickets.length} tiket ke pihak berwenang?`)) {
      return;
    }

    setIsBulkForwarding(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const ticket of unforwardedTickets) {
        try {
          // Call forward-ticket edge function
          const { error } = await supabase.functions.invoke('forward-ticket', {
            body: { ticketId: ticket.id }
          });

          if (error) {
            console.error(`Failed to forward ticket ${ticket.id}:`, error);
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          console.error(`Error forwarding ticket ${ticket.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`✅ ${successCount} tiket berhasil diteruskan!`);
      }
      if (failCount > 0) {
        toast.error(`❌ ${failCount} tiket gagal diteruskan`);
      }

      loadTickets();
    } catch (error) {
      console.error("Error in bulk forward:", error);
      toast.error("Gagal meneruskan tiket");
    } finally {
      setIsBulkForwarding(false);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subjek.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.nim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.lokasi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesCategory = filterCategory === "all" || ticket.kategori === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {activeTab === "tickets" && (
        <>
          {/* Sticky Page Header */}
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Kelola Tiket</h1>
                <p className="text-muted-foreground mt-1">
                  Kelola dan teruskan tiket keluhan ke pihak berwenang
                </p>
              </div>
              {!hideNotification && <NotificationBell />}
            </div>
          </div>
          
          {isLoading ? (
            <div className="glass-card max-w-7xl mx-auto overflow-hidden card-elevated">
              <div className="p-6 space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card max-w-7xl mx-auto overflow-hidden card-elevated">
              {/* Search and Filter */}
              <div className="p-6 space-y-4 border-b border-border/30">
                <div className="flex gap-3 items-center flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="Cari tiket..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 glass border-border/50"
                    />
                  </div>
                  <div className="glass-card px-4 py-2 rounded-full">
                    <span className="text-foreground font-bold">{filteredTickets.length} Tiket</span>
                  </div>
                  <Button
                    onClick={handleBulkForward}
                    disabled={isBulkForwarding || tickets.filter(t => !t.auto_forwarded).length === 0}
                    className="gradient-primary shrink-0"
                  >
                    {isBulkForwarding ? "Mengirim..." : `Kirim Semua (${tickets.filter(t => !t.auto_forwarded).length})`}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="diproses">Diproses</SelectItem>
                      <SelectItem value="selesai">Selesai</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="glass border-border/50">
                      <SelectValue placeholder="Filter Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      <SelectItem value="fasilitas">Fasilitas</SelectItem>
                      <SelectItem value="akademik">Akademik</SelectItem>
                      <SelectItem value="administrasi">Administrasi</SelectItem>
                      <SelectItem value="keuangan">Keuangan</SelectItem>
                      <SelectItem value="pelanggaran">Pelanggaran</SelectItem>
                      <SelectItem value="ppid">PPID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tickets */}
              <ScrollArea className="h-[600px] p-6">
                <div className="grid gap-6">
                  {filteredTickets.map((ticket, index) => (
                    <div
                      key={ticket.id}
                      className="glass-card p-6 hover:scale-[1.01] transition-transform"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="glass-card p-3 rounded-xl">
                            <AlertCircle className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{ticket.id.substring(0, 8).toUpperCase()}
                              </span>
                              <Badge className={`${categoryConfig[ticket.kategori]?.color} border status-badge`}>
                                {categoryConfig[ticket.kategori]?.label || ticket.kategori.toUpperCase()}
                              </Badge>
                              {ticket.status === "pending" && (
                                <Badge className="status-pending status-badge">⏳ PENDING</Badge>
                              )}
                              {ticket.status === "diproses" && (
                                <Badge className="status-processing status-badge">🔄 DIPROSES</Badge>
                              )}
                              {ticket.status === "selesai" && (
                                <Badge className="status-completed status-badge">✓ SELESAI</Badge>
                              )}
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">{ticket.subjek}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{ticket.deskripsi}</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-border/30">
                              <div className="flex items-center gap-2 text-sm">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{ticket.nim}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground truncate">{ticket.lokasi}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">
                                  {format(new Date(ticket.waktu), "dd MMM yyyy, HH:mm", { locale: id })}
                                </span>
                              </div>
                            </div>

                            {/* Auto-forward toggle */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between p-4 glass-card rounded-xl">
                                <div className="flex items-center gap-3">
                                  <Send className="h-5 w-5 text-primary" />
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      Auto-Forward
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {ticket.auto_forwarded ? "Aktif - Akan diteruskan otomatis" : "Nonaktif"}
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  checked={ticket.auto_forwarded || false}
                                  onCheckedChange={() => toggleAutoForward(ticket.id, ticket.auto_forwarded)}
                                />
                              </div>

                              {/* Suggested contacts if auto-forward is active */}
                              {ticket.auto_forwarded && getSuggestedContacts(ticket.kategori).length > 0 && (
                                <div className="mt-3 p-3 glass-card rounded-xl">
                                  <p className="text-xs text-muted-foreground mb-2">
                                    💡 Akan diteruskan ke:
                                  </p>
                                  <div className="space-y-1">
                                    {getSuggestedContacts(ticket.kategori).map((contact) => (
                                      <div key={contact.id} className="flex items-center gap-2 text-xs">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                                        <span className="font-semibold text-foreground">{contact.name}</span>
                                        <span className="text-muted-foreground">
                                          ({contact.contact_type === "email" ? "📧" : "📱"})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </>
      )}

      {activeTab === "stats" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Statistik Pengaduan</h1>
            <p className="text-muted-foreground mt-1">
              Lihat performa sistem penerusan otomatis
            </p>
          </div>
          <ForwardingStats />
        </>
      )}
      
      {activeTab === "analytics" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Analitik Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Dashboard analitik keluhan kampus
            </p>
          </div>
          <AdminAnalytics />
        </>
      )}
      
      {activeTab === "templates" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Template Pesan</h1>
            <p className="text-muted-foreground mt-1">
              Kelola template untuk email dan WhatsApp otomatis
            </p>
          </div>
          <MessageTemplates />
        </>
      )}
      
      {activeTab === "contacts" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Manajemen Kontak</h1>
            <p className="text-muted-foreground mt-1">
              Kelola kontak pihak berwenang untuk auto-forward tiket
            </p>
          </div>
          <ContactManagement />
        </>
      )}
      
      {activeTab === "api" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Pengaturan API</h1>
            <p className="text-muted-foreground mt-1">
              Konfigurasi API keys untuk integrasi eksternal
            </p>
          </div>
          <ApiSettings />
        </>
      )}
      
      {activeTab === "admins" && (
        <>
          <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 -mx-6 md:-mx-8 px-6 md:px-8 py-4 mb-6">
            <h1 className="text-3xl font-bold text-foreground">Manajemen Sub-Admin</h1>
            <p className="text-muted-foreground mt-1">
              Kelola akses dan permission admin sistem
            </p>
          </div>
          <SubAdminManagement />
        </>
      )}
    </div>
  );
};

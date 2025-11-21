import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Shield, Send, FileText, User, MapPin, Calendar, AlertCircle, Search, BarChart3, Users, Bell } from "lucide-react";
import { toast } from "sonner";
import { AdminAnalytics } from "./AdminAnalytics";
import { SubAdminManagement } from "./SubAdminManagement";
import { ContactManagement } from "./ContactManagement";
import { ApiSettings } from "./ApiSettings";
import type { RealtimeChannel } from "@supabase/supabase-js";

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

export const AdminDashboard = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assignTo, setAssignTo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forwardingContacts, setForwardingContacts] = useState<ForwardingContact[]>([]);

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

  const handleAssignTicket = async () => {
    if (!selectedTicket || !assignTo) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          assigned_to: assignTo,
          assigned_at: new Date().toISOString(),
          notes: notes || null,
          status: "diproses",
        })
        .eq("id", selectedTicket.id);

      if (error) throw error;

      toast.success("Tiket berhasil dikirim ke pihak berwenang");
      setSelectedTicket(null);
      setAssignTo("");
      setNotes("");
      loadTickets();
    } catch (error) {
      console.error("Error assigning ticket:", error);
      toast.error("Gagal mengirim tiket");
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-5 glass border-2 border-primary/20">
          <TabsTrigger value="tickets" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            <FileText className="h-4 w-4 mr-2" />
            Tiket
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="contacts" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            <Send className="h-4 w-4 mr-2" />
            Kontak
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            <Shield className="h-4 w-4 mr-2" />
            API
          </TabsTrigger>
          <TabsTrigger value="admins" className="data-[state=active]:gradient-primary data-[state=active]:text-white">
            <Users className="h-4 w-4 mr-2" />
            Sub-Admin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6">
          {isLoading ? (
            <div className="glass-card max-w-7xl mx-auto overflow-hidden card-elevated">
              <div className="gradient-primary p-6">
                <Skeleton className="h-8 w-64 bg-white/20" />
              </div>
              <div className="p-6 space-y-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card max-w-7xl mx-auto overflow-hidden card-elevated">
              {/* Header */}
              <div className="gradient-primary p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="h-8 w-8 text-white" />
                      <h2 className="text-2xl font-bold text-white">Kelola Tiket</h2>
                    </div>
                    <p className="text-white/80 text-sm">
                      Teruskan tiket keluhan ke pihak berwenang
                    </p>
                  </div>
                  <div className="glass-card px-4 py-2 rounded-full">
                    <span className="text-white font-bold">{filteredTickets.length} Tiket</span>
                  </div>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="p-6 space-y-4 border-b border-border/30">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Cari tiket..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 glass border-border/50"
                  />
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

                            {ticket.assigned_to && (
                              <div className="mt-4 p-3 glass-card rounded-xl">
                                <p className="text-sm text-muted-foreground mb-1">Diteruskan ke:</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {authorityOptions.find((opt) => opt.value === ticket.assigned_to)?.label ||
                                    ticket.assigned_to}
                                </p>
                                {ticket.notes && (
                                  <p className="text-xs text-muted-foreground mt-2">{ticket.notes}</p>
                                )}
                              </div>
                            )}

                            {/* Auto-forward toggle and suggestions */}
                            <div className="mt-4 space-y-3">
                              <div className="flex items-center justify-between p-3 glass-card rounded-xl">
                                <div className="flex items-center gap-2">
                                  <Send className="h-4 w-4 text-primary" />
                                  <span className="text-sm font-semibold text-foreground">
                                    Teruskan Otomatis
                                  </span>
                                </div>
                                <Button
                                  onClick={() => toggleAutoForward(ticket.id, ticket.auto_forwarded)}
                                  variant={ticket.auto_forwarded ? "default" : "outline"}
                                  size="sm"
                                  className={ticket.auto_forwarded ? "gradient-primary text-white" : ""}
                                >
                                  {ticket.auto_forwarded ? "Aktif" : "Nonaktif"}
                                </Button>
                              </div>

                              {getSuggestedContacts(ticket.kategori).length > 0 && (
                                <div className="p-3 glass-card rounded-xl">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    💡 Saran Tujuan Penerusan:
                                  </p>
                                  <div className="space-y-2">
                                    {getSuggestedContacts(ticket.kategori).map((contact) => (
                                      <div key={contact.id} className="flex items-center gap-2 text-sm">
                                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                                        <span className="font-semibold text-foreground">{contact.name}</span>
                                        <span className="text-muted-foreground">
                                          ({contact.contact_type === "email" ? "📧" : "📱"}{" "}
                                          {contact.contact_value})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <Dialog open={selectedTicket?.id === ticket.id} onOpenChange={(open) => !open && setSelectedTicket(null)}>
                          <DialogTrigger asChild>
                            <Button
                              onClick={() => setSelectedTicket(ticket)}
                              className="gradient-primary text-white hover:glow-hover"
                              disabled={ticket.status === "selesai"}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {ticket.assigned_to ? "Ubah Tujuan" : "Teruskan"}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-card border-border/50">
                            <DialogHeader>
                              <DialogTitle className="text-2xl gradient-text">Teruskan Tiket</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <label className="text-sm font-semibold text-foreground mb-2 block">
                                  Pihak Berwenang
                                </label>
                                <Select value={assignTo} onValueChange={setAssignTo}>
                                  <SelectTrigger className="glass border-border/50">
                                    <SelectValue placeholder="Pilih pihak berwenang" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {authorityOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <label className="text-sm font-semibold text-foreground mb-2 block">
                                  Catatan (Opsional)
                                </label>
                                <Textarea
                                  placeholder="Tambahkan catatan atau instruksi khusus..."
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  className="glass border-border/50 min-h-[100px]"
                                />
                              </div>

                              <Button
                                onClick={handleAssignTicket}
                                disabled={!assignTo || isSubmitting}
                                className="w-full gradient-primary text-white hover:glow-hover"
                              >
                                {isSubmitting ? "Mengirim..." : "Kirim ke Pihak Berwenang"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="contacts" className="mt-6">
          <ContactManagement />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <ApiSettings />
        </TabsContent>

        <TabsContent value="admins" className="mt-6">
          <SubAdminManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

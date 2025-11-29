import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, MapPin, User, Calendar, Tag, AlertCircle, Search, Filter, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Ticket {
  id: string;
  nim: string;
  kategori: string;
  lokasi: string;
  subjek: string;
  deskripsi: string;
  status: string;
  waktu: string;
}

const categoryConfig: Record<string, { color: string; label: string }> = {
  fasilitas: { color: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "FASILITAS" },
  akademik: { color: "bg-green-500/20 text-green-300 border-green-500/30", label: "AKADEMIK" },
  administrasi: { color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", label: "ADMINISTRASI" },
  keuangan: { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "KEUANGAN" },
  pelanggaran: { color: "bg-red-500/20 text-red-300 border-red-500/30", label: "PELANGGARAN" },
  ppid: { color: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "PPID" },
};

export const TicketHistory = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadTickets();
    checkAdminRole();
  }, []);

  const checkAdminRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roleData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!roleData && !error);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

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
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["ID", "NIM", "Kategori", "Lokasi", "Subjek", "Deskripsi", "Status", "Waktu"];
    const csvData = filteredTickets.map(ticket => [
      ticket.id,
      ticket.nim,
      ticket.kategori,
      ticket.lokasi,
      ticket.subjek,
      ticket.deskripsi,
      ticket.status,
      format(new Date(ticket.waktu), "dd/MM/yyyy HH:mm", { locale: id })
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `keluhan_${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  if (isLoading) {
    return (
      <div className="glass-card max-w-6xl mx-auto overflow-hidden card-elevated">
        <div className="gradient-primary p-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-64 mb-2 bg-white/20" />
              <Skeleton className="h-4 w-32 bg-white/10" />
            </div>
            <Skeleton className="h-14 w-14 rounded-full bg-white/20" />
          </div>
        </div>
        <div className="p-6 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 animate-fade-in">
              <div className="flex items-start gap-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/30">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center h-[600px] max-w-6xl mx-auto text-center p-8">
        <div className="glass-card p-6 rounded-full mb-6">
          <FileText className="h-16 w-16 text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Belum Ada Tiket</h3>
        <p className="text-muted-foreground max-w-md">
          Belum ada tiket keluhan yang dibuat. Mulai chat dengan bot untuk membuat tiket pertama Anda.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card max-w-6xl mx-auto overflow-hidden card-elevated">
      {/* Header */}
      <div className="gradient-primary p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Riwayat Tiket Keluhan</h2>
            <p className="text-white/80 text-sm mt-1">
              {filteredTickets.length} dari {tickets.length} tiket
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                onClick={exportToCSV}
                variant="secondary"
                size="sm"
                className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                disabled={filteredTickets.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden md:inline">Export CSV</span>
              </Button>
            )}
            <div className="glass-card px-4 py-2 rounded-full">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="p-6 space-y-4 border-b border-border/30">
        <div className="relative animate-fade-in">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cari tiket berdasarkan subjek, deskripsi, NIM, atau lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border/50 focus:border-primary transition-all"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-muted-foreground" />
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
          </div>

          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-muted-foreground" />
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
      </div>

      {/* Tickets Grid */}
      <ScrollArea className="h-[500px] p-6">
        {filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in">
            <div className="glass-card p-6 rounded-full mb-4">
              <Search className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Tidak Ada Tiket</h3>
            <p className="text-muted-foreground">
              Tidak ada tiket yang cocok dengan pencarian atau filter Anda.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredTickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className="glass-card p-6 hover:scale-[1.02] transition-transform animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div className="glass-card p-3 rounded-xl">
                    <AlertCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        #{ticket.id.substring(0, 8).toUpperCase()}
                      </span>
                      <Badge className={`${categoryConfig[ticket.kategori]?.color} border status-badge`}>
                        {categoryConfig[ticket.kategori]?.label || ticket.kategori.toUpperCase()}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{ticket.subjek}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{ticket.deskripsi}</p>
                  </div>
                </div>

                <div className="flex md:flex-col gap-2">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border/30">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">NIM:</span>
                  <span className="font-semibold text-foreground">{ticket.nim}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Lokasi:</span>
                  <span className="font-semibold text-foreground truncate">{ticket.lokasi}</span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold text-foreground">
                    {format(new Date(ticket.waktu), "dd MMM yyyy, HH:mm", { locale: id })}
                  </span>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, MapPin, User, Calendar, Tag, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";

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

  useEffect(() => {
    loadTickets();
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
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card flex items-center justify-center h-[600px] max-w-6xl mx-auto">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Riwayat Tiket Keluhan</h2>
            <p className="text-white/80 text-sm mt-1">{tickets.length} tiket tersimpan</p>
          </div>
          <div className="glass-card px-4 py-2 rounded-full">
            <FileText className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      <ScrollArea className="h-[600px] p-6">
        <div className="grid gap-6">
          {tickets.map((ticket, index) => (
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
      </ScrollArea>
    </div>
  );
};
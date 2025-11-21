import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, FileText } from "lucide-react";
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

const categoryColors: Record<string, string> = {
  fasilitas: "bg-blue-500",
  akademik: "bg-green-500",
  administrasi: "bg-yellow-500",
  keuangan: "bg-purple-500",
  pelanggaran: "bg-red-500",
  ppid: "bg-orange-500",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  diproses: "bg-blue-500",
  selesai: "bg-green-500",
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
      <Card className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center h-[600px] text-center p-8">
        <FileText className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Belum Ada Tiket</h3>
        <p className="text-muted-foreground">
          Belum ada tiket keluhan yang dibuat. Mulai chat untuk membuat tiket pertama Anda.
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Riwayat Tiket Keluhan</h2>
        <p className="text-sm text-muted-foreground">{tickets.length} tiket ditemukan</p>
      </div>

      <ScrollArea className="flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Tiket</TableHead>
              <TableHead>NIM</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Subjek</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-xs">
                  {ticket.id.substring(0, 8)}
                </TableCell>
                <TableCell>{ticket.nim}</TableCell>
                <TableCell>
                  <Badge className={categoryColors[ticket.kategori]}>
                    {ticket.kategori.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[150px] truncate">{ticket.lokasi}</TableCell>
                <TableCell className="max-w-[200px] truncate">{ticket.subjek}</TableCell>
                <TableCell>
                  <Badge className={statusColors[ticket.status]}>
                    {ticket.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(ticket.waktu), "dd MMM yyyy HH:mm", { locale: id })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </Card>
  );
};
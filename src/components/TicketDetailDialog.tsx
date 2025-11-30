import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Download, Clock, CheckCircle, AlertCircle, XCircle, User, MapPin, FileText, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface Ticket {
  id: string;
  nim: string;
  kategori: string;
  lokasi: string;
  subjek: string;
  deskripsi: string;
  status: string;
  waktu: string;
  reporter_name?: string;
  reporter_email?: string;
  is_anonymous?: boolean;
  status_history?: any; // Json type from Supabase
}

interface TicketDetailDialogProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwnerOrAdmin: boolean;
}

const categoryConfig: Record<string, { color: string; label: string }> = {
  fasilitas: { color: "bg-blue-500/20 text-blue-300 border-blue-500/30", label: "FASILITAS" },
  akademik: { color: "bg-green-500/20 text-green-300 border-green-500/30", label: "AKADEMIK" },
  administrasi: { color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", label: "ADMINISTRASI" },
  keuangan: { color: "bg-purple-500/20 text-purple-300 border-purple-500/30", label: "KEUANGAN" },
  pelanggaran: { color: "bg-red-500/20 text-red-300 border-red-500/30", label: "PELANGGARAN" },
  ppid: { color: "bg-orange-500/20 text-orange-300 border-orange-500/30", label: "PPID" },
};

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-500", label: "Pending" },
  diproses: { icon: AlertCircle, color: "text-blue-500", label: "Diproses" },
  selesai: { icon: CheckCircle, color: "text-green-500", label: "Selesai" },
  tidak_ditindaklanjuti: { icon: XCircle, color: "text-gray-500", label: "Tidak Ditindaklanjuti" },
};

export const TicketDetailDialog = ({ ticket, open, onOpenChange, isOwnerOrAdmin }: TicketDetailDialogProps) => {
  if (!ticket) return null;

  const downloadTicketPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("TIKET KELUHAN MAHASISWA", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("UIN Alauddin Makassar", 105, 28, { align: "center" });
      
      // Ticket ID
      doc.setFontSize(10);
      doc.text(`ID Tiket: #${ticket.id.substring(0, 8).toUpperCase()}`, 20, 45);
      
      // Details
      let yPos = 55;
      const lineHeight = 8;
      
      if (isOwnerOrAdmin) {
        doc.setFont("helvetica", "bold");
        doc.text("NIM:", 20, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(ticket.nim, 60, yPos);
        yPos += lineHeight;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text("Kategori:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(ticket.kategori.toUpperCase(), 60, yPos);
      yPos += lineHeight;
      
      doc.setFont("helvetica", "bold");
      doc.text("Lokasi:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(ticket.lokasi, 60, yPos);
      yPos += lineHeight;
      
      doc.setFont("helvetica", "bold");
      doc.text("Subjek:", 20, yPos);
      doc.setFont("helvetica", "normal");
      const subjekLines = doc.splitTextToSize(ticket.subjek, 130);
      doc.text(subjekLines, 60, yPos);
      yPos += lineHeight * subjekLines.length;
      
      doc.setFont("helvetica", "bold");
      doc.text("Deskripsi:", 20, yPos);
      doc.setFont("helvetica", "normal");
      const deskripsiLines = doc.splitTextToSize(ticket.deskripsi, 130);
      doc.text(deskripsiLines, 60, yPos);
      yPos += lineHeight * deskripsiLines.length;
      
      doc.setFont("helvetica", "bold");
      doc.text("Status:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(statusConfig[ticket.status]?.label || ticket.status, 60, yPos);
      yPos += lineHeight;
      
      doc.setFont("helvetica", "bold");
      doc.text("Tanggal:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(ticket.waktu), "dd MMMM yyyy, HH:mm", { locale: id }), 60, yPos);
      yPos += lineHeight * 2;
      
      // Status History
      if (ticket.status_history && ticket.status_history.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("RIWAYAT STATUS:", 20, yPos);
        yPos += lineHeight;
        
        ticket.status_history.forEach((history, index) => {
          doc.setFont("helvetica", "normal");
          doc.text(`${index + 1}. ${statusConfig[history.status]?.label || history.status}`, 25, yPos);
          yPos += 5;
          doc.setFontSize(9);
          doc.text(format(new Date(history.timestamp), "dd MMM yyyy, HH:mm", { locale: id }), 30, yPos);
          yPos += lineHeight;
          doc.setFontSize(10);
        });
      }
      
      // Footer
      doc.setFontSize(8);
      doc.text("Dokumen ini digenerate secara otomatis oleh Sistem Keluhan Kampus", 105, 280, { align: "center" });
      
      // Save
      doc.save(`Tiket_${ticket.id.substring(0, 8)}.pdf`);
      toast.success("Tiket berhasil diunduh");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Gagal mengunduh tiket");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-6 w-6 text-primary" />
            Detail Tiket
          </DialogTitle>
          <DialogDescription>
            Informasi lengkap dan tracking tiket keluhan
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Ticket Info */}
            <div className="glass-card p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm text-muted-foreground">
                    #{ticket.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <Badge className={`${categoryConfig[ticket.kategori]?.color} border`}>
                  {categoryConfig[ticket.kategori]?.label || ticket.kategori.toUpperCase()}
                </Badge>
              </div>

              {isOwnerOrAdmin && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">NIM:</span>
                  <span className="font-semibold">{ticket.nim}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Lokasi:</span>
                <span className="font-semibold">{ticket.lokasi}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">
                  {format(new Date(ticket.waktu), "dd MMMM yyyy, HH:mm", { locale: id })}
                </span>
              </div>
            </div>

            {/* Subject & Description */}
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Subjek</h4>
                <p className="text-base font-semibold">{ticket.subjek}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-1">Deskripsi</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{ticket.deskripsi}</p>
              </div>
            </div>

            <Separator />

            {/* Status Tracking */}
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Tracking Status
              </h4>
              
              <div className="space-y-4">
                {/* Current Status */}
                <div className="glass-card p-4 border-l-4 border-primary">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const StatusIcon = statusConfig[ticket.status]?.icon || AlertCircle;
                      return <StatusIcon className={`h-6 w-6 ${statusConfig[ticket.status]?.color}`} />;
                    })()}
                    <div className="flex-1">
                      <p className="font-semibold">Status Saat Ini</p>
                      <p className="text-sm text-muted-foreground">
                        {statusConfig[ticket.status]?.label || ticket.status}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status History */}
                {ticket.status_history && ticket.status_history.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-semibold text-muted-foreground">Riwayat Perubahan</h5>
                    <div className="space-y-2 pl-4 border-l-2 border-border/50">
                      {ticket.status_history.map((history, index) => {
                        const StatusIcon = statusConfig[history.status]?.icon || AlertCircle;
                        return (
                          <div key={index} className="glass p-3 rounded-lg">
                            <div className="flex items-start gap-3">
                              <StatusIcon className={`h-4 w-4 mt-0.5 ${statusConfig[history.status]?.color}`} />
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {statusConfig[history.status]?.label || history.status}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(history.timestamp), "dd MMM yyyy, HH:mm", { locale: id })}
                                </p>
                                {history.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Catatan: {history.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isOwnerOrAdmin && ticket.is_anonymous !== false && (
              <div className="glass-card p-4 bg-amber-500/10 border-amber-500/30">
                <p className="text-sm text-amber-200">
                  🔒 Informasi identitas pelapor disembunyikan untuk melindungi privasi
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={downloadTicketPDF}
            className="gradient-primary flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="glass"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
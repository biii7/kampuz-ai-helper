import { CheckCircle2, Hash, User, FolderOpen, MapPin, FileText, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TicketDisplayProps {
  ticketId: string;
  nim: string;
  kategori: string;
  lokasi: string;
  subjek: string;
}

export const TicketDisplay = ({ ticketId, nim, kategori, lokasi, subjek }: TicketDisplayProps) => {
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      fasilitas: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      akademik: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      administrasi: "bg-green-500/20 text-green-300 border-green-500/30",
      keuangan: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      pelanggaran: "bg-red-500/20 text-red-300 border-red-500/30",
      ppid: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      lainnya: "bg-gray-500/20 text-gray-300 border-gray-500/30"
    };
    return colors[category.toLowerCase()] || colors.lainnya;
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      {/* Header dengan Icon Tiket */}
      <div className="glass-card border-2 border-primary/30 rounded-t-2xl p-4 gradient-primary">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">TIKET KELUHAN MAHASISWA</h3>
            <p className="text-white/80 text-sm">Sistem Informasi Kampus</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <div className="glass-card border-x-2 border-primary/30 p-4 bg-green-500/10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-400" />
          <span className="text-green-300 font-semibold">Keluhan Anda telah berhasil dicatat!</span>
        </div>
      </div>

      {/* Detail Tiket */}
      <div className="glass-card border-x-2 border-primary/30 p-6 space-y-4">
        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <FileText className="h-5 w-5 text-primary" />
          Detail Tiket:
        </h4>

        {/* ID Tiket */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl hover:bg-primary/5 transition-colors">
          <Hash className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">ID Tiket</p>
            <p className="text-base font-mono font-bold text-foreground">{ticketId}</p>
          </div>
        </div>

        {/* NIM */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl hover:bg-primary/5 transition-colors">
          <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">NIM</p>
            <p className="text-base font-semibold text-foreground">{nim}</p>
          </div>
        </div>

        {/* Kategori */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl hover:bg-primary/5 transition-colors">
          <FolderOpen className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Kategori</p>
            <Badge className={`mt-1 ${getCategoryColor(kategori)} font-semibold`}>
              {kategori.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Lokasi */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl hover:bg-primary/5 transition-colors">
          <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Lokasi</p>
            <p className="text-base font-semibold text-foreground">{lokasi}</p>
          </div>
        </div>

        {/* Subjek */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl hover:bg-primary/5 transition-colors">
          <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Subjek</p>
            <p className="text-base font-semibold text-foreground">{subjek}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-start gap-3 p-3 glass rounded-xl bg-green-500/10 border border-green-500/30">
          <CheckCheck className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
            <p className="text-base font-bold text-green-400">✔ TERKIRIM KE PIHAK BERWENANG</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="glass-card border-2 border-primary/30 rounded-b-2xl p-4 bg-primary/5">
        <p className="text-sm text-muted-foreground text-center leading-relaxed">
          Keluhan Anda akan segera ditindaklanjuti oleh tim terkait.<br />
          <span className="font-semibold text-foreground">Pantau status tiket di menu "Riwayat Tiket".</span>
        </p>
        <p className="text-center mt-2 text-sm">
          Terima kasih telah menggunakan layanan kami! 🙏
        </p>
      </div>
    </div>
  );
};

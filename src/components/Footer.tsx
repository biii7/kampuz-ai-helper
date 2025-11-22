import { Mail, Phone, MapPin } from "lucide-react";
import uinLogo from "@/assets/uin-logo.png";

export default function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border/50 bg-background/95 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo & Description */}
          <div className="flex flex-col items-center md:items-start space-y-4">
            <img 
              src={uinLogo} 
              alt="UIN Alauddin Makassar" 
              className="h-20 w-auto object-contain"
            />
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Single Gateway & Sistem Triage Keluhan Otomatis berbasis AI untuk mahasiswa UIN Alauddin Makassar
            </p>
          </div>

          {/* Contact Info */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <h3 className="font-semibold text-foreground mb-2">Kontak</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 text-primary" />
              <span>(0411) 841879</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 text-primary" />
              <span>info@uin-alauddin.ac.id</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <span className="text-center md:text-left">
                Jl. H.M. Yasin Limpo No. 36, Romangpolong, Gowa, Sulawesi Selatan
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start space-y-3">
            <h3 className="font-semibold text-foreground mb-2">Tentang</h3>
            <p className="text-sm text-muted-foreground text-center md:text-left">
              Gerbang tunggal untuk keluhan kampus dengan Respons Instan (RAG) dan Penerusan Keluhan Otomatis ke pihak berwenang.
            </p>
            <p className="text-xs text-muted-foreground/70 text-center md:text-left">
              Universitas Islam Negeri Alauddin Makassar © {new Date().getFullYear()}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-center text-muted-foreground">
            Dibuat dengan ❤️ untuk UIN Alauddin Makassar
          </p>
        </div>
      </div>
    </footer>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { TicketHistory } from "@/components/TicketHistory";
import { AdminDashboard } from "@/components/AdminDashboard";
import { GraduationCap, MessageSquare, Ticket, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [view, setView] = useState<"hero" | "chat" | "tickets" | "admin">("hero");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single();
        setIsAdmin(!!data);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  if (view === "hero") {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-primary/20 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-secondary/20 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '1s' }} />
        </div>

        <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-16">
          <div className="text-center space-y-8 max-w-4xl animate-fade-in">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="glass-card p-6 glow-primary">
                <GraduationCap className="h-16 w-16 text-primary" />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">Chatbot Pelayanan</span>
              <br />
              <span className="text-foreground">Keluhan Kampus</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
              UIN Alauddin Makassar
            </p>

            <p className="text-base md:text-lg text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Sistem AI-powered untuk mengelola keluhan dan pertanyaan mahasiswa dengan teknologi RAG, Intent Detection, dan Ekstraksi Entitas otomatis
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Intent Detection</h3>
                <p className="text-sm text-muted-foreground">Deteksi otomatis keluhan atau informasi</p>
              </div>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <MessageSquare className="h-8 w-8 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">RAG System</h3>
                <p className="text-sm text-muted-foreground">Jawaban berdasarkan dokumen kampus</p>
              </div>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <Ticket className="h-8 w-8 text-accent mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Smart Ticketing</h3>
                <p className="text-sm text-muted-foreground">Tiket terstruktur dengan ekstraksi NER</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <Button
                size="lg"
                className="gradient-primary text-lg px-8 py-6 rounded-full glow-hover shadow-2xl"
                onClick={() => setView("chat")}
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                Mulai Chat
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="glass text-lg px-8 py-6 rounded-full hover:bg-white/10"
                onClick={() => setView("tickets")}
              >
                <Ticket className="mr-2 h-5 w-5" />
                Lihat Riwayat Tiket
              </Button>
            </div>

            {/* Admin Login Link */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <a
                href="/admin"
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Login Admin
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView("hero")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="glass-card p-2">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-lg font-bold gradient-text">Sistem Keluhan Kampus</h1>
                <p className="text-xs text-muted-foreground">UIN Alauddin Makassar</p>
              </div>
            </button>

            <div className="flex gap-2">
              <Button
                variant={view === "chat" ? "default" : "ghost"}
                className={view === "chat" ? "gradient-primary" : "glass"}
                onClick={() => setView("chat")}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </Button>
              <Button
                variant={view === "tickets" ? "default" : "ghost"}
                className={view === "tickets" ? "gradient-primary" : "glass"}
                onClick={() => setView("tickets")}
              >
                <Ticket className="h-4 w-4 mr-2" />
                Tiket
              </Button>
              {isAdmin && (
                <>
                  <Button
                    variant={view === "admin" ? "default" : "ghost"}
                    className={view === "admin" ? "gradient-primary" : "glass"}
                    onClick={() => setView("admin")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                  <Button
                    variant="ghost"
                    className="glass"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/admin";
                    }}
                  >
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {view === "chat" && <ChatInterface />}
          {view === "tickets" && <TicketHistory />}
          {view === "admin" && isAdmin && <AdminDashboard />}
        </div>
      </main>
    </div>
  );
};

export default Index;
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { TicketHistory } from "@/components/TicketHistory";
import { AdminDashboard } from "@/components/AdminDashboard";
import { GraduationCap, MessageSquare, Ticket, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [view, setView] = useState<"hero" | "chat" | "tickets" | "admin">("hero");
  const [adminTab, setAdminTab] = useState<"tickets" | "stats" | "analytics" | "templates" | "contacts" | "api" | "admins">("tickets");
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
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: '1s' }} />
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass border-b border-border/50 sticky top-0 z-50 backdrop-blur-xl bg-background/95">
        <div className="container mx-auto px-3 md:px-4 py-2 md:py-3">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setView("hero")}
              className="flex items-center gap-1.5 md:gap-2 hover:opacity-80 transition-opacity min-w-0"
            >
              <div className="glass-card p-1 md:p-1.5 flex-shrink-0">
                <GraduationCap className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              </div>
              <div className="text-left min-w-0">
                <h1 className="text-xs md:text-sm lg:text-base font-bold gradient-text truncate">Sistem Keluhan</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">UIN Alauddin</p>
              </div>
            </button>

            <nav className="flex gap-1 flex-shrink-0 items-center">
              {/* Show main navigation when not in admin view */}
              {view !== "admin" && (
                <>
                  <Button
                    variant={view === "chat" ? "default" : "ghost"}
                    className={`${view === "chat" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setView("chat")}
                    size="sm"
                  >
                    <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline ml-1 md:ml-2">Chat</span>
                  </Button>
                  <Button
                    variant={view === "tickets" ? "default" : "ghost"}
                    className={`${view === "tickets" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setView("tickets")}
                    size="sm"
                  >
                    <Ticket className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline ml-1 md:ml-2">Tiket</span>
                  </Button>
                </>
              )}
              
              {/* Show admin tabs navigation when in admin view */}
              {isAdmin && view === "admin" && (
                <>
                  <Button
                    variant={adminTab === "tickets" ? "default" : "ghost"}
                    className={`${adminTab === "tickets" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("tickets")}
                    size="sm"
                  >
                    <Ticket className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline ml-1 md:ml-2">Tiket</span>
                  </Button>
                  <Button
                    variant={adminTab === "stats" ? "default" : "ghost"}
                    className={`${adminTab === "stats" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("stats")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">Stat</span>
                  </Button>
                  <Button
                    variant={adminTab === "analytics" ? "default" : "ghost"}
                    className={`${adminTab === "analytics" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("analytics")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">Chart</span>
                  </Button>
                  <Button
                    variant={adminTab === "templates" ? "default" : "ghost"}
                    className={`${adminTab === "templates" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("templates")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">Template</span>
                  </Button>
                  <Button
                    variant={adminTab === "contacts" ? "default" : "ghost"}
                    className={`${adminTab === "contacts" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("contacts")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">Kontak</span>
                  </Button>
                  <Button
                    variant={adminTab === "api" ? "default" : "ghost"}
                    className={`${adminTab === "api" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("api")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">API</span>
                  </Button>
                  <Button
                    variant={adminTab === "admins" ? "default" : "ghost"}
                    className={`${adminTab === "admins" ? "gradient-primary" : "glass"} h-8 md:h-9 text-xs md:text-sm px-2 md:px-3`}
                    onClick={() => setAdminTab("admins")}
                    size="sm"
                  >
                    <span className="hidden sm:inline ml-1 md:ml-2">Admin</span>
                  </Button>
                </>
              )}
              
              {/* Admin login/logout buttons */}
              {isAdmin ? (
                <>
                  {view !== "admin" && (
                    <Button
                      variant="ghost"
                      className="glass h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
                      onClick={() => setView("admin")}
                      size="sm"
                    >
                      <Shield className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline ml-1 md:ml-2">Admin</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    className="glass h-8 md:h-9 text-xs px-2 md:px-3"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = "/admin";
                    }}
                    size="sm"
                  >
                    <span className="text-xs">Keluar</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  className="glass h-8 md:h-9 text-xs md:text-sm px-2 md:px-3"
                  onClick={() => window.location.href = "/admin"}
                  size="sm"
                >
                  <Shield className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline ml-1 md:ml-2">Login</span>
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="animate-fade-in">
          {view === "chat" && <ChatInterface />}
          {view === "tickets" && <TicketHistory />}
          {view === "admin" && isAdmin && <AdminDashboard activeTab={adminTab} />}
        </div>
      </main>
    </div>
  );
};

export default Index;
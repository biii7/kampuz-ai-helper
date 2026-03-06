import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { TicketHistory } from "@/components/TicketHistory";
import { AdminDashboard } from "@/components/AdminDashboard";
import { MessageSquare, Ticket, Sparkles, Shield, Menu, Moon, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import Footer from "@/components/Footer";
import uinLogo from "@/assets/uin-logo.png";

const Index = () => {
  const [view, setView] = useState<"hero" | "chat" | "tickets" | "admin">("hero");
  const [adminTab, setAdminTab] = useState<"tickets" | "stats" | "analytics" | "templates" | "contacts" | "api" | "admins" | "documents" | "logs">("tickets");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            const { data } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "admin")
              .single();
            setIsAdmin(!!data);
            if (data && event === "SIGNED_IN") {
              setView("admin");
            }
          }, 0);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Then check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .single()
          .then(({ data }) => {
            setIsAdmin(!!data);
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Shared Navbar component used in hero and non-admin views
  const Navbar = ({ transparent = false }: { transparent?: boolean }) => (
    <header
      className={`sticky top-0 z-50 h-16 flex-shrink-0 transition-colors ${
        transparent
          ? "bg-transparent"
          : "glass border-b border-border/50 backdrop-blur-xl bg-background/95"
      }`}
    >
      <div className="h-full px-4 md:px-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between h-full gap-4">
          {/* Logo */}
          <button
            onClick={() => setView("hero")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          >
            <img
              src={uinLogo}
              alt="UIN Alauddin"
              className="h-10 w-auto object-contain flex-shrink-0"
            />
            <div className="text-left min-w-0 hidden sm:block">
              <h1 className="text-sm font-bold gradient-text truncate">
                Sistem Keluhan Kampus
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                UIN Alauddin Makassar
              </p>
            </div>
          </button>

          {/* Navigation */}
          <nav className="flex gap-1.5 items-center flex-shrink-0">
            <Button
              variant={view === "chat" ? "default" : "ghost"}
              className={`${view === "chat" ? "gradient-primary text-white" : ""} h-9 text-sm`}
              onClick={() => setView("chat")}
              size="sm"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Chat</span>
            </Button>
            <Button
              variant={view === "tickets" ? "default" : "ghost"}
              className={`${view === "tickets" ? "gradient-primary text-white" : ""} h-9 text-sm`}
              onClick={() => setView("tickets")}
              size="sm"
            >
              <Ticket className="h-4 w-4 mr-1.5" />
              <span className="hidden md:inline">Tiket</span>
            </Button>

            {isAdmin ? (
              <>
                <Button
                  variant={view === "admin" ? "default" : "ghost"}
                  className={`${view === "admin" ? "gradient-primary text-white" : ""} h-9 text-sm`}
                  onClick={() => setView("admin")}
                  size="sm"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden md:inline ml-1.5">Dashboard</span>
                </Button>
                <Button
                  variant="ghost"
                  className="h-9 text-sm text-destructive hover:text-destructive"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setIsAdmin(false);
                    setView("hero");
                  }}
                  size="sm"
                  title="Keluar"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="h-9 w-9 p-0 text-muted-foreground/40 hover:text-muted-foreground/70"
                onClick={() => (window.location.href = "/admin-auth")}
                size="sm"
                title="Admin Login"
              >
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );

  if (view === "hero") {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 flex flex-col">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-primary/10 rounded-full blur-3xl -top-48 -left-48 animate-float" />
          <div className="absolute w-96 h-96 bg-accent/10 rounded-full blur-3xl -bottom-48 -right-48 animate-float" style={{ animationDelay: "1s" }} />
        </div>

        {/* Navbar on hero — transparent style */}
        <Navbar transparent />

        <main className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12">
          <div className="text-center space-y-8 max-w-4xl animate-fade-in">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src={uinLogo}
                alt="UIN Alauddin Makassar"
                className="h-28 md:h-36 w-auto object-contain animate-float"
              />
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl font-bold leading-tight">
              <span className="gradient-text">Chatbot Pelayanan</span>
              <br />
              <span className="text-foreground">Keluhan Kampus</span>
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.2s" }}>
              UIN Alauddin Makassar
            </p>

            <p className="text-base md:text-lg text-muted-foreground/80 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <strong>Single Gateway & Sistem Triage Otomatis</strong> untuk mengelola keluhan mahasiswa dengan teknologi AI — memberikan Respons Instan (RAG) dan Penerusan Keluhan Otomatis
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 animate-fade-in" style={{ animationDelay: "0.4s" }}>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Respons Instan (RAG)</h3>
                <p className="text-sm text-muted-foreground">Jawaban cepat berdasarkan dokumen kampus resmi</p>
              </div>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <Moon className="h-8 w-8 text-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Ekstraksi Entitas Kunci (NER)</h3>
                <p className="text-sm text-muted-foreground">Ekstraksi otomatis NIM, lokasi, dan subjek keluhan</p>
              </div>
              <div className="glass-card p-6 hover:scale-105 transition-transform">
                <Ticket className="h-8 w-8 text-accent mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Tiket Keluhan Terstruktur</h3>
                <p className="text-sm text-muted-foreground">Penerusan otomatis ke pihak berwenang</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-fade-in" style={{ animationDelay: "0.5s" }}>
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
        <Footer />
      </div>
    );
  }

  // Admin view with sidebar
  if (view === "admin" && isAdmin) {
    return (
      <SidebarProvider defaultOpen={true}>
        <div className="min-h-screen flex w-full bg-background">
          <AdminSidebar
            activeTab={adminTab}
            onTabChange={setAdminTab}
            onNavigate={(newView) => {
              setView(newView === "history" ? "tickets" : newView);
            }}
          />

          <div className="flex-1 flex flex-col min-w-0">
            {/* Fixed Toggle & Notification for Admin View */}
            <div className="fixed top-4 right-4 z-40 flex gap-2 items-center">
              <SidebarTrigger>
                <Button
                  variant="default"
                  size="icon"
                  className="gradient-primary shadow-lg h-10 w-10"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SidebarTrigger>
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                className="glass h-10 w-10"
                onClick={() => setView("hero")}
                title="Kembali ke Beranda"
              >
                <img src={uinLogo} alt="Home" className="h-6 w-6 object-contain" />
              </Button>
            </div>

            <main className="flex-1 overflow-auto">
              <div className="p-6 md:p-8 pt-16 lg:pt-8">
                <AdminDashboard activeTab={adminTab} hideNotification={true} />
              </div>
            </main>
            <Footer />
          </div>
        </div>
      </SidebarProvider>
    );
  }

  // Chat / Tickets view with shared navbar
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-fade-in">
            {view === "chat" && <ChatInterface />}
            {view === "tickets" && <TicketHistory />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "@/components/ChatInterface";
import { TicketHistory } from "@/components/TicketHistory";
import { AdminDashboard } from "@/components/AdminDashboard";
import { GraduationCap, Moon, Ticket, Sparkles, Shield, Menu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import Footer from "@/components/Footer";
import uinLogo from "@/assets/uin-logo.png";

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
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <img 
                src={uinLogo} 
                alt="UIN Alauddin Makassar" 
                className="h-32 md:h-40 w-auto object-contain animate-float"
              />
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
                <Moon className="h-8 w-8 text-secondary mx-auto mb-4" />
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
                <Moon className="mr-2 h-5 w-5" />
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

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar - Only show in admin view */}
        {view === "admin" && isAdmin && (
          <AdminSidebar 
            activeTab={adminTab} 
            onTabChange={setAdminTab}
            onNavigate={(newView) => {
              setView(newView === "history" ? "tickets" : newView);
            }}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - Only show when NOT in admin view */}
          {view !== "admin" && (
            <header className="glass border-b border-border/50 sticky top-0 z-50 backdrop-blur-xl bg-background/95 h-16 flex-shrink-0">
              <div className="h-full px-4 md:px-6">
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
                      <h1 className="text-sm font-bold gradient-text truncate">Sistem Keluhan Kampus</h1>
                      <p className="text-xs text-muted-foreground truncate">UIN Alauddin Makassar</p>
                    </div>
                  </button>

                  {/* Navigation */}
                  <nav className="flex gap-2 items-center flex-shrink-0">
                    <Button
                      variant={view === "chat" ? "default" : "ghost"}
                      className={`${view === "chat" ? "gradient-primary" : "glass"} h-9 text-sm`}
                      onClick={() => setView("chat")}
                      size="sm"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">Chat</span>
                    </Button>
                    <Button
                      variant={view === "tickets" ? "default" : "ghost"}
                      className={`${view === "tickets" ? "gradient-primary" : "glass"} h-9 text-sm`}
                      onClick={() => setView("tickets")}
                      size="sm"
                    >
                      <Ticket className="h-4 w-4 mr-2" />
                      <span className="hidden md:inline">Tiket</span>
                    </Button>
                    
                    {isAdmin ? (
                      <>
                        <Button
                          variant="ghost"
                          className="glass h-9 text-sm"
                          onClick={() => setView("admin")}
                          size="sm"
                        >
                          <Shield className="h-4 w-4" />
                          <span className="hidden md:inline ml-2">Admin</span>
                        </Button>
                        <Button
                          variant="ghost"
                          className="glass h-9 text-sm"
                          onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.href = "/admin-auth";
                          }}
                          size="sm"
                        >
                          <span className="text-xs">Keluar</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        className="glass h-9 text-sm"
                        onClick={() => window.location.href = "/admin-auth"}
                        size="sm"
                      >
                        <Shield className="h-4 w-4" />
                        <span className="hidden md:inline ml-2">Login</span>
                      </Button>
                    )}
                  </nav>
                </div>
              </div>
            </header>
          )}

          {/* Mobile Menu Toggle & Fixed Notification for Admin View */}
          {view === "admin" && isAdmin && (
            <>
              {/* Mobile Menu Button */}
              <div className="lg:hidden fixed top-4 left-4 z-40">
                <SidebarTrigger>
                  <Button
                    variant="default"
                    size="icon"
                    className="gradient-primary shadow-lg"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SidebarTrigger>
              </div>
              
              {/* Desktop Toggle & Notification */}
              <div className="hidden lg:flex fixed top-4 right-4 z-40 gap-2 items-center">
                <SidebarTrigger />
                <NotificationBell />
              </div>
              
              {/* Mobile Notification Only */}
              <div className="lg:hidden fixed top-4 right-4 z-40">
                <NotificationBell />
              </div>
            </>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {view === "admin" && isAdmin ? (
              <div className="p-6 md:p-8 pt-16 lg:pt-8">
                <AdminDashboard activeTab={adminTab} hideNotification={true} />
              </div>
            ) : (
              <div className="container mx-auto px-4 py-8">
                <div className="animate-fade-in">
                  {view === "chat" && <ChatInterface />}
                  {view === "tickets" && <TicketHistory />}
                </div>
              </div>
            )}
          </main>
          <Footer />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
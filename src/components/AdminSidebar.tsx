import { FileText, TrendingUp, BarChart3, Mail, Send, Settings, Users, Shield, LogOut, User, MessageSquare, History, Menu, X } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: "tickets" | "stats" | "analytics" | "templates" | "contacts" | "api" | "admins") => void;
  onNavigate?: (view: "chat" | "history") => void;
}

const navigationItems = [
  { id: "chat", label: "Chat Bot", icon: MessageSquare, action: "navigate" as const },
  { id: "history", label: "Riwayat Tiket", icon: History, action: "navigate" as const },
];

const menuItems = [
  { id: "tickets", label: "Kelola Tiket", icon: FileText },
  { id: "stats", label: "Statistik", icon: TrendingUp },
  { id: "analytics", label: "Analitik", icon: BarChart3 },
  { id: "templates", label: "Template Pesan", icon: Mail },
  { id: "contacts", label: "Kontak", icon: Send },
  { id: "api", label: "API Settings", icon: Settings },
  { id: "admins", label: "Sub-Admin", icon: Users },
];

export function AdminSidebar({ activeTab, onTabChange, onNavigate }: AdminSidebarProps) {
  const { state, open, setOpen, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin-auth";
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar 
        className={`
          ${collapsed ? "w-16" : "w-64"} 
          glass border-r border-border/50 h-screen
          ${isMobile ? "fixed left-0 top-0 z-50" : ""}
          transition-transform duration-300 ease-in-out
        `} 
        collapsible="icon"
      >
        {/* Logo/Brand Header */}
      <SidebarHeader className="border-b border-border/50 p-3">
        {collapsed ? (
          /* Collapsed State - Centered Icon Only */
          <div className="flex items-center justify-center w-full">
            <div className="glass-card gradient-primary rounded-lg p-2">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
        ) : (
          /* Expanded State - Full Header */
          <div className="flex items-center gap-3 w-full">
            <div className="glass-card gradient-primary rounded-xl flex-shrink-0 p-2.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-bold text-foreground text-sm truncate">Admin Panel</span>
              <span className="text-xs text-muted-foreground truncate">Sistem Keluhan</span>
            </div>
            
            {/* Close button for mobile */}
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="flex-shrink-0 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-transparent overflow-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2 py-4">
              {/* Navigation Items - Chat & History */}
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      onNavigate?.(item.id as "chat" | "history");
                      if (isMobile) setOpen(false);
                    }}
                    tooltip={collapsed ? item.label : undefined}
                    className={`
                      hover:bg-accent/10 text-foreground w-full
                      ${collapsed ? "justify-center px-2 mx-auto" : "justify-start px-4"}
                      transition-all duration-200 rounded-xl h-11
                    `}
                  >
                    <item.icon className={`flex-shrink-0 ${collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"}`} />
                    {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Separator */}
              <div className="my-4 px-2">
                <Separator />
              </div>

              {/* Admin Menu Items */}
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      onTabChange(item.id as any);
                      if (isMobile) setOpen(false);
                    }}
                    isActive={activeTab === item.id}
                    tooltip={collapsed ? item.label : undefined}
                    className={`
                      w-full transition-all duration-200 rounded-xl h-11
                      ${activeTab === item.id 
                        ? "gradient-primary text-white shadow-lg" 
                        : "hover:bg-primary/10 text-foreground"
                      }
                      ${collapsed ? "justify-center px-2 mx-auto" : "justify-start px-4"}
                    `}
                  >
                    <item.icon className={`flex-shrink-0 ${collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"}`} />
                    {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-border/50 p-4 mt-auto">
        <div className={`glass-card p-3 rounded-xl ${collapsed ? "flex justify-center items-center" : ""}`}>
          {!collapsed ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">Admin</p>
                  <p className="text-xs text-muted-foreground truncate">administrator</p>
                </div>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full border-destructive/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="icon"
              className="hover:bg-destructive/10 hover:text-destructive transition-colors mx-auto"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
      </Sidebar>
    </>
  );
}

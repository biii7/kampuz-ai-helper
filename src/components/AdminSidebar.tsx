import { FileText, TrendingUp, BarChart3, Mail, Send, Settings, Users, Shield, LogOut, User, MessageSquare, History } from "lucide-react";
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin-auth";
  };

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} glass border-r border-border/50 h-screen`} collapsible="icon">
      {/* Logo/Brand Header */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center gap-3">
          <div className="glass-card p-2 gradient-primary rounded-xl flex-shrink-0">
            <Shield className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-foreground text-base truncate">Admin Panel</span>
              <span className="text-xs text-muted-foreground truncate">Sistem Keluhan</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-transparent">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2 py-4">
              {/* Navigation Items - Chat & History */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onNavigate?.("chat")}
                  tooltip={collapsed ? "Chat Bot" : undefined}
                  className={`
                    hover:bg-accent/10 text-foreground
                    ${collapsed ? "justify-center px-2" : "px-4"}
                    transition-all duration-200 rounded-xl h-11
                  `}
                >
                  <MessageSquare className={`${collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"} flex-shrink-0`} />
                  {!collapsed && <span className="font-medium">Chat Bot</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onNavigate?.("history")}
                  tooltip={collapsed ? "Riwayat Tiket" : undefined}
                  className={`
                    hover:bg-accent/10 text-foreground
                    ${collapsed ? "justify-center px-2" : "px-4"}
                    transition-all duration-200 rounded-xl h-11
                  `}
                >
                  <History className={`${collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"} flex-shrink-0`} />
                  {!collapsed && <span className="font-medium">Riwayat Tiket</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Separator */}
              <div className="my-4">
                <Separator />
              </div>

              {/* Admin Menu Items */}
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(item.id as any)}
                    isActive={activeTab === item.id}
                    tooltip={collapsed ? item.label : undefined}
                    className={`
                      ${activeTab === item.id 
                        ? "gradient-primary text-white shadow-lg" 
                        : "hover:bg-primary/10 text-foreground"
                      }
                      ${collapsed ? "justify-center px-2" : "px-4"}
                      transition-all duration-200 rounded-xl h-11
                    `}
                  >
                    <item.icon className={`${collapsed ? "h-5 w-5" : "h-5 w-5 mr-3"} flex-shrink-0`} />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* User Footer */}
      <SidebarFooter className="border-t border-border/50 p-4 mt-auto">
        <div className={`glass-card p-3 rounded-xl ${collapsed ? "flex justify-center" : ""}`}>
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
                className="w-full border-destructive/50 hover:bg-destructive/10 hover:text-destructive"
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
              className="hover:bg-destructive/10 hover:text-destructive"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

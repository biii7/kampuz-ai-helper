import { FileText, TrendingUp, BarChart3, Mail, Send, Settings, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: "tickets" | "stats" | "analytics" | "templates" | "contacts" | "api" | "admins") => void;
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

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-64"} glass border-r border-border/50`} collapsible="icon">
      <SidebarContent className="bg-transparent pt-6">
        <SidebarGroup>
          <SidebarGroupLabel className={`${collapsed ? "sr-only" : ""} text-xs uppercase tracking-wide text-muted-foreground px-4 mb-2`}>
            Admin Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-2">
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
    </Sidebar>
  );
}

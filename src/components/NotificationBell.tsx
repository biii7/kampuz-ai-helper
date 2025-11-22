import { useState, useEffect } from "react";
import { Bell, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  ticket_id: string | null;
}

export const NotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();

    // Set up realtime subscription for new notifications
    const channel: RealtimeChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast.info(newNotif.title, {
            description: newNotif.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_reminder':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'new_ticket':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'status_change':
        return <AlertTriangle className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getNotificationStyle = (type: string, isRead: boolean) => {
    if (isRead) return "";
    
    switch (type) {
      case 'pending_reminder':
        return "bg-orange-500/10 border-l-4 border-orange-500";
      case 'new_ticket':
        return "bg-blue-500/10 border-l-4 border-blue-500";
      case 'status_change':
        return "bg-green-500/10 border-l-4 border-green-500";
      default:
        return "bg-primary/5";
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Semua notifikasi ditandai sudah dibaca");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Gagal menandai notifikasi");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 glass-card border-border/50">
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <h3 className="font-semibold text-foreground">Notifikasi</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-primary hover:text-primary"
            >
              Tandai Semua Dibaca
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Tidak ada notifikasi</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer border-b border-border/20 transition-colors ${
                  getNotificationStyle(notification.type, notification.is_read)
                }`}
                onClick={() => {
                  if (!notification.is_read) {
                    markAsRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start justify-between w-full mb-2">
                  <div className="flex items-center gap-2">
                    {getNotificationIcon(notification.type)}
                    <h4 className="font-semibold text-sm text-foreground">
                      {notification.title}
                    </h4>
                  </div>
                  {!notification.is_read && (
                    <div className="h-2 w-2 rounded-full bg-primary ml-2 flex-shrink-0 animate-pulse" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed pl-6">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between w-full pl-6">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), {
                      addSuffix: true,
                      locale: id,
                    })}
                  </span>
                  {notification.type === 'pending_reminder' && notification.ticket_id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-6 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.hash = '#/admin';
                        setIsOpen(false);
                      }}
                    >
                      Lihat Tiket
                    </Button>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

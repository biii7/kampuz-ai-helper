import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { History, Mail, MessageSquare, CheckCircle2, XCircle, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface ForwardingLog {
  id: string;
  ticket_id: string;
  contact_name: string;
  contact_type: string;
  contact_value: string;
  status: string;
  error_details: string | null;
  sent_at: string;
  tickets?: {
    nim: string;
    kategori: string;
    subjek: string;
  };
}

export const ForwardingLogs = () => {
  const [logs, setLogs] = useState<ForwardingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    loadLogs();

    // Subscribe to forwarding logs for real-time updates
    const forwardsChannel: RealtimeChannel = supabase
      .channel('forwards-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'forwarding_logs' },
        (payload) => {
          const newLog = payload.new as any;
          
          // Show toast notification
          if (newLog.status === "success") {
            toast.success(`✅ Tiket diteruskan ke ${newLog.contact_name}`, {
              description: `Via ${newLog.contact_type === "email" ? "Email" : "WhatsApp"}`,
            });
          } else {
            toast.error(`❌ Gagal mengirim ke ${newLog.contact_name}`, {
              description: newLog.error_details || "Terjadi kesalahan",
            });
          }
          
          // Reload logs
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(forwardsChannel);
    };
  }, []);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("forwarding_logs")
        .select(`
          *,
          tickets(nim, kategori, subjek)
        `)
        .order("sent_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error loading logs:", error);
      toast.error("Gagal memuat log pengiriman");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.contact_value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tickets?.subjek?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || log.status === filterStatus;
    const matchesType = filterType === "all" || log.contact_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === "success").length,
    failed: logs.filter(l => l.status === "failed").length,
    email: logs.filter(l => l.contact_type === "email").length,
    whatsapp: logs.filter(l => l.contact_type === "whatsapp").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="glass-card p-3 rounded-xl">
              <History className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold gradient-text">Log Pengiriman</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Riwayat pengiriman email & WhatsApp ke pihak berwenang
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Pengiriman</p>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </Card>
        <Card className="glass-card p-4 border-l-4 border-green-500/50">
          <p className="text-xs text-muted-foreground mb-1">Berhasil</p>
          <p className="text-2xl font-bold text-green-500">{stats.success}</p>
        </Card>
        <Card className="glass-card p-4 border-l-4 border-red-500/50">
          <p className="text-xs text-muted-foreground mb-1">Gagal</p>
          <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
        </Card>
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-3 w-3 text-blue-500" />
            <p className="text-xs text-muted-foreground">Email</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.email}</p>
        </Card>
        <Card className="glass-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-3 w-3 text-green-500" />
            <p className="text-xs text-muted-foreground">WhatsApp</p>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.whatsapp}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari kontak atau tiket..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 glass border-border/50"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="glass border-border/50">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="success">Berhasil</SelectItem>
              <SelectItem value="failed">Gagal</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="glass border-border/50">
              <SelectValue placeholder="Filter Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Logs List */}
      <Card className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Belum ada log pengiriman</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] p-6">
            <div className="space-y-4">
              {filteredLogs.map((log, index) => (
                <div
                  key={log.id}
                  className="glass-card p-4 hover:scale-[1.01] transition-all"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`glass-card p-2 rounded-lg ${
                      log.status === "success" ? "bg-green-500/10" : "bg-red-500/10"
                    }`}>
                      {log.status === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {log.contact_type === "email" ? (
                          <Mail className="h-4 w-4 text-blue-500" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-green-500" />
                        )}
                        <span className="font-semibold text-foreground">{log.contact_name}</span>
                        <span className="text-sm text-muted-foreground">→</span>
                        <span className="text-sm font-mono text-muted-foreground">{log.contact_value}</span>
                        <Badge variant={log.status === "success" ? "default" : "destructive"} className="ml-auto">
                          {log.status === "success" ? "Terkirim" : "Gagal"}
                        </Badge>
                      </div>

                      {log.tickets && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono text-xs">
                            {log.tickets.kategori.toUpperCase()}
                          </Badge>
                          <span className="text-muted-foreground">{log.tickets.subjek}</span>
                        </div>
                      )}

                      {log.error_details && (
                        <div className="flex items-start gap-2 p-3 glass-card bg-red-500/5 border-l-4 border-red-500/50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">Error Details:</p>
                            <p className="text-xs text-muted-foreground font-mono">{log.error_details}</p>
                          </div>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.sent_at), "PPpp", { locale: id })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};

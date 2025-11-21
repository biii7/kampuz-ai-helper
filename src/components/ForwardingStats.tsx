import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Send, CheckCircle, Clock, TrendingUp, Zap } from "lucide-react";

interface ForwardingStats {
  totalForwarded: number;
  successRate: number;
  avgResponseTime: number;
  autoForwardEnabled: number;
  dailyStats: { date: string; count: number }[];
  categoryStats: { kategori: string; forwarded: number; total: number }[];
}

export const ForwardingStats = () => {
  const [stats, setStats] = useState<ForwardingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("*");

      if (error) throw error;
      if (!tickets) return;

      // Calculate statistics
      const totalForwarded = tickets.filter(t => t.auto_forwarded).length;
      const autoForwardEnabled = tickets.filter(t => t.auto_forwarded === true).length;
      const successRate = tickets.length > 0 ? (totalForwarded / tickets.length) * 100 : 0;

      // Calculate avg response time for auto-forwarded tickets
      const forwardedTickets = tickets.filter(t => t.auto_forwarded && t.assigned_at);
      const totalResponseTime = forwardedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const assigned = new Date(ticket.assigned_at).getTime();
        return sum + (assigned - created);
      }, 0);
      const avgResponseTime = forwardedTickets.length > 0
        ? totalResponseTime / forwardedTickets.length / (1000 * 60) // Convert to minutes
        : 0;

      // Daily stats for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const dailyStats = last7Days.map(date => {
        const count = tickets.filter(t => {
          const ticketDate = new Date(t.created_at).toISOString().split('T')[0];
          return ticketDate === date && t.auto_forwarded;
        }).length;
        return { date: new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), count };
      });

      // Category stats
      const categories = ['fasilitas', 'akademik', 'administrasi', 'keuangan', 'pelanggaran', 'ppid'];
      const categoryStats = categories.map(kategori => {
        const total = tickets.filter(t => t.kategori === kategori).length;
        const forwarded = tickets.filter(t => t.kategori === kategori && t.auto_forwarded).length;
        return { kategori: kategori.charAt(0).toUpperCase() + kategori.slice(1), forwarded, total };
      }).filter(c => c.total > 0);

      setStats({
        totalForwarded,
        successRate,
        avgResponseTime,
        autoForwardEnabled,
        dailyStats,
        categoryStats,
      });
    } catch (error) {
      console.error("Error loading forwarding stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Diteruskan
            </CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{stats.totalForwarded}</div>
            <p className="text-xs text-muted-foreground mt-2">Tiket auto-forward</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {stats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tingkat keberhasilan</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Waktu Respons
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {stats.avgResponseTime.toFixed(0)} menit
            </div>
            <p className="text-xs text-muted-foreground mt-2">Rata-rata respons</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Auto-Forward Aktif
            </CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.autoForwardEnabled}</div>
            <p className="text-xs text-muted-foreground mt-2">Fitur aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="gradient-text">Tren Penerusan 7 Hari Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Tiket Diteruskan"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="gradient-text">Performa per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.categoryStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="kategori"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar dataKey="total" name="Total" fill="hsl(var(--muted))" radius={[8, 8, 0, 0]} />
                <Bar
                  dataKey="forwarded"
                  name="Diteruskan"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

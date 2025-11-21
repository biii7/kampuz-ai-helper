import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { FileText, Clock, CheckCircle, TrendingUp } from "lucide-react";

interface TicketStats {
  total: number;
  pending: number;
  diproses: number;
  selesai: number;
  byCategory: { kategori: string; count: number }[];
  avgResponseTime: number;
}

const categoryColors: Record<string, string> = {
  fasilitas: "hsl(var(--primary))",
  akademik: "hsl(var(--secondary))",
  administrasi: "hsl(142 76% 36%)",
  keuangan: "hsl(262 83% 58%)",
  pelanggaran: "hsl(0 84% 60%)",
  ppid: "hsl(25 95% 53%)",
};

const statusColors = {
  pending: "#f59e0b",
  diproses: "#3b82f6",
  selesai: "#10b981",
};

export const AdminAnalytics = () => {
  const [stats, setStats] = useState<TicketStats | null>(null);
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
      const total = tickets.length;
      const pending = tickets.filter((t) => t.status === "pending").length;
      const diproses = tickets.filter((t) => t.status === "diproses").length;
      const selesai = tickets.filter((t) => t.status === "selesai").length;

      // Count by category
      const categoryCount: Record<string, number> = {};
      tickets.forEach((ticket) => {
        categoryCount[ticket.kategori] = (categoryCount[ticket.kategori] || 0) + 1;
      });

      const byCategory = Object.entries(categoryCount).map(([kategori, count]) => ({
        kategori: kategori.charAt(0).toUpperCase() + kategori.slice(1),
        count,
      }));

      // Calculate average response time (for tickets that have been assigned)
      const assignedTickets = tickets.filter((t) => t.assigned_at);
      const totalResponseTime = assignedTickets.reduce((sum, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const assigned = new Date(ticket.assigned_at).getTime();
        return sum + (assigned - created);
      }, 0);
      const avgResponseTime = assignedTickets.length > 0 
        ? totalResponseTime / assignedTickets.length / (1000 * 60 * 60) // Convert to hours
        : 0;

      setStats({
        total,
        pending,
        diproses,
        selesai,
        byCategory,
        avgResponseTime,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
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

  const statusData = [
    { name: "Pending", value: stats.pending, color: statusColors.pending },
    { name: "Diproses", value: stats.diproses, color: statusColors.diproses },
    { name: "Selesai", value: stats.selesai, color: statusColors.selesai },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tiket</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold gradient-text">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-2">Semua tiket keluhan</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-2">Menunggu tindakan</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Diproses</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">{stats.diproses}</div>
            <p className="text-xs text-muted-foreground mt-2">Sedang ditangani</p>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50 hover:scale-105 transition-transform">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">{stats.selesai}</div>
            <p className="text-xs text-muted-foreground mt-2">Sudah ditangani</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="gradient-text">Tiket per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byCategory}>
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
                <Bar dataKey="count" name="Jumlah" radius={[8, 8, 0, 0]}>
                  {stats.byCategory.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={categoryColors[entry.kategori.toLowerCase()] || "hsl(var(--primary))"} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Pie Chart */}
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="gradient-text">Status Resolusi Tiket</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Card */}
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="gradient-text">Waktu Rata-rata Response</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="glass-card p-4 rounded-full">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="text-4xl font-bold text-foreground">
                {stats.avgResponseTime.toFixed(1)} jam
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Waktu rata-rata dari tiket dibuat hingga ditindaklanjuti
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

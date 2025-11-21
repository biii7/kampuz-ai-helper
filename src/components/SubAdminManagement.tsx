import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, Shield, Users } from "lucide-react";
import { z } from "zod";

const adminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  role: string;
}

export const SubAdminManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      // Get all admin users
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "admin");

      if (error) throw error;

      // Get user details from auth (we'll need to use service role for this in production)
      // For now, we'll just show the user_id
      const adminUsers = roles?.map((role) => ({
        id: role.user_id,
        email: `admin-${role.user_id.substring(0, 8)}`, // Placeholder
        created_at: role.created_at,
        role: role.role,
      })) || [];

      setAdmins(adminUsers);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Gagal memuat daftar admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    try {
      adminSchema.parse({ email, password });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Create new user via admin
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("User creation failed");
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "admin",
        });

      if (roleError) throw roleError;

      toast.success("Sub-admin berhasil ditambahkan!");
      setEmail("");
      setPassword("");
      setIsOpen(false);
      loadAdmins();
    } catch (error: any) {
      console.error("Error creating sub-admin:", error);
      if (error.message.includes("already registered")) {
        toast.error("Email sudah terdaftar");
      } else {
        toast.error("Gagal menambahkan sub-admin: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubAdmin = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus sub-admin ini?")) return;

    try {
      // Remove admin role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Sub-admin berhasil dihapus");
      loadAdmins();
    } catch (error) {
      console.error("Error deleting sub-admin:", error);
      toast.error("Gagal menghapus sub-admin");
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="gradient-text">Manajemen Sub-Admin</CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white hover:glow-hover">
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Sub-Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50">
              <DialogHeader>
                <DialogTitle className="text-2xl gradient-text">Tambah Sub-Admin Baru</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateSubAdmin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email Admin</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="admin-email"
                      type="email"
                      placeholder="subadmin@uinalauddin.ac.id"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 glass border-border/50"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="Minimal 8 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass border-border/50"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-white hover:glow-hover"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Membuat..." : "Buat Sub-Admin"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {admins.length === 0 ? (
          <div className="text-center py-8">
            <div className="glass-card p-4 rounded-full w-fit mx-auto mb-4">
              <Shield className="h-12 w-12 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Belum ada sub-admin</p>
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="glass-card p-4 flex items-center justify-between hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-center gap-4">
                  <div className="glass-card p-3 rounded-full">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{admin.email}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: {admin.id.substring(0, 8)}...
                    </p>
                  </div>
                  <Badge className="status-badge bg-primary/20 text-primary border-primary/30">
                    Admin
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteSubAdmin(admin.id)}
                  className="hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

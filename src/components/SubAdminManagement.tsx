import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Trash2, Shield, Mail, Settings } from "lucide-react";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const adminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

interface AdminUser {
  id: string;
  email: string | undefined;
  permissions: string[];
}

const permissionsList = [
  { value: 'view_tickets', label: 'Lihat Tiket' },
  { value: 'assign_tickets', label: 'Assign Tiket' },
  { value: 'forward_tickets', label: 'Teruskan Tiket' },
  { value: 'manage_contacts', label: 'Kelola Kontak' },
  { value: 'manage_templates', label: 'Kelola Template' },
  { value: 'view_analytics', label: 'Lihat Analitik' },
  { value: 'manage_api_settings', label: 'Kelola API' },
  { value: 'manage_admins', label: 'Kelola Admin' },
];

export const SubAdminManagement = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (error) throw error;

      // Get user details
      const adminUsers: AdminUser[] = [];
      
      for (const role of roles || []) {
        const { data: { user } } = await supabase.auth.admin.getUserById(role.user_id);
        
        // Get permissions for this admin
        const { data: permissions } = await supabase
          .from("admin_permissions")
          .select("permission")
          .eq("user_id", role.user_id);
        
        if (user) {
          adminUsers.push({
            id: user.id,
            email: user.email,
            permissions: permissions?.map(p => p.permission) || [],
          });
        }
      }

      setAdmins(adminUsers);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast.error("Gagal memuat data admin");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSubAdmin = async () => {
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
      // Create new user
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (authError) throw authError;
      if (!data.user) throw new Error("User creation failed");

      // Insert into user_roles table
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: "admin" });

      if (roleError) throw roleError;

      // Insert permissions
      if (selectedPermissions.length > 0) {
        const permissionsData = selectedPermissions.map(permission => ({
          user_id: data.user.id,
          permission: permission as any,
        }));
        
        const { error: permError } = await supabase
          .from("admin_permissions")
          .insert(permissionsData);

        if (permError) throw permError;
      }

      toast.success("Sub-admin berhasil dibuat!");
      setIsOpen(false);
      setEmail("");
      setPassword("");
      setSelectedPermissions([]);
      loadAdmins();
    } catch (error: any) {
      console.error("Error creating sub-admin:", error);
      toast.error(error.message || "Gagal membuat sub-admin");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubAdmin = async (userId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus sub-admin ini?")) return;

    try {
      // Delete permissions first
      await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", userId);

      // Then delete role
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");

      if (error) throw error;

      toast.success("Sub-admin berhasil dihapus");
      loadAdmins();
    } catch (error) {
      console.error("Error deleting sub-admin:", error);
      toast.error("Gagal menghapus sub-admin");
    }
  };

  const handleEditPermissions = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setSelectedPermissions(admin.permissions);
    setIsEditOpen(true);
  };

  const handleUpdatePermissions = async () => {
    if (!editingAdmin) return;

    try {
      setIsSubmitting(true);

      // Delete existing permissions
      await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", editingAdmin.id);

      // Insert new permissions
      if (selectedPermissions.length > 0) {
        const permissionsData = selectedPermissions.map(permission => ({
          user_id: editingAdmin.id,
          permission: permission as any,
        }));
        
        const { error } = await supabase
          .from("admin_permissions")
          .insert(permissionsData);

        if (error) throw error;
      }

      toast.success("Permissions berhasil diperbarui!");
      setIsEditOpen(false);
      setEditingAdmin(null);
      setSelectedPermissions([]);
      loadAdmins();
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("Gagal memperbarui permissions");
    } finally {
      setIsSubmitting(false);
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
              <Skeleton key={i} className="h-24 w-full" />
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
          <div>
            <CardTitle className="gradient-text flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Manajemen Sub-Admin
            </CardTitle>
            <CardDescription className="mt-2">
              Kelola sub-admin dan permissions mereka
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <UserPlus className="h-4 w-4 mr-2" />
                Tambah Sub-Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-2 border-primary/20 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="gradient-text">Buat Sub-Admin Baru</DialogTitle>
                <DialogDescription>
                  Tambahkan sub-admin baru dan atur permissions nya
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass border-border/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass border-border/50"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {permissionsList.map((perm) => (
                      <div key={perm.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`perm-${perm.value}`}
                          checked={selectedPermissions.includes(perm.value)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPermissions([...selectedPermissions, perm.value]);
                            } else {
                              setSelectedPermissions(selectedPermissions.filter(p => p !== perm.value));
                            }
                          }}
                        />
                        <label
                          htmlFor={`perm-${perm.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {perm.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreateSubAdmin}
                  disabled={isSubmitting}
                  className="w-full gradient-primary"
                >
                  {isSubmitting ? "Membuat..." : "Buat Sub-Admin"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Belum ada sub-admin. Klik tombol di atas untuk menambahkan.
          </p>
        ) : (
          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="glass-card p-6 hover:scale-[1.01] transition-transform"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="glass-card p-3 rounded-xl">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{admin.email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">ID: {admin.id.substring(0, 8)}</p>
                      
                      <div className="flex flex-wrap gap-1">
                        {admin.permissions.length > 0 ? (
                          admin.permissions.map(perm => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {permissionsList.find(p => p.value === perm)?.label || perm}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="text-xs">Full Access</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditPermissions(admin)}
                      className="gap-2"
                    >
                      <Settings className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteSubAdmin(admin.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit Permissions Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="glass-card border-2 border-primary/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="gradient-text">Edit Permissions</DialogTitle>
            <DialogDescription>
              Atur permissions untuk {editingAdmin?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {permissionsList.map((perm) => (
                <div key={perm.value} className="flex items-center space-x-2 glass-card p-3 rounded-lg">
                  <Checkbox
                    id={`edit-perm-${perm.value}`}
                    checked={selectedPermissions.includes(perm.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPermissions([...selectedPermissions, perm.value]);
                      } else {
                        setSelectedPermissions(selectedPermissions.filter(p => p !== perm.value));
                      }
                    }}
                  />
                  <label
                    htmlFor={`edit-perm-${perm.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
            <Button
              onClick={handleUpdatePermissions}
              disabled={isSubmitting}
              className="w-full gradient-primary"
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

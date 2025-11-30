import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, MessageSquare, Plus, Edit, Trash2, Save, Eye, Info, Sparkles, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
  category: string | null;
}

const templateDescriptions: Record<string, string> = {
  "email": "Template untuk notifikasi email otomatis ke pihak berwenang saat tiket keluhan diterima",
  "whatsapp": "Template untuk notifikasi WhatsApp otomatis ke pihak berwenang saat tiket keluhan diterima"
};

const variableDescriptions: Record<string, string> = {
  "nim": "Nomor Induk Mahasiswa pengadu",
  "kategori": "Kategori keluhan (fasilitas, akademik, dll)",
  "subjek": "Judul/subjek keluhan",
  "lokasi": "Lokasi kejadian keluhan",
  "deskripsi": "Deskripsi lengkap keluhan",
  "waktu": "Waktu tiket dibuat"
};

export const MessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [userRole, setUserRole] = useState<string>("");

  const [formData, setFormData] = useState({
    name: "",
    type: "email",
    subject: "",
    body: "",
    category: "all",
  });

  useEffect(() => {
    checkPermission();
    loadTemplates();
  }, []);

  const checkPermission = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user is admin (full access)
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleData) {
        setHasPermission(true);
        setUserRole("admin");
        return;
      }

      // Check if user has manage_templates permission
      const { data: permData } = await supabase
        .from("admin_permissions")
        .select("permission")
        .eq("user_id", session.user.id)
        .eq("permission", "manage_templates")
        .maybeSingle();

      setHasPermission(!!permData);
      setUserRole(permData ? "sub-admin" : "");
    } catch (error) {
      console.error("Error checking permission:", error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const formattedData = data?.map(template => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? template.variables 
          : (template.variables as any)?.length 
            ? JSON.parse(template.variables as string)
            : []
      })) || [];
      
      setTemplates(formattedData);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Gagal memuat template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.body) {
      toast.error("Nama dan isi template wajib diisi");
      return;
    }

    if (formData.type === "email" && !formData.subject) {
      toast.error("Subject email wajib diisi");
      return;
    }

    try {
      const templateData = {
        name: formData.name,
        type: formData.type,
        subject: formData.type === "email" ? formData.subject : null,
        body: formData.body,
        variables: extractVariables(formData.body),
        category: formData.category === "all" ? null : formData.category,
      };

      if (editingTemplate) {
        const { error } = await supabase
          .from("message_templates")
          .update(templateData)
          .eq("id", editingTemplate.id);

        if (error) throw error;
        toast.success("Template berhasil diperbarui");
      } else {
        const { error } = await supabase
          .from("message_templates")
          .insert(templateData);

        if (error) throw error;
        toast.success("Template berhasil dibuat");
      }

      setIsDialogOpen(false);
      resetForm();
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Gagal menyimpan template");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin ingin menghapus template ini?")) return;

    try {
      const { error } = await supabase
        .from("message_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Template berhasil dihapus");
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Gagal menghapus template");
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = text.matchAll(regex);
    return [...new Set(Array.from(matches, m => m[1]))];
  };

  const resetForm = () => {
    setFormData({ name: "", type: "email", subject: "", body: "", category: "all" });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || "",
      body: template.body,
      category: template.category || "all",
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      {/* Header with Permission Badge */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold gradient-text">Template Pesan</h2>
            {userRole && (
              <Badge variant={userRole === "admin" ? "default" : "secondary"} className="gap-1">
                <Shield className="h-3 w-3" />
                {userRole === "admin" ? "Admin Penuh" : "Sub-Admin"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            📧 Kelola template untuk notifikasi otomatis email & WhatsApp saat tiket keluhan diterima
          </p>
          <div className="flex items-center gap-2 mt-2 p-3 glass-card rounded-lg border-l-4 border-primary/50">
            <Info className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Tujuan:</span> Template ini digunakan untuk format pesan yang dikirim otomatis ke pihak berwenang. 
              Gunakan variabel <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">{`{{nama_variabel}}`}</code> untuk data dinamis dari tiket.
            </p>
          </div>
        </div>
        {hasPermission && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white hover:glow-hover shadow-lg">
                <Plus className="h-4 w-4 mr-2" />
                Buat Template
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-border/50 max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="gradient-text flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  {editingTemplate ? "Edit Template Pesan" : "Buat Template Baru"}
                </DialogTitle>
                <DialogDescription>
                  {editingTemplate 
                    ? "Perbarui template pesan otomatis untuk notifikasi tiket keluhan"
                    : "Buat template baru untuk format pesan notifikasi otomatis"}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="edit" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Edit Template
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="flex-1 overflow-auto space-y-4 pr-2">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Nama Template</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Contoh: Notifikasi Keluhan Fasilitas Rusak"
                      className="glass border-border/50"
                    />
                    <p className="text-xs text-muted-foreground">Nama untuk mengidentifikasi template ini</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Tipe Pengiriman</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger className="glass border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border/50">
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-primary" />
                            <span>Email</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="whatsapp">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-green-500" />
                            <span>WhatsApp</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{templateDescriptions[formData.type]}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Kategori Keluhan</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger className="glass border-border/50 bg-background/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background border-border/50">
                        <SelectItem value="all">Semua Kategori (Default)</SelectItem>
                        <SelectItem value="fasilitas">Fasilitas</SelectItem>
                        <SelectItem value="akademik">Akademik</SelectItem>
                        <SelectItem value="administrasi">Administrasi</SelectItem>
                        <SelectItem value="keuangan">Keuangan</SelectItem>
                        <SelectItem value="pelanggaran">Pelanggaran (SPI/DUMAS)</SelectItem>
                        <SelectItem value="ppid">PPID</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Template akan digunakan untuk kategori ini. Pilih "Semua Kategori" untuk template umum.
                    </p>
                  </div>

                  {formData.type === "email" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Subject Email</Label>
                      <Input
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="[{{kategori}}] Tiket Keluhan Baru - {{subjek}}"
                        className="glass border-border/50 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Subject line yang akan muncul di inbox penerima</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Isi Pesan</Label>
                    <Textarea
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      placeholder={`Contoh untuk ${formData.type === "email" ? "Email" : "WhatsApp"}:\n\n${formData.type === "email" 
                        ? `<h2>Tiket Keluhan Mahasiswa</h2>\n<p><strong>NIM:</strong> {{nim}}</p>\n<p><strong>Kategori:</strong> {{kategori}}</p>\n<p><strong>Lokasi:</strong> {{lokasi}}</p>\n<p><strong>Subjek:</strong> {{subjek}}</p>\n<p><strong>Deskripsi:</strong></p>\n<p>{{deskripsi}}</p>\n<p><small>Waktu: {{waktu}}</small></p>`
                        : `*[{{kategori}}] Tiket Keluhan Baru*\n\n*NIM:* {{nim}}\n*Kategori:* {{kategori}}\n*Lokasi:* {{lokasi}}\n*Subjek:* {{subjek}}\n\n*Deskripsi:*\n{{deskripsi}}\n\n_Waktu: {{waktu}}_`
                      }`}
                      className="glass border-border/50 min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.type === "email" 
                        ? "Gunakan HTML untuk formatting (contoh: <strong>, <p>, <br>)" 
                        : "Gunakan * untuk bold, _ untuk italic di WhatsApp"}
                    </p>
                  </div>

                  {/* Variabel Guide */}
                  <div className="p-4 glass-card rounded-lg border-l-4 border-primary/50">
                    <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Variabel Yang Tersedia
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(variableDescriptions).map(([key, desc]) => (
                        <div key={key} className="flex items-start gap-2 p-2 glass-card rounded">
                          <code className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-mono whitespace-nowrap">
                            {`{{${key}}}`}
                          </code>
                          <span className="text-xs text-muted-foreground">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {formData.body && extractVariables(formData.body).length > 0 && (
                    <div className="p-3 glass-card rounded-lg bg-green-500/5 border-l-4 border-green-500/50">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">
                        ✓ Variabel Terdeteksi:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {extractVariables(formData.body).map((v) => (
                          <Badge key={v} variant="outline" className="font-mono text-xs bg-green-500/10 border-green-500/30">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="preview" className="flex-1 overflow-auto">
                  <div className="space-y-4">
                    <div className="p-4 glass-card rounded-lg border-2 border-primary/20">
                      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Preview Live Template
                      </h3>
                      <Separator className="my-3" />
                      
                      {formData.type === "email" && formData.subject && (
                        <div className="mb-4 p-3 glass-card rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                          <p className="text-sm font-medium text-foreground font-mono">
                            {formData.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => 
                              `<span class="text-primary font-bold">[${key.toUpperCase()}]</span>`
                            )}
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-background/50 rounded-lg border border-border/30">
                        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                          {formData.body ? formData.body.replace(/\{\{(\w+)\}\}/g, (_, key) => 
                            `[${key.toUpperCase()}]`
                          ) : "Belum ada konten..."}
                        </pre>
                      </div>
                    </div>

                    <div className="p-3 glass-card rounded-lg bg-blue-500/5 border-l-4 border-blue-500/50">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">💡 Tips:</strong> Variabel dalam kurung kurawal akan diganti otomatis dengan data tiket saat pesan dikirim.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="pt-4 border-t border-border/30 mt-4">
                <Button onClick={handleSave} className="w-full gradient-primary text-white h-11">
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? "💾 Perbarui Template" : "✨ Simpan Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid gap-6">
          {isLoading ? (
            <Card className="glass-card p-6 text-center">
              <p className="text-muted-foreground">Memuat template...</p>
            </Card>
          ) : templates.length === 0 ? (
            <Card className="glass-card p-12 text-center border-2 border-dashed border-primary/30">
              <div className="max-w-md mx-auto">
                <Mail className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Belum Ada Template</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Buat template pertama untuk mengotomatiskan notifikasi tiket keluhan ke pihak berwenang
                </p>
                {hasPermission && (
                  <Button 
                    onClick={() => setIsDialogOpen(true)}
                    className="gradient-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Buat Template Pertama
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            templates.map((template, index) => (
              <Card 
                key={template.id} 
                className="glass-card p-6 card-elevated hover:scale-[1.01] transition-all border-l-4 border-primary/30"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`glass-card p-3 rounded-xl ${
                      template.type === "email" 
                        ? "bg-blue-500/10 border-blue-500/30" 
                        : "bg-green-500/10 border-green-500/30"
                    }`}>
                      {template.type === "email" ? (
                        <Mail className="h-6 w-6 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-6 w-6 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-foreground mb-1">{template.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge 
                          variant="outline" 
                          className={template.type === "email" 
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/30" 
                            : "bg-green-500/10 text-green-600 border-green-500/30"
                          }
                        >
                          {template.type === "email" ? "📧 Email" : "💬 WhatsApp"}
                        </Badge>
                        {template.is_active && (
                          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                            ✓ Aktif
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasPermission && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="Edit template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(template.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                        title="Hapus template"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                {/* Purpose & Description */}
                <div className="mb-4 p-3 glass-card rounded-lg bg-primary/5 border-l-4 border-primary/50">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-primary mb-1">Tujuan Penggunaan:</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {templateDescriptions[template.type]}
                      </p>
                    </div>
                  </div>
                </div>

                {template.subject && (
                  <div className="mb-4 p-4 glass-card rounded-lg border border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">Subject</Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground font-mono bg-muted/30 p-2 rounded">
                      {template.subject}
                    </p>
                  </div>
                )}

                <div className="p-4 glass-card rounded-lg border border-border/30 bg-background/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="text-xs">Isi Template</Badge>
                    <span className="text-xs text-muted-foreground">
                      {template.body.length} karakter
                    </span>
                  </div>
                  <ScrollArea className="max-h-[200px]">
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed p-3 bg-muted/20 rounded">
                      {template.body}
                    </pre>
                  </ScrollArea>
                </div>

                {template.variables.length > 0 && (
                  <div className="mt-4 p-3 glass-card rounded-lg bg-green-500/5">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Variabel Dinamis ({template.variables.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((v) => (
                        <div key={v} className="group relative">
                          <Badge 
                            variant="outline" 
                            className="font-mono text-xs bg-green-500/10 border-green-500/30 cursor-help"
                          >
                            {`{{${v}}}`}
                          </Badge>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                            <div className="bg-popover border border-border px-3 py-2 rounded-lg shadow-lg whitespace-nowrap text-xs">
                              {variableDescriptions[v] || "Variabel custom"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!hasPermission && (
                  <div className="mt-4 p-3 glass-card rounded-lg bg-orange-500/5 border-l-4 border-orange-500/50">
                    <div className="flex items-start gap-2">
                      <Shield className="h-4 w-4 text-orange-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        <span className="font-semibold text-orange-600">Akses Terbatas:</span> Anda hanya dapat melihat template. 
                        Hubungi admin utama untuk permission "manage_templates" agar bisa mengedit.
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

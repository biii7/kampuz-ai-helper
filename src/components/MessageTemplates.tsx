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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail, MessageSquare, Plus, Edit, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  subject: string | null;
  body: string;
  variables: string[];
  is_active: boolean;
}

export const MessageTemplates = () => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    type: "email",
    subject: "",
    body: "",
  });

  useEffect(() => {
    loadTemplates();
  }, []);

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
    setFormData({ name: "", type: "email", subject: "", body: "" });
    setEditingTemplate(null);
  };

  const openEditDialog = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject || "",
      body: template.body,
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Template Pesan</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola template untuk email dan WhatsApp auto-forward
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-white hover:glow-hover">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Template
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border/50 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="gradient-text">
                {editingTemplate ? "Edit Template" : "Buat Template Baru"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Template</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Email Keluhan Fasilitas"
                  className="glass border-border/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="glass border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === "email" && (
                <div className="space-y-2">
                  <Label>Subject Email</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Gunakan {{variabel}} untuk data dinamis"
                    className="glass border-border/50"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Isi Pesan</Label>
                <Textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Gunakan {{variabel}} untuk data dinamis. Contoh: {{nim}}, {{kategori}}, {{subjek}}, {{lokasi}}, {{deskripsi}}, {{waktu}}"
                  className="glass border-border/50 min-h-[200px] font-mono text-sm"
                />
                {formData.body && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">Variabel terdeteksi:</p>
                    <div className="flex flex-wrap gap-2">
                      {extractVariables(formData.body).map((v) => (
                        <Badge key={v} variant="outline" className="font-mono text-xs">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleSave} className="w-full gradient-primary text-white">
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? "Perbarui Template" : "Simpan Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="grid gap-4">
          {isLoading ? (
            <Card className="glass-card p-6 text-center">
              <p className="text-muted-foreground">Memuat template...</p>
            </Card>
          ) : templates.length === 0 ? (
            <Card className="glass-card p-12 text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada template</p>
            </Card>
          ) : (
            templates.map((template) => (
              <Card key={template.id} className="glass-card p-6 card-elevated hover:scale-[1.01] transition-transform">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="glass-card p-3 rounded-xl">
                      {template.type === "email" ? (
                        <Mail className="h-5 w-5 text-primary" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-secondary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{template.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {template.type === "email" ? "Email" : "WhatsApp"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(template)}
                      className="hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(template.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {template.subject && (
                  <div className="mb-3 p-3 glass-card rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Subject:</p>
                    <p className="text-sm font-medium text-foreground">{template.subject}</p>
                  </div>
                )}

                <div className="p-3 glass-card rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Isi Pesan:</p>
                  <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
                    {template.body}
                  </pre>
                </div>

                {template.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="secondary" className="font-mono text-xs">
                        {`{{${v}}}`}
                      </Badge>
                    ))}
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

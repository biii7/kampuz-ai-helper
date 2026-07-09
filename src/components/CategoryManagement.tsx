import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FolderOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = { name: "", description: "", is_active: true, sort_order: 0 };

export const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("complaint_categories")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error("Gagal memuat kategori");
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sort_order: categories.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description,
      is_active: cat.is_active,
      sort_order: cat.sort_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim().toLowerCase();
    const description = form.description.trim();
    if (!name) {
      toast.error("Nama kategori wajib diisi");
      return;
    }
    if (!description) {
      toast.error("Deskripsi wajib diisi agar AI dapat mempelajarinya");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("complaint_categories")
          .update({
            name,
            description,
            is_active: form.is_active,
            sort_order: form.sort_order,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Kategori berhasil diperbarui");
      } else {
        const { error } = await supabase.from("complaint_categories").insert({
          name,
          description,
          is_active: form.is_active,
          sort_order: form.sort_order,
        });
        if (error) throw error;
        toast.success("Kategori baru ditambahkan");
      }
      setDialogOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan kategori");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Hapus kategori "${cat.name}"? Tiket lama dengan kategori ini tetap ada.`)) return;
    const { error } = await supabase.from("complaint_categories").delete().eq("id", cat.id);
    if (error) {
      toast.error("Gagal menghapus kategori");
    } else {
      toast.success("Kategori dihapus");
      load();
    }
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabase
      .from("complaint_categories")
      .update({ is_active: !cat.is_active })
      .eq("id", cat.id);
    if (error) {
      toast.error("Gagal mengubah status");
    } else {
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="h-7 w-7 text-primary" />
            Kelola Kategori Keluhan
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Tambah, ubah, atau hapus kategori keluhan. Deskripsi setiap kategori akan{" "}
            <span className="text-primary font-semibold">dipelajari oleh AI</span> untuk
            mengklasifikasikan keluhan secara otomatis.
          </p>
        </div>
        <Button onClick={openCreate} className="gradient-primary">
          <Plus className="h-4 w-4 mr-2" />
          Tambah Kategori
        </Button>
      </div>

      <div className="glass-card p-4 rounded-xl flex items-start gap-3 border-l-4 border-primary">
        <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Tips:</span> Tulis deskripsi yang jelas
          dan spesifik (contoh: kata kunci, contoh masalah). AI akan menggunakan deskripsi ini
          sebagai konteks untuk mengklasifikasikan keluhan mahasiswa ke kategori yang benar.
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-card p-5 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className="uppercase font-bold">{cat.name}</Badge>
                    {!cat.is_active && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Nonaktif
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Urutan: {cat.sort_order}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {cat.description || (
                      <span className="italic text-muted-foreground">Belum ada deskripsi</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={cat.is_active}
                    onCheckedChange={() => toggleActive(cat)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="glass-card p-10 text-center text-muted-foreground">
              Belum ada kategori. Klik "Tambah Kategori" untuk membuat.
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
            <DialogDescription>
              Isi deskripsi selengkap mungkin — deskripsi ini akan digunakan AI untuk
              mengklasifikasikan keluhan mahasiswa.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold mb-1.5 block">
                Nama Kategori <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="contoh: fasilitas"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Gunakan huruf kecil tanpa spasi (akan otomatis diubah).
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold mb-1.5 block">
                Deskripsi <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Jelaskan kategori ini — jenis masalah, kata kunci, contoh keluhan..."
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold mb-1.5 block">Urutan Tampil</label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <span className="text-sm">Aktif</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

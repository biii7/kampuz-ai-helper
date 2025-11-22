import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Mail, Phone, Plus, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  name: string;
  contact_type: "email" | "whatsapp";
  contact_value: string;
  category: string;
  is_active: boolean;
}

const categories = [
  "fasilitas",
  "akademik",
  "administrasi",
  "keuangan",
  "pelanggaran",
  "ppid",
];

export const ContactManagement = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [autoForwardEnabled, setAutoForwardEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  const [newContact, setNewContact] = useState({
    name: "",
    contact_type: "email" as "email" | "whatsapp",
    contact_value: "",
    category: "fasilitas",
  });

  useEffect(() => {
    fetchContacts();
    fetchAutoForwardSetting();
  }, []);

  const fetchContacts = async () => {
    const { data, error } = await supabase
      .from("forwarding_contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat kontak",
        variant: "destructive",
      });
    } else {
      setContacts((data as Contact[]) || []);
    }
    setLoading(false);
  };

  const fetchAutoForwardSetting = async () => {
    const { data } = await supabase
      .from("system_settings")
      .select("setting_value")
      .eq("setting_key", "auto_forward_enabled")
      .single();

    if (data) {
      setAutoForwardEnabled(data.setting_value === "true");
    }
  };

  const toggleAutoForward = async (enabled: boolean) => {
    const { error } = await supabase
      .from("system_settings")
      .update({ setting_value: enabled.toString(), updated_at: new Date().toISOString() })
      .eq("setting_key", "auto_forward_enabled");

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah pengaturan",
        variant: "destructive",
      });
    } else {
      setAutoForwardEnabled(enabled);
      toast({
        title: "Berhasil",
        description: `Auto-forward ${enabled ? "diaktifkan" : "dinonaktifkan"}`,
      });
    }
  };

  const addContact = async () => {
    if (!newContact.name || !newContact.contact_value) {
      toast({
        title: "Error",
        description: "Mohon lengkapi semua field",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("forwarding_contacts").insert([
      {
        name: newContact.name,
        contact_type: newContact.contact_type,
        contact_value: newContact.contact_value,
        category: newContact.category,
        is_active: true,
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menambah kontak",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Kontak berhasil ditambahkan",
      });
      setNewContact({
        name: "",
        contact_type: "email",
        contact_value: "",
        category: "fasilitas",
      });
      fetchContacts();
    }
  };

  const updateContact = async () => {
    if (!editingContact) return;

    const { error } = await supabase
      .from("forwarding_contacts")
      .update({
        name: editingContact.name,
        contact_type: editingContact.contact_type,
        contact_value: editingContact.contact_value,
        category: editingContact.category,
      })
      .eq("id", editingContact.id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengupdate kontak",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Kontak berhasil diupdate",
      });
      setEditingContact(null);
      fetchContacts();
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase
      .from("forwarding_contacts")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus kontak",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Berhasil",
        description: "Kontak berhasil dihapus",
      });
      fetchContacts();
    }
  };

  const toggleContactActive = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from("forwarding_contacts")
      .update({ is_active })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status kontak",
        variant: "destructive",
      });
    } else {
      fetchContacts();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  const handleSendAll = async () => {
    setLoading(true);
    try {
      // Get all unsent tickets
      const { data: tickets, error: ticketsError } = await supabase
        .from("tickets")
        .select("*")
        .eq("auto_forwarded", false);

      if (ticketsError) {
        throw ticketsError;
      }

      if (!tickets || tickets.length === 0) {
        toast({
          title: "Info",
          description: "Tidak ada tiket yang perlu dikirim",
        });
        setLoading(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      // Forward each ticket
      for (const ticket of tickets) {
        try {
          const { error } = await supabase.functions.invoke("forward-ticket", {
            body: { ticketId: ticket.id },
          });

          if (error) {
            failCount++;
          } else {
            successCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      toast({
        title: "Proses Selesai",
        description: `${successCount} tiket berhasil dikirim, ${failCount} gagal`,
        variant: successCount > 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal mengirim tiket",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Auto Forward Toggle */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">
              Auto-Forward Keluhan
            </h3>
            <p className="text-sm text-muted-foreground">
              {autoForwardEnabled 
                ? "Tiket otomatis diteruskan ke kontak berdasarkan kategori"
                : "Aktifkan untuk meneruskan tiket secara otomatis"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={autoForwardEnabled}
              onCheckedChange={toggleAutoForward}
              className="data-[state=checked]:bg-primary"
            />
            <Button
              onClick={handleSendAll}
              disabled={loading || !autoForwardEnabled}
              className="gradient-primary text-white"
            >
              <Send className="mr-2 h-4 w-4" />
              Kirim Semua
            </Button>
          </div>
        </div>
      </Card>

      {/* Add/Edit Contact */}
      <Card className="p-6 border-2 border-primary/20">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {editingContact ? "Edit Kontak" : "Tambah Kontak Baru"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              value={editingContact ? editingContact.name : newContact.name}
              onChange={(e) =>
                editingContact
                  ? setEditingContact({ ...editingContact, name: e.target.value })
                  : setNewContact({ ...newContact, name: e.target.value })
              }
              placeholder="Nama penerima"
              className="border-primary/30"
            />
          </div>

          <div>
            <Label htmlFor="type">Tipe Kontak</Label>
            <Select
              value={editingContact ? editingContact.contact_type : newContact.contact_type}
              onValueChange={(value: "email" | "whatsapp") =>
                editingContact
                  ? setEditingContact({ ...editingContact, contact_type: value })
                  : setNewContact({ ...newContact, contact_type: value })
              }
            >
              <SelectTrigger className="border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="contact">
              {(editingContact ? editingContact.contact_type : newContact.contact_type) === "email" 
                ? "Email" 
                : "Nomor WhatsApp"}
            </Label>
            <Input
              id="contact"
              value={editingContact ? editingContact.contact_value : newContact.contact_value}
              onChange={(e) =>
                editingContact
                  ? setEditingContact({ ...editingContact, contact_value: e.target.value })
                  : setNewContact({ ...newContact, contact_value: e.target.value })
              }
              placeholder={
                (editingContact ? editingContact.contact_type : newContact.contact_type) === "email"
                  ? "email@example.com"
                  : "628123456789"
              }
              className="border-primary/30"
            />
          </div>

          <div>
            <Label htmlFor="category">Kategori</Label>
            <Select
              value={editingContact ? editingContact.category : newContact.category}
              onValueChange={(value) =>
                editingContact
                  ? setEditingContact({ ...editingContact, category: value })
                  : setNewContact({ ...newContact, category: value })
              }
            >
              <SelectTrigger className="border-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            onClick={editingContact ? updateContact : addContact}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {editingContact ? "Update Kontak" : "Tambah Kontak"}
          </Button>
          {editingContact && (
            <Button
              onClick={() => setEditingContact(null)}
              variant="outline"
              className="border-primary/30"
            >
              Batal
            </Button>
          )}
        </div>
      </Card>

      {/* Contact List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Daftar Kontak</h3>
        {contacts.length === 0 ? (
          <Card className="p-8 text-center border-2 border-dashed border-primary/30">
            <p className="text-muted-foreground">Belum ada kontak terdaftar</p>
          </Card>
        ) : (
          contacts.map((contact) => (
            <Card
              key={contact.id}
              className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div
                    className={`p-3 rounded-lg ${
                      contact.contact_type === "email"
                        ? "bg-primary/10"
                        : "bg-accent/10"
                    }`}
                  >
                    {contact.contact_type === "email" ? (
                      <Mail className="h-5 w-5 text-primary" />
                    ) : (
                      <Phone className="h-5 w-5 text-accent" />
                    )}
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">
                      {contact.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {contact.contact_value}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                      {contact.category.charAt(0).toUpperCase() +
                        contact.category.slice(1)}
                    </span>
                  </div>

                  <Switch
                    checked={contact.is_active}
                    onCheckedChange={(checked) =>
                      toggleContactActive(contact.id, checked)
                    }
                    className="data-[state=checked]:bg-primary"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingContact(contact)}
                    className="text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteContact(contact.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

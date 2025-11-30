import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Key, Save, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const ApiSettings = () => {
  const [resendKey, setResendKey] = useState("");
  const [whatsappKey, setWhatsappKey] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", ["resend_api_key", "whatsapp_api_key", "whatsapp_api_url"]);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.setting_key === "resend_api_key") {
          setResendKey(setting.setting_value || "");
        } else if (setting.setting_key === "whatsapp_api_key") {
          setWhatsappKey(setting.setting_value || "");
        } else if (setting.setting_key === "whatsapp_api_url") {
          setWhatsappUrl(setting.setting_value || "");
        }
      });
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const updates = [
        { setting_key: "resend_api_key", setting_value: resendKey },
        { setting_key: "whatsapp_api_key", setting_value: whatsappKey },
        { setting_key: "whatsapp_api_url", setting_value: whatsappUrl },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .upsert(update, { onConflict: "setting_key" });

        if (error) throw error;
      }

      toast.success("Pengaturan API berhasil disimpan");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Gagal menyimpan pengaturan API");
    } finally {
      setIsSaving(false);
    }
  };

  const testWhatsAppConnection = async () => {
    if (!whatsappKey || !whatsappUrl) {
      toast.error("Harap isi API Key dan URL WhatsApp terlebih dahulu");
      return;
    }

    if (!testPhone) {
      toast.error("Harap masukkan nomor telepon untuk test");
      return;
    }

    setIsTesting(true);
    try {
      const testMessage = `*Test Koneksi WhatsApp API*\n\nPesan test dari Sistem Keluhan Kampus UIN Alauddin Makassar.\n\nJika Anda menerima pesan ini, maka konfigurasi WhatsApp API sudah benar! ✅\n\n_${new Date().toLocaleString('id-ID')}_`;

      const response = await fetch(whatsappUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testPhone,
          message: testMessage,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('WhatsApp test success:', result);
        toast.success("✅ Test berhasil! Pesan WhatsApp terkirim ke " + testPhone);
      } else {
        const errorText = await response.text();
        console.error('WhatsApp test failed:', errorText);
        toast.error(`❌ Test gagal: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Error testing WhatsApp:", error);
      toast.error("❌ Gagal menghubungi API WhatsApp. Periksa URL dan koneksi internet Anda.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <Card className="glass-card p-6 card-elevated">
        <div className="flex items-center gap-3 mb-6">
          <div className="glass-card p-3 rounded-xl">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text">Pengaturan API</h2>
            <p className="text-sm text-muted-foreground">
              Kelola API keys untuk fitur auto-forward
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Resend API Key */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Resend API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Digunakan untuk mengirim email otomatis ke pihak berwenang
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="resend-key" className="text-foreground">API Key</Label>
              <div className="relative">
                <Input
                  id="resend-key"
                  type={showResend ? "text" : "password"}
                  value={resendKey}
                  onChange={(e) => setResendKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="glass border-border/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResend(!showResend)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showResend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dapatkan API key dari{" "}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Resend Dashboard
                </a>
              </p>
            </div>
          </div>

          {/* WhatsApp API Settings */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">WhatsApp API</h3>
                <p className="text-sm text-muted-foreground">
                  Digunakan untuk mengirim pesan WhatsApp otomatis
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp-url" className="text-foreground">API URL</Label>
                <Input
                  id="whatsapp-url"
                  type="text"
                  value={whatsappUrl}
                  onChange={(e) => setWhatsappUrl(e.target.value)}
                  placeholder="https://api.whatsapp.com/send"
                  className="glass border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp-key" className="text-foreground">API Key</Label>
                <div className="relative">
                  <Input
                    id="whatsapp-key"
                    type={showWhatsapp ? "text" : "password"}
                    value={whatsappKey}
                    onChange={(e) => setWhatsappKey(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="glass border-border/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWhatsapp(!showWhatsapp)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showWhatsapp ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gunakan WhatsApp Business API atau layanan pihak ketiga seperti Twilio, MessageBird, dll.
                </p>
              </div>
              
              {/* Test WhatsApp Connection */}
              <div className="space-y-2 p-4 glass-card rounded-lg border border-primary/20">
                <Label htmlFor="test-phone" className="text-foreground font-semibold">Test Koneksi WhatsApp</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Kirim pesan test untuk memastikan konfigurasi WhatsApp sudah benar
                </p>
                <div className="flex gap-2">
                  <Input
                    id="test-phone"
                    type="text"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="628123456789"
                    className="glass border-border/50"
                  />
                  <Button
                    onClick={testWhatsAppConnection}
                    disabled={isTesting || !whatsappKey || !whatsappUrl}
                    variant="outline"
                    className="shrink-0 border-primary/30 hover:bg-primary/10"
                  >
                    {isTesting ? "Mengirim..." : "Test Kirim"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format: 628xxx (kode negara + nomor tanpa 0 di depan)
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={saveSettings}
            disabled={isSaving}
            className="w-full gradient-primary text-white hover:glow-hover"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

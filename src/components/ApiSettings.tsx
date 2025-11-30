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
  const [fonnteKey, setFonnteKey] = useState("");
  const [adminWa, setAdminWa] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [showFonnte, setShowFonnte] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingFonnte, setIsTestingFonnte] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testFonntePhone, setTestFonntePhone] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("setting_key", [
          "resend_api_key", 
          "whatsapp_api_key", 
          "whatsapp_api_url",
          "fonnte_api_key",
          "admin_wa",
          "admin_email"
        ]);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.setting_key === "resend_api_key") {
          setResendKey(setting.setting_value || "");
        } else if (setting.setting_key === "whatsapp_api_key") {
          setWhatsappKey(setting.setting_value || "");
        } else if (setting.setting_key === "whatsapp_api_url") {
          setWhatsappUrl(setting.setting_value || "");
        } else if (setting.setting_key === "fonnte_api_key") {
          setFonnteKey(setting.setting_value || "");
        } else if (setting.setting_key === "admin_wa") {
          setAdminWa(setting.setting_value || "");
        } else if (setting.setting_key === "admin_email") {
          setAdminEmail(setting.setting_value || "");
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
        { setting_key: "fonnte_api_key", setting_value: fonnteKey },
        { setting_key: "admin_wa", setting_value: adminWa },
        { setting_key: "admin_email", setting_value: adminEmail },
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

  const testFonnteConnection = async () => {
    if (!fonnteKey) {
      toast.error("Harap isi API Key Fonnte terlebih dahulu");
      return;
    }

    if (!testFonntePhone) {
      toast.error("Harap masukkan nomor telepon untuk test");
      return;
    }

    setIsTestingFonnte(true);
    try {
      const testMessage = `*Test Koneksi Fonnte API*\n\nPesan test dari Sistem Keluhan Kampus UIN Alauddin Makassar.\n\nJika Anda menerima pesan ini, maka konfigurasi Fonnte API sudah benar! ✅\n\n_${new Date().toLocaleString('id-ID')}_`;

      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': fonnteKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: testFonntePhone,
          message: testMessage,
          countryCode: '62',
        }),
      });

      const result = await response.json();

      if (response.ok && result.status) {
        console.log('Fonnte test success:', result);
        toast.success("✅ Test berhasil! Pesan WhatsApp terkirim ke " + testFonntePhone);
      } else {
        console.error('Fonnte test failed:', result);
        toast.error(`❌ Test gagal: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error("Error testing Fonnte:", error);
      toast.error("❌ Gagal menghubungi API Fonnte. Periksa API Key dan koneksi internet Anda.");
    } finally {
      setIsTestingFonnte(false);
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
                <h3 className="text-lg font-semibold text-foreground mb-1">WhatsApp API (Custom)</h3>
                <p className="text-sm text-muted-foreground">
                  Digunakan untuk mengirim pesan WhatsApp otomatis via API custom
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

          {/* Fonnte API Settings */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Fonnte API</h3>
                <p className="text-sm text-muted-foreground">
                  API WhatsApp menggunakan Fonnte untuk endpoint /api/keluhan
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fonnte-key" className="text-foreground">API Key Fonnte</Label>
                <div className="relative">
                  <Input
                    id="fonnte-key"
                    type={showFonnte ? "text" : "password"}
                    value={fonnteKey}
                    onChange={(e) => setFonnteKey(e.target.value)}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="glass border-border/50 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFonnte(!showFonnte)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showFonnte ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dapatkan API key dari{" "}
                  <a
                    href="https://fonnte.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Fonnte.com
                  </a>
                </p>
              </div>
              
              {/* Test Fonnte Connection */}
              <div className="space-y-2 p-4 glass-card rounded-lg border border-primary/20">
                <Label htmlFor="test-fonnte-phone" className="text-foreground font-semibold">Test Koneksi Fonnte</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Kirim pesan test untuk memastikan konfigurasi Fonnte sudah benar
                </p>
                <div className="flex gap-2">
                  <Input
                    id="test-fonnte-phone"
                    type="text"
                    value={testFonntePhone}
                    onChange={(e) => setTestFonntePhone(e.target.value)}
                    placeholder="628123456789"
                    className="glass border-border/50"
                  />
                  <Button
                    onClick={testFonnteConnection}
                    disabled={isTestingFonnte || !fonnteKey}
                    variant="outline"
                    className="shrink-0 border-primary/30 hover:bg-primary/10"
                  >
                    {isTestingFonnte ? "Mengirim..." : "Test Kirim"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format: 628xxx (kode negara + nomor tanpa 0 di depan)
                </p>
              </div>
            </div>
          </div>

          {/* Admin Contact Settings */}
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Kontak Admin</h3>
                <p className="text-sm text-muted-foreground">
                  Nomor WhatsApp dan email admin untuk menerima notifikasi keluhan dari endpoint /api/keluhan
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-wa" className="text-foreground">Nomor WhatsApp Admin</Label>
                <Input
                  id="admin-wa"
                  type="text"
                  value={adminWa}
                  onChange={(e) => setAdminWa(e.target.value)}
                  placeholder="628123456789"
                  className="glass border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Format: 628xxx (kode negara + nomor tanpa 0 di depan)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-foreground">Email Admin</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@uin-alauddin.ac.id"
                  className="glass border-border/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email untuk menerima notifikasi keluhan
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

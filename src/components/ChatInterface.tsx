import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "👋 Halo! Saya asisten AI kampus UIN Alauddin Makassar.\n\nSaya dapat membantu Anda dengan:\n✓ Menerima keluhan fasilitas, akademik, administrasi\n✓ Menjawab pertanyaan tentang kampus\n✓ Membuat tiket keluhan otomatis\n\nSilakan sampaikan keluhan atau pertanyaan Anda!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Smooth typing effect
  const typeMessage = (content: string) => {
    return new Promise<void>((resolve) => {
      let currentText = "";
      const typingSpeed = 20; // ms per character
      const chars = content.split("");
      
      // Add empty message first
      setMessages(prev => [...prev, { role: "assistant", content: "", isTyping: true }]);
      
      let index = 0;
      const typingInterval = setInterval(() => {
        if (index < chars.length) {
          currentText += chars[index];
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: "assistant",
              content: currentText,
              isTyping: true
            };
            return newMessages;
          });
          index++;
        } else {
          clearInterval(typingInterval);
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: "assistant",
              content: currentText,
              isTyping: false
            };
            return newMessages;
          });
          resolve();
        }
      }, typingSpeed);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Deteksi intent
      const intentRes = await supabase.functions.invoke("process-complaint", {
        body: { message: userMessage, type: "intent" }
      });

      if (intentRes.error) throw intentRes.error;

      const intent = intentRes.data?.intent;

      if (intent === "informasi") {
        // RAG untuk pertanyaan informasi
        const ragRes = await supabase.functions.invoke("process-complaint", {
          body: { message: userMessage, type: "rag" }
        });

        if (ragRes.error) throw ragRes.error;

        await typeMessage(ragRes.data.answer);
      } else {
        // Proses keluhan
        const [classifyRes, nerRes] = await Promise.all([
          supabase.functions.invoke("process-complaint", {
            body: { message: userMessage, type: "classify" }
          }),
          supabase.functions.invoke("process-complaint", {
            body: { message: userMessage, type: "ner" }
          })
        ]);

        if (classifyRes.error || nerRes.error) {
          throw new Error("Gagal memproses keluhan");
        }

        const kategori = classifyRes.data?.kategori;
        const entities = nerRes.data;

        // Simpan tiket
        const { data: ticket, error: ticketError } = await supabase
          .from("tickets")
          .insert({
            nim: entities.nim,
            kategori: kategori,
            lokasi: entities.lokasi,
            subjek: entities.subjek,
            deskripsi: userMessage,
            status: "pending"
          })
          .select()
          .single();

        if (ticketError) throw ticketError;

        const response = `╔══════════════════════════════════╗
   🎫 TIKET KELUHAN MAHASISWA
╚══════════════════════════════════╝

✅ Keluhan Anda telah berhasil dicatat!

📋 **Detail Tiket:**

🆔 ID Tiket       : ${ticket.id.substring(0, 8).toUpperCase()}
👤 NIM            : ${entities.nim}
📂 Kategori       : ${kategori.toUpperCase()}
📍 Lokasi         : ${entities.lokasi}
📝 Subjek         : ${entities.subjek}
🔄 Status         : ✔ TERKIRIM KE PIHAK BERWENANG

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Keluhan Anda akan segera ditindaklanjuti oleh tim terkait. Pantau status tiket di menu "Riwayat Tiket".

Terima kasih telah menggunakan layanan kami! 🙏`;

        await typeMessage(response);

        toast({
          title: "✅ Tiket Berhasil Dibuat",
          description: `ID: ${ticket.id.substring(0, 8).toUpperCase()} - ${kategori.toUpperCase()}`,
        });
      }
    } catch (error: any) {
      console.error("Chat Error Details:", error);
      
      // Check for specific error types
      let errorMessage = "❌ Maaf, terjadi kesalahan dalam memproses pesan Anda.";
      let toastDescription = "Gagal memproses pesan";
      
      if (error?.message) {
        console.error("Error Message:", error.message);
        
        if (error.message.includes("LOVABLE_API_KEY")) {
          errorMessage = "⚠️ Sistem AI belum dikonfigurasi. Silakan hubungi administrator.";
          toastDescription = "Konfigurasi API belum lengkap";
        } else if (error.message.includes("429") || error.message.includes("rate limit")) {
          errorMessage = "⚠️ Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.";
          toastDescription = "Rate limit tercapai";
        } else if (error.message.includes("402") || error.message.includes("payment")) {
          errorMessage = "⚠️ Sistem sedang dalam perbaikan. Silakan coba beberapa saat lagi.";
          toastDescription = "Kredit AI habis";
        } else if (error.message.includes("network") || error.message.includes("fetch")) {
          errorMessage = "⚠️ Masalah koneksi internet. Silakan periksa koneksi Anda.";
          toastDescription = "Koneksi gagal";
        } else if (error.message.includes("schema")) {
          errorMessage = "⚠️ Sistem sedang dalam perbaikan. Silakan coba beberapa saat lagi.";
          toastDescription = "Database error";
        }
      }
      
      // Log the full error for debugging
      if (error?.data) {
        console.error("Error Data:", error.data);
      }
      if (error?.error) {
        console.error("Supabase Error:", error.error);
      }
      
      await typeMessage(errorMessage);
      
      toast({
        title: "Error",
        description: toastDescription,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card max-w-5xl mx-auto overflow-hidden card-elevated">
      {/* Header */}
      <div className="gradient-primary p-4 md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="glass-card p-2 rounded-xl animate-pulse">
            <Bot className="h-6 w-6 md:h-8 md:w-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-white">Chatbot AI Kampus</h2>
            <p className="text-white/80 text-xs md:text-sm">Powered by RAG & Intent Detection</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="h-[400px] md:h-[500px] p-3 md:p-6">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-2 md:gap-3 animate-fade-in ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{ 
                animationDelay: `${index * 0.05}s`,
                animationDuration: "0.3s"
              }}
            >
              {message.role === "assistant" && (
                <div className="glass-card p-1.5 md:p-2 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center flex-shrink-0 animate-scale-in">
                  <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
              )}
              
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 md:p-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
                  message.role === "user"
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                    : "glass-card border border-border/50"
                }`}
              >
                <p className="whitespace-pre-wrap text-xs md:text-sm leading-relaxed">
                  {message.content}
                  {message.isTyping && (
                    <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                  )}
                </p>
              </div>

              {message.role === "user" && (
                <div className="glass-card p-1.5 md:p-2 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center flex-shrink-0 animate-scale-in">
                  <User className="h-4 w-4 md:h-5 md:w-5 text-secondary" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 md:gap-3 animate-fade-in">
              <div className="glass-card p-2 h-8 w-8 md:h-10 md:w-10 flex items-center justify-center">
                <Bot className="h-4 w-4 md:h-5 md:w-5 text-primary animate-pulse" />
              </div>
              <div className="glass-card border border-border/50 rounded-2xl p-3 md:p-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs md:text-sm text-muted-foreground">AI sedang berpikir...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-3 md:p-6 border-t border-border/50 bg-background/50 backdrop-blur">
        <div className="flex gap-2 md:gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik keluhan atau pertanyaan..."
            disabled={isLoading}
            className="glass flex-1 rounded-full px-4 md:px-6 py-4 md:py-6 text-sm md:text-base border-border/50 focus:border-primary transition-all"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="gradient-primary rounded-full h-10 w-10 md:h-12 md:w-12 p-0 hover:scale-110 transition-transform shadow-lg"
          >
            <Send className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};

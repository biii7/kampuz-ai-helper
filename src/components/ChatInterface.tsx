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

        setMessages(prev => [...prev, {
          role: "assistant",
          content: ragRes.data.answer
        }]);
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

        setMessages(prev => [...prev, {
          role: "assistant",
          content: response
        }]);

        toast({
          title: "✅ Tiket Berhasil Dibuat",
          description: `ID: ${ticket.id.substring(0, 8).toUpperCase()} - ${kategori.toUpperCase()}`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "❌ Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi atau hubungi administrator."
      }]);
      toast({
        title: "Error",
        description: "Gagal memproses pesan",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card max-w-5xl mx-auto overflow-hidden card-elevated">
      {/* Header */}
      <div className="gradient-primary p-6">
        <div className="flex items-center gap-3">
          <Bot className="h-8 w-8 text-white" />
          <div>
            <h2 className="text-2xl font-bold text-white">Chatbot AI Kampus</h2>
            <p className="text-white/80 text-sm">Powered by RAG & Intent Detection</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="h-[500px] p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 mb-4 animate-slide-in ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <div className="glass-card p-2 h-10 w-10 flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-primary" />
              </div>
            )}
            
            <div
              className={`max-w-[75%] ${
                message.role === "user"
                  ? "chat-bubble-user slide-in-right"
                  : "chat-bubble-bot"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
            </div>

            {message.role === "user" && (
              <div className="glass-card p-2 h-10 w-10 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-secondary" />
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex gap-3 mb-4 animate-fade-in">
            <div className="glass-card p-2 h-10 w-10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="chat-bubble-bot flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Memproses...</span>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-border/50">
        <div className="flex gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik keluhan atau pertanyaan Anda..."
            disabled={isLoading}
            className="glass flex-1 rounded-full px-6 py-6 text-base border-border/50 focus:border-primary"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="gradient-primary rounded-full h-12 w-12 p-0 glow-hover"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};
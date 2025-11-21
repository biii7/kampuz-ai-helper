import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
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
      content: "Halo! Saya asisten kampus. Saya dapat membantu Anda dengan keluhan atau menjawab pertanyaan tentang kampus. Silakan sampaikan keluhan atau pertanyaan Anda."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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

        const response = `Tiket keluhan Anda telah berhasil dibuat!

📋 **Detail Tiket:**
- **ID Tiket:** ${ticket.id.substring(0, 8)}
- **NIM:** ${entities.nim}
- **Kategori:** ${kategori.toUpperCase()}
- **Lokasi:** ${entities.lokasi}
- **Subjek:** ${entities.subjek}
- **Status:** PENDING

Keluhan Anda akan segera ditindaklanjuti oleh tim terkait. Anda dapat melihat riwayat tiket di menu "Riwayat Tiket".`;

        setMessages(prev => [...prev, {
          role: "assistant",
          content: response
        }]);

        toast({
          title: "Tiket Berhasil Dibuat",
          description: `Tiket #${ticket.id.substring(0, 8)} telah disimpan`,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Maaf, terjadi kesalahan dalam memproses pesan Anda. Silakan coba lagi."
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
    <Card className="flex flex-col h-[600px] bg-card">
      <div className="p-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Chatbot Keluhan Kampus</h2>
        <p className="text-sm text-muted-foreground">Sampaikan keluhan atau tanyakan informasi kampus</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik keluhan atau pertanyaan Anda..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </Card>
  );
};
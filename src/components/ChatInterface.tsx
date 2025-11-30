import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Moon, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TicketDisplay } from "./TicketDisplay";
import Confetti from "react-confetti";
import { playSuccessSound, playSadSound, playFrustratedSound, playWorriedSound, playNeutralSound } from "@/utils/soundEffects";

interface Message {
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  ticketData?: {
    ticketId: string;
    nim: string;
    kategori: string;
    lokasi: string;
    subjek: string;
  };
}

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "السلام عليكم ورحمة الله وبركاته 🌙\n\nAlhamdulillah, saya Single Gateway UIN Alauddin Makassar untuk melayani keluhan dan informasi kampus.\n\nSaya dapat membantu dengan:\n• Respons cepat pertanyaan kampus (RAG)\n• Penerusan keluhan otomatis ke pihak berwenang\n\nSilakan sampaikan keperluan Anda, insyaAllah akan kami bantu."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
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
        const [classifyRes, nerRes, sentimentRes] = await Promise.all([
          supabase.functions.invoke("process-complaint", {
            body: { message: userMessage, type: "classify" }
          }),
          supabase.functions.invoke("process-complaint", {
            body: { message: userMessage, type: "ner" }
          }),
          supabase.functions.invoke("process-complaint", {
            body: { message: userMessage, type: "sentiment" }
          })
        ]);

        if (classifyRes.error || nerRes.error || sentimentRes.error) {
          console.error("AI processing error", { 
            classifyError: classifyRes.error, 
            nerError: nerRes.error,
            sentimentError: sentimentRes.error 
          });
        }

        const kategori = classifyRes.data?.kategori || "lainnya";
        const entities = nerRes.data || {
          nim: "tidak disebutkan",
          lokasi: "tidak disebutkan",
          subjek: "keluhan umum",
        };
        const sentiment = sentimentRes.data?.sentiment || "neutral";

        // Play sound effect based on sentiment
        if (sentiment === "frustrated") {
          playFrustratedSound();
        } else if (sentiment === "sad") {
          playSadSound();
        } else if (sentiment === "worried") {
          playWorriedSound();
        } else {
          playNeutralSound();
        }

        // Generate empathetic response based on sentiment
        const empatheticRes = await supabase.functions.invoke("process-complaint", {
          body: { 
            message: userMessage, 
            type: "empathetic_response",
            sentiment: sentiment,
            kategori: kategori
          }
        });

        const empatheticMessage = empatheticRes.data?.response || 
          "Terima kasih telah menyampaikan keluhan Anda. Kami akan segera menindaklanjuti.";

        // Show empathetic response first
        await typeMessage(empatheticMessage);

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

        // Check auto-forward setting and forward immediately if enabled
        const { data: autoForwardSetting } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "auto_forward_enabled")
          .single();

        const autoForwardEnabled = autoForwardSetting?.setting_value === "true";

        if (autoForwardEnabled) {
          // Forward ticket immediately
          try {
            const forwardResult = await supabase.functions.invoke("forward-ticket", {
              body: { ticketId: ticket.id }
            });
            
            if (forwardResult.error) {
              console.error("Auto-forward error:", forwardResult.error);
            } else {
              console.log("Ticket auto-forwarded successfully:", forwardResult.data);
            }
          } catch (forwardError) {
            console.error("Failed to auto-forward ticket:", forwardError);
            // Don't fail the whole process if forwarding fails
          }
        }

        // Play success sound effect
        playSuccessSound();

        // First show success message with typing effect
        await typeMessage("🎉 Tiket keluhan Anda berhasil dibuat!\n\nTiket Anda telah diterima dan akan segera diproses oleh tim terkait. Berikut detail tiket Anda:");

        // Trigger confetti celebration
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);

        // Then show ticket display
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "",
          ticketData: {
            ticketId: ticket.id.substring(0, 8).toUpperCase(),
            nim: entities.nim,
            kategori: kategori,
            lokasi: entities.lokasi,
            subjek: entities.subjek
          }
        }]);

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
    <div className="glass-card max-w-5xl mx-auto overflow-hidden card-elevated relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}
      {/* Header */}
      <div className="gradient-primary p-3 md:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="glass-card p-1.5 md:p-2 rounded-xl animate-pulse">
            <Moon className="h-5 w-5 md:h-8 md:w-8 text-white" />
          </div>
          <div>
            <h2 className="text-base md:text-2xl font-bold text-white">Chatbot AI Kampus</h2>
            <p className="text-white/80 text-[10px] md:text-sm">Powered by RAG & Intent Detection</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea ref={scrollRef} className="h-[450px] md:h-[500px] p-3 md:p-6">
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
                <div className="glass-card p-1 md:p-2 h-7 w-7 md:h-10 md:w-10 flex items-center justify-center flex-shrink-0 animate-scale-in">
                  <Moon className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary" />
                </div>
              )}
              
              {message.ticketData ? (
                <TicketDisplay {...message.ticketData} />
              ) : (
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-2.5 md:p-4 shadow-lg transition-all duration-300 hover:shadow-xl ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                      : "glass-card border border-border/50"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[11px] md:text-sm leading-relaxed">
                    {message.content}
                    {message.isTyping && (
                      <span className="inline-block w-1 h-3 md:h-4 ml-1 bg-current animate-pulse" />
                    )}
                  </p>
                </div>
              )}

              {message.role === "user" && (
                <div className="glass-card p-1 md:p-2 h-7 w-7 md:h-10 md:w-10 flex items-center justify-center flex-shrink-0 animate-scale-in">
                  <User className="h-3.5 w-3.5 md:h-5 md:w-5 text-secondary" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-2 md:gap-3 animate-fade-in">
              <div className="glass-card p-1 md:p-2 h-7 w-7 md:h-10 md:w-10 flex items-center justify-center">
                <Moon className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary animate-pulse" />
              </div>
              <div className="glass-card border border-border/50 rounded-2xl p-2 md:p-4 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin text-primary" />
                <span className="text-[11px] md:text-sm text-muted-foreground">AI sedang berpikir...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="p-2.5 md:p-6 border-t border-border/50 bg-background/50 backdrop-blur">
        <div className="flex gap-2 md:gap-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik keluhan atau pertanyaan..."
            disabled={isLoading}
            className="glass flex-1 rounded-full px-3 md:px-6 py-2.5 md:py-6 text-xs md:text-base border-border/50 focus:border-primary transition-all"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="gradient-primary rounded-full h-9 w-9 md:h-12 md:w-12 p-0 hover:scale-110 transition-transform shadow-lg flex-shrink-0"
          >
            <Send className="h-3.5 w-3.5 md:h-5 md:w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
};

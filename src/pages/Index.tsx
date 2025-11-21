import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatInterface } from "@/components/ChatInterface";
import { TicketHistory } from "@/components/TicketHistory";
import { GraduationCap } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sistem Keluhan Kampus</h1>
              <p className="text-sm text-muted-foreground">AI-Powered Campus Complaint Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="chat">Chatbot</TabsTrigger>
            <TabsTrigger value="history">Riwayat Tiket</TabsTrigger>
          </TabsList>
          
          <div className="mt-6">
            <TabsContent value="chat">
              <ChatInterface />
            </TabsContent>
            
            <TabsContent value="history">
              <TicketHistory />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

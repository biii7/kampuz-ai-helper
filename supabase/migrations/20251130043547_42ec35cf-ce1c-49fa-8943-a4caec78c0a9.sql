-- Create forwarding_logs table for tracking email and WhatsApp deliveries
CREATE TABLE IF NOT EXISTS public.forwarding_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.forwarding_contacts(id) ON DELETE SET NULL,
  contact_name TEXT NOT NULL,
  contact_type TEXT NOT NULL, -- 'email' or 'whatsapp'
  contact_value TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  error_details TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.forwarding_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view forwarding logs"
  ON public.forwarding_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs
CREATE POLICY "System can insert forwarding logs"
  ON public.forwarding_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_forwarding_logs_ticket_id ON public.forwarding_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_forwarding_logs_sent_at ON public.forwarding_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_forwarding_logs_status ON public.forwarding_logs(status);
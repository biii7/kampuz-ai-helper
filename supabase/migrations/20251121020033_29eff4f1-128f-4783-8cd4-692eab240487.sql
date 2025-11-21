-- Create notifications table for admin alerts
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view their own notifications
CREATE POLICY "Admins can view their notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

-- Admins can update their notifications
CREATE POLICY "Admins can update their notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND user_id = auth.uid());

-- Create message templates table
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can view templates"
ON public.message_templates
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert templates"
ON public.message_templates
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update templates"
ON public.message_templates
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete templates"
ON public.message_templates
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to create notifications for admins when ticket status changes
CREATE OR REPLACE FUNCTION public.notify_admins_on_ticket_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get all admin users
    FOR admin_record IN 
      SELECT DISTINCT user_id 
      FROM public.user_roles 
      WHERE role = 'admin'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, ticket_id, title, message, type)
      VALUES (
        admin_record.user_id,
        NEW.id,
        'Status Tiket Berubah',
        format('Tiket #%s (%s) berubah status dari "%s" menjadi "%s"', 
          substring(NEW.id::text, 1, 8), 
          NEW.subjek, 
          OLD.status, 
          NEW.status
        ),
        'status_change'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for ticket status changes
DROP TRIGGER IF EXISTS trigger_notify_admins_on_ticket_update ON public.tickets;
CREATE TRIGGER trigger_notify_admins_on_ticket_update
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_on_ticket_update();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to update message_templates updated_at
CREATE OR REPLACE FUNCTION public.update_message_templates_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for message_templates
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_message_templates_updated_at();

-- Insert default templates
INSERT INTO public.message_templates (name, type, subject, body, variables) VALUES
(
  'Email Penerusan Keluhan',
  'email',
  'Keluhan Baru: {{kategori}} - {{subjek}}',
  '<h2>Keluhan Baru Diterima</h2>
  <p><strong>ID Tiket:</strong> {{ticket_id}}</p>
  <p><strong>NIM:</strong> {{nim}}</p>
  <p><strong>Kategori:</strong> {{kategori}}</p>
  <p><strong>Subjek:</strong> {{subjek}}</p>
  <p><strong>Lokasi:</strong> {{lokasi}}</p>
  <p><strong>Deskripsi:</strong></p>
  <p>{{deskripsi}}</p>
  <p><strong>Waktu:</strong> {{waktu}}</p>
  <hr>
  <p><small>Ini adalah email otomatis dari Sistem Keluhan Kampus</small></p>',
  '["ticket_id", "nim", "kategori", "subjek", "lokasi", "deskripsi", "waktu"]'::jsonb
),
(
  'WhatsApp Penerusan Keluhan',
  'whatsapp',
  NULL,
  '🔔 *KELUHAN BARU*

📋 Tiket: {{ticket_id}}
👤 NIM: {{nim}}
📂 Kategori: {{kategori}}
📌 Subjek: {{subjek}}
📍 Lokasi: {{lokasi}}

📝 Deskripsi:
{{deskripsi}}

🕒 Waktu: {{waktu}}

_Sistem Keluhan Kampus_',
  '["ticket_id", "nim", "kategori", "subjek", "lokasi", "deskripsi", "waktu"]'::jsonb
);
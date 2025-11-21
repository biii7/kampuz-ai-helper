-- Create contacts table for forwarding complaints
CREATE TABLE IF NOT EXISTS public.forwarding_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email', 'whatsapp')),
  contact_value TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.forwarding_contacts ENABLE ROW LEVEL SECURITY;

-- Admins can manage contacts
CREATE POLICY "Admins can view contacts"
ON public.forwarding_contacts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert contacts"
ON public.forwarding_contacts
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contacts"
ON public.forwarding_contacts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contacts"
ON public.forwarding_contacts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add auto_forward_enabled column to tickets
ALTER TABLE public.tickets
ADD COLUMN IF NOT EXISTS auto_forwarded BOOLEAN DEFAULT false;

-- Create settings table for auto-forward toggle
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage settings
CREATE POLICY "Admins can view settings"
ON public.system_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert settings"
ON public.system_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update settings"
ON public.system_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default setting for auto-forward
INSERT INTO public.system_settings (setting_key, setting_value)
VALUES ('auto_forward_enabled', 'false')
ON CONFLICT (setting_key) DO NOTHING;
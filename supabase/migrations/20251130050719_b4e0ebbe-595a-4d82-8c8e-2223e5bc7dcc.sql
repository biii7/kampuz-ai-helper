-- Add tracking fields to tickets table
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS reporter_name TEXT,
ADD COLUMN IF NOT EXISTS reporter_email TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- Create function to update status history
CREATE OR REPLACE FUNCTION public.update_ticket_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only add to history if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_history = COALESCE(OLD.status_history, '[]'::jsonb) || 
      jsonb_build_object(
        'status', NEW.status,
        'timestamp', now(),
        'notes', NEW.notes
      );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for status history
DROP TRIGGER IF EXISTS update_ticket_status_history_trigger ON public.tickets;
CREATE TRIGGER update_ticket_status_history_trigger
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_status_history();
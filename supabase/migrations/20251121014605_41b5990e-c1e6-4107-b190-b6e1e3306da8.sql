-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Create a function to call the forward-ticket edge function
CREATE OR REPLACE FUNCTION public.trigger_auto_forward()
RETURNS TRIGGER AS $$
DECLARE
  response_status integer;
BEGIN
  -- Call the forward-ticket edge function asynchronously
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/forward-ticket',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object('ticketId', NEW.id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-forward tickets when created
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_forward();
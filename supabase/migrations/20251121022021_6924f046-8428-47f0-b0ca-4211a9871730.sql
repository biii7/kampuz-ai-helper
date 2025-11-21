-- Drop trigger yang error karena net schema
DROP TRIGGER IF EXISTS on_ticket_created ON tickets;

-- Drop function yang bermasalah
DROP FUNCTION IF EXISTS trigger_auto_forward();

-- Tambahkan trigger untuk notifikasi saat tiket BARU dibuat
CREATE OR REPLACE FUNCTION notify_admins_on_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Notifikasi semua admin saat ada tiket baru
  FOR admin_record IN 
    SELECT DISTINCT user_id 
    FROM public.user_roles 
    WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, ticket_id, title, message, type)
    VALUES (
      admin_record.user_id,
      NEW.id,
      'Tiket Baru Masuk',
      format('Tiket baru #%s: %s (Kategori: %s, Lokasi: %s)', 
        substring(NEW.id::text, 1, 8), 
        NEW.subjek,
        NEW.kategori,
        NEW.lokasi
      ),
      'new_ticket'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Buat trigger untuk tiket baru
CREATE TRIGGER trigger_notify_admins_on_new_ticket
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_new_ticket();
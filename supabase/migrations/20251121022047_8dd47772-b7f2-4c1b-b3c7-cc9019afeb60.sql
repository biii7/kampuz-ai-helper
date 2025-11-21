-- Perbaiki search_path untuk semua security definer functions

-- 1. Update has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 2. Update notify_admins_on_ticket_update function
CREATE OR REPLACE FUNCTION public.notify_admins_on_ticket_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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

-- 3. Update notify_admins_on_new_ticket function
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
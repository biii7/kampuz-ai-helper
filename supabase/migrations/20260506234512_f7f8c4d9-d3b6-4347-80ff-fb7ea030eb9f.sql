
-- Tickets: hapus akses publik untuk SELECT dan UPDATE (tetap izinkan INSERT publik karena tiket dibuat anonim dari chatbot)
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;

-- Campus documents: batasi SELECT hanya untuk admin (RAG memakai SECURITY DEFINER match_documents, tidak butuh public SELECT)
DROP POLICY IF EXISTS "Anyone can view documents" ON public.campus_documents;
CREATE POLICY "Admins can view documents"
ON public.campus_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Perbaiki search_path mutable pada fungsi custom
CREATE OR REPLACE FUNCTION public.update_message_templates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix search_path for update_rag_cache_access function
-- Drop trigger first, then function, then recreate with proper search_path
DROP TRIGGER IF EXISTS update_rag_cache_access_trigger ON public.rag_cache;
DROP FUNCTION IF EXISTS update_rag_cache_access();

CREATE OR REPLACE FUNCTION update_rag_cache_access()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.access_count = NEW.access_count + 1;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_rag_cache_access_trigger
BEFORE UPDATE ON public.rag_cache
FOR EACH ROW
EXECUTE FUNCTION update_rag_cache_access();
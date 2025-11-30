-- Add RLS policy to allow admins to delete tickets
CREATE POLICY "Admins can delete tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
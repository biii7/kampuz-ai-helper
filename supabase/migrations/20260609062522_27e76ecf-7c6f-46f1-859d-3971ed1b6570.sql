CREATE POLICY "Admins can update forwarding logs"
ON public.forwarding_logs FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete forwarding logs"
ON public.forwarding_logs FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
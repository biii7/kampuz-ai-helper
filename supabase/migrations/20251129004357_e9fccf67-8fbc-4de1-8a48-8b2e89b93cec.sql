-- Create storage bucket for campus documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campus-documents',
  'campus-documents',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf']::text[]
);

-- Create RLS policies for campus documents bucket
CREATE POLICY "Anyone can view campus documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'campus-documents');

CREATE POLICY "Admins can upload campus documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campus-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete campus documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'campus-documents' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add file_url column to campus_documents table to store PDF reference
ALTER TABLE public.campus_documents
ADD COLUMN IF NOT EXISTS file_url text;

-- Update RLS policies for campus_documents
DROP POLICY IF EXISTS "Anyone can create documents" ON public.campus_documents;
DROP POLICY IF EXISTS "Anyone can view documents" ON public.campus_documents;

CREATE POLICY "Admins can create documents"
ON public.campus_documents FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update documents"
ON public.campus_documents FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete documents"
ON public.campus_documents FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view documents"
ON public.campus_documents FOR SELECT
USING (true);
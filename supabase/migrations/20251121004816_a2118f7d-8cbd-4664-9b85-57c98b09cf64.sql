-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nim TEXT NOT NULL,
  kategori TEXT NOT NULL CHECK (kategori IN ('fasilitas', 'akademik', 'administrasi', 'keuangan', 'pelanggaran', 'ppid')),
  lokasi TEXT NOT NULL,
  subjek TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  waktu TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'diproses', 'selesai')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campus_documents table for RAG
CREATE TABLE IF NOT EXISTS public.campus_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_documents ENABLE ROW LEVEL SECURITY;

-- Policies for tickets (public access for demo)
CREATE POLICY "Anyone can view tickets" 
ON public.tickets FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create tickets" 
ON public.tickets FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update tickets" 
ON public.tickets FOR UPDATE 
USING (true);

-- Policies for campus_documents (public read access)
CREATE POLICY "Anyone can view documents" 
ON public.campus_documents FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create documents" 
ON public.campus_documents FOR INSERT 
WITH CHECK (true);
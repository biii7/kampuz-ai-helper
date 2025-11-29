-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create RAG cache table for frequently asked questions
CREATE TABLE IF NOT EXISTS public.rag_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  documents_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  access_count INTEGER DEFAULT 1
);

-- Add vector column to campus_documents for semantic search
ALTER TABLE public.campus_documents 
ADD COLUMN IF NOT EXISTS content_embedding vector(768);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS campus_documents_embedding_idx 
ON public.campus_documents 
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for RAG cache question lookup
CREATE INDEX IF NOT EXISTS rag_cache_question_idx 
ON public.rag_cache 
USING gin(to_tsvector('indonesian', question));

-- Enable RLS on rag_cache
ALTER TABLE public.rag_cache ENABLE ROW LEVEL SECURITY;

-- Admins can view cache
CREATE POLICY "Admins can view rag_cache"
ON public.rag_cache
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert cache (for edge functions)
CREATE POLICY "System can insert rag_cache"
ON public.rag_cache
FOR INSERT
WITH CHECK (true);

-- System can update cache
CREATE POLICY "System can update rag_cache"
ON public.rag_cache
FOR UPDATE
USING (true);

-- Function to update cache access count
CREATE OR REPLACE FUNCTION update_rag_cache_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.access_count = NEW.access_count + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update access count
CREATE TRIGGER update_rag_cache_access_trigger
BEFORE UPDATE ON public.rag_cache
FOR EACH ROW
EXECUTE FUNCTION update_rag_cache_access();
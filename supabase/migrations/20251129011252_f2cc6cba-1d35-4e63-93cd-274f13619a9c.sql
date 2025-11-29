-- Create function for semantic document search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  metadata jsonb,
  file_url text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT
    campus_documents.id,
    campus_documents.title,
    campus_documents.content,
    campus_documents.metadata,
    campus_documents.file_url,
    campus_documents.created_at,
    1 - (campus_documents.content_embedding <=> query_embedding) as similarity
  FROM campus_documents
  WHERE campus_documents.content_embedding IS NOT NULL
    AND 1 - (campus_documents.content_embedding <=> query_embedding) > match_threshold
  ORDER BY campus_documents.content_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
-- Add category column to message_templates for category-specific templates
ALTER TABLE public.message_templates 
ADD COLUMN category TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON public.message_templates(category);

-- Add comment for clarity
COMMENT ON COLUMN public.message_templates.category IS 'Optional category filter - if set, template only applies to specific complaint category (fasilitas, akademik, administrasi, keuangan, pelanggaran, ppid)';
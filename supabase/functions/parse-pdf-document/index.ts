import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getDocument } from 'https://esm.sh/pdfjs-serverless@0.3.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { fileUrl, title, category, source } = await req.json();
    
    console.log('Parsing PDF from URL:', fileUrl);

    // Download PDF file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to download PDF file');
    }

    const pdfBuffer = await fileResponse.arrayBuffer();
    console.log('PDF downloaded, size:', pdfBuffer.byteLength, 'bytes');

    // Parse PDF using pdfjs-serverless
    const uint8Array = new Uint8Array(pdfBuffer);
    const doc = await getDocument(uint8Array).promise;
    const numPages = doc.numPages;
    
    console.log('PDF loaded, number of pages:', numPages);

    // Extract text from all pages
    const textPages: string[] = [];
    for (let i = 1; i <= numPages; i++) {
      console.log(`Processing page ${i}/${numPages}`);
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      textPages.push(pageText);
    }

    const extractedText = textPages.join('\n\n');
    console.log('Successfully extracted text, length:', extractedText.length, 'characters');

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from PDF. The PDF might be image-based or corrupted.');
    }

    // Save to database
    const { data, error } = await supabase
      .from('campus_documents')
      .insert({
        title,
        content: extractedText.trim(),
        file_url: fileUrl,
        metadata: {
          category,
          source,
          file_type: 'pdf',
          pages: numPages,
          extracted_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Document saved to database:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        document: data,
        extractedLength: extractedText.length,
        pages: numPages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-pdf-document:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

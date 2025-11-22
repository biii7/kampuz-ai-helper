import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { ticketId, specificContactId } = await req.json();

    console.log('Processing ticket for forward:', ticketId, specificContactId ? `to specific contact: ${specificContactId}` : 'to all contacts');

    // Get ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Check if auto-forward is enabled
    const { data: setting } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_forward_enabled')
      .single();

    if (!setting || setting.setting_value !== 'true') {
      return new Response(
        JSON.stringify({ message: 'Auto-forward is disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active contacts for this category
    let contactsQuery = supabaseClient
      .from('forwarding_contacts')
      .select('*')
      .eq('category', ticket.kategori)
      .eq('is_active', true);
    
    // If specific contact ID provided, filter to that contact only
    if (specificContactId) {
      contactsQuery = contactsQuery.eq('id', specificContactId);
    }

    const { data: contacts, error: contactsError } = await contactsQuery;

    if (contactsError || !contacts || contacts.length === 0) {
      console.log('No active contacts found for category:', ticket.kategori);
      return new Response(
        JSON.stringify({ 
          message: specificContactId 
            ? 'Specified contact not found or inactive' 
            : 'No active contacts for this category' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    // Forward to each contact
    for (const contact of contacts) {
      try {
        if (contact.contact_type === 'email') {
          // Send email using Resend
          const resendApiKey = Deno.env.get('RESEND_API_KEY');
          if (!resendApiKey) {
            console.error('RESEND_API_KEY not configured');
            results.push({ contact: contact.name, status: 'failed', reason: 'Email API not configured' });
            continue;
          }

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'Sistem Keluhan Kampus <onboarding@resend.dev>',
              to: [contact.contact_value],
              subject: `[${ticket.kategori.toUpperCase()}] Tiket Keluhan Baru - ${ticket.subjek}`,
              html: `
                <h2>Tiket Keluhan Mahasiswa</h2>
                <hr />
                <p><strong>NIM:</strong> ${ticket.nim}</p>
                <p><strong>Kategori:</strong> ${ticket.kategori.toUpperCase()}</p>
                <p><strong>Lokasi:</strong> ${ticket.lokasi}</p>
                <p><strong>Subjek:</strong> ${ticket.subjek}</p>
                <p><strong>Deskripsi:</strong></p>
                <p>${ticket.deskripsi}</p>
                <hr />
                <p><small>Waktu: ${new Date(ticket.waktu).toLocaleString('id-ID')}</small></p>
              `,
            }),
          });

          if (emailResponse.ok) {
            results.push({ contact: contact.name, type: 'email', status: 'success' });
          } else {
            const errorData = await emailResponse.text();
            console.error('Email sending failed:', errorData);
            results.push({ contact: contact.name, type: 'email', status: 'failed', reason: errorData });
          }
        } else if (contact.contact_type === 'whatsapp') {
          // Send WhatsApp message
          const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
          const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
          
          if (!whatsappApiKey || !whatsappApiUrl) {
            console.error('WhatsApp API not configured');
            results.push({ contact: contact.name, status: 'failed', reason: 'WhatsApp API not configured' });
            continue;
          }

          const message = `*[${ticket.kategori.toUpperCase()}] Tiket Keluhan Baru*\n\n` +
            `*NIM:* ${ticket.nim}\n` +
            `*Kategori:* ${ticket.kategori.toUpperCase()}\n` +
            `*Lokasi:* ${ticket.lokasi}\n` +
            `*Subjek:* ${ticket.subjek}\n\n` +
            `*Deskripsi:*\n${ticket.deskripsi}\n\n` +
            `_Waktu: ${new Date(ticket.waktu).toLocaleString('id-ID')}_`;

          const whatsappResponse = await fetch(whatsappApiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsappApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: contact.contact_value,
              message: message,
            }),
          });

          if (whatsappResponse.ok) {
            results.push({ contact: contact.name, type: 'whatsapp', status: 'success' });
          } else {
            const errorData = await whatsappResponse.text();
            console.error('WhatsApp sending failed:', errorData);
            results.push({ contact: contact.name, type: 'whatsapp', status: 'failed', reason: errorData });
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error forwarding to contact:', contact.name, error);
        results.push({ contact: contact.name, status: 'failed', reason: errorMessage });
      }
    }

    // Update ticket status (only update auto_forwarded if no specific contact, meaning bulk/auto mode)
    await supabaseClient
      .from('tickets')
      .update({ 
        auto_forwarded: specificContactId ? ticket.auto_forwarded : true,
        status: ticket.status === 'pending' ? 'diproses' : ticket.status,
      })
      .eq('id', ticketId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: specificContactId 
          ? `Ticket forwarded to specific contact` 
          : 'Ticket forwarded to all contacts',
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in forward-ticket function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

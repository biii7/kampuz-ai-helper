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
    const logEntries = [];

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
            logEntries.push({
              ticket_id: ticketId,
              contact_id: contact.id,
              contact_name: contact.name,
              contact_type: 'email',
              contact_value: contact.contact_value,
              status: 'success',
              error_details: null,
            });
          } else {
            const errorData = await emailResponse.text();
            console.error('Email sending failed:', errorData);
            results.push({ contact: contact.name, type: 'email', status: 'failed', reason: errorData });
            logEntries.push({
              ticket_id: ticketId,
              contact_id: contact.id,
              contact_name: contact.name,
              contact_type: 'email',
              contact_value: contact.contact_value,
              status: 'failed',
              error_details: errorData,
            });
          }
        } else if (contact.contact_type === 'whatsapp') {
          // Send WhatsApp message via Fonnte API
          const fonnteApiKey = Deno.env.get('FONNTE_API_KEY');
          
          if (!fonnteApiKey) {
            console.error('FONNTE_API_KEY not configured');
            const errorMsg = 'WhatsApp API (Fonnte) belum dikonfigurasi';
            results.push({ contact: contact.name, type: 'whatsapp', status: 'failed', reason: errorMsg });
            logEntries.push({
              ticket_id: ticketId,
              contact_id: contact.id,
              contact_name: contact.name,
              contact_type: 'whatsapp',
              contact_value: contact.contact_value,
              status: 'failed',
              error_details: errorMsg,
            });
            
            // Notify admins of failure
            await notifyAdminsOfFailure(supabaseClient, ticketId, contact.name, 'WhatsApp (Fonnte)', errorMsg);
            continue;
          }

          console.log('Sending WhatsApp via Fonnte to:', contact.contact_value);

          const message = `*[${ticket.kategori.toUpperCase()}] Tiket Keluhan Baru*\n\n` +
            `*NIM:* ${ticket.nim}\n` +
            `*Kategori:* ${ticket.kategori.toUpperCase()}\n` +
            `*Lokasi:* ${ticket.lokasi}\n` +
            `*Subjek:* ${ticket.subjek}\n\n` +
            `*Deskripsi:*\n${ticket.deskripsi}\n\n` +
            `_Waktu: ${new Date(ticket.waktu).toLocaleString('id-ID')}_`;

          const whatsappResponse = await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: {
              'Authorization': fonnteApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              target: contact.contact_value,
              message: message,
              countryCode: '62',
            }),
          });

          const whatsappData = await whatsappResponse.json();

          if (whatsappResponse.ok && whatsappData.status) {
            console.log('WhatsApp sent successfully via Fonnte:', whatsappData);
            results.push({ contact: contact.name, type: 'whatsapp', status: 'success' });
            logEntries.push({
              ticket_id: ticketId,
              contact_id: contact.id,
              contact_name: contact.name,
              contact_type: 'whatsapp',
              contact_value: contact.contact_value,
              status: 'success',
              error_details: null,
            });
          } else {
            const errorMsg = `Fonnte error: ${JSON.stringify(whatsappData)}`;
            console.error('WhatsApp sending failed via Fonnte:', errorMsg);
            results.push({ contact: contact.name, type: 'whatsapp', status: 'failed', reason: errorMsg });
            logEntries.push({
              ticket_id: ticketId,
              contact_id: contact.id,
              contact_name: contact.name,
              contact_type: 'whatsapp',
              contact_value: contact.contact_value,
              status: 'failed',
              error_details: errorMsg,
            });
            
            // Notify admins of failure
            await notifyAdminsOfFailure(supabaseClient, ticketId, contact.name, 'WhatsApp (Fonnte)', errorMsg);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error forwarding to contact:', contact.name, error);
        results.push({ contact: contact.name, status: 'failed', reason: errorMessage });
        logEntries.push({
          ticket_id: ticketId,
          contact_id: contact.id,
          contact_name: contact.name,
          contact_type: contact.contact_type,
          contact_value: contact.contact_value,
          status: 'failed',
          error_details: errorMessage,
        });
        
        // Notify admins of failure
        await notifyAdminsOfFailure(supabaseClient, ticketId, contact.name, contact.contact_type, errorMessage);
      }
    }

    // Save logs to database
    if (logEntries.length > 0) {
      const { error: logError } = await supabaseClient
        .from('forwarding_logs')
        .insert(logEntries);
      
      if (logError) {
        console.error('Error saving forwarding logs:', logError);
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

// Helper function to notify admins of delivery failures
async function notifyAdminsOfFailure(
  supabaseClient: any,
  ticketId: string,
  contactName: string,
  channel: string,
  errorDetails: string
) {
  try {
    // Get all admin users
    const { data: admins } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        user_id: admin.user_id,
        ticket_id: ticketId,
        title: `Gagal Mengirim ke ${contactName}`,
        message: `Pengiriman ${channel} ke ${contactName} untuk tiket #${ticketId.substring(0, 8)} gagal. Error: ${errorDetails}`,
        type: 'delivery_failure',
      }));

      await supabaseClient
        .from('notifications')
        .insert(notifications);
      
      console.log(`Notified ${admins.length} admins of delivery failure to ${contactName}`);
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

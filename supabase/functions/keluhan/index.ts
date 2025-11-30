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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { nim, kategori, lokasi, subjek, deskripsi } = await req.json();

    console.log('Received complaint:', { nim, kategori, lokasi, subjek });

    // Validate required fields
    if (!nim || !kategori || !lokasi || !subjek || !deskripsi) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create ticket in database
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .insert({
        nim,
        kategori,
        lokasi,
        subjek,
        deskripsi,
        status: 'pending',
        waktu: new Date().toISOString(),
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError);
      return new Response(
        JSON.stringify({ error: 'Failed to create ticket' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Ticket created:', ticket.id);

    // Get admin contact info from environment
    const adminWa = Deno.env.get('ADMIN_WA');
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const fonnteApiKey = Deno.env.get('FONNTE_API_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const results = [];
    const errors = [];

    // Send WhatsApp notification via Fonnte
    if (adminWa && fonnteApiKey) {
      try {
        const waMessage = `*[${kategori.toUpperCase()}] Tiket Keluhan Baru*\n\n` +
          `*NIM:* ${nim}\n` +
          `*Kategori:* ${kategori.toUpperCase()}\n` +
          `*Lokasi:* ${lokasi}\n` +
          `*Subjek:* ${subjek}\n\n` +
          `*Deskripsi:*\n${deskripsi}\n\n` +
          `_Waktu: ${new Date(ticket.waktu).toLocaleString('id-ID')}_`;

        const waResponse = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: {
            'Authorization': fonnteApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            target: adminWa,
            message: waMessage,
            countryCode: '62',
          }),
        });

        const waData = await waResponse.json();
        
        if (waResponse.ok && waData.status) {
          console.log('WhatsApp sent successfully via Fonnte');
          results.push({ type: 'whatsapp', status: 'success' });
          
          // Log success
          await supabaseClient.from('forwarding_logs').insert({
            ticket_id: ticket.id,
            contact_name: 'Admin',
            contact_type: 'whatsapp',
            contact_value: adminWa,
            status: 'success',
          });
        } else {
          const errorMsg = `Fonnte error: ${JSON.stringify(waData)}`;
          console.error('WhatsApp failed:', errorMsg);
          errors.push({ type: 'whatsapp', reason: errorMsg });
          results.push({ type: 'whatsapp', status: 'failed', reason: errorMsg });
          
          // Log failure and notify admin
          await supabaseClient.from('forwarding_logs').insert({
            ticket_id: ticket.id,
            contact_name: 'Admin',
            contact_type: 'whatsapp',
            contact_value: adminWa,
            status: 'failed',
            error_details: errorMsg,
          });
          
          await notifyAdminsOfFailure(supabaseClient, ticket.id, 'WhatsApp', errorMsg);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('WhatsApp exception:', errorMsg);
        errors.push({ type: 'whatsapp', reason: errorMsg });
        results.push({ type: 'whatsapp', status: 'failed', reason: errorMsg });
        
        await supabaseClient.from('forwarding_logs').insert({
          ticket_id: ticket.id,
          contact_name: 'Admin',
          contact_type: 'whatsapp',
          contact_value: adminWa || 'N/A',
          status: 'failed',
          error_details: errorMsg,
        });
        
        await notifyAdminsOfFailure(supabaseClient, ticket.id, 'WhatsApp', errorMsg);
      }
    } else {
      const errorMsg = 'WhatsApp not configured (missing ADMIN_WA or FONNTE_API_KEY)';
      console.log(errorMsg);
      errors.push({ type: 'whatsapp', reason: errorMsg });
    }

    // Send Email notification via Resend
    if (adminEmail && resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Sistem Keluhan Kampus <onboarding@resend.dev>',
            to: [adminEmail],
            subject: `[${kategori.toUpperCase()}] Tiket Keluhan Baru - ${subjek}`,
            html: `
              <h2>Tiket Keluhan Mahasiswa</h2>
              <hr />
              <p><strong>NIM:</strong> ${nim}</p>
              <p><strong>Kategori:</strong> ${kategori.toUpperCase()}</p>
              <p><strong>Lokasi:</strong> ${lokasi}</p>
              <p><strong>Subjek:</strong> ${subjek}</p>
              <p><strong>Deskripsi:</strong></p>
              <p>${deskripsi}</p>
              <hr />
              <p><small>Waktu: ${new Date(ticket.waktu).toLocaleString('id-ID')}</small></p>
            `,
          }),
        });

        if (emailResponse.ok) {
          console.log('Email sent successfully via Resend');
          results.push({ type: 'email', status: 'success' });
          
          // Log success
          await supabaseClient.from('forwarding_logs').insert({
            ticket_id: ticket.id,
            contact_name: 'Admin',
            contact_type: 'email',
            contact_value: adminEmail,
            status: 'success',
          });
        } else {
          const errorData = await emailResponse.text();
          const errorMsg = `Email error: ${errorData}`;
          console.error('Email failed:', errorMsg);
          errors.push({ type: 'email', reason: errorMsg });
          results.push({ type: 'email', status: 'failed', reason: errorMsg });
          
          // Log failure and notify admin
          await supabaseClient.from('forwarding_logs').insert({
            ticket_id: ticket.id,
            contact_name: 'Admin',
            contact_type: 'email',
            contact_value: adminEmail,
            status: 'failed',
            error_details: errorMsg,
          });
          
          await notifyAdminsOfFailure(supabaseClient, ticket.id, 'Email', errorMsg);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error('Email exception:', errorMsg);
        errors.push({ type: 'email', reason: errorMsg });
        results.push({ type: 'email', status: 'failed', reason: errorMsg });
        
        await supabaseClient.from('forwarding_logs').insert({
          ticket_id: ticket.id,
          contact_name: 'Admin',
          contact_type: 'email',
          contact_value: adminEmail || 'N/A',
          status: 'failed',
          error_details: errorMsg,
        });
        
        await notifyAdminsOfFailure(supabaseClient, ticket.id, 'Email', errorMsg);
      }
    } else {
      const errorMsg = 'Email not configured (missing ADMIN_EMAIL or RESEND_API_KEY)';
      console.log(errorMsg);
      errors.push({ type: 'email', reason: errorMsg });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        ticket_id: ticket.id,
        results,
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in keluhan endpoint:', error);
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
        title: `Gagal Mengirim ${channel}`,
        message: `Pengiriman ${channel} untuk tiket #${ticketId.substring(0, 8)} gagal. Error: ${errorDetails}`,
        type: 'delivery_failure',
      }));

      await supabaseClient
        .from('notifications')
        .insert(notifications);
      
      console.log(`Notified ${admins.length} admins of ${channel} failure`);
    }
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

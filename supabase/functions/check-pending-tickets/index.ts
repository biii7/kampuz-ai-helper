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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Checking for pending tickets that need attention...');

    // Calculate time threshold (1 hour ago)
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Check if auto-forward is enabled
    const { data: autoForwardSetting } = await supabaseClient
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'auto_forward_enabled')
      .maybeSingle();

    const isAutoForwardEnabled = autoForwardSetting?.setting_value === 'true';

    // Find pending tickets older than 1 hour that haven't been forwarded
    const { data: pendingTickets, error: ticketsError } = await supabaseClient
      .from('tickets')
      .select('*')
      .eq('status', 'pending')
      .eq('auto_forwarded', false)
      .lt('created_at', oneHourAgo.toISOString());

    if (ticketsError) {
      console.error('Error fetching pending tickets:', ticketsError);
      throw ticketsError;
    }

    if (!pendingTickets || pendingTickets.length === 0) {
      console.log('No pending tickets requiring attention');
      return new Response(
        JSON.stringify({ message: 'No pending tickets requiring attention', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${pendingTickets.length} pending ticket(s) older than 1 hour`);

    // Get all admin users
    const { data: admins, error: adminsError } = await supabaseClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      throw adminsError;
    }

    if (!admins || admins.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admin users to notify', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for each admin about each pending ticket
    const notifications = [];
    const notifiedTicketIds = new Set<string>();

    for (const admin of admins) {
      for (const ticket of pendingTickets) {
        // Check if we already sent a reminder for this ticket recently (within last 2 hours)
        const twoHoursAgo = new Date();
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

        const { data: existingNotif } = await supabaseClient
          .from('notifications')
          .select('id')
          .eq('user_id', admin.user_id)
          .eq('ticket_id', ticket.id)
          .eq('type', 'pending_reminder')
          .gte('created_at', twoHoursAgo.toISOString())
          .maybeSingle();

        // Skip if already notified recently
        if (existingNotif) {
          console.log(`Skipping ticket ${ticket.id} - already notified recently`);
          continue;
        }

        const hoursSincePending = Math.floor(
          (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60)
        );

        // Determine message based on auto-forward status
        let message = '';
        if (isAutoForwardEnabled) {
          message = `Tiket pending sudah ${hoursSincePending} jam dan belum diteruskan secara otomatis. Pastikan ada kontak aktif untuk kategori "${ticket.kategori}".`;
        } else {
          message = `Tiket pending sudah ${hoursSincePending} jam dan belum dikirim. Mode Auto-Forward nonaktif - kirim manual di menu Kelola Tiket.`;
        }

        notifications.push({
          user_id: admin.user_id,
          ticket_id: ticket.id,
          title: '⏰ Reminder: Tiket Pending Perlu Perhatian',
          message: message,
          type: 'pending_reminder',
          is_read: false,
        });

        notifiedTicketIds.add(ticket.id);
      }
    }

    if (notifications.length > 0) {
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
        throw notifError;
      }

      console.log(`Created ${notifications.length} notification(s) for ${notifiedTicketIds.size} ticket(s)`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Checked ${pendingTickets.length} pending ticket(s), sent ${notifications.length} notification(s)`,
        ticketsChecked: pendingTickets.length,
        notificationsSent: notifications.length,
        autoForwardEnabled: isAutoForwardEnabled
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in check-pending-tickets function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

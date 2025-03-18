
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Cashfree configuration
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY');

interface WebhookPayload {
  data: {
    order: {
      order_id: string;
      order_status: string;
    }
  };
  event_time: string;
  type: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    const { data, type } = payload;
    
    console.log('Received webhook:', type, JSON.stringify(data));

    if (type !== 'ORDER_PAY_STATUS' || !data.order) {
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Not a payment status update' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { order_id, order_status } = data.order;

    // Update order status in database
    const { data: orderData, error: findError } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (findError || !orderData) {
      console.error('Order not found:', order_id);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({ status: order_status, updated_at: new Date().toISOString() })
      .eq('order_id', order_id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Database error' }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If payment is successful, add credits to user's account
    if (order_status === 'PAID') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('credit')
        .eq('id', orderData.user_id)
        .single();
      
      if (profileError) {
        console.error('Failed to fetch user profile:', profileError);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: 'User profile error' }), 
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const currentCredits = profileData.credit || 0;
      const newCredits = currentCredits + orderData.credits;

      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credit: newCredits })
        .eq('id', orderData.user_id);
      
      if (creditError) {
        console.error('Failed to update user credits:', creditError);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: 'Credit update error' }), 
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log(`Added ${orderData.credits} credits to user ${orderData.user_id}`);
    }

    return new Response(
      JSON.stringify({ received: true, processed: true }), 
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

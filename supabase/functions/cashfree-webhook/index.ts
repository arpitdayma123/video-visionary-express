
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

interface WebhookPayload {
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency: string;
      order_tags: {
        link_id: string;
      };
    };
    payment: {
      payment_status: string;
      payment_amount: number;
    };
    customer_details: {
      customer_email: string;
      customer_phone: string;
    };
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

    if (type !== 'PAYMENT_SUCCESS_WEBHOOK') {
      console.log('Not a payment success webhook:', type);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Not a payment success webhook' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const orderId = data.order.order_tags.link_id;
    const paymentStatus = data.payment.payment_status;

    console.log(`Processing payment status update for order ${orderId}: ${paymentStatus}`);

    // Find the order in the database
    const { data: orderData, error: findError } = await supabase
      .from('payment_orders')
      .select('user_id, credits, status')
      .eq('order_id', orderId)
      .maybeSingle();

    if (findError) {
      console.error('Database error finding order:', findError);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Database error', error: findError }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!orderData) {
      console.error('Order not found:', orderId);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order not found' }), 
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If payment was already processed, don't process it again
    if (orderData.status === 'PAID') {
      console.log('Payment was already processed:', orderId);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Payment already processed' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({ 
        status: paymentStatus === 'SUCCESS' ? 'PAID' : 'FAILED',
        updated_at: new Date().toISOString() 
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Database error', error: updateError }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If payment is successful, add credits to user's account
    if (paymentStatus === 'SUCCESS') {
      console.log(`Processing successful payment for order ${orderId}`);
      
      // Update credits using the update_user_credits function
      const { error: creditError } = await supabase.rpc('update_user_credits', {
        p_user_id: orderData.user_id,
        p_credits_to_add: orderData.credits
      });

      if (creditError) {
        console.error('Failed to update user credits:', creditError);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: 'Credit update error', error: creditError }), 
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      console.log(`Successfully added ${orderData.credits} credits to user ${orderData.user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: true,
        status: paymentStatus,
        order_id: orderId 
      }), 
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

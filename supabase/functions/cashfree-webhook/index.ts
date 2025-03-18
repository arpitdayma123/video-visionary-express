
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
        cf_link_id?: string;
        link_id: string;
      };
    };
    payment: {
      cf_payment_id?: number;
      payment_status: string;
      payment_amount: number;
    };
    customer_details: {
      customer_email: string;
      customer_phone: string;
    };
    link?: {
      link_id: string;
      link_status: string;
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
    console.log('Raw webhook received:', JSON.stringify(payload));
    
    const { data, type } = payload;
    
    console.log('Received webhook:', type, JSON.stringify(data));

    // Extract order ID and status based on webhook type
    let orderId: string | undefined;
    let paymentStatus: string | undefined;

    // Handle both PAYMENT_SUCCESS_WEBHOOK and PAYMENT_LINK_EVENT types
    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data.order && data.payment) {
      // Try to get the order ID from different possible locations
      orderId = data.order.order_tags.link_id || data.order.order_id;
      paymentStatus = data.payment.payment_status;
      console.log(`Processing payment success webhook for order ${orderId}: ${paymentStatus}`);
    } else if (type === 'PAYMENT_LINK_EVENT' && data.link) {
      orderId = data.link.link_id;
      paymentStatus = data.link.link_status === 'PAID' ? 'SUCCESS' : data.link.link_status;
      console.log(`Processing payment link event for order ${orderId}: ${paymentStatus}`);
    } else {
      console.log('Unsupported webhook event type:', type, 'with data:', JSON.stringify(data));
      
      // If we have order data, try to extract it even if the type is unexpected
      if (data.order) {
        // Try all possible ways to get order ID
        if (data.order.order_tags && data.order.order_tags.link_id) {
          orderId = data.order.order_tags.link_id;
        } else if (data.order.order_id) {
          orderId = data.order.order_id;
        }
        
        if (data.payment && data.payment.payment_status) {
          paymentStatus = data.payment.payment_status;
          console.log(`Extracted payment info from unexpected webhook type: ${orderId}: ${paymentStatus}`);
        } else {
          console.log('Could not extract payment status from unexpected webhook type');
          return new Response(
            JSON.stringify({ received: true, processed: false, reason: `Could not extract payment status from webhook type: ${type}` }), 
            { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
      } else {
        console.log('Could not extract order ID from unexpected webhook type');
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: `Could not extract order ID from webhook type: ${type}` }), 
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    if (!orderId) {
      console.error('Order ID not found in webhook payload');
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order ID not found in webhook payload' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Looking for payment order with order_id: ${orderId}`);

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
      console.error('Order not found in database:', orderId);
      
      // Try searching without the "order_" prefix if it exists
      let alternateOrderId = orderId;
      if (orderId.startsWith('order_')) {
        alternateOrderId = orderId.substring(6);
      }
      
      console.log(`Trying alternate search with order_id: ${alternateOrderId}`);
      
      const { data: altOrderData, error: altFindError } = await supabase
        .from('payment_orders')
        .select('user_id, credits, status')
        .eq('order_id', alternateOrderId)
        .maybeSingle();
        
      if (altFindError || !altOrderData) {
        console.error('Order not found with alternate ID either:', alternateOrderId);
        return new Response(
          JSON.stringify({ received: true, processed: false, reason: 'Order not found in database' }), 
          { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
      
      console.log(`Found order using alternate ID: ${alternateOrderId}`);
      orderId = alternateOrderId;
      orderData = altOrderData;
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
    const isPaid = paymentStatus === 'SUCCESS' || paymentStatus === 'PAID';
    const newStatus = isPaid ? 'PAID' : 'FAILED';
    
    console.log(`Updating order ${orderId} status to ${newStatus}`);
    
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({ 
        status: newStatus,
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
    if (isPaid) {
      console.log(`Processing successful payment for order ${orderId}, adding ${orderData.credits} credits to user ${orderData.user_id}`);
      
      // Get current user credits before update
      const { data: beforeUpdate } = await supabase
        .from('profiles')
        .select('credit')
        .eq('id', orderData.user_id)
        .single();
        
      console.log(`User ${orderData.user_id} has ${beforeUpdate?.credit || 0} credits before update`);
      
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

      // Get current user credits after update to verify
      const { data: afterUpdate } = await supabase
        .from('profiles')
        .select('credit')
        .eq('id', orderData.user_id)
        .single();
        
      console.log(`User ${orderData.user_id} now has ${afterUpdate?.credit || 0} credits after update (added ${orderData.credits})`);
      console.log(`Successfully added ${orderData.credits} credits to user ${orderData.user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: true,
        status: newStatus,
        order_id: orderId,
        user_id: orderData.user_id,
        credits_added: isPaid ? orderData.credits : 0
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

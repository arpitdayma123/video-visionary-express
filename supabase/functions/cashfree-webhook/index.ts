
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
    order?: {
      order_id?: string;
      order_amount?: number;
      order_currency?: string;
      order_tags?: {
        cf_link_id?: string;
        link_id?: string;
      };
    };
    payment?: {
      cf_payment_id?: number;
      payment_status?: string;
      payment_amount?: number;
    };
    customer_details?: {
      customer_email?: string;
      customer_phone?: string;
    };
    link?: {
      link_id?: string;
      link_status?: string;
    };
    payment_link?: {
      link_id?: string;
      link_status?: string;
      link_amount?: number;
    };
  };
  event_time?: string;
  type?: string;
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
    let linkId: string | undefined;

    console.log('Extracting order and payment information...');
    
    // Extract order ID and payment status from different webhook types
    if (type === 'PAYMENT_SUCCESS_WEBHOOK' && data.order) {
      // For standard payment webhooks
      if (data.order.order_tags && data.order.order_tags.link_id) {
        orderId = data.order.order_tags.link_id;
      } else {
        orderId = data.order.order_id;
      }
      
      if (data.payment) {
        paymentStatus = data.payment.payment_status;
      }
      
      console.log(`Extracted from PAYMENT_SUCCESS_WEBHOOK: orderId=${orderId}, status=${paymentStatus}`);
    } else if (type === 'PAYMENT_LINK_EVENT' && data.link) {
      // For payment link webhooks
      linkId = data.link.link_id;
      orderId = linkId; // Use link_id as the order_id
      
      if (data.link.link_status === 'PAID') {
        paymentStatus = 'SUCCESS';
      } else {
        paymentStatus = data.link.link_status;
      }
      
      console.log(`Extracted from PAYMENT_LINK_EVENT: linkId=${linkId}, orderId=${orderId}, status=${paymentStatus}`);
    } else if (data.payment_link) {
      // Handle payment_link object if available
      linkId = data.payment_link.link_id;
      orderId = linkId;
      
      if (data.payment_link.link_status === 'PAID') {
        paymentStatus = 'SUCCESS';
      } else {
        paymentStatus = data.payment_link.link_status;
      }
      
      console.log(`Extracted from payment_link object: linkId=${linkId}, orderId=${orderId}, status=${paymentStatus}`);
    } else if (data.order) {
      // Last resort fallback for other webhook formats
      if (data.order.order_tags && (data.order.order_tags.link_id || data.order.order_tags.cf_link_id)) {
        orderId = data.order.order_tags.link_id || data.order.order_tags.cf_link_id;
      } else if (data.order.order_id) {
        orderId = data.order.order_id;
      }
      
      if (data.payment && data.payment.payment_status) {
        paymentStatus = data.payment.payment_status;
      }
      
      console.log(`Extracted from generic data: orderId=${orderId}, status=${paymentStatus}`);
    }

    // If we still can't identify the order, try to extract from any available fields
    if (!orderId) {
      console.log('Could not extract order ID from standard fields, trying alternatives...');
      
      // Check all possible locations for an order ID or link ID
      if (data.link && data.link.link_id) {
        orderId = data.link.link_id;
        console.log(`Using link.link_id as order ID: ${orderId}`);
      } else if (data.order && data.order.order_id) {
        orderId = data.order.order_id;
        console.log(`Using order.order_id directly: ${orderId}`);
      } else {
        // Last resort: Look through entire data object for any ID-like fields
        const jsonStr = JSON.stringify(data);
        const idMatches = jsonStr.match(/"(order_id|link_id)":"([^"]*)"/g);
        
        if (idMatches && idMatches.length > 0) {
          const firstMatch = idMatches[0].match(/"(order_id|link_id)":"([^"]*)"/);
          if (firstMatch && firstMatch[2]) {
            orderId = firstMatch[2];
            console.log(`Extracted order ID from JSON pattern matching: ${orderId}`);
          }
        }
      }
    }

    if (!orderId) {
      console.error('Order ID not found in webhook payload');
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order ID not found in webhook payload' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // If no explicit payment status was found but we have link_status, use that
    if (!paymentStatus && data.link && data.link.link_status) {
      paymentStatus = data.link.link_status === 'PAID' ? 'SUCCESS' : data.link.link_status;
      console.log(`Using link_status as payment status: ${paymentStatus}`);
    }
    
    if (!paymentStatus) {
      // Default to SUCCESS if we have order ID but no status (webhook wouldn't be sent for failures)
      paymentStatus = 'SUCCESS';
      console.log('No payment status found, defaulting to SUCCESS');
    }

    console.log(`Searching for payment order with ID: ${orderId}`);

    // First, try exact match with the order_id
    let { data: orderData, error: findError } = await supabase
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

    // If no exact match, try with order_ prefix removed or added
    if (!orderData) {
      console.log('Order not found with exact ID, trying alternative formats...');
      
      // Try without 'order_' prefix if it exists
      let alternateOrderId = orderId;
      if (orderId.startsWith('order_')) {
        alternateOrderId = orderId.substring(6);
        console.log(`Trying without 'order_' prefix: ${alternateOrderId}`);
      } else {
        // Try with 'order_' prefix if it doesn't exist
        alternateOrderId = `order_${orderId}`;
        console.log(`Trying with 'order_' prefix: ${alternateOrderId}`);
      }
      
      const { data: altOrderData, error: altFindError } = await supabase
        .from('payment_orders')
        .select('user_id, credits, status')
        .eq('order_id', alternateOrderId)
        .maybeSingle();
        
      if (altFindError) {
        console.error('Database error finding order with alternate ID:', altFindError);
      } else if (altOrderData) {
        console.log(`Found order using alternate ID: ${alternateOrderId}`);
        orderId = alternateOrderId;
        orderData = altOrderData;
      }
    }

    // If order still not found, search by pattern matching (order IDs may have been truncated)
    if (!orderData) {
      console.log('Order not found with exact or alternate IDs, trying pattern matching...');
      
      // Try to find by partial match (for truncated IDs)
      const { data: patternOrderData, error: patternFindError } = await supabase
        .from('payment_orders')
        .select('order_id, user_id, credits, status');
        
      if (patternFindError) {
        console.error('Database error with pattern search:', patternFindError);
      } else if (patternOrderData && patternOrderData.length > 0) {
        // Find any order where our ID is contained in the stored ID or vice versa
        const matchedOrder = patternOrderData.find(order => 
          order.order_id.includes(orderId) || orderId.includes(order.order_id)
        );
        
        if (matchedOrder) {
          console.log(`Found order using pattern matching. Original ID: ${orderId}, Matched ID: ${matchedOrder.order_id}`);
          orderId = matchedOrder.order_id;
          orderData = {
            user_id: matchedOrder.user_id,
            credits: matchedOrder.credits,
            status: matchedOrder.status
          };
        }
      }
    }

    if (!orderData) {
      console.error('Order not found in database after multiple search attempts:', orderId);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order not found in database' }), 
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

    // Determine if the payment is successful
    const isPaid = paymentStatus === 'SUCCESS' || paymentStatus === 'PAID';
    const newStatus = isPaid ? 'PAID' : 'FAILED';
    
    console.log(`Updating order ${orderId} status to ${newStatus}`);
    
    // Update order status
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
        .maybeSingle();
        
      console.log(`User ${orderData.user_id} has ${beforeUpdate?.credit || 0} credits before update`);
      
      // Update credits using the update_user_credits function
      const { error: creditError } = await supabase.rpc('update_user_credits', {
        p_user_id: orderData.user_id,
        p_credits_to_add: orderData.credits
      });

      if (creditError) {
        console.error('Failed to update user credits:', creditError);
        
        // If the RPC call failed, try a direct update as fallback
        console.log('Attempting direct update as fallback...');
        
        const { error: directUpdateError } = await supabase
          .from('profiles')
          .update({ 
            credit: (beforeUpdate?.credit || 0) + orderData.credits,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderData.user_id);
          
        if (directUpdateError) {
          console.error('Direct update also failed:', directUpdateError);
          return new Response(
            JSON.stringify({ 
              received: true, 
              processed: false, 
              reason: 'Credit update error', 
              error: creditError,
              directError: directUpdateError 
            }), 
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }
        
        console.log('Direct update successful as fallback');
      }

      // Get current user credits after update to verify
      const { data: afterUpdate } = await supabase
        .from('profiles')
        .select('credit')
        .eq('id', orderData.user_id)
        .maybeSingle();
        
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

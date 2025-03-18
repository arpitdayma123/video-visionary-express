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
      link_amount?: string;
      link_purpose?: string;
    };
    payment_link?: {
      link_id?: string;
      link_status?: string;
      link_amount?: string;
      link_purpose?: string;
    };
  };
  event_time?: string;
  type?: string;
  
  // Direct fields for PAYMENT_LINK_EVENT
  link_id?: string;
  link_status?: string;
  link_amount?: string;
  link_purpose?: string;
  order?: {
    order_id?: string;
    transaction_status?: string;
  };
}

function getCreditsFromPurpose(purpose: string | undefined): number {
  if (!purpose) return 0;
  
  // Extract number from strings like "Credit purchase: 5 credits"
  const match = purpose.match(/Credit purchase: (\d+) credits/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  // Fallback based on amount if purpose doesn't contain credits info
  return 0;
}

function getCreditsFromAmount(amount: string | number | undefined): number {
  if (!amount) return 0;
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Apply credit packages logic
  if (numAmount >= 1999) return 30;
  if (numAmount >= 999) return 15;
  if (numAmount >= 499) return 5;
  
  return 0;
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
    
    // Handle both nested and direct properties (different webhook formats)
    const data = payload.data || payload;
    const type = payload.type || (payload.link_status ? 'PAYMENT_LINK_EVENT' : 'UNKNOWN');
    
    console.log('Received webhook:', type, JSON.stringify(data));

    // Extract order ID from various possible locations
    let orderId: string | undefined;
    let paymentStatus: string | undefined;
    let linkPurpose: string | undefined;
    let linkAmount: string | undefined;
    
    // For PAYMENT_LINK_EVENT format
    if (type === 'PAYMENT_LINK_EVENT') {
      // Try direct fields first (most common in PAYMENT_LINK_EVENT)
      if (payload.link_id) {
        orderId = payload.link_id;
        paymentStatus = payload.link_status;
        linkPurpose = payload.link_purpose;
        linkAmount = payload.link_amount;
      } 
      // Then try nested data.link structure
      else if (data.link) {
        orderId = data.link.link_id;
        paymentStatus = data.link.link_status;
        linkPurpose = data.link.link_purpose;
        linkAmount = data.link.link_amount;
      }
      // Also check nested payment_link structure
      else if (data.payment_link) {
        orderId = data.payment_link.link_id;
        paymentStatus = data.payment_link.link_status;
        linkPurpose = data.payment_link.link_purpose;
        linkAmount = data.payment_link.link_amount;
      }
      
      // Check if we have order data from nested order object
      if (payload.order) {
        // Use order_id if available, fallback to our existing orderId
        orderId = payload.order.order_id || orderId;
        
        // If transaction_status is available, use it for payment status
        if (payload.order.transaction_status) {
          paymentStatus = payload.order.transaction_status;
        }
      }
    } 
    // For standard payment webhook format
    else if (data.order) {
      // Try to get from order_tags if available
      if (data.order.order_tags && (data.order.order_tags.link_id || data.order.order_tags.cf_link_id)) {
        orderId = data.order.order_tags.link_id || data.order.order_tags.cf_link_id;
      } 
      // Otherwise use direct order_id
      else if (data.order.order_id) {
        orderId = data.order.order_id;
      }
      
      if (data.payment && data.payment.payment_status) {
        paymentStatus = data.payment.payment_status;
      }
    }

    // Last attempt to find order ID if still not found
    if (!orderId) {
      console.log('Order ID not found in standard fields, trying alternatives...');
      
      // Deep search through the entire payload for any order_id or link_id
      const payloadStr = JSON.stringify(payload);
      const orderIdMatch = payloadStr.match(/"order_id":"([^"]+)"/);
      const linkIdMatch = payloadStr.match(/"link_id":"([^"]+)"/);
      
      if (orderIdMatch && orderIdMatch[1]) {
        orderId = orderIdMatch[1];
        console.log(`Found order_id in deep search: ${orderId}`);
      } else if (linkIdMatch && linkIdMatch[1]) {
        orderId = linkIdMatch[1];
        console.log(`Found link_id in deep search: ${orderId}`);
      }
    }

    if (!orderId) {
      console.error('Order ID not found in webhook payload');
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order ID not found in webhook payload' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Extracted order ID: ${orderId}`);
    console.log(`Payment status: ${paymentStatus}`);
    console.log(`Link purpose: ${linkPurpose}`);
    console.log(`Link amount: ${linkAmount}`);

    // Determine payment success status
    const successStatuses = ['SUCCESS', 'PAID'];
    const isPaid = successStatuses.includes(paymentStatus || '');
    
    if (!isPaid) {
      console.log(`Payment not successful. Status: ${paymentStatus}`);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Payment not successful' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Determine credits from link purpose or amount
    let creditsToAdd = getCreditsFromPurpose(linkPurpose);
    
    // If we couldn't determine credits from purpose, try from amount
    if (creditsToAdd === 0) {
      creditsToAdd = getCreditsFromAmount(linkAmount);
      console.log(`Determined ${creditsToAdd} credits from amount ${linkAmount}`);
    }
    
    if (creditsToAdd === 0) {
      console.error('Could not determine credits to add from webhook data');
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Could not determine credits to add' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // First check if we can find the order in our database
    console.log(`Searching for payment order with ID: ${orderId}`);
    
    let { data: orderData, error: findError } = await supabase
      .from('payment_orders')
      .select('user_id, credits, status')
      .eq('order_id', orderId)
      .maybeSingle();
      
    if (findError) {
      console.error('Database error finding order:', findError);
    }

    // If no exact match, try with alternative formats (with/without prefix)
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

    // If order still not found, search by pattern matching
    if (!orderData) {
      console.log('Order not found with exact or alternate IDs, trying pattern matching...');
      
      // Try to find by partial match
      const { data: patternOrderData, error: patternFindError } = await supabase
        .from('payment_orders')
        .select('order_id, user_id, credits, status');
        
      if (patternFindError) {
        console.error('Database error with pattern search:', patternFindError);
      } else if (patternOrderData && patternOrderData.length > 0) {
        // Find any order where our ID is contained in the stored ID or vice versa
        const matchedOrder = patternOrderData.find(order => 
          order.order_id.includes(orderId!) || orderId!.includes(order.order_id)
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

    // If we still don't have order data, but we have a Cashfree payment link event with purpose
    // we can try to extract user ID from the customer details
    if (!orderData && data.customer_details && data.customer_details.customer_email) {
      console.log(`Order not found in database, trying to find user by email: ${data.customer_details.customer_email}`);
      
      // Try to find user by email
      const { data: userData, error: userError } = await supabase
        .auth.admin.listUsers();
      
      if (userError) {
        console.error('Error finding user by email:', userError);
      } else if (userData) {
        const user = userData.users.find(u => u.email === data.customer_details?.customer_email);
        
        if (user) {
          console.log(`Found user by email: ${user.id}`);
          
          // Create a payment_order record for tracking
          const { error: createError } = await supabase
            .from('payment_orders')
            .insert({
              order_id: orderId,
              user_id: user.id,
              credits: creditsToAdd,
              status: 'PAID',
              currency: 'INR',
              amount: parseFloat(linkAmount || '0'),
            });
            
          if (createError) {
            console.error('Error creating payment order record:', createError);
          } else {
            orderData = {
              user_id: user.id,
              credits: creditsToAdd,
              status: 'PAID'
            };
          }
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

    // Determine the credits to add - use the determined value if we have it, otherwise use the value from the order
    const finalCreditsToAdd = creditsToAdd > 0 ? creditsToAdd : orderData.credits;
    console.log(`Will add ${finalCreditsToAdd} credits to user ${orderData.user_id}`);
    
    // Update order status to PAID
    const { error: updateError } = await supabase
      .from('payment_orders')
      .update({ 
        status: 'PAID',
        updated_at: new Date().toISOString() 
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
    } else {
      console.log(`Updated order ${orderId} status to PAID`);
    }

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
      p_credits_to_add: finalCreditsToAdd
    });

    if (creditError) {
      console.error('Failed to update user credits using RPC:', creditError);
      
      // If the RPC call failed, try a direct update as fallback
      console.log('Attempting direct update as fallback...');
      
      const { error: directUpdateError } = await supabase
        .from('profiles')
        .update({ 
          credit: (beforeUpdate?.credit || 0) + finalCreditsToAdd,
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
      
    console.log(`User ${orderData.user_id} now has ${afterUpdate?.credit || 0} credits after update (added ${finalCreditsToAdd})`);
    console.log(`Successfully added ${finalCreditsToAdd} credits to user ${orderData.user_id}`);

    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: true,
        status: 'PAID',
        order_id: orderId,
        user_id: orderData.user_id,
        credits_added: finalCreditsToAdd,
        creditsBeforeUpdate: beforeUpdate?.credit || 0,
        creditsAfterUpdate: afterUpdate?.credit || 0
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

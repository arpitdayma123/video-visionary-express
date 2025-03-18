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

// External webhook URL to forward data to
const EXTERNAL_WEBHOOK_URL = "https://primary-production-ce25.up.railway.app/webhook/payment";

interface WebhookPayload {
  data?: {
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
  link_amount_paid?: string;
  cf_link_id?: number;
  link_url?: string;
  customer_details?: {
    customer_email?: string;
    customer_phone?: string;
    customer_name?: string;
  };
  order?: {
    order_id?: string;
    transaction_status?: string;
    order_amount?: string;
    transaction_id?: number;
  };
}

// Get credits based on link purpose
function getCreditsFromPurpose(purpose: string | undefined): number {
  if (!purpose) return 0;
  
  // Extract number from strings like "Credit purchase: 5 credits"
  const match = purpose.match(/Credit purchase: (\d+) credits/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  
  return 0;
}

// Get credits based on package amount
function getCreditsFromAmount(amount: string | number | undefined): number {
  if (!amount) return 0;
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Apply credit packages logic - match to packages in BuyCredits.tsx
  if (numAmount >= 2999) return 50;
  if (numAmount >= 1499) return 20;
  if (numAmount >= 499) return 5;
  
  return 0;
}

// Forward webhook data to external endpoint
async function forwardWebhookData(payload: any, userId: string | null = null) {
  try {
    // Add user_id to the payload if available
    const dataToForward: any = {
      ...payload,
      user_id: userId
    };
    
    // If we have a userId, get the profile information to include
    if (userId) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, email, credit')
          .eq('id', userId)
          .maybeSingle();
          
        if (!profileError && profileData) {
          // Include profile data in the forwarded webhook
          dataToForward.profile = {
            id: profileData.id,
            email: profileData.email,
            credit: profileData.credit
          };
          console.log(`Including profile data in webhook: ${JSON.stringify(dataToForward.profile)}`);
        } else {
          console.error('Error fetching profile for webhook:', profileError);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile for webhook:', err);
      }
    }
    
    console.log(`Forwarding webhook data to ${EXTERNAL_WEBHOOK_URL}`);
    
    const response = await fetch(EXTERNAL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dataToForward),
    });
    
    if (!response.ok) {
      console.error(`Error forwarding webhook data: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
    } else {
      console.log(`Successfully forwarded webhook data, status: ${response.status}`);
    }
    
    return response.ok;
  } catch (error) {
    console.error('Error forwarding webhook data:', error);
    return false;
  }
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

    // Extract key information based on webhook format
    let orderId: string | undefined;
    let paymentStatus: string | undefined;
    let linkPurpose: string | undefined;
    let linkAmount: string | undefined;
    let customerEmail: string | undefined;
    
    // For PAYMENT_LINK_EVENT format with direct fields
    if (type === 'PAYMENT_LINK_EVENT') {
      // Try direct fields first (most common in PAYMENT_LINK_EVENT)
      orderId = payload.link_id || payload.order?.order_id;
      paymentStatus = payload.link_status || payload.order?.transaction_status;
      linkPurpose = payload.link_purpose;
      linkAmount = payload.link_amount || payload.link_amount_paid || payload.order?.order_amount;
      customerEmail = payload.customer_details?.customer_email;
      
      // If nested data structure is present
      if (data.link) {
        orderId = orderId || data.link.link_id;
        paymentStatus = paymentStatus || data.link.link_status;
        linkPurpose = linkPurpose || data.link.link_purpose;
        linkAmount = linkAmount || data.link.link_amount;
      }
      
      // Also check nested payment_link structure
      if (data.payment_link) {
        orderId = orderId || data.payment_link.link_id;
        paymentStatus = paymentStatus || data.payment_link.link_status;
        linkPurpose = linkPurpose || data.payment_link.link_purpose;
        linkAmount = linkAmount || data.payment_link.link_amount;
      }
      
      // Get customer email if available in nested structure
      customerEmail = customerEmail || data.customer_details?.customer_email;
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
      
      // Get customer email if available
      customerEmail = data.customer_details?.customer_email;
    }

    // Last attempt to find order ID if still not found
    if (!orderId) {
      console.log('Order ID not found in standard fields, searching in full payload...');
      
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
      
      // Forward webhook data without user ID since we can't find the order
      await forwardWebhookData(payload);
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order ID not found in webhook payload', payload: payload }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Extracted order ID: ${orderId}`);
    console.log(`Payment status: ${paymentStatus}`);
    console.log(`Link purpose: ${linkPurpose}`);
    console.log(`Link amount: ${linkAmount}`);
    console.log(`Customer email: ${customerEmail}`);

    // Determine payment success status
    const successStatuses = ['SUCCESS', 'PAID'];
    const isPaid = successStatuses.includes(paymentStatus || '');
    
    if (!isPaid) {
      console.log(`Payment not successful. Status: ${paymentStatus}`);
      
      // Forward webhook data without user ID for unsuccessful payments
      await forwardWebhookData(payload);
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Payment not successful' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    // Determine credits to add
    let creditsToAdd = getCreditsFromPurpose(linkPurpose);
    
    // If we couldn't determine credits from purpose, try from amount
    if (creditsToAdd === 0) {
      creditsToAdd = getCreditsFromAmount(linkAmount);
      console.log(`Determined ${creditsToAdd} credits from amount ${linkAmount}`);
    }
    
    if (creditsToAdd === 0) {
      console.error('Could not determine credits to add from webhook data');
      
      // Forward webhook data without user ID since we can't determine credits
      await forwardWebhookData(payload);
      
      return new Response(
        JSON.stringify({ 
          received: true, 
          processed: false, 
          reason: 'Could not determine credits to add',
          payload: payload 
        }), 
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

    // If order still not found, try to find by pattern matching
    if (!orderData) {
      console.log('Order not found with exact or alternate IDs, trying pattern matching...');
      
      // Try to find by partial match
      const { data: allOrders, error: patternFindError } = await supabase
        .from('payment_orders')
        .select('order_id, user_id, credits, status');
        
      if (patternFindError) {
        console.error('Database error with pattern search:', patternFindError);
      } else if (allOrders && allOrders.length > 0) {
        // Find any order where our ID is contained in the stored ID or vice versa
        const matchedOrder = allOrders.find(order => 
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

    // If we still don't have order data, but we have a customer email, try to find user
    if (!orderData && customerEmail) {
      console.log(`Order not found in database, trying to find user by email: ${customerEmail}`);
      
      // Try to find user by email
      const { data: userData, error: userError } = await supabase
        .auth.admin.listUsers();
      
      if (userError) {
        console.error('Error finding user by email:', userError);
      } else if (userData) {
        const user = userData.users.find(u => u.email === customerEmail);
        
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
      
      // Forward webhook data without user ID since we can't find the order
      await forwardWebhookData(payload);
      
      return new Response(
        JSON.stringify({ 
          received: true, 
          processed: false, 
          reason: 'Order not found in database',
          order_id: orderId,
          payload: payload
        }), 
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Forward webhook data with user ID before processing payment
    await forwardWebhookData(payload, orderData.user_id);

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
    
    // First try to use the update_user_credits function
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
    
    // Verify that credits were properly added
    const expectedCredits = (beforeUpdate?.credit || 0) + finalCreditsToAdd;
    if (afterUpdate?.credit !== expectedCredits) {
      console.error(`Credit update verification failed. Expected: ${expectedCredits}, Actual: ${afterUpdate?.credit}`);
      
      // Attempt one more direct update as last resort
      const { error: finalUpdateError } = await supabase
        .from('profiles')
        .update({ 
          credit: expectedCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderData.user_id);
        
      if (finalUpdateError) {
        console.error('Final credit update attempt failed:', finalUpdateError);
      } else {
        console.log(`Final credit update successful. Set credits to ${expectedCredits}`);
      }
    } else {
      console.log(`Successfully added ${finalCreditsToAdd} credits to user ${orderData.user_id}`);
    }

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
    
    // Forward the error to the external webhook
    try {
      await forwardWebhookData({
        error: error.message || 'Unknown error processing webhook',
        stack: error.stack
      });
    } catch (fwdError) {
      console.error('Error forwarding error details:', fwdError);
    }
    
    return new Response(
      JSON.stringify({ received: true, processed: false, reason: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

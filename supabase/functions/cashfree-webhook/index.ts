
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "./utils.ts";
import { WebhookPayload } from "./types.ts";
import { forwardWebhookData } from "./webhookForwarder.ts";
import { extractOrderId, extractPaymentStatus, extractAdditionalData } from "./dataExtractor.ts";
import { findOrder } from "./orderFinder.ts";
import { processSuccessfulPayment } from "./paymentProcessor.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse webhook payload
    const payload: WebhookPayload = await req.json();
    console.log('Raw webhook received:', JSON.stringify(payload));

    // Extract key information
    const orderId = extractOrderId(payload);
    if (!orderId) {
      console.error('Order ID not found in webhook payload');
      
      // Forward webhook data without user ID since we can't find the order
      await forwardWebhookData(payload);
      
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Order ID not found in webhook payload', payload: payload }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Extract other key information
    const paymentStatus = extractPaymentStatus(payload);
    const { linkPurpose, linkAmount, customerEmail, type } = extractAdditionalData(payload);

    console.log(`Extracted order ID: ${orderId}`);
    console.log(`Payment status: ${paymentStatus}`);
    console.log(`Link purpose: ${linkPurpose}`);
    console.log(`Link amount: ${linkAmount}`);
    console.log(`Customer email: ${customerEmail}`);
    console.log(`Event type: ${type}`);

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

    // Find the order in the database using multiple strategies
    const { orderId: finalOrderId, orderData } = await findOrder(
      orderId, 
      customerEmail, 
      linkPurpose, 
      linkAmount
    );

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
      console.log('Payment was already processed:', finalOrderId);
      return new Response(
        JSON.stringify({ received: true, processed: false, reason: 'Payment already processed' }), 
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Process the successful payment
    const result = await processSuccessfulPayment(
      finalOrderId, 
      orderData, 
      linkPurpose, 
      linkAmount
    );

    if (!result.success) {
      return new Response(
        JSON.stringify({ 
          received: true, 
          processed: false, 
          reason: result.message || 'Processing error', 
          error: result.error
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        received: true, 
        processed: true,
        status: 'PAID',
        order_id: finalOrderId,
        user_id: result.userId,
        credits_added: result.creditsAdded,
        creditsBeforeUpdate: result.creditsBeforeUpdate,
        creditsAfterUpdate: result.creditsAfterUpdate
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

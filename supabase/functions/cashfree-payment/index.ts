
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
const CASHFREE_APP_ID = Deno.env.get('CASHFREE_APP_ID');
const CASHFREE_SECRET_KEY = Deno.env.get('CASHFREE_SECRET_KEY');
const CASHFREE_API_URL = "https://sandbox.cashfree.com/pg";

interface PaymentRequest {
  orderId: string;
  orderAmount: number;
  orderCurrency: string;
  userId: string;
  credits: number;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  returnUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const payload: PaymentRequest = await req.json();
    const { 
      orderId, 
      orderAmount, 
      orderCurrency,
      userId,
      credits,
      customerEmail, 
      customerName,
      customerPhone,
      returnUrl
    } = payload;

    // Validate required fields
    if (!orderId || !orderAmount || !orderCurrency || !userId || !credits || !customerEmail || !customerPhone || !returnUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("Creating Cashfree order with data:", {
      orderId,
      orderAmount,
      customerEmail,
      customerPhone,
      returnUrl
    });

    // Create order in Cashfree
    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CASHFREE_APP_ID as string,
        'x-client-secret': CASHFREE_SECRET_KEY as string,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: orderAmount,
        order_currency: orderCurrency,
        customer_details: {
          customer_id: userId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_name: customerName || customerEmail,
        },
        order_meta: {
          return_url: returnUrl,
          notify_url: returnUrl
        },
        order_note: `Credit purchase: ${credits} credits`,
      }),
    });

    // Log the full response for debugging
    const responseText = await response.text();
    console.log("Cashfree API raw response:", responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Cashfree response:", e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from payment gateway', 
          details: responseText 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }
    
    if (!response.ok) {
      console.error('Cashfree error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to create payment', details: data }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("Cashfree successful response:", data);

    // Use the payments.url from the response as the payment link
    const paymentUrl = data.payments?.url;
    if (!paymentUrl) {
      console.error('No payment URL in response:', data);
      return new Response(
        JSON.stringify({ 
          error: 'No payment URL received', 
          details: 'The payment gateway did not provide a payment URL',
          response: data
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Store order information in database
    const { error: dbError } = await supabase
      .from('payment_orders')
      .insert({
        order_id: orderId,
        user_id: userId,
        amount: orderAmount,
        currency: orderCurrency,
        credits: credits,
        status: 'CREATED',
        payment_session_id: data.payment_session_id,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Database error', details: dbError }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        payment_link: paymentUrl,
        payment_session_id: data.payment_session_id,
        cf_order_id: data.cf_order_id 
      }), 
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

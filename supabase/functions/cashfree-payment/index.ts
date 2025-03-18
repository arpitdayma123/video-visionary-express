
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
    console.log("Received payment request");
    
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

    console.log("Payment request details:", { 
      orderId, 
      orderAmount, 
      orderCurrency, 
      customerEmail,
      customerPhone
    });

    // Check if Cashfree credentials are available
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      console.error('Cashfree credentials not found. APP_ID:', !!CASHFREE_APP_ID, 'SECRET_KEY:', !!CASHFREE_SECRET_KEY);
      return new Response(
        JSON.stringify({ 
          error: 'Payment gateway configuration missing',
          details: 'Missing Cashfree API credentials' 
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate required fields
    if (!orderId || !orderAmount || !orderCurrency || !userId || !credits || !customerEmail || !customerPhone) {
      console.error('Missing required fields:', { 
        hasOrderId: !!orderId, 
        hasAmount: !!orderAmount, 
        hasCurrency: !!orderCurrency,
        hasUserId: !!userId,
        hasCredits: !!credits,
        hasEmail: !!customerEmail,
        hasPhone: !!customerPhone
      });
      
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Always redirect to dashboard instead of the provided returnUrl
    const dashboardUrl = returnUrl.replace('/buy-credits', '/dashboard');
    
    console.log("Creating Cashfree payment link with data:", {
      orderId,
      orderAmount,
      customerEmail,
      customerPhone,
      returnUrl: dashboardUrl
    });

    // Create payment link using Cashfree's links API
    console.log("Using Cashfree API credentials - APP_ID:", CASHFREE_APP_ID?.substring(0, 3) + '...');
    
    const response = await fetch(`${CASHFREE_API_URL}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': CASHFREE_APP_ID as string,
        'x-client-secret': CASHFREE_SECRET_KEY as string,
      },
      body: JSON.stringify({
        link_id: orderId,
        link_amount: orderAmount,
        link_currency: orderCurrency,
        link_purpose: `Credit purchase: ${credits} credits`,
        customer_details: {
          customer_id: userId,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_name: customerName || customerEmail,
        },
        link_meta: {
          return_url: dashboardUrl,
          notify_url: dashboardUrl,
        },
        link_notify: {
          send_email: true,
          send_sms: false
        },
        link_auto_reminders: true,
        link_partial_payments: false,
      }),
    });

    // Log the full response for debugging
    const responseText = await response.text();
    console.log("Cashfree API response status:", response.status);
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
        JSON.stringify({ 
          error: 'Failed to create payment', 
          details: data,
          code: response.status
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log("Cashfree successful response:", data);

    // Use the link_url from the response as the payment link
    const paymentUrl = data.link_url;
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
        payment_session_id: data.link_id,
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
        payment_session_id: data.link_id,
        cf_order_id: data.link_id
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

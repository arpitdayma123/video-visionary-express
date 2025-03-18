
// Logic for finding order data in the database
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import type { OrderData } from "./types.ts";
import { getCreditsFromPurpose, getCreditsFromAmount } from "./utils.ts";

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Find order in database with multiple strategies
export async function findOrder(orderId: string, customerEmail?: string, linkPurpose?: string, linkAmount?: string | number): Promise<{ orderId: string; orderData: OrderData | null; error?: any }> {
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
        
        // Determine credits from purpose or amount
        const creditsToAdd = getCreditsFromPurpose(linkPurpose) || getCreditsFromAmount(linkAmount) || 0;
        
        // Create a payment_order record for tracking
        const { error: createError } = await supabase
          .from('payment_orders')
          .insert({
            order_id: orderId,
            user_id: user.id,
            credits: creditsToAdd,
            status: 'PAID',
            currency: 'INR',
            amount: parseFloat(linkAmount?.toString() || '0'),
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

  return { orderId, orderData };
}

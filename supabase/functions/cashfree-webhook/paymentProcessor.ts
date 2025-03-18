
// Logic for processing payments and updating user credits
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { OrderData } from "./types.ts";
import { getCreditsFromPurpose, getCreditsFromAmount } from "./utils.ts";

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Process successful payment and update user credits
export async function processSuccessfulPayment(
  orderId: string, 
  orderData: OrderData, 
  linkPurpose: string | undefined,
  linkAmount: string | undefined
) {
  // Determine the credits to add - use purpose if available, otherwise fall back to amount
  let creditsToAdd = getCreditsFromPurpose(linkPurpose);
  
  // If we couldn't determine credits from purpose, try from amount
  if (creditsToAdd === 0) {
    creditsToAdd = getCreditsFromAmount(linkAmount);
    console.log(`Determined ${creditsToAdd} credits from amount ${linkAmount}`);
  }
  
  // If still no credits, use value from order record
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
    return { 
      success: false, 
      error: updateError, 
      message: 'Failed to update order status'
    };
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
      return {
        success: false,
        error: directUpdateError,
        message: 'Failed to update user credits'
      };
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
      return {
        success: false,
        error: finalUpdateError,
        message: 'Final credit update attempt failed'
      };
    } else {
      console.log(`Final credit update successful. Set credits to ${expectedCredits}`);
    }
  } else {
    console.log(`Successfully added ${finalCreditsToAdd} credits to user ${orderData.user_id}`);
  }

  return {
    success: true,
    userId: orderData.user_id,
    creditsAdded: finalCreditsToAdd,
    creditsBeforeUpdate: beforeUpdate?.credit || 0,
    creditsAfterUpdate: afterUpdate?.credit || 0
  };
}

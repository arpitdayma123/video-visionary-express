
// Logic for forwarding webhook data to external system
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "./utils.ts";

// External webhook URL to forward data to
const EXTERNAL_WEBHOOK_URL = "https://primary-production-ce25.up.railway.app/webhook/payment";

// Create Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;
const supabase = createClient(supabaseUrl, supabaseKey);

// Forward webhook data to external endpoint
export async function forwardWebhookData(payload: any, userId: string | null = null) {
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

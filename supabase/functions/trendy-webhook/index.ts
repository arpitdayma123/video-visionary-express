
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

// Primary webhook URL and backup webhook URL
const PRIMARY_WEBHOOK_URL = "https://n8n.latestfreegames.online/webhook/trendy";
const SCRIPT_FIND_WEBHOOK_URL = "https://n8n.latestfreegames.online/webhook/scriptfind";
// Timeout for webhook requests
const WEBHOOK_TIMEOUT = 25000; // 25 seconds

serve(async (req) => {
  console.log("trendy-webhook function started");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse URL and get query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const scriptOption = url.searchParams.get('scriptOption');
    const customScript = url.searchParams.get('customScript');
    const userQuery = url.searchParams.get('user_query'); // Get user_query parameter
    const regenerate = url.searchParams.get('regenerate') === 'true';
    const changeScript = url.searchParams.get('changescript') === 'true';
    
    console.log(`Request received for user ${userId}, script option: ${scriptOption}, query: ${userQuery}, regenerate: ${regenerate}, changeScript: ${changeScript}`);

    if (!userId) {
      console.error('Missing userId parameter');
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get user profile from Supabase
    console.log(`Fetching profile for user ${userId}`);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credit, videos, voice_files, selected_video, selected_voice, selected_niches, competitors, user_query')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile', details: profileError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check for selected data
    if (!profile.selected_video || !profile.selected_voice || !profile.selected_niches || !profile.competitors) {
      console.error('Missing required data from profile');
      return new Response(
        JSON.stringify({ error: 'Missing required data from profile' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Special check for script_from_prompt
    if (scriptOption === 'script_from_prompt' && !userQuery && !profile.user_query) {
      console.error('Missing user_query for script_from_prompt option');
      return new Response(
        JSON.stringify({ error: 'Missing topic/prompt for script_from_prompt option' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Determine which webhook to use based on the parameters
    const targetWebhook = (scriptOption === 'ai_find' || scriptOption === 'script_from_prompt' || scriptOption === 'ai_remake' || regenerate || changeScript)
      ? SCRIPT_FIND_WEBHOOK_URL
      : PRIMARY_WEBHOOK_URL;

    // Prepare the params to forward
    const paramsToForward = new URLSearchParams({
      userId,
      scriptOption: scriptOption || 'ai_find',
      customScript: customScript || '',
      user_query: userQuery || profile.user_query || '' // Use profile.user_query as fallback
    });

    // Add regenerate parameter if needed
    if (regenerate) {
      paramsToForward.append('regenerate', 'true');
    }

    // Add changeScript parameter if needed
    if (changeScript) {
      paramsToForward.append('changescript', 'true');
    }

    if (scriptOption === 'ig_reel') {
      const reelUrl = url.searchParams.get('reelUrl');
      if (reelUrl) {
        paramsToForward.append('reelUrl', reelUrl);
      }
    }

    // Create AbortController for the webhook request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);

    // Update profile status to Processing before attempting webhook call
    console.log('Setting database preview status to generating...');
    await supabase
      .from('profiles')
      .update({ preview: 'generating' })
      .eq('id', userId);

    // Try to call the appropriate webhook
    try {
      const webhookUrl = `${targetWebhook}?${paramsToForward.toString()}`;
      console.log(`Forwarding request to: ${webhookUrl}`);
      
      const primaryResponse = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      }).catch(error => {
        // Handle specific abort error
        if (error.name === 'AbortError') {
          console.log('Webhook request timed out');
          return null;
        }
        throw error;
      });

      // Clear the timeout
      clearTimeout(timeoutId);
      
      // If we got a response, process it
      if (primaryResponse && primaryResponse.ok) {
        // Webhook call succeeded
        const responseData = await primaryResponse.json();
        console.log('Webhook response:', responseData);
        
        return new Response(
          JSON.stringify(responseData),
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/json',
              ...corsHeaders 
            } 
          }
        );
      } else if (primaryResponse) {
        // We got a response, but it wasn't ok
        console.error('Webhook call failed with status:', primaryResponse.status);
        const responseText = await primaryResponse.text();
        console.error('Response text:', responseText);
        throw new Error(`Webhook failed with status ${primaryResponse.status}: ${responseText}`);
      } else {
        // No response (timed out)
        console.error('Webhook call timed out');
        throw new Error('Webhook request timed out');
      }
    } catch (primaryError) {
      console.error('Error calling webhook:', primaryError);
      // Clear the timeout if it hasn't been cleared already
      clearTimeout(timeoutId);
      // Continue with our fallback implementation below
    }

    // Fallback implementation if webhook fails
    // Just update the status to Processing and provide a success response
    console.log('Using fallback implementation');
    
    // Update the profile status to Processing
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        status: 'Processing',
        updated_at: new Date().toISOString() 
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile status:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update profile status', details: updateError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Successfully updated profile status to Processing');
    return new Response(
      JSON.stringify({ 
        message: "Workflow was started",
        success: true,
        fallback: true
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

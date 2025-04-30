
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

// Primary webhook URL - updated to use the specified URL
const PRIMARY_WEBHOOK_URL = "https://n8n.latestfreegames.online/webhook/trendy";

serve(async (req) => {
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
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get user profile from Supabase
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

    // Update profile status immediately to show processing
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        preview: 'generating',
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

    // Prepare the params to forward - use profile.user_query as fallback if userQuery is not provided
    const paramsToForward = new URLSearchParams({
      userId,
      scriptOption: scriptOption || 'ai_find',
      customScript: customScript || '',
      user_query: userQuery || profile.user_query || '' // Use profile.user_query as fallback
    });

    // Add regenerate and changeScript parameters if present
    if (regenerate) {
      paramsToForward.append('regenerate', 'true');
    }
    
    if (changeScript) {
      paramsToForward.append('changescript', 'true');
    }

    if (scriptOption === 'ig_reel') {
      const reelUrl = url.searchParams.get('reelUrl');
      if (reelUrl) {
        paramsToForward.append('reelUrl', reelUrl);
      }
    }

    // Return an immediate success response to prevent timeout
    // The actual processing will continue in the background
    EdgeRuntime.waitUntil(callPrimaryWebhook(paramsToForward, userId));

    return new Response(
      JSON.stringify({ 
        message: "Script generation started",
        success: true,
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
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

// Function to call primary webhook in the background
async function callPrimaryWebhook(params: URLSearchParams, userId: string) {
  try {
    console.log(`Forwarding request to primary endpoint: ${PRIMARY_WEBHOOK_URL}?${params.toString()}`);
    
    const controller = new AbortController();
    // Set a long timeout for the webhook call (5 minutes)
    const timeoutId = setTimeout(() => controller.abort(), 300000);
    
    const primaryResponse = await fetch(`${PRIMARY_WEBHOOK_URL}?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (primaryResponse.ok) {
      // Primary webhook call succeeded
      const responseData = await primaryResponse.json();
      console.log('Primary webhook response:', responseData);
      return responseData;
    } else {
      // If primary fails, fall back to just updating status
      console.error('Primary webhook call failed:', primaryResponse.status);
      throw new Error(`Primary webhook failed with status ${primaryResponse.status}`);
    }
  } catch (error) {
    console.error('Error calling primary webhook:', error);
    
    // If webhook call fails completely, update the profile status
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          preview: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('Error updating profile status after webhook failure:', updateError);
      }
    } catch (innerError) {
      console.error('Error updating profile after webhook failure:', innerError);
    }
  }
}

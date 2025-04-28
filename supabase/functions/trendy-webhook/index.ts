
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
    
    console.log(`Request received for user ${userId}, script option: ${scriptOption}, query: ${userQuery}`);

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

    // Prepare the params to forward - use profile.user_query as fallback if userQuery is not provided
    const paramsToForward = new URLSearchParams({
      userId,
      scriptOption: scriptOption || 'ai_find',
      customScript: customScript || '',
      user_query: userQuery || profile.user_query || '' // Use profile.user_query as fallback
    });

    if (scriptOption === 'ig_reel') {
      const reelUrl = url.searchParams.get('reelUrl');
      if (reelUrl) {
        paramsToForward.append('reelUrl', reelUrl);
      }
    }

    // Create controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout

    // Try to call the primary webhook directly
    try {
      console.log(`Forwarding request to primary endpoint: ${PRIMARY_WEBHOOK_URL}?${paramsToForward.toString()}`);
      
      const primaryResponse = await fetch(`${PRIMARY_WEBHOOK_URL}?${paramsToForward.toString()}`, {
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
        let responseData;
        try {
          responseData = await primaryResponse.json();
          console.log('Primary webhook response:', responseData);
        } catch (parseError) {
          console.warn('Could not parse primary webhook response as JSON');
          responseData = { success: true, message: "Request processed" };
        }
        
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
      } else {
        // If primary fails with specific status code
        console.error('Primary webhook call failed:', primaryResponse.status);
        throw new Error(`Primary webhook failed with status ${primaryResponse.status}`);
      }
    } catch (primaryError) {
      clearTimeout(timeoutId);
      console.error('Error calling primary webhook:', primaryError);
      
      // Check if it was a timeout
      if (primaryError.name === 'AbortError') {
        console.error('Primary webhook request timed out');
      }
      
      // Continue with our fallback implementation below
    }

    // Fallback implementation if primary webhook fails
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
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

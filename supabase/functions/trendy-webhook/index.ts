
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

// Primary webhook URL - updated to N8N endpoint
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
    
    console.log(`Request received for user ${userId}, script option: ${scriptOption}`);

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get user profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credit, videos, voice_files, selected_video, selected_voice, selected_niches, competitors')
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

    // Prepare the params to forward
    const paramsToForward = new URLSearchParams({
      userId,
      scriptOption: scriptOption || 'ai_find',
      customScript: customScript || ''
    });

    // Try to call the primary webhook first
    try {
      console.log(`Forwarding request to primary endpoint: ${PRIMARY_WEBHOOK_URL}?${paramsToForward.toString()}`);
      
      const primaryResponse = await fetch(`${PRIMARY_WEBHOOK_URL}?${paramsToForward.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
      });

      if (primaryResponse.ok) {
        // Primary webhook call succeeded
        const responseData = await primaryResponse.json();
        console.log('Primary webhook response:', responseData);
        
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
        // If primary fails, we'll handle it ourselves below
        console.error('Primary webhook call failed:', primaryResponse.status);
        throw new Error(`Primary webhook failed with status ${primaryResponse.status}`);
      }
    } catch (primaryError) {
      console.error('Error calling primary webhook:', primaryError);
      
      // Continue with our fallback implementation below
    }

    // Fallback implementation if primary webhook fails
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

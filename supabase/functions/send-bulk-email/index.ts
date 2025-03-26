
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BulkEmailRequest {
  subject: string;
  html: string;
  from?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { subject, html, from }: BulkEmailRequest = await req.json();

    if (!subject || !html) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.0");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all user emails
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("email")
      .not("email", "is", null);

    if (profilesError) {
      console.error("Error fetching user emails:", profilesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user emails" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Extract email addresses
    const emails = profiles
      .filter((profile) => profile.email)
      .map((profile) => profile.email as string);

    if (emails.length === 0) {
      return new Response(
        JSON.stringify({ message: "No valid email addresses found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending email to ${emails.length} recipients with subject: ${subject}`);

    // Process emails in batches of 50 to avoid rate limits
    const batchSize = 50;
    const results = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} emails`);
      
      try {
        // Send email to this batch
        const emailResponse = await resend.emails.send({
          from: from || "Zockto <no-reply@zockto.com>",
          bcc: batch, // Use BCC for bulk sending to hide recipient emails from each other
          subject,
          html,
        });
        
        results.push(emailResponse);
        console.log(`Batch ${i / batchSize + 1} sent successfully`);
        
        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (batchError) {
        console.error(`Error sending batch ${i / batchSize + 1}:`, batchError);
        results.push({ error: batchError.message });
      }
    }

    console.log("All batches processed");

    return new Response(JSON.stringify({ 
      message: `Sent email to ${emails.length} recipients`,
      results 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-bulk-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define CORS headers to allow cross-origin requests.
// This is essential for frontend applications hosted on different domains to interact with this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allows requests from any origin.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Specifies which headers are allowed.
};

// Deno.serve listens for incoming HTTP requests.
Deno.serve(async (req) => {
  // Handle OPTIONS requests (preflight requests for CORS).
  // If it's an OPTIONS request, respond with 'ok' and the CORS headers.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize the Supabase client with admin privileges.
    // This client uses the service role key, allowing it to bypass Row Level Security (RLS).
    const supabaseAdmin = createClient(
      Deno.env.get('EXPO_PUBLIC_SUPABASE_URL') ?? '', // Supabase project URL from environment variables.
      Deno.env.get('EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY') ?? '' // Supabase service role key from environment variables.
    );

    // Retrieve the authenticated user's information from the request's authorization header.
    // This implicitly validates the JWT provided by the client.
    const {
      data: { user },
    } = await supabaseAdmin.auth.getUser();

    // If no user is found (e.g., invalid or missing token), return an unauthorized response.
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Attempt to delete the user's account using the admin client.
    // This action requires the service role key as it modifies user data directly in Auth.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    // If there's an error during user deletion, throw it to be caught by the catch block.
    if (error) {
      throw error;
    }

    // If deletion is successful, return a success response.
    return new Response(JSON.stringify({ message: 'Account deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Combine CORS headers with Content-Type.
      status: 200, // HTTP 200 OK status.
    });
  } catch (error: any) {
    // Catch any errors that occur during the process.
    // Return an error response with the error message.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Combine CORS headers with Content-Type.
      status: 400, // HTTP 400 Bad Request status for client-side errors or general failures.
    });
  }
});

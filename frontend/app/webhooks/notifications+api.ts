import crypto from 'crypto';
import { Database } from "@/types/database"
import { sendPushNotification } from "@/lib/notifications"
import { createClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServerSide = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    flowType: 'implicit', // Add this
    storage: undefined, // Explicitly set storage to undefined
  },
  global: {
    headers: {
      // Explicitly set the Authorization header to ensure service role is used
      'Authorization': `Bearer ${supabaseServiceRoleKey}`,
      'User-Agent': 'webhook-server/1.0.0'
    }
  }
});


// Types for Supabase webhook payload
interface SupabaseWebhookPayload {
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    schema: string;
    record?: Database['public']['Tables']['entries']['Row'];
    old_record?: any;
    columns?: Array<{
      name: string;
      type: string;
    }>;
}

// Webhook signature verification
function verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace('sha256=', '');
  
  // Create HMAC hash
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cleanSignature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

export async function POST(request: Request) {
    try {
        const payload = await request.json();
    
        // Parse the JSON payload
        const webhookData: SupabaseWebhookPayload = payload;

        if (!webhookData.record) {
          return Response.json({
            error: "Webhook did not receive recor from Supabase",
            data: null
          }, { status: 400 });
        }

        
        const recipients = webhookData.record.shared_with ?? [];

        if (recipients.length < 1) {
          return Response.json({ data: null, message: "No recipeients for this notification" });
        }

        //TODO: Cache this user
        const { data: profile } = await supabaseServerSide.from(TABLES.PROFILES)
          .select('username')
          .eq('id', webhookData.record?.user_id ?? "")
          .single() as { data: { username: string } };

        //TODO: Add batching for sending notfiications
        await Promise.all(recipients.map(async (recipient) => {
          //TODO: Add Exponential Backoff
          await sendPushNotification(supabaseServerSide, {
            user_id: recipient,
            title: "New Entry Log",
            body: `${profile.username} has shared something with you`,
            data: {
              page: '/vault'
            }
          })
        }))

        return Response.json({ data: null, message: "Notifications sent successfully" });
    } catch (error: any) {
        console.log("Error:", error);
    }
}
  
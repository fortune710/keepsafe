import { SupabaseNotification } from "@/types/notifications";
import { SupabaseClient } from "@supabase/supabase-js";
import axios from  'axios';

export const sendPushNotification = async (
    supabase: SupabaseClient,
    notification: SupabaseNotification
  ): Promise<{ success: boolean; ticketId?: string; error?: string }> => {
    try {
      // Get user's push tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('push_tokens')
        .select('token, platform')
        .eq('user_id', notification.user_id);
  
      if (tokenError || !tokens || tokens.length === 0) {
        return { success: false, error: 'No push tokens found for user' };
      }
  
      // Prepare Expo push message
      const messages = tokens.map(tokenData => ({
        to: tokenData.token,
        sound: notification.sound || 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge,
        categoryId: notification.categoryId,
        priority: notification.priority || 'high',
      }));
  
      // Send to Expo Push API
      const response = await axios.post('https://exp.host/--/api/v2/push/send', messages, {
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });
  
      const result = response.data;
      console.log({ result: result.data[0] });
      return { success: true };
    } catch (error) {
      console.error('Error sending push notification:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};
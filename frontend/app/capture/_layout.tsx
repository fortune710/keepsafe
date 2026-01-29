import { Stack } from 'expo-router';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useEffect } from 'react';
import { PushNotificationService } from "@/services/push-notification-service"
import { useAuthContext } from '@/providers/auth-provider';


export default function CaptureLayout() {
  // Initialize push notifications
  const { profile } = useAuthContext();
  const { expoPushToken, error } = usePushNotifications(profile?.id);

  
  useEffect(() => {
    if (expoPushToken && profile?.id) {
      console.log('Push token registered:', expoPushToken);
      // Here you would typically send the token to your backend
      PushNotificationService.savePushToken(expoPushToken, profile?.id ?? "");
    }
    if (error) {
      console.warn('Push notification error:', error);
    }
  }, [expoPushToken, error, profile?.id]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="details" />
    </Stack>
  );
}
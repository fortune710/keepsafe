import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useDeepLinking } from '@/hooks/use-deep-linking';

export default function RootLayout() {
  useFrameworkReady();
  
  // Initialize deep linking
  useDeepLinking();
  
  // Initialize push notifications
  const { expoPushToken, error } = usePushNotifications();
  
  useEffect(() => {
    if (expoPushToken) {
      console.log('Push token registered:', expoPushToken);
      // Here you would typically send the token to your backend
    }
    if (error) {
      console.warn('Push notification error:', error);
    }
  }, [expoPushToken, error]);

  return (
    <QueryProvider>
      <AuthProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="index" />
            <Stack.Screen name="capture" />
            <Stack.Screen name="invite/[id]" />
            <Stack.Screen name="vault" />
            <Stack.Screen name="calendar" />
            <Stack.Screen name="calendar/day" />
            <Stack.Screen name="social" />
            <Stack.Screen name="friends" />
            <Stack.Screen name="dreamscape" />
            <Stack.Screen name="capture/details" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="dark" />
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryProvider>
  );
}
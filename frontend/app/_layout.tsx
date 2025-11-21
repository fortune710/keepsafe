import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';

import { useDeepLinking } from '@/hooks/use-deep-linking';
import { Host } from 'react-native-portalize';
import { useEffect } from 'react';
import { initializeBackgroundTasks } from '@/lib/background-task-init';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  useFrameworkReady();
  
  // Initialize deep linking
  useDeepLinking();

  // Initialize background tasks
  useEffect(() => {
    initializeBackgroundTasks();
  }, []);

  return (
    <Host>
      <SafeAreaProvider>
        <QueryProvider>
          <AuthProvider>
            <ToastProvider>
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
                  <Stack.Screen name="search" />
                  <Stack.Screen name="capture/details" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="dark" />
              </GestureHandlerRootView>
            </ToastProvider>
          </AuthProvider>
        </QueryProvider>
      </SafeAreaProvider>
    </Host>
  );
}
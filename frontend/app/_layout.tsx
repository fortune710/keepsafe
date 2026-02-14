import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { ToastProvider } from '@/providers/toast-provider';
import { SaveLockProvider } from '@/providers/save-lock-provider';
import { ErrorBoundary } from '@/components/error-boundary';

import { useDeepLinking } from '@/hooks/use-deep-linking';
import { Host } from 'react-native-portalize';
import { useEffect } from 'react';
import { initializeBackgroundTasks } from '@/lib/background-task-init';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from '@/hooks/useFonts';
import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  // Initialize deep linking
  useDeepLinking();

  // Initialize background tasks
  useEffect(() => {
    initializeBackgroundTasks();
  }, []);

  // Load fonts
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  return (
    <ErrorBoundary>
      <Host>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <SaveLockProvider>
                  <GestureHandlerRootView style={{ flex: 1 }}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen
                        name="onboarding"
                        options={{
                          animation: 'fade',
                          animationDuration: 500
                        }}
                      />
                      <Stack.Screen name="index" />
                      <Stack.Screen name="capture" />
                      <Stack.Screen name="invite/[id]" />
                      <Stack.Screen
                        options={{
                          animationDuration: 350,
                          animation: 'fade_from_bottom'
                        }}
                        name="vault"
                      />
                      <Stack.Screen
                        options={{
                          animationDuration: 350,
                          animation: platform === 'ios' ? 'ios_from_left' : 'default'
                        }}
                        name="calendar"
                      />
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
                </SaveLockProvider>
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </Host>
    </ErrorBoundary>
  );
}
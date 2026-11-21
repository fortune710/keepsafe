import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
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
import { CaptureProvider } from '@/providers/capture-provider';
import { posthog } from '@/constants/posthog';
import { useNotificationNavigation } from '@/hooks/use-notification-navigation';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  // Initialize deep linking
  useDeepLinking();
  useNotificationNavigation();

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

  useEffect(() => {
    posthog.screen(pathname, params);
  }, [params, pathname]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <Host>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <SaveLockProvider>
                  <CaptureProvider>
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
                        <Stack.Screen name="(tabs)" />
                        <Stack.Screen name="invite/[id]" />
                        <Stack.Screen name="social" />
                        <Stack.Screen name="dreamscape" />
                        <Stack.Screen name="search" />
                        <Stack.Screen
                          name="report-entry"
                          options={{
                            animationDuration: 350,
                            animation: "fade_from_bottom"
                          }}
                        />
                        <Stack.Screen name="+not-found" />
                      </Stack>
                      <StatusBar style="dark" />
                    </GestureHandlerRootView>
                  </CaptureProvider>
                </SaveLockProvider>
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </Host>
    </ErrorBoundary>
  );
}

import { ReplayScreenShield } from '@/components/replay-screen-shield';
import { isReplaySafeNavigatorScreen } from '@/lib/analytics/replay';
import { Stack, usePathname } from 'expo-router';
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
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { ScreenTracker } from '@/lib/analytics/screen-tracker';
import { screenName } from '@/lib/analytics/privacy';
import { isReplaySafeScreen } from '@/lib/analytics/replay';
import { replayController, replayEnabled } from '@/lib/analytics/replay-client';
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
  const currentScreen = screenName(pathname);
  const tracker = useRef<ScreenTracker | null>(null);
  if (!tracker.current) {
    tracker.current = new ScreenTracker((event, properties) => {
      if (event === '$screen') {
        posthog.screen(properties.screen_name as string, { pickup_id: properties.pickup_id });
      } else {
        posthog.capture(event, properties);
      }
    }, () => Crypto.randomUUID());
  }

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

  useLayoutEffect(() => {
    if (!fontsLoaded && !fontError) return;
    tracker.current?.setScreen(currentScreen);
    void replayController.setScreen(currentScreen, AppState.currentState === 'active');
  }, [currentScreen, fontsLoaded, fontError]);

  useEffect(() => {
    if (!fontsLoaded && !fontError) return;
    const current = tracker.current;
    if (AppState.currentState === 'active') current?.foreground();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') current?.foreground();
      if (state === 'background') current?.background();
      if (state === 'active' || state === 'background') {
        void replayController.setScreen(currentScreen, state === 'active');
      }
    });
    return () => subscription.remove();
  }, [currentScreen, fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ErrorBoundary>
      <View
        collapsable={false}
        accessibilityLabel={replayEnabled && !isReplaySafeScreen(currentScreen) ? 'ph-no-capture' : undefined}
        importantForAccessibility="no"
        style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { tracker.current?.interact(); return false; }}>
      <Host>
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider>
              <ToastProvider>
                <SaveLockProvider>
                  <CaptureProvider>
                    <GestureHandlerRootView style={{ flex: 1 }}>
                      <Stack screenOptions={{ headerShown: false }} screenLayout={({ route, children }) => (
                        <ReplayScreenShield allow={isReplaySafeNavigatorScreen('root', route.name)}>{children}</ReplayScreenShield>
                      )}>
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
      </View>
    </ErrorBoundary>
  );
}

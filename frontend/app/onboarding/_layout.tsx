import { ReplayScreenShield } from '@/components/replay-screen-shield';
import { isReplaySafeNavigatorScreen } from '@/lib/analytics/replay';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OnboardingLayout() {
  const platform = Platform.OS;
  return (
    <Stack screenOptions={{ headerShown: false }} screenLayout={({ route, children }) => (
      <ReplayScreenShield allow={isReplaySafeNavigatorScreen('onboarding', route.name)}>{children}</ReplayScreenShield>
    )}>
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="value-props" />
      <Stack.Screen name="auth" options={{ animation: 'fade' }} />
      <Stack.Screen name="invite" />
      <Stack.Screen
        name="forgot-password"
        options={{
          animation: 'fade_from_bottom',
        }}
      />
      <Stack.Screen
        name="forgot-password-success"
        options={{
          animation: platform === 'ios' ? 'ios_from_right' : 'slide_from_left',
        }}
      />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}

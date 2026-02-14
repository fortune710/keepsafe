import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function OnboardingLayout() {
  const platform = Platform.OS;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="value-props" />
      <Stack.Screen name="auth" />
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
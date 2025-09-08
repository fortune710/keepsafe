import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="value-props" />
      <Stack.Screen name="auth" />
      <Stack.Screen name="invite" />
    </Stack>
  );
}
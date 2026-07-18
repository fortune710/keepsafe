import { Stack } from 'expo-router';

export default function CalendarLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'ios_from_left' }}>
      <Stack.Screen
        name="index"
      />
      <Stack.Screen name="day" />
    </Stack>
  );
}
import { Stack } from 'expo-router';

export default function ReminderLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[reminderId]" />
      <Stack.Screen name="add" />
    </Stack>
  );
}

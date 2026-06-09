import { Stack } from 'expo-router';

export default function ServiceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="create" />
      <Stack.Screen name="my-listings" />
      <Stack.Screen name="[id]/edit" />
      <Stack.Screen name="[id]/manage" />
    </Stack>
  );
}

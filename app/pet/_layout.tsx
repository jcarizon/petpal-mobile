import { Stack } from 'expo-router';

export default function PetLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]/record" />
      <Stack.Screen name="[id]/diary" />
      <Stack.Screen name="[id]/reminder" />
    </Stack>
  );
}

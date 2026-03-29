import { Stack } from 'expo-router';

export default function PetLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
      <Stack.Screen name="add" />
      <Stack.Screen name="[id]/record/add" />
    </Stack>
  );
}

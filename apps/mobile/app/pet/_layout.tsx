import { Stack } from 'expo-router';

export default function PetLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Pet Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="add" options={{ title: 'Add Pet', headerBackTitle: 'Back' }} />
      <Stack.Screen name="[id]/record/add" options={{ title: 'Add Health Record', headerBackTitle: 'Back' }} />
    </Stack>
  );
}

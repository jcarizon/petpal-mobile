import { Stack } from 'expo-router';

export default function AlertLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Alert Details', headerBackTitle: 'Back' }} />
      <Stack.Screen name="create" options={{ title: 'Create Alert', headerBackTitle: 'Back' }} />
    </Stack>
  );
}

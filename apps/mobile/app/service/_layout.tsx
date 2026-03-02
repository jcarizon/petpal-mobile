import { Stack } from 'expo-router';

export default function ServiceLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Service Details', headerBackTitle: 'Back' }} />
    </Stack>
  );
}

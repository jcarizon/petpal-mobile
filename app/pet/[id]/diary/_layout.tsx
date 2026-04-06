import { Stack } from 'expo-router';

export default function DiaryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="add" />
      <Stack.Screen name="[diaryId]" />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="users/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

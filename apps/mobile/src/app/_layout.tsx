import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { color } from '@teddysteps/ui';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }} />
    </>
  );
}

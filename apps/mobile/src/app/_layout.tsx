import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { color, useTeddyFonts } from '@teddysteps/ui';

export default function RootLayout() {
  const fontsReady = useTeddyFonts();
  if (!fontsReady) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }} />
    </>
  );
}

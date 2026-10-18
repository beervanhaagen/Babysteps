import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { color, useTeddyFonts } from '@teddysteps/ui';
import { AuthProvider, useAuth } from '@/lib/auth';

export default function RootLayout() {
  const fontsReady = useTeddyFonts();
  if (!fontsReady) return null;
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Routes />
    </AuthProvider>
  );
}

// Each group of screens is only reachable in its own state; anything else falls back to
// index, which sends the parent to the right place.
function Routes() {
  const { status } = useAuth().state;
  // Wait until we know who this is, so a link into the app isn't bounced while loading.
  if (status === 'loading') return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.paper } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={status === 'signed-out'}>
        <Stack.Screen name="start" />
        <Stack.Screen name="welkom" />
        <Stack.Screen name="account" />
        <Stack.Screen name="inloggen" />
        <Stack.Screen name="code" />
        <Stack.Screen name="uitgenodigd" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'onboarding'}>
        <Stack.Screen name="kleintje" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        <Stack.Screen name="pad" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'offline'}>
        <Stack.Screen name="opnieuw" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="galerij" />
      </Stack.Protected>
    </Stack>
  );
}

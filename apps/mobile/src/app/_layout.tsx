import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { color, useTeddyFonts } from '@teddysteps/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { startQueue } from '@/lib/queue';

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
  const { state } = useAuth();
  const { status } = state;
  // Uploads only run for a parent with a trail, in that parent's own queue.
  const userId = state.status === 'ready' ? state.session.user.id : null;
  const trailId = state.status === 'ready' ? state.trail.id : null;
  useEffect(() => (userId && trailId ? startQueue(userId, trailId) : undefined), [userId, trailId]);
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
        <Stack.Screen name="toevoegen" options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="fotos" />
        <Stack.Screen name="details" />
        <Stack.Screen name="vastgepind" options={{ gestureEnabled: false }} />
        <Stack.Screen name="moment/[id]" />
        <Stack.Screen name="geboren" />
        <Stack.Screen name="boek" options={{ animation: 'none' }} />
        <Stack.Screen name="familie" options={{ animation: 'none' }} />
        <Stack.Screen name="ik" options={{ animation: 'none' }} />
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

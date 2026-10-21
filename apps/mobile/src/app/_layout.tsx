import { todayInAmsterdam } from '@teddysteps/core';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { color, useTeddyFonts } from '@teddysteps/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { askQuietly, listenForTaps, registerDevice } from '@/lib/push';
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
  // Pushes: quiet permission on iPhone, this device stays registered for this parent, and a tap
  // opens Knuffels or the screen a seintje is about.
  useEffect(() => {
    if (!userId) return undefined;
    askQuietly()
      .then(registerDevice)
      .catch(() => undefined);
    // Coming back from the background also counts as opening the app (for the seintjes),
    // once per day is enough.
    let seenOn = todayInAmsterdam();
    const back = AppState.addEventListener('change', (next) => {
      if (next !== 'active' || seenOn === todayInAmsterdam()) return;
      seenOn = todayInAmsterdam();
      registerDevice().catch(() => undefined);
    });
    const stopTaps = listenForTaps();
    return () => {
      back.remove();
      stopTaps();
    };
  }, [userId]);
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
        <Stack.Screen name="eerste-keer" />
        <Stack.Screen name="vastgepind" options={{ gestureEnabled: false }} />
        <Stack.Screen name="moment/[id]" />
        <Stack.Screen name="weekweergave/[week]" />
        <Stack.Screen name="opties/[id]" />
        <Stack.Screen name="bewerken/[id]" />
        <Stack.Screen name="week/[id]" />
        <Stack.Screen name="verwijderd" />
        <Stack.Screen name="meldingen" />
        <Stack.Screen name="geboren" />
        <Stack.Screen name="uitnodigen" />
        <Stack.Screen name="inhalen" options={{ gestureEnabled: false }} />
        <Stack.Screen name="iemand" />
        <Stack.Screen name="uitnodiging/[id]" />
        <Stack.Screen name="kring/[id]" />
        <Stack.Screen name="activiteit" options={{ animation: 'none' }} />
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

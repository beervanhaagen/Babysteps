import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// One push a day at most, sent by the function `push` straight to APNs/FCM (docs/bouwplan.md):
// hugs from family, or a seintje back to the trail. The app asks permission, registers its own
// device token (not an Expo push token) and opens the right screen when a push is tapped.
// On iPhone it asks quietly ("provisional") right away, so seintjes reach parents who haven't
// pinned yet; they land silently in the notification list. The real question follows on A4.

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Android shows no permission question until a channel exists. Seintjes have their own channel,
// so a parent can mute them in the phone's settings and keep the hugs.
async function channel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('knuffels', { name: 'Knuffels', importance: AndroidImportance.DEFAULT });
    await Notifications.setNotificationChannelAsync('seintjes', { name: 'Seintjes', importance: AndroidImportance.LOW });
  }
}

const provisional = (p: Notifications.NotificationPermissionsStatus) => p.ios?.status === IosAuthorizationStatus.PROVISIONAL;

// The registered token, so signing out works offline and never waits for Apple or Google.
const STORED = 'push-token';

async function deviceToken(): Promise<string | null> {
  try {
    return (await Notifications.getDevicePushTokenAsync()).data as string;
  } catch {
    // Simulator without push, Expo Go, or no connection: try again at the next start.
    return null;
  }
}

/** On every start, when allowed: (re)registers this device for the signed-in parent. */
export async function registerDevice() {
  if (Platform.OS === 'web') return;
  const permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted' && !provisional(permission)) return;
  await channel();
  const token = await deviceToken();
  if (!token) return;
  // Development builds talk to Apple's sandbox server; the app's own profile says which it is.
  const sandbox = Platform.OS === 'ios' && (await Application.getIosPushNotificationServiceEnvironmentAsync()) === 'development';
  await supabase.rpc('register_push_token', { platform: Platform.OS, token, sandbox });
  await SecureStore.setItemAsync(STORED, token);
}

/** iPhone, on every start until decided: quiet notifications without a question (owner, 21 October 2026). */
export async function askQuietly(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined') return;
  await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true, allowProvisional: true } });
}

/** Right after a pinned moment (A4): the system question, once. iOS never asks a second time. */
export async function askOnce(): Promise<void> {
  if (Platform.OS === 'web') return;
  await channel();
  if (!(await willAsk())) return;
  const answer = await Notifications.requestPermissionsAsync();
  if (answer.status === 'granted') await registerDevice();
  // Said no after quiet notifications: stop sending to this device.
  else if (answer.status === 'denied') await unregisterDevice();
}

/** Whether A4 should say what notifications are for, just before the question. */
export async function willAsk(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  // Quiet (provisional) on iPhone still gets the real question once.
  return (current.status === 'undetermined' || provisional(current)) && current.canAskAgain;
}

/** Before signing out: this device gets nothing more for this account. Gives up after 3 seconds. */
export async function unregisterDevice() {
  if (Platform.OS === 'web') return;
  const token = await SecureStore.getItemAsync(STORED);
  if (token) {
    const done = supabase.rpc('unregister_push_token', { token }).then(undefined, () => undefined);
    await Promise.race([done, new Promise((resolve) => setTimeout(resolve, 3000))]);
    await SecureStore.deleteItemAsync(STORED);
  }
  await Notifications.dismissAllNotificationsAsync();
}

// Where a tapped seintje lands: on the trail, with the one small thing it asked for on top.
const LANDING = { week: '/toevoegen', idee: '/toevoegen', start: '/toevoegen', kring: '/uitnodigen', inhalen: '/inhalen', terug: '/inhalen' } as const;

/** A tapped push (also one that opened the app): hugs open Knuffels, a seintje its screen over the trail. */
export function listenForTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const kind = response?.notification.request.content.data?.kind;
    if (typeof kind !== 'string') return;
    // Handled once: a later sign-in doesn't open an old push again.
    Notifications.clearLastNotificationResponse();
    if (kind === 'daily') return router.replace('/activiteit');
    router.replace('/pad');
    if (Object.prototype.hasOwnProperty.call(LANDING, kind)) router.push(LANDING[kind as keyof typeof LANDING]);
  };
  open(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}

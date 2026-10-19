import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Step 5 at its minimum: one push a day at most, sent by the function `push` straight to APNs/FCM
// (docs/bouwplan.md). The app only asks permission, registers its own device token (not an Expo
// push token) and opens the activity when a push is tapped.

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

// Android shows no permission question until a channel exists.
async function channel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('knuffels', { name: 'Knuffels', importance: AndroidImportance.DEFAULT });
  }
}

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
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;
  await channel();
  const token = await deviceToken();
  if (!token) return;
  // Development builds talk to Apple's sandbox server.
  await supabase.rpc('register_push_token', { platform: Platform.OS, token, sandbox: Platform.OS === 'ios' && __DEV__ });
}

/** Right after a pinned moment (A4): the system question, once. iOS never asks a second time. */
export async function askOnce(): Promise<void> {
  if (Platform.OS === 'web') return;
  await channel();
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== 'undetermined' || !current.canAskAgain) return;
  const answer = await Notifications.requestPermissionsAsync();
  if (answer.status === 'granted') await registerDevice();
}

/** Whether A4 should say what notifications are for, just before the question. */
export async function willAsk(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  return current.status === 'undetermined' && current.canAskAgain;
}

/** Before signing out: this device gets nothing more for this account. */
export async function unregisterDevice() {
  if (Platform.OS === 'web') return;
  const { status } = await Notifications.getPermissionsAsync();
  const token = status === 'granted' ? await deviceToken() : null;
  if (token) await supabase.rpc('unregister_push_token', { token }).then(undefined, () => undefined);
  await Notifications.dismissAllNotificationsAsync();
}

/** A tapped push (also one that opened the app) shows who sent hugs. */
export function listenForTaps(): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    if (response?.notification.request.content.data?.kind === 'daily') router.push('/activiteit');
  };
  open(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}

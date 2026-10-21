import { possessive } from '@teddysteps/core';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Callout, color, Sticker, Switch, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { askOnce } from '@/lib/push';
import { supabase } from '@/lib/supabase';

// M5 Meldingen (board Account-6, small for now; owner 21 October 2026): seintjes and hugs, each
// with its own switch, and the quiet hours as a fixed promise. No "Nieuws van TeddySteps" (not at
// launch) and no year book (backlog). Both switches are on by default; the system permission is
// the opt-in. What the seintjes do: supabase/migrations/20261023110000_nudges.sql.
type Settings = { notify_nudges: boolean; notify_reactions: boolean };

// Quiet (provisional) on iPhone counts as not on yet: the real question can still come.
const phoneState = (p: Notifications.NotificationPermissionsStatus) =>
  p.status === 'granted' && p.ios?.status !== IosAuthorizationStatus.PROVISIONAL ? 'on' : p.canAskAgain ? 'ask' : 'off';

const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export default function NotificationSettings() {
  const { state } = useAuth();
  const userId = state.status === 'ready' ? state.session.user.id : null;
  const [settings, setSettings] = useState<Settings>({ notify_nudges: true, notify_reactions: true });
  const [phone, setPhone] = useState<'on' | 'ask' | 'off'>('on');
  const [message, setMessage] = useState<string>();
  useAnnounce(message);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('notify_nudges, notify_reactions')
      .eq('id', userId)
      .single()
      .then(({ data }) => data && setSettings(data as Settings));
  }, [userId]);

  // Whether this phone lets us through, checked again when coming back from the phone's settings.
  useFocusEffect(
    useCallback(() => {
      Notifications.getPermissionsAsync().then((p) => setPhone(phoneState(p)));
    }, []),
  );

  if (state.status !== 'ready') return null;
  const name = state.trail.childName;
  const birth = state.trail.birthDate;
  // The last day of a trail week is the day before the weekday of the birth.
  const lastDay = birth ? WEEKDAYS[(new Date(`${birth}T12:00:00Z`).getUTCDay() + 6) % 7] : null;

  async function change(key: keyof Settings, value: boolean) {
    setMessage(undefined);
    setSettings((s) => ({ ...s, [key]: value }));
    const { error } = await supabase.from('profiles').update({ [key]: value }).eq('id', userId!);
    if (error) {
      setSettings((s) => ({ ...s, [key]: !value }));
      setMessage(friendlyError(error));
    }
  }

  async function turnOn() {
    if (phone === 'ask') {
      await askOnce();
      setPhone(phoneState(await Notifications.getPermissionsAsync()));
    } else {
      await Linking.openSettings();
    }
  }

  return (
    <Screen header={{ title: 'Meldingen', subtitle: 'Nooit meer dan één per dag', color: 'lilac', onBack: router.back, character: 'puddle' }}>
      {phone !== 'on' ? (
        <View style={styles.banner}>
          <Banner tone="sunshine" icon="bell" title="Meldingen staan uit op deze telefoon">
            {phone === 'ask' ? 'Zet ze aan, dan hoor je het als er een knuffel binnenkomt.' : 'Je zet ze aan in de instellingen van je telefoon.'}
          </Banner>
          <Button size="md" onPress={turnOn}>
            {phone === 'ask' ? 'Meldingen aanzetten' : 'Zet aan in Instellingen'}
          </Button>
        </View>
      ) : null}
      <View>
        <Switch
          label="Seintjes"
          hint={
            lastDay
              ? `Als ${possessive(name)} week nog leeg is, op ${lastDay} om 19.00 uur. In het begin soms een ideetje of tip.`
              : 'Als een week nog leeg is, om 19.00 uur. In het begin soms een ideetje of tip.'
          }
          value={settings.notify_nudges}
          onValueChange={(v) => change('notify_nudges', v)}
        />
        <Switch
          label="Knuffels en berichtjes"
          hint="Als familie op een moment reageert, om 19.00 uur in één bericht."
          value={settings.notify_reactions}
          onValueChange={(v) => change('notify_reactions', v)}
        />
      </View>
      {message ? (
        <Text role="alert" style={[text('meta'), { color: color.plum }]}>
          {message}
        </Text>
      ) : null}
      <Callout title="Stille uren" tone="butter" accessory={<Sticker>22.00 tot 07.00 uur</Sticker>}>
        Niets van ons terwijl jullie slapen.
      </Callout>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { gap: 10, alignItems: 'flex-start' },
});

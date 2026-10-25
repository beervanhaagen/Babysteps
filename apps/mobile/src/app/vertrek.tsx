import { longDutchDate, possessive, todayInAmsterdam } from '@teddysteps/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { signOut, useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { restoreDeletion } from '@/lib/leave';

// M7, the 30 days in between: after signing in, or for the other parent when the trail is going.
// "Toch bewaren" brings back the account and the trail (family links work again at once),
// "Alles downloaden" first if they like. Once the purge has started there is no way back.
export default function Leaving() {
  const { state, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // The moment the screen opened: is the date already past (wiped right away)?
  const [openedAt] = useState(() => Date.now());
  useAnnounce(error);
  if (state.status !== 'leaving') return null;
  const { deletion, trail } = state;
  const until = deletion.trailUntil ?? deletion.accountUntil;
  const soon = !until || new Date(until).getTime() <= openedAt;
  const day = until ? longDutchDate(todayInAmsterdam(new Date(until)), { weekday: false }) : '';
  const child = trail ? possessive(trail.childName) : null;
  const byOther = !!deletion.trailUntil && !deletion.byMe;

  const title = byOther ? `${child} pad wordt verwijderd` : deletion.trailUntil ? 'Je pad wordt verwijderd' : 'Je account wordt verwijderd';
  const body = soon
    ? 'Binnen een uur is alles gewist. Dit kunnen we helaas niet meer terugdraaien.'
    : byOther
      ? `${deletion.byName ?? 'De andere ouder'} liet ${child} pad verwijderen. Op ${day} is alles weg, ook voor jou. Familie kan nu al niets meer zien.`
      : deletion.trailUntil
        ? `Op ${day} wissen we ${child} pad en je account definitief. Familie kan nu al niets meer zien.`
        : `Op ${day} wissen we je account.${child ? ` ${child} pad blijft bij de andere ouder.` : ''}`;

  async function keep() {
    setBusy(true);
    setError(undefined);
    try {
      await restoreDeletion();
      await refresh();
      router.replace('/');
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  return (
    <Screen
      header={{ title, color: 'lilac', character: 'puddle' }}
      footer={
        <>
          {!soon ? (
            <Button block onPress={keep} busy={busy}>
              Toch bewaren
            </Button>
          ) : null}
          <TextLink onPress={() => signOut()}>Uitloggen</TextLink>
        </>
      }
    >
      <Text style={styles.body}>{body}</Text>
      {trail && !soon ? (
        <Button block variant="paper" icon="download" onPress={() => router.push('/downloaden')}>
          Eerst alles downloaden
        </Button>
      ) : null}
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  error: { ...text('meta'), color: color.plum },
});

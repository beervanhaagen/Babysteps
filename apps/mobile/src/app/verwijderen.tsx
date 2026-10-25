import { longDutchDate, possessive, todayInAmsterdam } from '@teddysteps/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button, Callout, ChoiceChip, ChoiceGroup, color, text, TextField, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { useCircle, useParents } from '@/lib/family';
import { requestDeletion, signOutEverywhere } from '@/lib/leave';
import { clearQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { forgetPhotos, useQueue } from '@/lib/trail';

// M7 "Pad en account verwijderen" (board Account-7; Apple requires deleting the account in the
// app). 30 days to change your mind, "Nu meteen definitief wissen" for whoever wants it gone now.
// With two parents: only my account (the trail stays with the other), or the trail and my account
// (the other parent gets a mail and may bring it back).
export default function Delete() {
  const { state } = useAuth();
  const { members } = useCircle();
  const { parents } = useParents();
  const [moments, setMoments] = useState<number | null>(null);
  // With two parents the gentler choice comes first: the trail is the other parent's too.
  const [scope, setScope] = useState<'account' | 'trail'>('account');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [until, setUntil] = useState<{ account: string; trail: string | null; soon: boolean }>();
  const { queue } = useQueue();
  const [error, setError] = useState<string>();
  useAnnounce(error ?? (until ? 'Het is geregeld.' : undefined));

  useEffect(() => {
    supabase
      .from('moments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready')
      .then(({ count, error: countError }) => !countError && setMoments(count ?? 0));
  }, []);
  if (state.status !== 'ready') return null;
  const name = state.trail.childName;
  const other = (parents ?? []).find((p) => !p.isMe);
  const otherName = other?.firstName ?? 'De andere ouder';
  const trailGoes = !other || scope === 'trail';
  const family = (members ?? []).filter((m) => m.joinedAt).length;
  const confirmed = typed.trim().toLocaleUpperCase('nl-NL') === name.toLocaleUpperCase('nl-NL');

  async function go(rightAway: boolean) {
    setBusy(true);
    setError(undefined);
    try {
      const answer = await requestDeletion(other ? scope : 'trail', rightAway);
      setUntil({ account: answer.accountUntil, trail: answer.trailUntil, soon: rightAway });
    } catch {
      setBusy(false);
      setError('Dat lukte even niet. Check je internet en probeer het opnieuw.');
    }
  }

  function now() {
    const message = !trailGoes
      ? 'Je account is dan binnen een uur weg. Dit kun je niet terugdraaien.'
      : other
        ? `Je account is dan binnen een uur weg. ${possessive(name)} pad blijft nog 30 dagen bestaan, zodat ${otherName} het kan bewaren.`
        : `${possessive(name)} pad en je account zijn dan binnen een uur weg. Dit kun je niet terugdraaien.`;
    Alert.alert('Nu meteen wissen?', message, [
      { text: 'Toch niet', style: 'cancel' },
      { text: 'Ja, nu wissen', style: 'destructive', onPress: () => void go(true) },
    ]);
  }

  async function leave() {
    const { data } = await supabase.auth.getSession();
    await clearQueue();
    if (data.session) await forgetPhotos(data.session.user.id);
    await signOutEverywhere();
  }

  if (until) {
    const day = (iso: string) => longDutchDate(todayInAmsterdam(new Date(iso)), { weekday: false });
    const line = !until.trail
      ? `${until.soon ? 'Binnen een uur' : `Op ${day(until.account)}`} wissen we je account. ${possessive(name)} pad blijft bij ${otherName}.`
      : until.soon && other
        ? `Binnen een uur wissen we je account. ${possessive(name)} pad blijft nog tot ${day(until.trail)} bestaan, zodat ${otherName} het kan bewaren.`
        : until.soon
          ? `Binnen een uur wissen we ${possessive(name)} pad en je account. Je krijgt daarna nog één mail.`
          : `Op ${day(until.trail)} wissen we ${possessive(name)} pad en je account definitief.`;
    return (
      <Screen header={{ title: 'Het is geregeld', color: 'lilac', character: 'puddle' }} footer={<Button block onPress={leave}>Uitloggen</Button>}>
        <Text style={styles.body}>
          {line}
          {until.soon ? '' : ' Bedenk je je? Log tot die tijd in en kies Toch bewaren.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen
      header={{ title: trailGoes ? `${possessive(name)} pad verwijderen?` : 'Je account verwijderen?', color: 'lilac', onBack: router.back, character: 'puddle' }}
      footer={
        <>
          <Button block variant="danger" icon="trash" onPress={() => go(false)} busy={busy} disabled={!confirmed}>
            {trailGoes ? 'Pad verwijderen' : 'Account verwijderen'}
          </Button>
          <TextLink onPress={() => router.back()}>Toch bewaren</TextLink>
        </>
      }
    >
      {other ? (
        <ChoiceGroup label="Wat wil je verwijderen?">
          <ChoiceChip selected={scope === 'account'} onPress={() => setScope('account')}>
            Alleen mijn account
          </ChoiceChip>
          <ChoiceChip selected={scope === 'trail'} onPress={() => setScope('trail')}>
            Het pad en mijn account
          </ChoiceChip>
        </ChoiceGroup>
      ) : null}
      <Text style={styles.body}>
        {trailGoes
          ? `Hiermee verdwijnen ${moments === null ? 'alle momenten' : moments === 1 ? '1 moment' : `${moments} momenten`}${family ? ` en de toegang van ${family === 1 ? '1 persoon' : `${family} mensen`}` : ''}. Familie kan meteen niets meer zien. Je hebt 30 dagen om je te bedenken.${other ? ` ${otherName} krijgt een mail en kan het pad in die tijd nog bewaren.` : ''}`
          : `Je kunt dan niet meer bij ${possessive(name)} pad. Het pad, de foto’s en de familie blijven bij ${otherName}. Je hebt 30 dagen om je te bedenken.`}
      </Text>
      {trailGoes ? (
        <Callout
          title="Eerst alles op je telefoon bewaren?"
          tone="pistachio"
          accessory={
            <Button size="md" variant="paper" icon="download" onPress={() => router.push('/downloaden')}>
              Downloaden
            </Button>
          }
        />
      ) : null}
      {queue.length ? (
        <Text style={styles.error}>
          {queue.length === 1 ? 'Er staat nog 1 moment alleen op deze telefoon.' : `Er staan nog ${queue.length} momenten alleen op deze telefoon.`} Die gaan verloren
          als je nu verwijdert. Wacht even tot ze verstuurd zijn als je ze wilt bewaren.
        </Text>
      ) : null}
      <TextField label={`Typ ${name.toLocaleUpperCase('nl-NL')} om te bevestigen`} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {confirmed ? <TextLink onPress={now}>Nu meteen definitief wissen</TextLink> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  error: { ...text('meta'), color: color.plum },
});

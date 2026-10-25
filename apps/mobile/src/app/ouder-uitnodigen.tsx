import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, TextField, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { InviteRefused, invitePartner } from '@/lib/family';

// M3, inviting the other parent by e-mail (decision 6). The full address comes back once before
// sending, because a typo would make a stranger a parent with access to every photo.
const PROBLEM = {
  address: 'Dat adres lijkt niet te kloppen, of het is je eigen adres.',
  full: 'Er zijn al twee ouders op dit pad.',
  limit: 'Je hebt vandaag al drie keer iemand uitgenodigd. Probeer het morgen weer.',
  gone: 'Dat lukte even niet. Probeer het zo nog eens.',
  other: 'Dat lukte even niet. Probeer het zo nog eens.',
} as const;

export default function InvitePartner() {
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [mailFailed, setMailFailed] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error ?? (sent ? 'Uitnodiging verstuurd.' : checking ? `Klopt dit adres? ${email.trim()}` : undefined));
  const clean = email.trim().toLowerCase();

  async function send() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) return setError(PROBLEM.address);
    if (!checking) {
      setError(undefined);
      return setChecking(true);
    }
    setBusy(true);
    setError(undefined);
    try {
      const answer = await invitePartner(clean);
      setMailFailed(answer.sent === false);
      setSent(true);
    } catch (e) {
      setBusy(false);
      setChecking(false);
      setError(PROBLEM[e instanceof InviteRefused ? e.reason : 'other']);
    }
  }

  if (sent) {
    return (
      <Screen header={{ title: 'Uitnodiging verstuurd', color: 'lilac', onBack: router.back, character: 'bizzy' }}>
        <Text style={styles.body}>
          {mailFailed ? `De uitnodiging staat klaar, maar de mail naar ${clean} lukte niet. Vraag je partner om in de TeddySteps-app in te loggen met dit adres.` : `We stuurden een mail naar ${clean}.`} Zodra je partner met dit adres inlogt, zien jullie allebei hetzelfde pad. Je krijgt een mail als het gelukt is.
        </Text>
        <Button block variant="paper" onPress={() => router.back()}>
          Terug naar de kring
        </Button>
      </Screen>
    );
  }

  return (
    <Screen
      header={{ title: 'Samen het pad bijhouden', color: 'lilac', onBack: router.back, character: 'bizzy' }}
      footer={
        <>
          <Button block onPress={send} busy={busy}>
            {checking ? 'Ja, stuur de uitnodiging' : 'Volgende'}
          </Button>
          {checking && !busy ? <TextLink onPress={() => setChecking(false)}>Adres aanpassen</TextLink> : null}
        </>
      }
    >
      <Text style={styles.body}>Nodig je partner uit als tweede ouder. Jullie zien dan allebei alles, kunnen allebei momenten vastpinnen en hebben dezelfde rechten.</Text>
      {checking ? (
        <Text role="alert" style={styles.check}>
          Klopt dit adres? {clean}
        </Text>
      ) : (
        <TextField
          label="E-mailadres van je partner"
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError(undefined);
          }}
          error={error} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
      )}
      {checking && error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.note}>In de mail staat geen naam en geen foto. De uitnodiging werkt 7 dagen en alleen voor wie inlogt met precies dit adres.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  check: { ...text('rowTitle'), fontSize: 18 },
  note: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
});

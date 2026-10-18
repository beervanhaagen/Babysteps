import { possessive } from '@teddysteps/core';
import { useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, fontFamily, Hug, TextField, useAnnounce, useLoop } from '@teddysteps/ui';
import { api, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page } from './shared';

type Frequency = FamilyPage['me']['frequency'];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

// F2 Uitnodiging geaccepteerd, also "Kaartjes instellen" later (`editing`).
// The board says "Sam nodigt je uit"; the parent's first name isn't asked yet.
export function Join({ page, editing, onSaved }: { page: FamilyPage; editing?: boolean; onSaved: () => void }) {
  const name = page.child.firstName;
  const [label, setLabel] = useState(page.me.label);
  const [email, setEmail] = useState(page.me.email ?? '');
  const [frequency, setFrequency] = useState<Frequency>(page.me.joined ? page.me.frequency : 'weekly');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const bob = useLoop('bob');
  useView(editing ? 'Je kaartjes' : `Uitnodiging voor ${possessive(name)} pad`);
  useAnnounce(error);

  async function save() {
    if (frequency !== 'never' && !EMAIL.test(email.trim())) return setError('Dit e-mailadres klopt nog niet helemaal.');
    setError(undefined);
    setBusy(true);
    try {
      await api.join(label, email, frequency);
      onSaved();
      navigate('/', true);
    } catch {
      setBusy(false);
      setError('Dat lukte even niet. Probeer het zo nog eens.');
    }
  }

  return (
    <Page background={color.butter}>
      <Animated.View style={[styles.hug, { transform: bob }]}>
        <Hug size={150} />
      </Animated.View>
      <Heading>{editing ? 'Je kaartjes' : `Je bent uitgenodigd voor ${possessive(name)} pad!`}</Heading>
      {editing ? null : <Text style={styles.lead}>Kijk mee met elk nieuw moment. Geen app, geen wachtwoord.</Text>}
      <TextField size="lg" label={`Hoe noemt ${name} jou?`} value={label} onChangeText={setLabel} maxLength={40} autoComplete="off" />
      <ChoiceGroup label="Hoe vaak wil je een kaartje in je mail?">
        <ChoiceChip selected={frequency === 'each'} onPress={() => setFrequency('each')}>
          Bij elk moment
        </ChoiceChip>
        <ChoiceChip selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')}>
          Eén keer per week
        </ChoiceChip>
        <ChoiceChip selected={frequency === 'never'} onPress={() => setFrequency('never')}>
          Liever niet
        </ChoiceChip>
      </ChoiceGroup>
      {/* "Liever niet" asks for no address at all (docs/family-email.md). */}
      {frequency !== 'never' ? (
        <TextField
          size="lg"
          label="Je e-mailadres"
          hint="Hier komen je kaartjes binnen."
          error={error}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      ) : error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <View style={styles.action}>
        <Button block onPress={save} busy={busy}>
          {editing ? 'Opslaan' : `Open ${possessive(name)} pad`}
        </Button>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'center', marginTop: 16, transformOrigin: '50% 100%' },
  lead: { fontFamily: fontFamily('sans', 400), fontSize: 19, lineHeight: 28, color: color.ink },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 14, color: color.plum },
  action: { marginTop: 8 },
});

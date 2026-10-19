import { possessive } from '@teddysteps/core';
import { useState } from 'react';
import { Animated, Linking, StyleSheet, Text, View } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, fontFamily, Hug, TextField, useAnnounce, useLoop } from '@teddysteps/ui';
import { api, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page, TextLink } from './shared';

type Frequency = FamilyPage['me']['frequency'];

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

// F2 Uitnodiging geaccepteerd, also "Kaartjes instellen" later (`editing`), with the way out:
// "Ik wil niet meer meekijken". The board says "Sam nodigt je uit"; the parent's first name
// isn't asked yet.
export function Join({ page, editing, onSaved, onLeft }: { page: FamilyPage; editing?: boolean; onSaved: () => void; onLeft: () => void }) {
  const name = page.child.firstName;
  const [label, setLabel] = useState(page.me.label);
  const [email, setEmail] = useState(page.me.email ?? '');
  // "Bij elk moment" isn't offered at launch: everyone gets the Sunday mail (F8).
  const [frequency, setFrequency] = useState<Frequency>(page.me.joined && page.me.frequency === 'never' ? 'never' : 'weekly');
  const [checkMail, setCheckMail] = useState(false);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const bob = useLoop('bob');
  useView(editing ? 'Je kaartjes' : `Uitnodiging voor ${possessive(name)} pad`);
  useAnnounce(checkMail ? `We hebben een mailtje gestuurd naar ${email.trim()}. Kijk even in je mail.` : error);

  async function save() {
    if (frequency !== 'never' && !EMAIL.test(email.trim())) return setError('Dit e-mailadres klopt nog niet helemaal.');
    setError(undefined);
    setBusy(true);
    try {
      const { confirm } = await api.join(label, email, frequency);
      if (confirm === 'limited') {
        setBusy(false);
        return setError('We hebben vandaag al een paar mailtjes naar dit adres gestuurd. Probeer het morgen nog eens.');
      }
      if (confirm) {
        setBusy(false);
        return setCheckMail(true);
      }
      onSaved();
      navigate('/', true);
    } catch {
      setBusy(false);
      setError('Dat lukte even niet. Probeer het zo nog eens.');
    }
  }

  async function leave() {
    if (!leaving) return setLeaving(true);
    try {
      await api.leave();
      onLeft();
    } catch {
      setError('Dat lukte even niet. Probeer het zo nog eens.');
    }
  }

  // A new address: postcards only start after "Ja, dit is mijn adres" in the mail.
  if (checkMail) {
    return (
      <Page background={color.butter}>
        <Animated.View style={[styles.hug, { transform: bob }]}>
          <Hug size={150} />
        </Animated.View>
        <Heading>Kijk even in je mail</Heading>
        <Text style={styles.lead}>
          We hebben een mailtje gestuurd naar {email.trim()}. Tik op de knop erin om je adres te bevestigen, dan krijg je elke zondag een kaartje. Staat het niet in je inbox? Kijk dan even in je spam.
        </Text>
        <TextLink onPress={() => setCheckMail(false)}>Ander adres? Pas het aan</TextLink>
        <View style={styles.action}>
          <Button
            block
            onPress={() => {
              onSaved();
              navigate('/', true);
            }}
          >
            {editing ? 'Terug naar de kaartjes' : `Open ${possessive(name)} pad`}
          </Button>
        </View>
      </Page>
    );
  }

  return (
    <Page background={color.butter}>
      <Animated.View style={[styles.hug, { transform: bob }]}>
        <Hug size={150} />
      </Animated.View>
      <Heading>{editing ? 'Je kaartjes' : `Je bent uitgenodigd voor ${possessive(name)} pad!`}</Heading>
      {editing ? null : <Text style={styles.lead}>Kijk mee met elk nieuw moment. Geen app, geen wachtwoord.</Text>}
      <TextField size="lg" label={`Hoe noemt ${name} jou?`} value={label} onChangeText={setLabel} maxLength={40} autoComplete="off" />
      <ChoiceGroup size="lg" label="Hoe vaak wil je een kaartje in je mail?">
        <ChoiceChip selected={frequency === 'weekly'} onPress={() => setFrequency('weekly')}>
          Elke zondag
        </ChoiceChip>
        <ChoiceChip selected={frequency === 'never'} onPress={() => setFrequency('never')}>
          Liever niet
        </ChoiceChip>
      </ChoiceGroup>
      {/* "Liever niet" asks for no address at all (docs/family-email.md). */}
      {editing && frequency === 'never' && page.me.email ? (
        <Text style={styles.small}>Dan wissen we je e-mailadres. De familiepagina blijft open.</Text>
      ) : null}
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
      <Text style={styles.small}>
        De ouders zien hoe {name} jou noemt, je knuffels en of je meekijkt. Je e-mailadres gebruiken we alleen voor je kaartjes.{' '}
        <Text accessibilityRole="link" style={styles.smallLink} onPress={() => Linking.openURL('https://teddysteps.nl/privacy#familie')}>
          Onze privacybelofte
        </Text>
      </Text>
      <View style={styles.action}>
        <Button block onPress={save} busy={busy}>
          {editing ? 'Opslaan' : `Open ${possessive(name)} pad`}
        </Button>
      </View>
      {editing ? (
        <>
          <TextLink onPress={() => navigate('/')}>Terug naar de kaartjes</TextLink>
          {leaving ? (
            <Text role="alert" style={styles.leaveText}>
              Dan werkt je link niet meer en wissen we je e-mailadres. Weet je het zeker?
            </Text>
          ) : null}
          <TextLink onPress={leave}>{leaving ? 'Ja, ik wil niet meer meekijken' : 'Ik wil niet meer meekijken'}</TextLink>
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hug: { alignSelf: 'center', marginTop: 16, transformOrigin: '50% 100%' },
  lead: { fontFamily: fontFamily('sans', 400), fontSize: 19, lineHeight: 28, color: color.ink },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 14, color: color.plum },
  small: { fontFamily: fontFamily('sans', 700), fontSize: 14, lineHeight: 20, color: color.inkMuted },
  smallLink: { fontFamily: fontFamily('sans', 800), color: color.ink, textDecorationLine: 'underline' },
  action: { marginTop: 8 },
  leaveText: { fontFamily: fontFamily('sans', 800), fontSize: 16, lineHeight: 22, color: color.plum, textAlign: 'center' },
});

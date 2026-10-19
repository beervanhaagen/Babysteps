import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, Character, color, fontFamily, useAnnounce } from '@teddysteps/ui';
import { api, NoAccess, TooManyDevices } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page, TextLink } from './shared';

// The pages links in mails lead to (step 7). Each one needs a tap before anything happens, so a
// mail scanner that opens the link changes nothing. Codes come after "#" and never reach a server log.
// Only a refused code says the link no longer works; a dropped connection keeps the button.

type State = 'ready' | 'busy' | 'done' | 'failed' | 'offline' | 'full';

const OFFLINE = 'Even geen verbinding. Kijk of je wifi of mobiele data aan staat, en probeer het zo nog eens.';
const outcome = (error: unknown): State => (error instanceof TooManyDevices ? 'full' : error instanceof NoAccess ? 'failed' : 'offline');
// A fresh start of the page, with the device's own session (if any).
const toFamilyPage = () => window.location.assign('/');

function Frame({ title, character, children }: { title: string; character: 'bo' | 'puddle' | 'bizzy'; children: React.ReactNode }) {
  useView(title);
  useAnnounce(title);
  return (
    <Page background={color.paper}>
      <Character name={character} size={120} decorative />
      <Heading style={styles.title}>{title}</Heading>
      {children}
    </Page>
  );
}

/** /bevestig#<code>, from the mail F2 sends: "Ja, dit is mijn adres". */
export function ConfirmEmail({ code }: { code: string }) {
  const [state, setState] = useState<State>(code ? 'ready' : 'failed');
  async function confirm() {
    setState('busy');
    try {
      await api.confirm(code);
      setState('done');
    } catch (error) {
      setState(outcome(error));
    }
  }
  if (state === 'done') {
    return (
      <Frame title="Gelukt!" character="bo">
        <Text style={styles.body}>Vanaf nu krijg je elke zondag een kaartje met de nieuwe momenten van die week.</Text>
        <TextLink onPress={toFamilyPage}>Naar de familiepagina</TextLink>
      </Frame>
    );
  }
  if (state === 'failed') {
    return (
      <Frame title="Deze link werkt niet meer" character="puddle">
        <Text style={styles.body}>Hij is al gebruikt, of ouder dan 7 dagen. Vul je e-mailadres gerust opnieuw in bij je kaartjes op de familiepagina.</Text>
        <TextLink onPress={toFamilyPage}>Naar de familiepagina</TextLink>
      </Frame>
    );
  }
  return (
    <Frame title="Klopt dit adres?" character="puddle">
      <Text style={styles.body}>Tik op de knop, dan krijg je elke zondag een kaartje met de nieuwe momenten.</Text>
      {state === 'offline' ? <Text role="alert" style={styles.note}>{OFFLINE}</Text> : null}
      <Button block onPress={confirm} busy={state === 'busy'}>
        Ja, dit is mijn adres
      </Button>
    </Frame>
  );
}

/** /afmelden#<token>, from every Sunday mail. The family page itself stays open. */
export function Unsubscribe({ token }: { token: string }) {
  const [state, setState] = useState<State>(token ? 'ready' : 'failed');
  async function unsubscribe() {
    setState('busy');
    try {
      await api.unsubscribe(token);
      setState('done');
    } catch (error) {
      setState(outcome(error));
    }
  }
  if (state === 'done') {
    return (
      <Frame title="Je bent afgemeld" character="puddle">
        <Text style={styles.body}>Je krijgt geen kaartjes meer en we hebben je e-mailadres gewist. De familiepagina blijft gewoon open met je eigen link.</Text>
      </Frame>
    );
  }
  if (state === 'failed') {
    return (
      <Frame title="Deze link werkt niet" character="puddle">
        <Text style={styles.body}>
          Probeer het nog eens vanuit het mailtje, of mail naar{' '}
          <Text accessibilityRole="link" style={styles.link} onPress={() => window.location.assign('mailto:hallo@teddysteps.nl')}>
            hallo@teddysteps.nl
          </Text>
          .
        </Text>
      </Frame>
    );
  }
  return (
    <Frame title="Geen kaartjes meer?" character="puddle">
      <Text style={styles.body}>Dan krijg je op zondag geen mailtje meer en wissen we je e-mailadres. De familiepagina blijft open.</Text>
      {state === 'offline' ? <Text role="alert" style={styles.note}>{OFFLINE}</Text> : null}
      <Button block onPress={unsubscribe} busy={state === 'busy'}>
        Ja, meld me af
      </Button>
    </Frame>
  );
}

/** /m#<code> from the Sunday mail, on a device that isn't in yet: one tap opens the trail. */
export function OpenFromMail({ onOpen }: { onOpen: () => Promise<void> }) {
  const [state, setState] = useState<State>('ready');
  async function open() {
    setState('busy');
    try {
      await onOpen();
      navigate('/', true);
    } catch (error) {
      setState(outcome(error));
    }
  }
  if (state === 'full') {
    return (
      <Frame title="Deze link is al vaak geopend" character="puddle">
        <Text style={styles.body}>Hij werkt op 5 apparaten tegelijk, en die zijn er al. Vraag de ouders om een nieuwe link.</Text>
      </Frame>
    );
  }
  if (state === 'failed') {
    return (
      <Frame title="Deze link werkt niet meer" character="puddle">
        <Text style={styles.body}>De knop in een kaartje werkt één keer en 7 dagen lang. Open de familiepagina met je eigen link uit de uitnodiging, of wacht op het kaartje van zondag.</Text>
      </Frame>
    );
  }
  return (
    <Frame title="Bekijk de nieuwe momenten" character="bizzy">
      <Text style={styles.body}>Tik op de knop om het pad te openen en een knuffel te sturen.</Text>
      {state === 'offline' ? <Text role="alert" style={styles.note}>{OFFLINE}</Text> : null}
      <Button block onPress={open} busy={state === 'busy'}>
        Open het pad
      </Button>
    </Frame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 34, marginTop: 8 },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 19, lineHeight: 28, color: color.ink },
  note: { fontFamily: fontFamily('sans', 700), fontSize: 16, lineHeight: 24, color: color.plum },
  link: { fontFamily: fontFamily('sans', 800), color: color.ink, textDecorationLine: 'underline' },
});

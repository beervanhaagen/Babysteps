import { StyleSheet, Text } from 'react-native';
import { Character, color, fontFamily } from '@teddysteps/ui';
import { useView } from '../route';
import { Heading, Page } from './shared';

// Without a (working) personal link: say what to do, never what exists behind it.
export function NoAccess({ reason }: { reason: 'no-link' | 'unknown-link' | 'offline' }) {
  useView('TeddySteps');
  return (
    <Page background={color.paper}>
      <Character name="puddle" size={120} decorative />
      <Heading style={styles.title}>
        {reason === 'offline' ? 'Even geen verbinding' : reason === 'unknown-link' ? 'Deze link werkt niet meer' : 'Alleen voor de eigen kring'}
      </Heading>
      <Text style={styles.body}>
        {reason === 'offline'
          ? 'Check je wifi of mobiele data en probeer het opnieuw.'
          : reason === 'unknown-link'
            ? 'Misschien is er een nieuwe link gestuurd. Vraag de ouders om je link nog een keer te sturen.'
            : 'Open deze pagina met de persoonlijke link uit je uitnodiging, bijvoorbeeld in WhatsApp.'}
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 34, marginTop: 8 },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 19, lineHeight: 28, color: color.ink },
});

import { StyleSheet, Text } from 'react-native';
import { Button, Character, color, fontFamily } from '@teddysteps/ui';
import { useView } from '../route';
import { Heading, Page } from './shared';

export type Problem = 'no-link' | 'unknown-link' | 'offline' | 'full' | 'left';

const COPY: Record<Problem, { title: string; body: string }> = {
  'no-link': {
    title: 'Alleen voor de eigen kring',
    body: 'Open deze pagina met de persoonlijke link uit je uitnodiging, bijvoorbeeld in WhatsApp.',
  },
  'unknown-link': {
    title: 'Deze link werkt niet meer',
    body: 'Misschien is er een nieuwe link gestuurd. Vraag de ouders om je link nog een keer te sturen.',
  },
  offline: {
    title: 'Even geen verbinding',
    body: 'Kijk even of je wifi of mobiele data aan staat, en probeer het dan opnieuw.',
  },
  full: {
    title: 'Deze link is al vaak geopend',
    body: 'Hij werkt op 5 apparaten tegelijk, en die zijn er al. Vraag de ouders om een nieuwe link.',
  },
  left: {
    title: 'Je kijkt niet meer mee',
    body: 'Je link werkt niet meer en je e-mailadres is gewist. Wil je toch weer meekijken? Vraag de ouders om een nieuwe uitnodiging.',
  },
};

// Without a (working) personal link: say what to do, never what exists behind it.
export function NoAccess({ reason, onRetry }: { reason: Problem; onRetry?: () => void }) {
  const copy = COPY[reason];
  useView(copy.title);
  return (
    <Page background={color.paper}>
      <Character name="puddle" size={120} decorative />
      <Heading style={styles.title}>{copy.title}</Heading>
      <Text style={styles.body}>{copy.body}</Text>
      {onRetry ? (
        <Button block onPress={onRetry}>
          Probeer opnieuw
        </Button>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, lineHeight: 34, marginTop: 8 },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 19, lineHeight: 28, color: color.ink },
});

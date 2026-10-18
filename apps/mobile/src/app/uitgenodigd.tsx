import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, Callout, color, fontFamily, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';

// From O1 "Ik ben uitgenodigd door familie". Family never needs the app (F1 to F8 are a web
// page); a second parent logs in with the address they were invited on (bouwplan §3).
// No board for this screen yet: the copy is ours and still needs the growth review.
export default function Invited() {
  return (
    <Screen
      header={{ title: 'Uitgenodigd?', color: 'pistachio', onBack: router.back, character: 'puddle' }}
      footer={
        <Button block onPress={() => router.replace('/inloggen')}>
          Inloggen
        </Button>
      }
    >
      <Callout title="Ben je familie?" tone="butter">
        Dan heb je geen app nodig. Open de link uit je uitnodiging, bijvoorbeeld in WhatsApp. Link kwijt? Vraag de ouder om hem nog een keer te sturen.
      </Callout>
      <Text accessibilityRole="header" style={[text('rowTitle'), styles.heading]}>
        Ben je de andere ouder?
      </Text>
      <Text style={styles.body}>Log in met het e-mailadres waarop je bent uitgenodigd. Dan kom je meteen bij het pad van jullie kleintje.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { marginTop: 8 },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 15, lineHeight: 22, color: color.ink },
});

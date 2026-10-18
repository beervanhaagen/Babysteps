import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { border, Button, color, fontFamily, shadow, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';

// From O1 "Ik ben uitgenodigd door familie". Family never needs the app (F1 to F8 are a web
// page); a second parent logs in with the address they were invited on (bouwplan §3).
// No board for this screen yet: the copy is ours and still needs the design and growth review.
export default function Invited() {
  return (
    <Screen header={{ title: 'Uitgenodigd?', color: 'pistachio', onBack: router.back, character: 'puddle' }}>
      <View style={[styles.card, { backgroundColor: color.butter, transform: [{ rotate: '-1deg' }] }]}>
        <Text style={styles.title}>Ben je familie?</Text>
        <Text style={styles.body}>Dan heb je geen app nodig. Open de link uit je uitnodiging, bijvoorbeeld in WhatsApp. Je ziet alles meteen in je browser.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: color.lilac, transform: [{ rotate: '1deg' }] }]}>
        <Text style={styles.title}>Ben je de andere ouder?</Text>
        <Text style={styles.body}>Log in met het e-mailadres waarop je bent uitgenodigd. Dan kom je meteen bij het pad van jullie kleintje.</Text>
        <Button size="md" variant="sunshine" onPress={() => router.replace('/inloggen')}>
          Inloggen
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 16,
    borderRadius: 20,
    borderWidth: border.edge,
    borderColor: color.ink,
    boxShadow: shadow.shadowMd,
  },
  title: { ...text('rowTitle') },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 15, lineHeight: 22, color: color.ink },
});

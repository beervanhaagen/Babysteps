import { StyleSheet, Text, View } from 'react-native';
import { color, fontFamily, Hug, Scallop, text } from '@teddysteps/ui';
import { navigate, useView } from '../route';
import { Heading, Page, TextLink } from './shared';

// F4 Stuur liefde, after "Knuffelen" on a card (the hug itself is sent from the card, so
// reloading this page never sends another). No book list while the year book is out of the MVP.
// Voice notes come in step 6. "Naar Sam en Alex" needs the parents' first names, which aren't
// asked yet.
export function Sent() {
  useView('Knuffel verstuurd');
  return (
    <View style={styles.screen}>
      <View style={styles.band}>
        <View role="status" style={styles.status}>
          <Hug size={56} decorative />
          <Heading style={styles.title}>Knuffel verstuurd!</Heading>
        </View>
      </View>
      <Scallop color="pistachio" />
      <Page>
        <Text style={styles.body}>De ouders zien je knuffel meteen terug.</Text>
        <TextLink onPress={() => navigate('/')}>Terug naar de kaartjes</TextLink>
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  band: { backgroundColor: color.pistachio, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { ...text('titleL'), flex: 1 },
  body: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.ink },
});

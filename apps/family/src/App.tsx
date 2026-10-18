import { StyleSheet, Text, View } from 'react-native';
import { border, color, Hug, radius, shadow, space, text, useTeddyFonts } from '@teddysteps/ui';
import { Gallery } from '@teddysteps/ui/src/Gallery';

// The family page is one light web page without a router: it only has a few views
// (invite, postcards, send love), and every kilobyte counts on Oma's old phone.
// Placeholder until the family loop is built (step 4 of docs/bouwplan.md).
// Invite links open /j#<code>; this is what anyone else sees.
export default function App() {
  const fontsReady = useTeddyFonts();
  if (!fontsReady) return null;
  if (__DEV__ && window.location.pathname === '/galerij') return <Gallery />;
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Hug size={120} />
        <Text accessibilityRole="header" style={text('titleL')}>TeddySteps</Text>
        <Text style={styles.body}>
          Deze pagina is alleen voor de eigen kring. Open hem met de persoonlijke link uit je uitnodiging.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.space6,
    backgroundColor: color.paper,
  },
  card: {
    maxWidth: 420,
    alignItems: 'center',
    gap: space.space3,
    padding: space.space6,
    borderWidth: border.edge,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    backgroundColor: color.white,
    boxShadow: shadow.shadowMd,
  },
  body: { ...text('body'), color: color.inkMuted, textAlign: 'center' },
});

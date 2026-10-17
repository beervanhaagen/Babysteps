import { StyleSheet, Text, View } from 'react-native';
import { border, color, radius, shadow, space, type } from '@teddysteps/ui';

// The family page is one light web page without a router: it only has a few views
// (invite, postcards, send love), and every kilobyte counts on Oma's old phone.
// Placeholder until the family loop is built (step 4 of docs/bouwplan.md).
// Invite links open /j#<code>; this is what anyone else sees.
export default function App() {
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>TeddySteps</Text>
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
    gap: space.space3,
    padding: space.space6,
    borderWidth: border.edge,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    backgroundColor: color.white,
    boxShadow: shadow.shadowMd,
  },
  title: {
    color: color.ink,
    fontSize: type.titleL.fontSize,
    lineHeight: type.titleL.lineHeight,
    fontWeight: '800',
  },
  body: {
    color: color.inkMuted,
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
  },
});

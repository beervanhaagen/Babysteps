import { StyleSheet, Text, View } from 'react-native';
import { color, space, type } from '@teddysteps/ui';

// Placeholder until S1 Splash is built (step 1 and 2 of docs/bouwplan.md).
export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>TeddySteps</Text>
      <Text style={styles.body}>Hier komt het pad van je kleintje. We zijn nog aan het bouwen.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: space.space6,
    gap: space.space3,
    backgroundColor: color.paper,
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

import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Character, color, space, text, Wordmark } from '@teddysteps/ui';

// Placeholder until S1 Splash is built (step 2 of docs/bouwplan.md).
export default function Home() {
  return (
    <View style={styles.screen}>
      <Wordmark size={48} />
      <Character name="bo" size={140} />
      <Text style={styles.body}>Hier komt het pad van je kleintje. We zijn nog aan het bouwen.</Text>
      {__DEV__ ? <Button onPress={() => router.push('/galerij')}>Bekijk de galerij</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.space6,
    gap: space.space5,
    backgroundColor: color.paper,
  },
  body: { ...text('body'), color: color.inkMuted, textAlign: 'center' },
});

import { router } from 'expo-router';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, color, fontFamily, Hug, space, text, useLoop, Wordmark } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { TextLink } from '@/components/TextLink';

// O1 Welkom.
export default function Welcome() {
  const insets = useSafeAreaInsets();
  const bob = useLoop('bob');
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Doodles />
      <View style={styles.middle}>
        <Animated.View style={{ transform: bob, transformOrigin: '50% 100%' }}>
          <Hug size={170} />
        </Animated.View>
        <Wordmark size={46} tone="header" />
        <Text accessibilityRole="header" style={styles.title}>
          Hoi, kersverse ouder!
        </Text>
        <Text style={styles.body}>Samen beginnen we aan het pad van je kleintje. Eén minuut, één hand, nul stress.</Text>
      </View>
      <View style={[styles.footer, { paddingBottom: space.space6 + insets.bottom }]}>
        <Button block onPress={() => router.push('/account')}>
          Aan de slag!
        </Button>
        <Button block variant="paper" onPress={() => router.push('/uitgenodigd')}>
          Ik ben uitgenodigd door familie
        </Button>
        <TextLink onPress={() => router.push('/inloggen')}>Ik heb al een account</TextLink>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.pistachio },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: space.space6 },
  title: { ...text('display'), textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 17, lineHeight: 25, color: color.ink, textAlign: 'center' },
  footer: { paddingTop: 12, paddingHorizontal: space.space6, gap: 10 },
});

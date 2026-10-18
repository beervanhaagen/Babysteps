import { router } from 'expo-router';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Character, color, fontFamily, useLoop, Wordmark } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';

// S1 Startscherm: a full-colour delight screen; tap anywhere to begin.
export default function Start() {
  return (
    <View style={styles.screen}>
      <Doodles />
      <Pressable accessibilityRole="button" accessibilityLabel="Begin met TeddySteps" onPress={() => router.push('/welkom')} style={styles.tap}>
        <Character name="bo" size={150} decorative />
        <Wordmark size={52} tone="header" />
        <Text style={styles.tagline}>het eerste jaar, voor altijd bewaard</Text>
        <View style={styles.dots}>
          <Dot delay={1} />
          <Dot delay={2} />
          <Dot delay={3} />
        </View>
      </Pressable>
    </View>
  );
}

function Dot({ delay }: { delay: 1 | 2 | 3 }) {
  const transform = useLoop('hop', delay);
  return <Animated.View style={[styles.dot, { transform }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.sunshine },
  tap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22, padding: 24 },
  tagline: { fontFamily: fontFamily('hand', 700), fontSize: 20, lineHeight: 24, color: color.ink, transform: [{ rotate: '-3deg' }] },
  dots: { flexDirection: 'row', gap: 10, marginTop: 18 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: color.ink },
});

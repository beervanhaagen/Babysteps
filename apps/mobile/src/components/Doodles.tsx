import { StyleSheet, View } from 'react-native';
import { Doodle, type ColorName, type DoodleName } from '@teddysteps/ui';

type Spot = { name: DoodleName; color?: ColorName; left: `${number}%`; top: `${number}%`; size?: number };

// Scattered doodles behind the full-colour screens (S1, O1), roughly where the boards put them.
const SPOTS: Spot[] = [
  { name: 'star', color: 'tomato', left: '10%', top: '13%' },
  { name: 'heart', left: '80%', top: '17%' },
  { name: 'twinkle', left: '84%', top: '62%', size: 30 },
  { name: 'sparkle', color: 'ink', left: '8%', top: '70%', size: 22 },
  { name: 'squiggle', left: '16%', top: '40%', size: 26 },
];

export function Doodles({ spots = SPOTS }: { spots?: Spot[] }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {spots.map((spot, i) => (
        <View key={i} style={{ position: 'absolute', left: spot.left, top: spot.top }}>
          <Doodle name={spot.name} color={spot.color} size={spot.size} delay={((i % 3) + 1) as 1 | 2 | 3} />
        </View>
      ))}
    </View>
  );
}

import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Character, color } from '@teddysteps/ui';
import { usePhoto, type PhotoSource } from '@/lib/trail';

/**
 * A private photo: a file on the phone, or a signed link that expo-image caches by its path.
 * Until it's there (offline, still loading), a soft block with Bo keeps the frame from looking broken.
 */
export function Photo({ source, style, fit = 'cover' }: { source?: PhotoSource; style?: StyleProp<ImageStyle>; fit?: 'cover' | 'contain' }) {
  const image = usePhoto(source);
  if (!image) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.waiting]}>
        <Character name="bo" size={56} motion={null} decorative />
      </View>
    );
  }
  return <Image source={image} contentFit={fit} transition={150} style={style ?? StyleSheet.absoluteFill} accessible={false} />;
}

const styles = StyleSheet.create({
  waiting: { backgroundColor: color.lilac, alignItems: 'center', justifyContent: 'center' },
});

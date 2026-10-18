import { Image } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';
import { usePhoto, type PhotoSource } from '@/lib/trail';

/** A private photo: a file on the phone, or a signed link that expo-image caches by its path. */
export function Photo({ source, style }: { source?: PhotoSource; style?: StyleProp<ImageStyle> }) {
  const image = usePhoto(source);
  if (!image) return null;
  return <Image source={image} contentFit="cover" transition={150} style={style ?? StyleSheet.absoluteFill} accessible={false} />;
}

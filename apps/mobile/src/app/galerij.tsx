import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery } from '@teddysteps/ui/src/Gallery';

// Design-system gallery, development builds only.
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery topInset={insets.top} bottomInset={insets.bottom} />;
}

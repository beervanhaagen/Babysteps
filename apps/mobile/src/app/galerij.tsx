import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gallery } from '@teddysteps/ui/src/Gallery';

// Design-system gallery, development builds only (guarded in _layout.tsx).
export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  return <Gallery topInset={insets.top} bottomInset={insets.bottom} />;
}

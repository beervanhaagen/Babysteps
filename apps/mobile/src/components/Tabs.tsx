import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type TabId } from '@teddysteps/ui';

const ROUTES = { trail: '/pad', family: '/familie', me: '/ik' } as const;

/** The tab bar at the bottom of the three main screens; the + opens A1. */
export function Tabs({ active }: { active: TabId }) {
  const insets = useSafeAreaInsets();
  return (
    <TabBar
      active={active}
      bottomInset={insets.bottom}
      onChange={(id) => id !== active && router.replace(ROUTES[id])}
      onAdd={() => router.push('/toevoegen')}
    />
  );
}

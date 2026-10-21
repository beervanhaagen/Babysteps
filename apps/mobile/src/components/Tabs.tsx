import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabBar, type TabId } from '@teddysteps/ui';
import { useUnseenHugs } from '@/lib/family';

const ROUTES = { trail: '/pad', family: '/familie', hugs: '/activiteit', me: '/ik' } as const;

/** The tab bar at the bottom of the four main screens; the + opens A1. A dot on Knuffels for unseen hugs. */
export function Tabs({ active }: { active: TabId }) {
  const insets = useSafeAreaInsets();
  const unseen = useUnseenHugs();
  return (
    <TabBar
      active={active}
      bottomInset={insets.bottom}
      onChange={(id) => id !== active && router.replace(ROUTES[id])}
      onAdd={() => router.push('/toevoegen')}
      news={unseen && active !== 'hugs' ? ['hugs'] : []}
    />
  );
}

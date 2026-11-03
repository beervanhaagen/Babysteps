import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReactionKind } from '@teddysteps/ui';

// How many reactions of each kind a moment had when the parent last opened it big, kept on this
// phone only (no tracking on the server): when there are more, the new ones float up once. Only
// moment ids and numbers; wiped on sign-out and M7.
const KEY = 'teddysteps.reactions-seen.v2';
type Counts = Partial<Record<ReactionKind, number>>;
let seen: Record<string, Counts> | null = null;

/**
 * The kind with the most new reactions on this moment since it was last seen, and how many are
 * new in all; then remembers them. The very first time on this phone every moment counts as seen,
 * so an update doesn't rain icons.
 */
export async function newReactions(momentId: string, counts: Counts, all: Record<string, Counts>): Promise<{ kind: ReactionKind; count: number } | null> {
  if (!seen) {
    const stored = await AsyncStorage.getItem(KEY).catch(() => null);
    if (!stored) {
      seen = { ...all };
      void AsyncStorage.setItem(KEY, JSON.stringify(seen)).catch(() => undefined);
      return null;
    }
    seen = JSON.parse(stored) as Record<string, Counts>;
  }
  const before = seen[momentId] ?? {};
  const fresh = (Object.entries(counts) as [ReactionKind, number][]).map(([kind, n]) => [kind, n - (before[kind] ?? 0)] as const).filter(([, n]) => n > 0);
  if (!fresh.length) return null;
  seen[momentId] = { ...counts };
  void AsyncStorage.setItem(KEY, JSON.stringify(seen)).catch(() => undefined);
  const [kind] = [...fresh].sort((a, b) => b[1] - a[1])[0];
  return { kind, count: fresh.reduce((n, [, c]) => n + c, 0) };
}

export function forgetReactionsSeen() {
  seen = null;
  void AsyncStorage.multiRemove([KEY, 'teddysteps.reactions-seen']).catch(() => undefined);
}

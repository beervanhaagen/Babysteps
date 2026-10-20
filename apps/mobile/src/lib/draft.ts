import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { MAX_PHOTOS, pickPhotos, type PickedPhoto } from './photos';

// The moment being made, from A1 to A3. Lives in memory only; A4 hands it to the queue.
export interface Draft {
  photos: PickedPhoto[];
  /** Chosen via "Een eerste keer!" on A1; A3 can still change it. */
  isFirst: boolean;
  /** Chosen via "Oudere weken": A3 starts at the week of the photos. */
  olderWeek: boolean;
  /** Picked or typed on A3b "Welke eerste keer?". */
  firstLabel: string;
}

const EMPTY: Draft = { photos: [], isFirst: false, olderWeek: false, firstLabel: '' };
let draft = EMPTY;
const listeners = new Set<() => void>();

export function setDraft(change: Partial<Draft>) {
  draft = { ...draft, ...change };
  listeners.forEach((listener) => listener());
}

export function resetDraft() {
  setDraft(EMPTY);
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => draft,
  );
}

/**
 * A1 and X1: open the system photo picker and, if the parent chose something, go on to A2.
 * `replace` swaps the A1 sheet for A2 instead of stacking it.
 */
export async function startMoment(kind: 'photos' | 'first' | 'older', how: 'push' | 'replace' = 'push'): Promise<boolean> {
  const photos = await pickPhotos(MAX_PHOTOS);
  if (!photos.length) return false;
  setDraft({ photos, isFirst: kind === 'first', olderWeek: kind === 'older', firstLabel: '' });
  router[how]('/fotos');
  return true;
}

// A3b while editing a moment that is already on the trail (T8 → Bijschrift): the choice, by moment.
let editPick: { momentId: string; label: string } | null = null;
const pickListeners = new Set<() => void>();

export function pickFirstFor(momentId: string, label: string) {
  editPick = { momentId, label };
  pickListeners.forEach((listener) => listener());
}

/** The first picked on A3b for this moment since the edit screen opened, if any. */
export function usePickedFirst(momentId: string): string | undefined {
  const pick = useSyncExternalStore(
    (listener) => {
      pickListeners.add(listener);
      return () => pickListeners.delete(listener);
    },
    () => editPick,
  );
  return pick?.momentId === momentId ? pick.label : undefined;
}

export function forgetPickedFirst() {
  editPick = null;
}

// O6 Inhalen: older photos the parent picked, sorted into the weeks of the trail by the day they
// were taken. One photo per day is suggested (owner, 21 October 2026); the parent ticks the rest.
// Photos without a date, from before the birth or from the future can't be placed and are left out.
import { daysBetween, trailWeek, type CalendarDate } from './weeks.ts';

/** A moment holds at most this many photos (create_moment). */
export const MAX_PER_WEEK = 10;
/** Photos per catch-up while we are on the free plan (owner, 21 October 2026). */
export const CATCH_UP_LIMIT = 20;

export interface CatchUpWeek<T> {
  week: number;
  /** In the order they were taken. */
  photos: T[];
  /** The ones ticked to start with: the first of each day, unless the week has moments already. */
  suggested: T[];
  /** The trail already has a moment in this week. */
  onTrail: boolean;
}

export function planCatchUp<T extends { takenOn: CalendarDate | null }>(
  photos: T[],
  birth: CalendarDate,
  today: CalendarDate,
  weeksOnTrail: number[],
): { weeks: CatchUpWeek<T>[]; leftOut: T[] } {
  const leftOut: T[] = [];
  const byWeek = new Map<number, T[]>();
  for (const photo of photos) {
    const day = photo.takenOn;
    if (!day || daysBetween(birth, day) < 0 || daysBetween(day, today) < 0) {
      leftOut.push(photo);
      continue;
    }
    const week = trailWeek(birth, day);
    byWeek.set(week, [...(byWeek.get(week) ?? []), photo]);
  }
  const weeks = [...byWeek.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([week, list]) => {
      // A stable sort keeps the picker's order within a day.
      const sorted = [...list].sort((a, b) => a.takenOn!.localeCompare(b.takenOn!));
      const onTrail = weeksOnTrail.includes(week);
      const days = new Set<string>();
      const suggested = onTrail
        ? []
        : sorted.filter((p) => !days.has(p.takenOn!) && days.add(p.takenOn!)).slice(0, MAX_PER_WEEK);
      return { week, photos: sorted, suggested, onTrail };
    });
  return { weeks, leftOut };
}

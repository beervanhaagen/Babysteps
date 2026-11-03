// Dates are calendar days ("2026-05-03") in Europe/Amsterdam, never timestamps,
// so a moment never shifts a week because of a time zone or summer time.
export type CalendarDate = `${number}-${number}-${number}`;

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(date: CalendarDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcDay(to) - toUtcDay(from)) / DAY_MS);
}

// Week 1 is the first seven days, starting on `start` itself.
// Returns 0 or less for days before `start`.
export function weekNumber(start: CalendarDate, on: CalendarDate): number {
  return Math.floor(daysBetween(start, on) / 7) + 1;
}

// The trail and the book count from the birth date.
export function trailWeek(birthDate: CalendarDate, on: CalendarDate): number {
  return weekNumber(birthDate, on);
}

// Sprongetjes count from the due date, so a baby born early reaches them "later".
export function leapWeek(dueDate: CalendarDate, on: CalendarDate): number {
  return weekNumber(dueDate, on);
}

export const TRAIL_WEEKS = 78;

// The first year counts in weeks ("Week 31"); from the first birthday (week 53) the trail says
// the age instead (owner, 3 November 2026): "1 jaar", "1 jaar en 4 weken".
function afterOneYear(week: number) {
  return { years: Math.floor((week - 1) / 52), weeks: (week - 1) % 52 };
}

/** "Week 31", or from week 53 "1 jaar en 4 weken". */
export function weekName(week: number): string {
  if (week <= 52) return `Week ${week}`;
  const { years, weeks } = afterOneYear(week);
  return weeks ? `${years} jaar en ${weeks} ${weeks === 1 ? 'week' : 'weken'}` : `${years} jaar`;
}

/** "in week 31", or "op 1 jaar en 4 weken": after "Vastgepind", "Staat nu". */
export function atWeek(week: number): string {
  return week <= 52 ? `in week ${week}` : `op ${weekName(week)}`;
}

/** Under a stop in the week strip: "31", or "1j 4w". */
export function weekShort(week: number): string {
  if (week <= 52) return String(week);
  const { years, weeks } = afterOneYear(week);
  return weeks ? `${years}j ${weeks}w` : `${years} jaar`;
}

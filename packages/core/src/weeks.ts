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

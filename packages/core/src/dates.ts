import { daysBetween, type CalendarDate } from './weeks.ts';

/** Reads "12-03-2026" (also with / or . and without leading zeros) as a calendar day. */
export function parseDutchDate(input: string): CalendarDate | null {
  const match = input.trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as CalendarDate;
}

export function formatDutchDate(date: CalendarDate): string {
  const [year, month, day] = date.split('-');
  return `${day}-${month}-${year}`;
}

/** Adds dashes while typing digits: "120320" becomes "12-03-20". */
export function typeDutchDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('-');
}

export type ChildDatesProblem =
  | 'birth-format'
  | 'birth-future'
  | 'due-format'
  | 'due-far-from-birth'
  | 'due-past'
  | 'due-too-far';

/**
 * Checks the dates from O2. Matches the database: a baby is born at most 20 weeks before
 * or 8 weeks after the due date; a baby on the way is due within 44 weeks.
 */
export function checkChildDates(born: boolean, birth: CalendarDate | null, due: CalendarDate | null, today: CalendarDate): ChildDatesProblem[] {
  const problems: ChildDatesProblem[] = [];
  if (born) {
    if (!birth) problems.push('birth-format');
    else if (daysBetween(today, birth) > 0) problems.push('birth-future');
  }
  if (!due) problems.push('due-format');
  else if (born && birth) {
    const late = daysBetween(due, birth);
    if (late < -140 || late > 56) problems.push('due-far-from-birth');
  } else if (!born) {
    const ahead = daysBetween(today, due);
    if (ahead < 0) problems.push('due-past');
    else if (ahead > 44 * 7) problems.push('due-too-far');
  }
  return problems;
}

/** Today's calendar day in the Netherlands, whatever the phone's time zone. */
export function todayInAmsterdam(now = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return parts as CalendarDate;
}

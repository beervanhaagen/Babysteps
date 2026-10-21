// The "Wat komt eraan" card on T1 (CLAUDE.md, "Sprongetjes"). Copy written and checked by
// child-development-reviewer, 19 October 2026: our own words only, always "misschien", never
// pronouns (the app doesn't know the child's sex), never an absolute week (leaps count from the
// due date, the trail from the birth), and a safety line under every leap card.
import { type CalendarDate, leapWeek, trailWeek, TRAIL_WEEKS } from './weeks.ts';

interface Leap {
  /** Around this week, counted from the due date. */
  week: number;
  notice: string;
  capture: string;
}

/** `{naam}` is the child's first name. */
export const LEAPS: readonly Leap[] = [
  { week: 5, notice: 'Misschien wil {naam} een paar dagen vaker gedragen worden.', capture: 'hoe {naam} jouw gezicht van dichtbij bekijkt' },
  { week: 8, notice: 'Misschien slaapt {naam} een paar nachten wat onrustiger dan je gewend bent.', capture: 'een lachje of geluidje terug als je tegen {naam} praat' },
  { week: 12, notice: 'Misschien even wat onrustiger, en daarna meer kijken, kirren en lachen.', capture: 'het moment dat {naam} de eigen handjes ontdekt' },
  { week: 17, notice: 'Misschien zijn de nachten een paar dagen wat korter en wil {naam} meer bij je zijn.', capture: 'een kraai of giecheltje als jij gekke bekken trekt' },
  { week: 26, notice: 'Misschien een paar dagen meer bij je willen zijn of wat slechter slapen.', capture: 'het eerste ‘gesprekje’ waarin {naam} terugbrabbelt' },
  { week: 36, notice: 'Misschien is {naam} even wat eenkenniger en graag dicht bij jou.', capture: 'het gezicht van {naam} bij een spelletje kiekeboe' },
  { week: 44, notice: 'Misschien zit {naam} een paar dagen het liefst bij jou op schoot.', capture: 'het grote uitpakspel: alles uit de mand of de doos' },
  { week: 53, notice: 'Misschien vindt {naam} afscheid nemen een paar dagen extra lastig.', capture: 'jullie lievelingsspelletje, zoals klappen, zwaaien of verstoppen' },
  { week: 62, notice: 'Misschien wat meer protest, en daarna juist weer heel graag bij jou.', capture: 'zelf eten met de vingers, met alle rommel van dien' },
  { week: 73, notice: 'Misschien een paar dagen wat eigenwijzer, en tegelijk extra aanhankelijk.', capture: 'hoe {naam} jou nadoet, met de bezem of de telefoon' },
];

export const LEAP_DISCLAIMER =
  'Een ruwe schatting vanaf de uitgerekende datum: het kan eerder, later of nauwelijks merkbaar zijn. Twijfel je? Het consultatiebureau helpt.';
export const LEAP_SAFETY = 'Koorts, veel minder drinken of ontroostbaar huilen? Dat is geen sprongetje: bel de huisarts of huisartsenpost.';

/** Shown from this many weeks before a leap. */
const AHEAD = 6;

export interface LeapCard {
  kind: 'leap' | 'between' | 'early';
  title: string;
  /** "over zo’n 3 weken", "over ongeveer een week", "rond nu" (leap cards only). */
  when?: string;
  notice: string;
  /** The whole line, starting "Mooi om vast te pinnen: …". */
  capture: string;
  disclaimer?: string;
  safety?: string;
}

const named = (line: string, name: string) => line.replaceAll('{naam}', name);
const capture = (idea: string, name: string) => `Mooi om vast te pinnen: ${named(idea, name)}`;

/** The leap card for today, or null once the leaps are over or a leap would fall after the trail ends. */
export function leapCard(name: string, dueDate: CalendarDate, birthDate: CalendarDate, today: CalendarDate): LeapCard | null {
  const now = leapWeek(dueDate, today);
  if (now < -1) {
    return {
      kind: 'early',
      title: 'Eerst rustig aan',
      notice: named('Sprongetjes tellen we vanaf de uitgerekende datum, dus voor {naam} wat later.', name),
      capture: 'Mooi om vast te pinnen: een klein handje om jouw vinger',
    };
  }
  // The card stays one week past a leap ("rond nu"), then moves on.
  const leap = LEAPS.find((l) => l.week - now >= -1);
  if (!leap) return null;
  // A leap after the trail's last week (babies born six weeks or more early) is left out.
  const leapDay = addDays(dueDate, (leap.week - 1) * 7);
  if (trailWeek(birthDate, leapDay) > TRAIL_WEEKS) return null;
  const away = leap.week - now;
  if (away > AHEAD) {
    return {
      kind: 'between',
      title: 'Even geen sprongetje in zicht',
      notice: named('Tijd om te genieten van alles wat {naam} nu doet.', name),
      capture: 'Mooi om vast te pinnen: een gewone dag, precies zoals hij is.',
      disclaimer: LEAP_DISCLAIMER,
    };
  }
  return {
    kind: 'leap',
    // Never certain, also before it comes (child-development-reviewer, 21 October 2026).
    title: 'Misschien een sprongetje',
    when: away <= 0 ? 'rond nu' : away === 1 ? 'over ongeveer een week' : `over zo’n ${away} weken`,
    notice: named(leap.notice, name),
    capture: capture(leap.capture, name),
    disclaimer: LEAP_DISCLAIMER,
    safety: LEAP_SAFETY,
  };
}

function addDays(date: CalendarDate, days: number): CalendarDate {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10) as CalendarDate;
}

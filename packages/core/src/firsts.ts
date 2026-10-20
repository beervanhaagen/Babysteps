// A3b "Welke eerste keer?" (board Add-first, spec "Pad 2.0"): firsts to pick from, in six kinds.
// Wording checked by child-development-reviewer (20 October 2026): things that happened, never
// advice or a checklist, and food and sleep words that make no claims. Each kind has a soft-block colour (a token name in packages/ui) and each first a 24×24 line icon.
// No ages or weeks: a list to choose from, not a checklist. Typing your own always works; a first
// is stored as its label only, and the card finds its icon by matching that label.

export type FirstKindId = 'bewegen' | 'eten' | 'geluid' | 'samen' | 'slapen' | 'groeien';

export interface FirstKind {
  id: FirstKindId;
  title: string;
  /** Token name of the kind's colour. */
  tone: 'apricot' | 'sunshine' | 'butter' | 'lilac' | 'cornflower' | 'pistachio';
}

export interface FirstItem {
  id: string;
  label: string;
  kind: FirstKindId;
  /** SVG path data on a 24×24 grid, drawn as a 2.2px ink line. */
  icon: string;
}

export const FIRST_KINDS: FirstKind[] = [
  { id: 'bewegen', title: 'Bewegen', tone: 'apricot' },
  { id: 'eten', title: 'Eten en drinken', tone: 'sunshine' },
  { id: 'geluid', title: 'Geluidjes en gebaren', tone: 'butter' },
  { id: 'samen', title: 'Samen', tone: 'lilac' },
  { id: 'slapen', title: 'Slapen en badderen', tone: 'cornflower' },
  { id: 'groeien', title: 'Groeien en uitjes', tone: 'pistachio' },
];

/** A circle as path data, for icons that combine shapes. */
const c = (x: number, y: number, r: number) => `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;

const ITEMS: [FirstKindId, string, string, string][] = [
  ['bewegen', 'hoofdje', 'Hoofdje opgetild', `${c(16, 9, 2.5)} M4 18 C 6 14, 10 13, 14 13 M3 19 H21`],
  ['bewegen', 'omgerold', 'Omgerold', 'M5 12 a7 7 0 0 1 12 -5 M17 4 V7 H14 M19 12 a7 7 0 0 1 -12 5 M7 20 V17 H10'],
  ['bewegen', 'gezeten', 'Los gezeten', `${c(12, 6, 2.5)} M12 9 V14 M6 19 C6 16, 9 14, 12 14 C15 14, 18 16, 18 19 M9 11 L7 13 M15 11 L17 13`],
  ['bewegen', 'gekropen', 'Gekropen', `${c(18, 8, 2)} M5 12 C8 9, 13 9, 16 10 M15 11 L16 17 M7 11 L5 17 M3 17 H21`],
  ['bewegen', 'staan', 'Zelf gaan staan', `${c(9, 5, 2)} M9 7 V14 M9 14 L7 20 M9 14 L11 20 M9 10 H15 M15 9 H21 M17 9 V20 M21 9 V20`],
  ['bewegen', 'stapjes', 'Eerste stapjes', `M4.5 8 a2.5 4 0 1 0 5 0 a2.5 4 0 1 0 -5 0 ${c(7, 15.5, 1.5)} M14.5 11 a2.5 4 0 1 0 5 0 a2.5 4 0 1 0 -5 0 ${c(17, 18.5, 1.5)}`],
  ['eten', 'hapje', 'Eerste hapje', 'M12 3 C9.5 3 9 5.5 9 7 C9 8.8 10.3 10 12 10 C13.7 10 15 8.8 15 7 C15 5.5 14.5 3 12 3 Z M12 10 V21'],
  ['eten', 'groente', 'Eerste groente', 'M4 20 L8.5 10.5 C9.5 8.5 12.5 8 14.5 9.5 C16 11 15.5 14.5 13.5 15.5 Z M14 9 L17 4 M15 10 L20 7 M7 15 L9 16 M9.5 12.5 L11.5 13.5'],
  ['eten', 'fruit', 'Eerste fruit', 'M12 7 C9 5, 5 6, 5 11 C5 16, 8 20, 10 20 C11 20, 11.5 19.5, 12 19.5 C12.5 19.5, 13 20, 14 20 C16 20, 19 16, 19 11 C19 6, 15 5, 12 7 Z M12 7 C12 5, 13 3.5, 15 3'],
  ['eten', 'beker', 'Uit een bekertje gedronken', 'M7 9 H17 L16 20 H8 Z M9 9 V6 C9 5 10 4 12 4 C14 4 15 5 15 6 V9 M17 12 H19 C20 12 20 15 19 15 H16.5'],
  ['eten', 'zelfeten', 'Zelf gegeten', 'M3 11 H21 C21 16 17 20 12 20 C7 20 3 16 3 11 Z M9 11 C9 8 11 7 12 5 M14 11 C14 9 15 8 16 7'],
  ['eten', 'korst', 'Eerste stukje brood', 'M6 21 V11 C3 10 3 4 8 4 H16 C21 4 21 10 18 11 V21 Z M9 14 h0.01 M14 16 h0.01 M12 11 h0.01'],
  ['geluid', 'lachje', 'Eerste lachje', `${c(12, 12, 9)} M8 14 C9.5 16.5 14.5 16.5 16 14 M9 9.5 h0.01 M15 9.5 h0.01`],
  ['geluid', 'hardop', 'Hardop gelachen', `${c(12, 12, 9)} M7.5 13 H16.5 C16.5 16 14.5 18 12 18 C9.5 18 7.5 16 7.5 13 Z M8 8.5 L10 9.5 L8 10.5 M16 8.5 L14 9.5 L16 10.5`],
  ['geluid', 'brabbel', 'Eerste gebrabbel', 'M4 5 H20 V16 H11 L6 20 V16 H4 Z M7.5 11 C8.5 9 9.5 9 10.5 11 C11.5 13 12.5 13 13.5 11 C14.5 9 15.5 9 16.5 11'],
  ['geluid', 'woordje', 'Eerste woordje', 'M4 5 H20 V16 H11 L6 20 V16 H4 Z M8 9.5 H16 M8 12.5 H13'],
  ['geluid', 'gezwaaid', 'Gezwaaid', 'M7 11 V6 a1.5 1.5 0 0 1 3 0 V10 M10 10 V4.5 a1.5 1.5 0 0 1 3 0 V10 M13 10 V5.5 a1.5 1.5 0 0 1 3 0 V12 M16 12 V9 a1.5 1.5 0 0 1 3 0 V14 C19 18 16.5 21 13 21 C10 21 8 19.5 6.5 17 L4.5 13.5 C3.8 12.3 5.3 11.2 6.3 12.2 L7 13 M3 5 C3.5 3.8 4.3 3 5.5 2.5'],
  ['geluid', 'geklapt', 'Geklapt', 'M9 21 C6 19 5 16 6 12 L8 6 C8.5 4.5 10.5 5 10 6.5 L9 10 M15 21 C18 19 19 16 18 12 L16 6 C15.5 4.5 13.5 5 14 6.5 L15 10 M12 3 V1.5 M8 3 L7 2 M16 3 L17 2'],
  ['samen', 'kiekeboe', 'Kiekeboe gespeeld', `${c(12, 13, 8)} M6 10 H11 M13 10 H18 M9.5 16 C10.5 17 13.5 17 14.5 16`],
  ['samen', 'knuffel', 'Knuffel terug', 'M12 20 C4 14 2 9 5 6 C8 3 11 5 12 8 C13 5 16 3 19 6 C22 9 20 14 12 20 Z'],
  ['samen', 'kusje', 'Kusje gegeven', 'M3 12 C6 8 9 8 12 10 C15 8 18 8 21 12 C18 16 15 17 12 17 C9 17 6 16 3 12 Z M3 12 H21'],
  ['samen', 'wijzen', 'Iets aangewezen', 'M9 21 V11 C9 10 11 10 11 11 V4 C11 2.8 13 2.8 13 4 V12 M13 10.5 C13 9.5 15 9.5 15 10.5 V12 M15 11 C15 10 17 10 17 11 V15 C17 18.5 15 21 12 21 Z'],
  ['samen', 'lievelings', 'Lievelingsknuffel', 'M8 7.5 a2 2 0 1 1 -2.5 -2.5 M16 7.5 a2 2 0 1 0 2.5 -2.5 M12 6 C16 6 18 9 18 12 C18 16 15 19 12 19 C9 19 6 16 6 12 C6 9 8 6 12 6 Z M10 11 h0.01 M14 11 h0.01 M10.5 14.5 C11.5 15.5 12.5 15.5 13.5 14.5'],
  ['samen', 'spiegel', 'Spiegel ontdekt', 'M7 9 a5 6 0 1 0 10 0 a5 6 0 1 0 -10 0 M12 15 V21 M9.5 21 H14.5 M10 6.5 C9.5 7 9.2 8 9.2 9'],
  ['slapen', 'doorgeslapen', 'Doorgeslapen', 'M20 14 A8 8 0 1 1 10 4 A6.5 6.5 0 0 0 20 14 Z M17 4 V7 M15.5 5.5 H18.5'],
  ['slapen', 'bedje', 'Naar het grote bed', 'M4 6 V20 M20 6 V20 M4 9 H20 M4 17 H20 M8 9 V17 M12 9 V17 M16 9 V17'],
  ['slapen', 'badje', 'Eerste badje', `M3 12 H21 V14 C21 17 18 19 15 19 H9 C6 19 3 17 3 14 Z M7 19 L6 21 M17 19 L18 21 M6 12 V5 C6 3.8 7 3 8 3 C9 3 10 3.8 10 5 ${c(15, 7.5, 1.5)} ${c(19, 5, 1)}`],
  ['slapen', 'spetteren', 'Gespetterd', 'M12 3 C12 3 7 9 7 13 a5 5 0 0 0 10 0 C17 9 12 3 12 3 Z M4 6 C4 6 2.5 8 2.5 9 a1.5 1.5 0 0 0 3 0 C5.5 8 4 6 4 6 Z M20 4 C20 4 18.5 6 18.5 7 a1.5 1.5 0 0 0 3 0 C21.5 6 20 4 20 4 Z'],
  ['slapen', 'zwemmen', 'Eerste keer in het zwembad', 'M2 9 C4 7 6 7 8 9 C10 11 12 11 14 9 C16 7 18 7 20 9 L22 10 M2 15 C4 13 6 13 8 15 C10 17 12 17 14 15 C16 13 18 13 20 15 L22 16'],
  ['slapen', 'inslaap', 'Zelf in slaap gevallen', 'M4 7 H9 L4 13 H9 M12 11 H16 L12 16 H16 M17 4 H20 L17 8 H20'],
  ['groeien', 'tandje', 'Eerste tandje', 'M7 3 C4.5 3 3.5 5 4 8 C4.5 11 5.5 13 6 16 C6.5 19 7 21 8 21 C9.5 21 9.5 16 12 16 C14.5 16 14.5 21 16 21 C17 21 17.5 19 18 16 C18.5 13 19.5 11 20 8 C20.5 5 19.5 3 17 3 C15 3 14 4 12 4 C10 4 9 3 7 3 Z'],
  ['groeien', 'knipbeurt', 'Eerste knipbeurt', `${c(6, 6, 2.5)} ${c(6, 18, 2.5)} M8 7.5 L20 18 M8 16.5 L20 6`],
  ['groeien', 'schoentjes', 'Eerste schoentjes', 'M3 16 V9 C3 8 4 7 5 7 H8 L10 10 C12 11.5 15 12 18 12.5 C20 13 21 14 21 16 V17 H3 Z M3 14 H21 M10 10 L11.5 8.5 M12.5 11 L14 9.5'],
  ['groeien', 'teentjes', 'Teentjes ontdekt', 'M6 21 C4 18 5 14 6 11 C7 8 9 8 11 10 C13 12 13 15 15 17 C17 19 13 22 6 21 Z M10.5 5.5 h0.01 M14 6.5 h0.01 M16.5 9 h0.01 M18 12 h0.01'],
  ['groeien', 'wandeling', 'Eerste wandeling', `M5 11 A7 7 0 0 1 12 4 V11 Z M5 11 H19 C19 14 16.5 16 12 16 C7.5 16 5 14 5 11 Z M19 11 L21 6 ${c(8.5, 19.5, 1.5)} ${c(15.5, 19.5, 1.5)}`],
  ['groeien', 'strand', 'Naar het strand', `${c(11, 9, 3)} M11 3 V4 M5 9 H6 M16 9 H17 M6.8 4.8 L7.5 5.5 M15.2 4.8 L14.5 5.5 M2 16 C4 14 6 14 8 16 C10 18 12 18 14 16 C16 14 18 14 20 16 L22 17 M3 20.5 H21`],
  ['groeien', 'vakantie', 'Eerste vakantie', 'M4 8 H20 V19 H4 Z M9 8 V5.5 C9 4.7 9.7 4 10.5 4 H13.5 C14.3 4 15 4.7 15 5.5 V8 M9 8 V19 M15 8 V19'],
];

export const FIRSTS: FirstItem[] = ITEMS.map(([kind, id, label, icon]) => ({ id, label, kind, icon }));

/** A first the parent typed themselves: a star on butter. */
export const OWN_FIRST_ICON = 'M12 3 L14.6 8.6 L20.6 9.3 L16.1 13.4 L17.3 19.4 L12 16.4 L6.7 19.4 L7.9 13.4 L3.4 9.3 L9.4 8.6 Z';

const normal = (s: string) => s.trim().toLocaleLowerCase('nl-NL');

/** The catalogue entry for a stored label, if it is one (case and spaces don't matter). */
export function findFirst(label: string | null | undefined): FirstItem | undefined {
  if (!label) return undefined;
  const wanted = normal(label);
  return FIRSTS.find((f) => normal(f.label) === wanted);
}

export function firstKind(id: FirstKindId): FirstKind {
  return FIRST_KINDS.find((k) => k.id === id)!;
}

/** For the label on a card: the icon and colour of a first, or the star for one of your own. */
export function firstLook(label: string | null | undefined): { icon: string; tone: FirstKind['tone'] } {
  const item = findFirst(label);
  return item ? { icon: item.icon, tone: firstKind(item.kind).tone } : { icon: OWN_FIRST_ICON, tone: 'butter' };
}

/** A3b's search: firsts whose label contains the words typed, in catalogue order. */
export function searchFirsts(query: string, kind?: FirstKindId): FirstItem[] {
  const q = normal(query);
  return FIRSTS.filter((f) => (q ? normal(f.label).includes(q) : !kind || f.kind === kind));
}

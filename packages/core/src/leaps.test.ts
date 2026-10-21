import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEAP_DISCLAIMER, LEAP_SAFETY, LEAPS, leapCard } from './leaps.ts';

// Born on the due date, 1 March 2026: leap week = trail week.
const due = '2026-03-01' as const;
const on = (days: number) => new Date(Date.UTC(2026, 2, 1 + days)).toISOString().slice(0, 10) as `${number}-${number}-${number}`;
const inWeek = (week: number) => on((week - 1) * 7);

test('ten leaps at the commonly cited weeks, in order', () => {
  assert.deepEqual(LEAPS.map((l) => l.week), [5, 8, 12, 17, 26, 36, 44, 53, 62, 73]);
});

test('six weeks ahead the card says roughly when', () => {
  const card = leapCard('Lotte', due, due, inWeek(20))!;
  assert.equal(card.kind, 'leap');
  assert.equal(card.when, 'over zo’n 6 weken');
  assert.equal(card.title, 'Misschien een sprongetje');
  assert.equal(card.capture, 'Mooi om vast te pinnen: het eerste ‘gesprekje’ waarin Lotte terugbrabbelt');
  assert.equal(card.safety, LEAP_SAFETY);
  assert.equal(card.disclaimer, LEAP_DISCLAIMER);
});

test('one week ahead, and "rond nu" from the week itself until a week after', () => {
  assert.equal(leapCard('Lotte', due, due, inWeek(25))!.when, 'over ongeveer een week');
  assert.equal(leapCard('Lotte', due, due, inWeek(26))!.when, 'rond nu');
  assert.equal(leapCard('Lotte', due, due, inWeek(26))!.title, 'Misschien een sprongetje');
  assert.equal(leapCard('Lotte', due, due, inWeek(27))!.when, 'rond nu');
  assert.equal(leapCard('Lotte', due, due, inWeek(28))!.kind, 'between');
});

test('between leaps a quiet card, without a time and without the safety line', () => {
  const card = leapCard('Noa', due, due, inWeek(19))!;
  assert.equal(card.kind, 'between');
  assert.equal(card.when, undefined);
  assert.equal(card.safety, undefined);
  assert.equal(card.notice, 'Tijd om te genieten van alles wat Noa nu doet.');
});

test('weeks count from the due date: a baby born four weeks early sees the first leap later', () => {
  const born = on(-28);
  assert.equal(leapCard('Max', due, born, on(-21))!.kind, 'early');
  assert.equal(leapCard('Max', due, born, inWeek(3))!.when, 'over zo’n 2 weken');
});

test('after the last leap, and for a leap past the end of the trail, no card', () => {
  assert.equal(leapCard('Lotte', due, due, inWeek(75)), null);
  // Born seven weeks early: leap week 73 falls after trail week 78.
  assert.equal(leapCard('Max', due, on(-49), inWeek(70)), null);
});

test('no pronouns ("zijn" is also a verb, so not checked) and never the wording of published leap books', () => {
  const all = LEAPS.flatMap((l) => [l.notice, l.capture]).join(' ').toLowerCase() + ` ${LEAP_DISCLAIMER} ${LEAP_SAFETY}`.toLowerCase();
  for (const word of [' ze ', ' zij ', ' hij ', ' haar ', 'huilerig', 'hangerig', 'humeurig', 'oei', 'wereld van', 'richtlijn']) {
    assert.equal(all.includes(word), false, word);
  }
});

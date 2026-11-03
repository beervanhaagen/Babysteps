import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atWeek, daysBetween, leapWeek, trailWeek, weekName, weekShort } from './weeks.ts';

test('the birth day is week 1', () => {
  assert.equal(trailWeek('2026-03-01', '2026-03-01'), 1);
  assert.equal(trailWeek('2026-03-01', '2026-03-07'), 1);
  assert.equal(trailWeek('2026-03-01', '2026-03-08'), 2);
});

test('summer time does not shift a week', () => {
  // Clocks go forward on 29 March 2026 in the Netherlands.
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(trailWeek('2026-03-23', '2026-03-30'), 2);
});

test('leaps count from the due date, not the birth date', () => {
  // Born two weeks early: week 3 on the trail is still week 1 for leaps.
  const born = '2026-03-01';
  const due = '2026-03-15';
  const on = '2026-03-16';
  assert.equal(trailWeek(born, on), 3);
  assert.equal(leapWeek(due, on), 1);
});

test('days before the start give week 0 or less', () => {
  assert.equal(leapWeek('2026-03-15', '2026-03-10'), 0);
});

test('from the first birthday the trail says the age, not the week', () => {
  assert.equal(weekName(31), 'Week 31');
  assert.equal(weekName(52), 'Week 52');
  assert.equal(weekName(53), '1 jaar');
  assert.equal(weekName(54), '1 jaar en 1 week');
  assert.equal(weekName(60), '1 jaar en 7 weken');
  assert.equal(atWeek(31), 'in week 31');
  assert.equal(atWeek(57), 'op 1 jaar en 4 weken');
  assert.equal(weekShort(31), '31');
  assert.equal(weekShort(57), '1j 4w');
});

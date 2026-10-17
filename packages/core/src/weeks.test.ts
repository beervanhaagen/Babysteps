import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysBetween, leapWeek, trailWeek } from './weeks.ts';

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

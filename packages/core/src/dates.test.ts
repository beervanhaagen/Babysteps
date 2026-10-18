import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkChildDates, formatDutchDate, parseDutchDate, todayInAmsterdam, typeDutchDate } from './dates.ts';

test('reads Dutch dates and rejects impossible ones', () => {
  assert.equal(parseDutchDate('12-03-2026'), '2026-03-12');
  assert.equal(parseDutchDate('1/3/2026'), '2026-03-01');
  assert.equal(parseDutchDate('29-02-2027'), null);
  assert.equal(parseDutchDate('31-04-2026'), null);
  assert.equal(parseDutchDate('2026-03-12'), null);
  assert.equal(formatDutchDate('2026-03-12'), '12-03-2026');
});

test('adds dashes while typing', () => {
  assert.equal(typeDutchDate('1'), '1');
  assert.equal(typeDutchDate('1203'), '12-03');
  assert.equal(typeDutchDate('12032026'), '12-03-2026');
  assert.equal(typeDutchDate('12-03-20261'), '12-03-2026');
});

test('a born baby: birth not in the future, due date near birth', () => {
  const today = '2026-10-18';
  assert.deepEqual(checkChildDates(true, '2026-03-12', '2026-03-19', today), []);
  assert.deepEqual(checkChildDates(true, '2026-11-01', '2026-11-01', today), ['birth-future']);
  assert.deepEqual(checkChildDates(true, '2026-03-12', '2025-01-01', today), ['due-far-from-birth']);
  assert.deepEqual(checkChildDates(true, null, null, today), ['birth-format', 'due-format']);
});

test('a baby on the way: due date in the coming 44 weeks', () => {
  const today = '2026-10-18';
  assert.deepEqual(checkChildDates(false, null, '2027-01-10', today), []);
  assert.deepEqual(checkChildDates(false, null, '2026-10-15', today), [], 'a few days overdue is still on the way');
  assert.deepEqual(checkChildDates(false, null, '2026-09-20', today), ['due-past']);
  assert.deepEqual(checkChildDates(false, null, '2027-12-01', today), ['due-too-far']);
});

test('today is the Dutch calendar day, also late at night elsewhere', () => {
  // 23:30 UTC on 17 October is already 18 October in Amsterdam (summer time).
  assert.equal(todayInAmsterdam(new Date('2026-10-17T23:30:00Z')), '2026-10-18');
});

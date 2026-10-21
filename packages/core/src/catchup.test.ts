import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PER_WEEK, planCatchUp } from './catchup.ts';
import type { CalendarDate } from './weeks.ts';

const birth = '2026-03-02' as const;
const today = '2026-04-20' as const; // week 8
const p = (id: string, takenOn: string | null) => ({ id, takenOn: takenOn as CalendarDate | null });

test('photos land in the week they were taken, oldest week first', () => {
  const { weeks } = planCatchUp([p('a', '2026-03-20'), p('b', '2026-03-02'), p('c', '2026-03-08')], birth, today, []);
  assert.deepEqual(weeks.map((w) => [w.week, w.photos.map((x) => x.id)]), [[1, ['b', 'c']], [3, ['a']]]);
});

test('one photo per day is suggested, in the order taken', () => {
  const { weeks } = planCatchUp([p('b', '2026-03-03'), p('a', '2026-03-02'), p('a2', '2026-03-02'), p('c', '2026-03-04')], birth, today, []);
  assert.deepEqual(weeks[0].suggested.map((x) => x.id), ['a', 'b', 'c']);
});

test('no suggestions in a week that is already on the trail', () => {
  const { weeks } = planCatchUp([p('a', '2026-03-10')], birth, today, [2]);
  assert.equal(weeks[0].onTrail, true);
  assert.deepEqual(weeks[0].suggested, []);
});

test('no date, before the birth or in the future: left out', () => {
  const { weeks, leftOut } = planCatchUp([p('x', null), p('y', '2026-03-01'), p('z', '2026-04-21'), p('ok', '2026-04-20')], birth, today, []);
  assert.deepEqual(leftOut.map((x) => x.id), ['x', 'y', 'z']);
  assert.deepEqual(weeks.map((w) => w.week), [8]);
});

test('never more suggestions than a moment can hold', () => {
  const many = Array.from({ length: 7 }, (_, d) => [p(`${d}a`, `2026-03-0${d + 2}`), p(`${d}b`, `2026-03-0${d + 2}`)]).flat();
  const { weeks } = planCatchUp(many, birth, today, []);
  assert.ok(weeks[0].suggested.length <= MAX_PER_WEEK);
  assert.equal(weeks[0].suggested.length, 7);
});

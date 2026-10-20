import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_KINDS, FIRSTS, findFirst, firstLook, OWN_FIRST_ICON, searchFirsts } from './firsts.ts';
import { shortDutchDate, weekSpan } from './dates.ts';

test('37 firsts in six kinds, every label and id once', () => {
  assert.equal(FIRSTS.length, 37);
  assert.equal(FIRST_KINDS.length, 6);
  assert.equal(new Set(FIRSTS.map((f) => f.label)).size, 37);
  assert.equal(new Set(FIRSTS.map((f) => f.id)).size, 37);
  for (const kind of FIRST_KINDS) assert.ok(FIRSTS.some((f) => f.kind === kind.id), kind.title);
});

test('a stored label finds its icon, whatever the case or spaces', () => {
  assert.equal(findFirst('  eerste HAPJE ')?.id, 'hapje');
  assert.equal(firstLook('Los gezeten').tone, 'apricot');
  assert.deepEqual(firstLook('De kat geaaid'), { icon: OWN_FIRST_ICON, tone: 'butter' });
});

test('search looks in every kind; without a query a kind filters', () => {
  assert.deepEqual(searchFirsts('tand').map((f) => f.id), ['tandje']);
  assert.equal(searchFirsts('', 'samen').length, 6);
  assert.equal(searchFirsts('').length, 37);
});

test('no ages, weeks or months in the list: it is not a checklist', () => {
  for (const f of FIRSTS) assert.doesNotMatch(f.label, /\d|week|maand/i, f.label);
});

test('short dates and week spans in Dutch', () => {
  assert.equal(shortDutchDate('2026-10-17'), 'za 17 okt');
  assert.equal(weekSpan('2026-03-30', 30), '19 – 25 okt');
  assert.equal(weekSpan('2026-03-30', 27), '28 sep – 4 okt');
});

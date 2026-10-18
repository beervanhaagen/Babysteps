import { test } from 'node:test';
import assert from 'node:assert/strict';
import { possessive } from './names.ts';

test('Dutch possessives follow the house rules', () => {
  assert.equal(possessive('Lotte'), 'Lottes');
  assert.equal(possessive('Sam'), 'Sams');
  assert.equal(possessive('Noa'), "Noa's");
  assert.equal(possessive('Timo'), "Timo's");
  assert.equal(possessive('Max'), "Max'");
  assert.equal(possessive('Guus'), "Guus'");
  assert.equal(possessive('Liz'), "Liz'");
  assert.equal(possessive('Rémy'), "Rémy's");
  assert.equal(possessive(' Lotte '), 'Lottes');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const { comboSaving } = require('../services/combos');

const shuddh = { category: 'thekua', weight: '400g' };
const regular = { category: 'thekua', weight: '400g', oilFried: true };
const small = { category: 'thekua', weight: '200g' };
const nimki = { category: 'nimki', weight: '250g' };
const sattu = { category: 'sattu', weight: '400g' };

test('combo: thekua + nimki pair, trio extra, regular smaller, no saving without nimki', () => {
  assert.equal(comboSaving([{ product: shuddh, quantity: 1 }, { product: nimki, quantity: 1 }]).amount, 49);
  assert.equal(comboSaving([{ product: regular, quantity: 1 }, { product: nimki, quantity: 1 }]).amount, 29);
  assert.equal(comboSaving([{ product: shuddh, quantity: 1 }, { product: nimki, quantity: 1 }, { product: sattu, quantity: 1 }]).amount, 78);
  assert.equal(comboSaving([{ product: shuddh, quantity: 1 }, { product: sattu, quantity: 1 }]).amount, 0);
  assert.equal(comboSaving([{ product: small, quantity: 1 }, { product: nimki, quantity: 1 }]).amount, 0);
  // 2 thekua (one shuddh, one regular) + 1 nimki: nimki pairs with the shuddh one
  assert.equal(comboSaving([{ product: regular, quantity: 1 }, { product: shuddh, quantity: 1 }, { product: nimki, quantity: 1 }]).amount, 49);
  // 2 shuddh + 3 nimki + 5 sattu: 2 pairs, 2 trios
  assert.equal(comboSaving([{ product: shuddh, quantity: 2 }, { product: nimki, quantity: 3 }, { product: sattu, quantity: 5 }]).amount, 2 * 49 + 2 * 29);
});

/**
 * Combo savings ("Frequently bought together").
 *
 * A 400 g thekua bought together with a nimki pack gets a fixed saving, and adding sattu to that
 * pair saves a bit more. The saving is worked out here on the server from real cart lines, so it
 * can't be faked from the browser, and it applies whether the items were added together or one by one.
 *
 * Switched off (13 Nov 2026): add-ons sell at full price. Nimki adds ~₹50 profit to an order at
 * full price but only ~₹10-30 with a combo saving once the bigger courier slab is paid, and the
 * first-order ₹100 off already does the job of pulling people in. Set amounts > 0 to bring it back.
 */
const COMBOS = {
  // per thekua + nimki pair
  pair: { shuddh: 0, regular: 0 },
  // extra per thekua + nimki + sattu trio
  trioExtra: 0,
};

const isThekua400 = (p) => p && p.category === 'thekua' && !p.isBundle && /^400\s?g/i.test(String(p.weight || ''));
const isNimki = (p) => p && p.category === 'nimki' && !p.isBundle;
const isSattu = (p) => p && p.category === 'sattu' && !p.isBundle;

/**
 * @param {Array<{product: Object, quantity: number}>} lines  product docs with quantities
 * @returns {{ amount: number, pairs: number, trios: number, label: string|null }}
 */
function comboSaving(lines, cfg = COMBOS) {
  let nimki = 0; let sattu = 0;
  const thekua = []; // one entry per pack: saving for that pack's pair
  for (const { product, quantity } of lines || []) {
    const q = Math.max(0, Number(quantity) || 0);
    if (isNimki(product)) nimki += q;
    else if (isSattu(product)) sattu += q;
    else if (isThekua400(product)) {
      const per = product.oilFried ? cfg.pair.regular : cfg.pair.shuddh;
      for (let i = 0; i < q; i += 1) thekua.push(per);
    }
  }
  thekua.sort((a, b) => b - a); // pair nimki with the biggest-saving thekua first
  const pairs = Math.min(thekua.length, nimki);
  const trios = Math.min(pairs, sattu);
  const amount = thekua.slice(0, pairs).reduce((s, v) => s + v, 0) + trios * cfg.trioExtra;
  return {
    amount,
    pairs,
    trios,
    label: amount > 0 ? 'Combo saving' : null,
  };
}

module.exports = { comboSaving, COMBOS };

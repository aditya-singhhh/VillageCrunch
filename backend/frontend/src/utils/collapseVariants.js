// Shop lists show one card per recipe type (e.g. Shuddh Desi Ghee, Regular) instead of every
// size + sweetener. The card links to the gud 400 g pack when it exists; the product page has the rest.
const score = (p) => (/gud|jaggery/i.test(p.sweetener || '') ? 2 : 0) + (/^400\s*g/i.test(p.weight || '') ? 1 : 0);

export default function collapseVariants(list) {
  const index = new Map();
  const out = [];
  for (const p of list) {
    if (!p.packGroup || !p.variant || p.isBundle) { out.push(p); continue; }
    const key = `${p.packGroup}|${p.variant}`;
    if (!index.has(key)) { index.set(key, out.length); out.push(p); continue; }
    const i = index.get(key);
    if (score(p) > score(out[i])) out[i] = p;
  }
  return out;
}

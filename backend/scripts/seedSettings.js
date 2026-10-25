/**
 * Store-wide pricing settings. Safe to re-run. Runs with the "seed-products" workflow action.
 *   - Prices are final (MRP, all taxes included); nothing is added at checkout
 *   - GST line hidden for now (taxRate 0). If your CA says you must show GST, set
 *     taxRate to 5 here: it will appear as "Includes GST" without changing the price.
 */
const db = require('../db');
const Settings = require('../models/Settings');

(async () => {
  await db.connect();
  try {
    const s = await Settings.getSettings();
    s.pricing = { ...s.toObject().pricing, taxRate: 0, pricesIncludeTax: true, codCharges: 49 };
    await s.save();
    console.log('::notice::Pricing: prices are final, no tax added at checkout. COD charge ₹49.');
  } finally {
    await db.disconnect();
  }
})().catch((e) => { console.error(e); process.exit(1); });

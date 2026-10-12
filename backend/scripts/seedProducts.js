/**
 * Load the starter catalogue (scripts/seedProducts.json taken from the shop's own
 * product export) into Firestore. Safe to re-run: products that already exist are skipped.
 *
 *   FIREBASE_PROJECT_ID=... node scripts/seedProducts.js
 */
const db = require('../db');
const Product = require('../models/Product');
const products = require('./seedProducts.json');
// Products whose name/price/images follow the real packaging; re-running the seed refreshes them.
const REFRESH = new Set([
  '697a51ed6d805b30e09a52da', '697a51ed6d805b30e09a52db', '697a51ed6d805b30e09a52dc', '697a51ed6d805b30e09a52e0',
  '697a51ed6d805b30e09a52e1', '697a51ed6d805b30e09a52e2', '697a51ed6d805b30e09a52e3', '697a51ed6d805b30e09a52e4', '697a51ed6d805b30e09a52e5',
  '69e3585293621137e26e18ca', '697a51ed6d805b30e09a52d8', '697a51ed6d805b30e09a52d9', '69e3585393621137e26e18cd', '697a51ed6d805b30e09a52f1', '697a51ed6d805b30e09a52f2',
  '697a51ed6d805b30e09a52d6', '697a51ed6d805b30e09a52d7', '697a51ed6d805b30e09a52d3', '697a51ed6d805b30e09a52d4', '697a51ed6d805b30e09a52d5', '697a51ed6d805b30e09a52d2',
]);
const REFRESH_FIELDS = ['name', 'price', 'originalPrice', 'weight', 'image', 'images', 'ingredients', 'benefits', 'description',
  'isActive', 'packGroup', 'packLabel', 'packNote', 'packOrder', 'isBundle'];

(async () => {
  await db.connect();
  let created = 0, skipped = 0, refreshed = 0;
  try {
    for (const p of products) {
      if (await Product.findById(p._id)) {
        // Packaging refresh: keep stock/ratings/etc., but bring names, prices and pack shots up to date.
        if (REFRESH.has(p._id)) {
          const set = {};
          for (const f of REFRESH_FIELDS) if (p[f] !== undefined) set[f] = p[f];
          await Product.findByIdAndUpdate(p._id, { $set: set });
          refreshed += 1;
        } else skipped += 1;
        continue;
      }
      await Product.create(p);
      created += 1;
    }
  } finally {
    await db.disconnect();
  }
  console.log(`Products: ${created} created, ${skipped} already existed, ${refreshed} refreshed.`);
})().catch((e) => { console.error(e); process.exit(1); });

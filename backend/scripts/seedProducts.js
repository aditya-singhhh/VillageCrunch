/**
 * Load the starter catalogue (scripts/seedProducts.json, 13 products taken from the shop's own
 * product export) into Firestore. Safe to re-run: products that already exist are skipped.
 *
 *   FIREBASE_PROJECT_ID=... node scripts/seedProducts.js
 */
const db = require('../db');
const Product = require('../models/Product');
const products = require('./seedProducts.json');
// Products whose name/price/images follow the real packaging; re-running the seed refreshes them.
const REFRESH = new Set(['697a51ed6d805b30e09a52da', '697a51ed6d805b30e09a52dc']);

(async () => {
  await db.connect();
  let created = 0, skipped = 0, refreshed = 0;
  try {
    for (const p of products) {
      if (await Product.findById(p._id)) {
        // Packaging refresh: keep stock/ratings/etc., but bring names, prices and pack shots up to date.
        if (REFRESH.has(p._id)) {
          await Product.findByIdAndUpdate(p._id, { $set: { name: p.name, price: p.price, originalPrice: p.originalPrice, weight: p.weight, image: p.image, images: p.images, ingredients: p.ingredients, description: p.description } });
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

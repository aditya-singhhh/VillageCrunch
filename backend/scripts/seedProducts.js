/**
 * Load the starter catalogue (scripts/seedProducts.json, 13 products taken from the shop's own
 * product export) into Firestore. Safe to re-run: products that already exist are skipped.
 *
 *   FIREBASE_PROJECT_ID=... node scripts/seedProducts.js
 */
const db = require('../db');
const Product = require('../models/Product');
const products = require('./seedProducts.json');

(async () => {
  await db.connect();
  let created = 0, skipped = 0;
  try {
    for (const p of products) {
      if (await Product.findById(p._id)) { skipped += 1; continue; }
      await Product.create(p);
      created += 1;
    }
  } finally {
    await db.disconnect();
  }
  console.log(`Products: ${created} created, ${skipped} already existed.`);
})().catch((e) => { console.error(e); process.exit(1); });

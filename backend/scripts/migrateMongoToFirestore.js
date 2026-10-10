/**
 * One-off migration: MongoDB -> Firestore.
 *
 *   MONGODB_URI="mongodb+srv://..." FIREBASE_PROJECT_ID=my-project \
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json \
 *   node scripts/migrateMongoToFirestore.js [--dry-run] [--only users,products] [--wipe]
 *
 * - Documents keep their ObjectId (as a 24-hex string) so URLs, refs and JWTs stay valid.
 * - Every document goes through the same Mongoose schema + data layer the app uses, so
 *   validation, defaults and `_unique` marker docs are produced exactly as at runtime.
 * - Idempotent: documents that already exist in Firestore are skipped, so a failed run can be
 *   resumed. Use --wipe (with FIRESTORE_EMULATOR_HOST only) to start over locally.
 * - MongoDB is only READ. Nothing is changed or deleted there.
 */
require('dotenv').config();
const { MongoClient } = require('mongodb');
const db = require('../db');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// Order matters little (refs are plain ids) but users/products first reads naturally.
const COLLECTIONS = [
  ['users', 'User'],
  ['products', 'Product'],
  ['promocodes', 'Promocode'],
  ['campaigns', 'Campaign'],
  ['settings', 'Settings'],
  ['orders', 'Order'],
  ['liveorders', 'LiveOrder'],
  ['carts', 'Cart'],
  ['contacts', 'Contact'],
  ['customersupports', 'CustomerSupport'],
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI to the MongoDB database you are migrating FROM');
  const dryRun = flag('--dry-run');
  const only = opt('--only') ? new Set(opt('--only').split(',').map((s) => s.trim().toLowerCase())) : null;

  if (flag('--wipe') && !process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('--wipe is only allowed against the Firestore emulator (FIRESTORE_EMULATOR_HOST)');
  }

  const mongo = new MongoClient(uri);
  await mongo.connect();
  const source = mongo.db(); // database named in the URI
  await db.connect();
  const fs = db.getDb();

  const present = new Set((await source.listCollections().toArray()).map((c) => c.name.toLowerCase()));
  const summary = [];

  try {
    for (const [mongoName, modelName] of COLLECTIONS) {
      if (only && !only.has(mongoName) && !only.has(modelName.toLowerCase())) continue;
      const Model = require(`../models/${modelName}`);
      const actualName = [...present].find((n) => n === mongoName);
      if (!actualName) {
        summary.push({ collection: mongoName, read: 0, written: 0, skipped: 0, failed: 0, note: 'not in MongoDB' });
        continue;
      }
      // collection names in Mongo may be differently cased; find the real one
      const realName = (await source.listCollections().toArray()).find((c) => c.name.toLowerCase() === mongoName).name;

      if (flag('--wipe')) await wipe(fs, Model.__fs.collection);

      const stat = { collection: mongoName, read: 0, written: 0, skipped: 0, failed: 0, errors: [] };
      const cursor = source.collection(realName).find({});
      for await (const raw of cursor) {
        stat.read += 1;
        const doc = { ...raw };
        delete doc.__v;
        if (modelName === 'Settings') doc._id = 'main';
        try {
          if (dryRun) {
            await new Model(doc).validate();
            stat.written += 1;
          } else {
            await Model.create(doc);
            stat.written += 1;
          }
        } catch (err) {
          if (err.code === 6 || err.code === 11000 || /ALREADY_EXISTS|already exists/i.test(err.message)) {
            stat.skipped += 1;
          } else {
            stat.failed += 1;
            if (stat.errors.length < 5) stat.errors.push(`${raw._id}: ${err.message}`);
          }
        }
      }
      summary.push(stat);
      console.log(`${mongoName}: read ${stat.read}, ${dryRun ? 'valid' : 'written'} ${stat.written}, skipped ${stat.skipped}, failed ${stat.failed}`);
      stat.errors.forEach((e) => console.log(`   ! ${e}`));
    }
  } finally {
    await mongo.close();
    await db.disconnect();
  }

  const failed = summary.reduce((n, s) => n + (s.failed || 0), 0);
  console.log(`\n${dryRun ? 'DRY RUN - nothing written. ' : ''}${failed ? `${failed} document(s) failed - fix and re-run (safe to repeat).` : 'Done.'}`);
  if (failed) process.exitCode = 1;
}

async function wipe(fs, collection) {
  for (const name of [collection, '_unique']) {
    const snap = await fs.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

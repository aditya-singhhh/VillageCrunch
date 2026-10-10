/**
 * Firestore connection (Firebase Admin SDK).
 *
 * - On Cloud Run / Cloud Functions credentials come from the runtime service account (ADC).
 * - Locally set GOOGLE_APPLICATION_CREDENTIALS to a service-account key, or run the
 *   Firestore emulator and set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 (no credentials needed).
 */
let db = null;

function getDb() {
  if (db) return db;

  const admin = require('firebase-admin');
  const { getFirestore } = require('firebase-admin/firestore');

  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    (usingEmulator ? 'demo-villagecrunch' : undefined);

  const app = admin.apps.length ? admin.app() : admin.initializeApp(projectId ? { projectId } : undefined);
  db = process.env.FIRESTORE_DATABASE_ID ? getFirestore(app, process.env.FIRESTORE_DATABASE_ID) : getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch (_) {
    /* settings can only be applied once, before first use */
  }
  return db;
}

/** Tests inject an in-memory fake here. */
function setDb(fake) {
  db = fake;
}

/** Sentinel that removes a field on update(). */
function deleteField() {
  const d = getDb();
  if (typeof d.__fieldDelete === 'function') return d.__fieldDelete();
  return require('firebase-admin/firestore').FieldValue.delete();
}

/** Cheap connectivity probe used at startup and by /api/health. */
async function ping() {
  await getDb().collection('_health').doc('ping').get();
  return true;
}

async function connect() {
  await ping();
  const target = process.env.FIRESTORE_EMULATOR_HOST
    ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}`
    : `project ${process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || '(default credentials)'}`;
  console.log(`✅ Firestore connected: ${target}`);
}

async function disconnect() {
  if (db && typeof db.terminate === 'function') await db.terminate();
  db = null;
}

module.exports = { getDb, setDb, deleteField, ping, connect, disconnect };

/**
 * Conversion between Mongoose documents and plain Firestore data.
 *
 * Firestore only stores plain JSON-like values + Dates, so ObjectIds become 24-char
 * hex strings (the same value MongoDB used - references keep working), Maps become
 * objects, and Timestamps read back as Dates.
 */
const mongoose = require('mongoose');

const isObjectId = (v) =>
  v instanceof mongoose.Types.ObjectId || (v && typeof v === 'object' && typeof v.toHexString === 'function');

const isTimestamp = (v) =>
  v && typeof v === 'object' && typeof v.toDate === 'function' && typeof v.seconds === 'number';

const isPlainObject = (v) => {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/** Mongoose/BSON values -> Firestore-safe values. Undefined fields are dropped. */
function toPlain(value) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (isObjectId(value)) return value.toHexString();
  if (value instanceof Date) return value;
  if (value instanceof Map) return toPlain(Object.fromEntries(value));
  if (Array.isArray(value)) return value.map((v) => (v === undefined ? null : toPlain(v)));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const pv = toPlain(v);
      if (pv !== undefined) out[k] = pv;
    }
    return out;
  }
  return value;
}

/** Firestore values -> JS values (Timestamp -> Date). */
function fromFirestore(value) {
  if (value === null || value === undefined) return value;
  if (isTimestamp(value)) return value.toDate();
  if (Array.isArray(value)) return value.map(fromFirestore);
  if (typeof value === 'object' && !(value instanceof Date)) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = fromFirestore(v);
    return out;
  }
  return value;
}

/** A hydrated/new Mongoose document -> { id, data } ready to write. */
function docToPlain(doc) {
  const obj = doc.toObject({
    depopulate: true,
    flattenMaps: true,
    virtuals: false,
    getters: false,
    versionKey: false,
    minimize: false,
  });
  const plain = toPlain(obj);
  const id = String(plain._id);
  delete plain._id;
  return { id, data: plain };
}

function isEqual(a, b) {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a === null || b === null || a === undefined || b === undefined) return a == null && b == null;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => isEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).filter((k) => a[k] !== undefined);
    const kb = Object.keys(b).filter((k) => b[k] !== undefined);
    return ka.length === kb.length && ka.every((k) => isEqual(a[k], b[k]));
  }
  return false;
}

const clone = (v) => {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
};

module.exports = { toPlain, fromFirestore, docToPlain, isEqual, clone, isObjectId, isPlainObject, isTimestamp };

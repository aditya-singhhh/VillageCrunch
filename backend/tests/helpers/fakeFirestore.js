/**
 * Strict in-memory stand-in for the Firestore Admin SDK subset the data layer uses.
 * It is deliberately picky, like the real service:
 *  - rejects `undefined`, class instances (ObjectId, Map, ...) and nested arrays
 *  - returns Dates as Timestamp-like objects
 *  - create() on an existing document fails with gRPC ALREADY_EXISTS (code 6)
 *  - transactions must read before they write
 * Run the same tests against the real emulator with:
 *   firebase emulators:exec --only firestore "FIRESTORE_EMULATOR_HOST=... npm test"
 */
const DELETE = Symbol('fieldDelete');

class FakeTimestamp {
  constructor(date) {
    this._d = date;
    this.seconds = Math.floor(date.getTime() / 1000);
    this.nanoseconds = (date.getTime() % 1000) * 1e6;
  }
  toDate() {
    return new Date(this._d.getTime());
  }
}

function fsError(code, message) {
  const e = new Error(`${code === 6 ? '6 ALREADY_EXISTS' : code === 5 ? '5 NOT_FOUND' : String(code)}: ${message}`);
  e.code = code;
  return e;
}

function validate(value, path = '', inArray = false) {
  if (value === undefined) throw new Error(`Value for argument "data" is not a valid Firestore document. Cannot use "undefined" as a Firestore value (found in field "${path}")`);
  if (value === null || typeof value !== 'object') return;
  if (value instanceof Date) return;
  if (Array.isArray(value)) {
    if (inArray) throw new Error(`Nested arrays are not supported (field "${path}")`);
    value.forEach((v, i) => validate(v, `${path}[${i}]`, true));
    return;
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error(`Couldn't serialize object of type "${value.constructor.name}" (found in field "${path}"). Firestore doesn't support JavaScript objects with custom prototypes`);
  }
  for (const [k, v] of Object.entries(value)) validate(v, path ? `${path}.${k}` : k, false);
}

const store = (v) => {
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(store);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, store(x)]));
  return v;
};
const out = (v) => {
  if (v instanceof Date) return new FakeTimestamp(v);
  if (Array.isArray(v)) return v.map(out);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, out(x)]));
  return v;
};

class DocSnap {
  constructor(ref, raw) {
    this.ref = ref;
    this.id = ref.id;
    this._raw = raw;
    this.exists = raw !== undefined;
  }
  data() {
    return this.exists ? out(this._raw) : undefined;
  }
}

class DocRef {
  constructor(db, collection, id) {
    this.db = db;
    this.collection = collection;
    this.id = id;
    this.path = `${collection}/${id}`;
  }
  async get() {
    return new DocSnap(this, this.db._data(this.collection).get(this.id));
  }
  async set(data) {
    this.db._apply([{ op: 'set', ref: this, data }]);
  }
  async create(data) {
    this.db._apply([{ op: 'create', ref: this, data }]);
  }
  async update(data) {
    this.db._apply([{ op: 'update', ref: this, data }]);
  }
  async delete() {
    this.db._apply([{ op: 'delete', ref: this }]);
  }
}

class QuerySnap {
  constructor(docs) {
    this.docs = docs;
    this.size = docs.length;
    this.empty = docs.length === 0;
  }
}

class Query {
  constructor(db, collection, filters = [], limitN = null) {
    this.db = db;
    this.collectionName = collection;
    this.filters = filters;
    this.limitN = limitN;
  }
  where(field, op, value) {
    if (op !== '==') throw new Error(`Fake Firestore only supports "==" (got "${op}")`);
    if (value === undefined) throw new Error('Cannot use undefined in a where() clause');
    return new Query(this.db, this.collectionName, [...this.filters, [field, value]], this.limitN);
  }
  limit(n) {
    return new Query(this.db, this.collectionName, this.filters, n);
  }
  _run() {
    let rows = [...this.db._data(this.collectionName).entries()].filter(([, raw]) =>
      this.filters.every(([f, v]) => raw[f] === v || (raw[f] instanceof Date && v instanceof Date && raw[f].getTime() === v.getTime()))
    );
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    return rows.map(([id, raw]) => new DocSnap(new DocRef(this.db, this.collectionName, id), raw));
  }
  async get() {
    return new QuerySnap(this._run());
  }
  count() {
    return { get: async () => ({ data: () => ({ count: this._run().length }) }) };
  }
}

class CollectionRef extends Query {
  constructor(db, name) {
    super(db, name);
  }
  doc(id) {
    if (!id) throw new Error('doc() requires an id in this fake');
    return new DocRef(this.db, this.collectionName, id);
  }
}

class FakeFirestore {
  constructor() {
    this.collections = new Map();
    this.ops = { reads: 0, writes: 0 };
  }
  _data(name) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name);
  }
  collection(name) {
    return new CollectionRef(this, name);
  }
  __fieldDelete() {
    return DELETE;
  }
  async getAll(...refs) {
    if (!refs.length) throw new Error('getAll() requires at least one document reference');
    return refs.map((r) => new DocSnap(r, this._data(r.collection).get(r.id)));
  }
  /** Apply writes atomically: either all succeed or none do. */
  _apply(writes) {
    const staged = new Map(); // "collection/id" -> raw | null (deleted)
    const current = (ref) => (staged.has(ref.path) ? staged.get(ref.path) : this._data(ref.collection).get(ref.id));
    for (const w of writes) {
      const existing = current(w.ref);
      if (w.op === 'create') {
        if (existing) throw fsError(6, `Document already exists: projects/fake/databases/(default)/documents/${w.ref.path}`);
        validate(w.data);
        staged.set(w.ref.path, store(w.data));
      } else if (w.op === 'set') {
        validate(w.data);
        staged.set(w.ref.path, store(w.data));
      } else if (w.op === 'update') {
        if (!existing) throw fsError(5, `No document to update: projects/fake/databases/(default)/documents/${w.ref.path}`);
        const next = store(existing);
        for (const [k, v] of Object.entries(w.data)) {
          if (v === DELETE) delete next[k];
          else {
            validate(v, k);
            next[k] = store(v);
          }
        }
        staged.set(w.ref.path, next);
      } else if (w.op === 'delete') {
        staged.set(w.ref.path, null);
      }
    }
    for (const w of writes) {
      const val = staged.get(w.ref.path);
      if (val === null) this._data(w.ref.collection).delete(w.ref.id);
      else if (val !== undefined) this._data(w.ref.collection).set(w.ref.id, val);
      this.ops.writes += 1;
    }
  }
  batch() {
    const writes = [];
    const b = {
      create: (ref, data) => (writes.push({ op: 'create', ref, data }), b),
      set: (ref, data) => (writes.push({ op: 'set', ref, data }), b),
      update: (ref, data) => (writes.push({ op: 'update', ref, data }), b),
      delete: (ref) => (writes.push({ op: 'delete', ref }), b),
      commit: async () => this._apply(writes),
    };
    return b;
  }
  /** Transactions are serialised (a valid outcome of Firestore's optimistic retry loop). */
  runTransaction(fn) {
    const run = (this._txChain || Promise.resolve()).then(() => this._runTransaction(fn));
    this._txChain = run.catch(() => {});
    return run;
  }
  async _runTransaction(fn) {
    const writes = [];
    let wrote = false;
    const t = {
      get: async (target) => {
        if (wrote) throw new Error('Firestore transactions require all reads to be executed before all writes.');
        return target.get();
      },
      create: (ref, data) => (wrote = true, writes.push({ op: 'create', ref, data }), t),
      set: (ref, data) => (wrote = true, writes.push({ op: 'set', ref, data }), t),
      update: (ref, data) => (wrote = true, writes.push({ op: 'update', ref, data }), t),
      delete: (ref) => (wrote = true, writes.push({ op: 'delete', ref }), t),
    };
    const result = await fn(t);
    this._apply(writes);
    return result;
  }
  async terminate() {}
  /** Test helper: raw stored document. */
  raw(collection, id) {
    return this._data(collection).get(id);
  }
}

module.exports = { FakeFirestore, FakeTimestamp };

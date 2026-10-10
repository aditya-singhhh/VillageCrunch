/**
 * Firestore persistence for Mongoose schemas.
 *
 * Mongoose is used purely as a schema/validation/casting layer (defaults, enums,
 * subdocument arrays, virtuals, populate, ...). It never talks to MongoDB: every
 * read and write below goes to Firestore through the Firebase Admin SDK.
 *
 * Behaviour notes (differences from MongoDB you should know about):
 *  - Document ids are the same 24-char hex strings MongoDB used, so references and
 *    URLs keep working after migration.
 *  - Simple equality filters are executed by Firestore; every other filter ($in on
 *    non-ids, $regex, $gt, ...) runs in memory on the narrowed result set. Fine for a
 *    store this size; add Firestore indexes/queries if a collection grows large.
 *  - `unique: true` fields are enforced with marker documents in `_unique`,
 *    written atomically together with the document.
 *  - save() writes only the top-level fields that changed (so adding a review does
 *    not overwrite a concurrent stock update).
 *  - Atomic read-modify-write operations (updateOne/findOneAndUpdate/...) use
 *    Firestore transactions and re-check their filter inside the transaction.
 */
const crypto = require('crypto');
const mongoose = require('mongoose');
const { getDb, deleteField } = require('./firestore');
const { matches, sortRows, project, normalizeFields, normalize, isOperatorObject } = require('./query');
const { fromFirestore, docToPlain, isEqual, clone } = require('./serialize');

mongoose.set('bufferCommands', false);
mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

const HEX24 = /^[a-f0-9]{24}$/i;
const UNIQUE_COLLECTION = '_unique';
const GETALL_CHUNK = 100;

/* ------------------------------------------------------------------ helpers */

const metaOf = (Model) => Model.__fs;
const colOf = (Model) => getDb().collection(metaOf(Model).collection);

const validId = (Model, id) => {
  if (typeof id !== 'string' || !id || id.includes('/')) return false;
  return metaOf(Model).idIsObjectId ? HEX24.test(id) : true;
};

const isArrayPath = (schemaPath) =>
  !!schemaPath && (schemaPath.$isMongooseArray || schemaPath.instance === 'Array');

function uniqueRef(meta, field, value) {
  const hash = crypto.createHash('sha1').update(`${meta.collection}|${field}|${String(value)}`).digest('hex');
  return getDb().collection(UNIQUE_COLLECTION).doc(hash);
}

const uniqueData = (meta, field, value, id) => ({ c: meta.collection, f: field, v: String(value), id });

function duplicateError(meta, field, value) {
  const err = new Error(
    `E11000 duplicate key error collection: ${meta.collection} index: ${field}_1 dup key: { ${field}: "${value}" }`
  );
  err.code = 11000;
  err.keyPattern = { [field]: 1 };
  err.keyValue = { [field]: value };
  return err;
}

/** Hydrate a stored row into a Mongoose document, remembering what was stored. */
function hydrateRow(Model, row, rawFields) {
  const stored = row.data;
  const fields = normalizeFields(rawFields);
  const trimmed = project(stored, fields);
  let projection = null;
  if (fields) {
    const inclusive = Object.entries(fields).some(([k, v]) => k !== '_id' && v === 1);
    projection = inclusive ? { ...fields, _id: 1 } : fields;
  }
  const doc = Model.hydrate({ ...trimmed, _id: row.id }, projection);
  const orig = clone(stored);
  delete orig._id;
  doc.$locals.fsOrig = orig;
  doc.$locals.fsPartial = !!projection;
  return doc;
}

const leanRow = (row, fields) => project({ ...row.data, _id: row.id }, fields);

/* --------------------------------------------------------------- fetch rows */

/** Equality conditions Firestore can evaluate for us. */
function pushableEquality(Model, filter) {
  const conds = [];
  let allPushable = true;
  for (const [key, value] of Object.entries(filter || {})) {
    if (key === '_id') continue;
    const nv = value instanceof Date ? undefined : normalize(value);
    const simple = typeof nv === 'string' || typeof nv === 'number' || typeof nv === 'boolean';
    if (key.startsWith('$') || key.includes('.') || !simple || isArrayPath(Model.schema.path(key))) {
      allPushable = false;
      continue;
    }
    conds.push([key, nv]);
  }
  return { conds, allPushable };
}

/** ids named by an `_id` filter (equality or $in), or null when there is no such filter. */
function idsFromFilter(filter) {
  if (!filter || filter._id === undefined) return null;
  const c = filter._id;
  if (isOperatorObject(c)) {
    if (Array.isArray(c.$in)) return c.$in.map((v) => String(normalize(v)));
    return null;
  }
  return [String(normalize(c))];
}

async function getByIds(Model, ids) {
  const db = getDb();
  const col = colOf(Model);
  const unique = [...new Set(ids)].filter((id) => validId(Model, id));
  const rows = [];
  for (let i = 0; i < unique.length; i += GETALL_CHUNK) {
    const snaps = await db.getAll(...unique.slice(i, i + GETALL_CHUNK).map((id) => col.doc(id)));
    for (const s of snaps) if (s.exists) rows.push({ id: s.id, data: { ...fromFirestore(s.data()), _id: s.id } });
  }
  return rows;
}

async function fetchRows(Model, filter) {
  const ids = idsFromFilter(filter);
  if (ids) return getByIds(Model, ids);

  let query = colOf(Model);
  for (const [k, v] of pushableEquality(Model, filter).conds) query = query.where(k, '==', v);
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, data: { ...fromFirestore(d.data()), _id: d.id } }));
}

/* ----------------------------------------------------------- update engine */

const OPS = ['$set', '$unset', '$inc', '$push', '$pull', '$addToSet', '$setOnInsert'];

function normalizeUpdate(update) {
  const u = update || {};
  const keys = Object.keys(u);
  if (keys.some((k) => k.startsWith('$'))) {
    for (const k of keys) if (!OPS.includes(k)) throw new Error(`Unsupported update operator ${k} (Firestore data layer)`);
    return u;
  }
  const $set = { ...u };
  delete $set._id; // immutable
  return { $set };
}

/** Apply a Mongo-style update to a hydrated Mongoose document. */
function applyUpdate(doc, update) {
  const ops = normalizeUpdate(update);
  for (const [p, v] of Object.entries(ops.$set || {})) doc.set(p, v);
  for (const p of Object.keys(ops.$unset || {})) doc.set(p, undefined);
  for (const [p, v] of Object.entries(ops.$inc || {})) doc.set(p, (Number(doc.get(p)) || 0) + Number(v));
  for (const [p, v] of Object.entries(ops.$push || {})) {
    const items = v && typeof v === 'object' && Array.isArray(v.$each) ? v.$each : [v];
    for (const item of items) doc.get(p).push(item);
  }
  for (const [p, v] of Object.entries(ops.$addToSet || {})) {
    const arr = doc.get(p);
    const exists = arr.some((x) => String(x && x._id ? x._id : x) === String(v && v._id ? v._id : v));
    if (!exists) arr.push(v);
  }
  for (const [p, v] of Object.entries(ops.$pull || {})) doc.get(p).pull(v);
}

/** What to write for `data` given what is stored (`orig`). */
function diffFields(orig, data, partial) {
  const payload = {};
  let changed = false;
  for (const k of Object.keys(data)) {
    if (!isEqual(orig[k], data[k])) {
      payload[k] = data[k];
      changed = true;
    }
  }
  if (!partial) {
    for (const k of Object.keys(orig)) {
      if (!(k in data)) {
        payload[k] = deleteField();
        changed = true;
      }
    }
  }
  return changed ? payload : null;
}

function uniqueChanges(meta, id, orig, data) {
  const creates = [];
  const deletes = [];
  for (const f of meta.uniqueFields) {
    const ov = orig ? orig[f] : undefined;
    const nv = data ? data[f] : undefined;
    if (ov === nv) continue;
    if (nv !== undefined && nv !== null) creates.push({ field: f, value: nv, ref: uniqueRef(meta, f, nv), data: uniqueData(meta, f, nv, id) });
    if (ov !== undefined && ov !== null) deletes.push({ ref: uniqueRef(meta, f, ov) });
  }
  return { creates, deletes };
}

const stamp = (Model, doc, creating) => {
  if (!metaOf(Model).hasTimestamps) return;
  const now = new Date();
  if (creating && !doc.get('createdAt')) doc.set('createdAt', now);
  doc.set('updatedAt', now);
};

/** Turn a failed create into a Mongo-style duplicate-key error where possible. */
async function mapWriteError(Model, err, creates) {
  const already = err && (err.code === 6 || /ALREADY_EXISTS|already exists/i.test(err.message || ''));
  if (!already) return err;
  const meta = metaOf(Model);
  for (const c of creates) {
    const snap = await c.ref.get();
    if (snap.exists) return duplicateError(meta, c.field, c.value);
  }
  return err;
}

/**
 * Transactionally read `id`, check `filter`, let `mutator` change the document, then write.
 * Resolves null when the document is missing or no longer matches.
 */
async function mutateById(Model, id, filter, mutator, { validate = false } = {}) {
  const db = getDb();
  const meta = metaOf(Model);
  const ref = colOf(Model).doc(id);
  let creates = [];
  try {
    return await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return null;
      const row = { id, data: { ...fromFirestore(snap.data()), _id: id } };
      if (!matches(row.data, filter)) return null;

      const doc = hydrateRow(Model, row);
      const before = hydrateRow(Model, row);
      mutator(doc);
      if (validate) await doc.validate();

      let { data } = docToPlain(doc);
      const orig = doc.$locals.fsOrig;
      let payload = diffFields(orig, data, false);
      if (!payload) return { before, doc, modified: false };

      stamp(Model, doc, false);
      data = docToPlain(doc).data;
      payload = diffFields(orig, data, false);

      const uc = uniqueChanges(meta, id, orig, data);
      creates = uc.creates;
      for (const c of uc.creates) {
        if ((await t.get(c.ref)).exists) throw duplicateError(meta, c.field, c.value);
      }
      t.update(ref, payload);
      for (const c of uc.creates) t.create(c.ref, c.data);
      for (const d of uc.deletes) t.delete(d.ref);

      doc.$locals.fsOrig = clone(data);
      return { before, doc, modified: true };
    });
  } catch (err) {
    throw await mapWriteError(Model, err, creates);
  }
}

async function deleteById(Model, id, filter) {
  const db = getDb();
  const meta = metaOf(Model);
  const ref = colOf(Model).doc(id);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return null;
    const row = { id, data: { ...fromFirestore(snap.data()), _id: id } };
    if (filter && !matches(row.data, filter)) return null;
    const doc = hydrateRow(Model, row);
    const { deletes } = uniqueChanges(meta, id, row.data, null);
    t.delete(ref);
    for (const d of deletes) t.delete(d.ref);
    return doc;
  });
}

/* ------------------------------------------------------------------- query */

class FsQuery extends mongoose.Query {
  async exec() {
    switch (this.op) {
      case 'find':
        return this._findImpl(false);
      case 'findOne':
        return this._findImpl(true);
      case 'countDocuments':
      case 'estimatedDocumentCount':
      case 'count':
        return this._countImpl();
      case 'findOneAndUpdate':
        return this._updateImpl({ many: false, returnDoc: true });
      case 'updateOne':
        return this._updateImpl({ many: false, returnDoc: false });
      case 'updateMany':
        return this._updateImpl({ many: true, returnDoc: false });
      case 'findOneAndDelete':
      case 'findOneAndRemove':
        return this._deleteImpl({ many: false, returnDoc: true });
      case 'deleteOne':
        return this._deleteImpl({ many: false, returnDoc: false });
      case 'deleteMany':
        return this._deleteImpl({ many: true, returnDoc: false });
      default:
        throw new Error(`Query operation "${this.op}" is not supported by the Firestore data layer`);
    }
  }

  async _matchingRows() {
    const filter = this._conditions || {};
    const rows = await fetchRows(this.model, filter);
    return rows.filter((r) => matches(r.data, filter));
  }

  async _findImpl(single) {
    const Model = this.model;
    let rows = await this._matchingRows();
    const o = this.options || {};
    rows = sortRows(rows, o.sort);
    if (o.skip) rows = rows.slice(o.skip);
    if (single) rows = rows.slice(0, 1);
    else if (o.limit) rows = rows.slice(0, o.limit);

    if (this._mongooseOptions && this._mongooseOptions.lean) {
      const plain = rows.map((r) => leanRow(r, this._fields));
      return single ? plain[0] || null : plain;
    }

    const docs = rows.map((r) => hydrateRow(Model, r, this._fields));
    const populate = Object.values((this._mongooseOptions && this._mongooseOptions.populate) || {});
    if (populate.length && docs.length) await Model.populate(docs, populate);
    return single ? docs[0] || null : docs;
  }

  async _countImpl() {
    const Model = this.model;
    const filter = this._conditions || {};
    if (!Object.keys(filter).length || this.op === 'estimatedDocumentCount') {
      const snap = await colOf(Model).count().get();
      return snap.data().count;
    }
    const { conds, allPushable } = pushableEquality(Model, filter);
    if (allPushable && conds.length && filter._id === undefined) {
      let q = colOf(Model);
      for (const [k, v] of conds) q = q.where(k, '==', v);
      return (await q.count().get()).data().count;
    }
    return (await this._matchingRows()).length;
  }

  async _updateImpl({ many, returnDoc }) {
    const Model = this.model;
    const o = this.options || {};
    if (o.upsert) throw new Error('upsert is not supported by the Firestore data layer');
    const filter = this._conditions || {};
    const update = this._update || {};
    const candidates = await this._matchingRows();

    let matched = 0;
    let modified = 0;
    let result = null;
    for (const row of candidates) {
      const res = await mutateById(Model, row.id, filter, (doc) => applyUpdate(doc, update), {
        validate: !!o.runValidators,
      });
      if (!res) continue;
      matched += 1;
      if (res.modified) modified += 1;
      if (returnDoc) {
        const returnNew = o.new === true || o.returnDocument === 'after';
        result = returnNew ? res.doc : res.before;
      }
      if (!many) break;
    }
    if (returnDoc) {
      if (result) {
        const populate = Object.values((this._mongooseOptions && this._mongooseOptions.populate) || {});
        if (populate.length) await Model.populate(result, populate);
      }
      return result;
    }
    return { acknowledged: true, matchedCount: matched, modifiedCount: modified, upsertedCount: 0 };
  }

  async _deleteImpl({ many, returnDoc }) {
    const Model = this.model;
    const filter = this._conditions || {};
    const candidates = await this._matchingRows();
    let deleted = 0;
    let last = null;
    for (const row of candidates) {
      const doc = await deleteById(Model, row.id, filter);
      if (!doc) continue;
      deleted += 1;
      last = doc;
      if (!many) break;
    }
    return returnDoc ? last : { acknowledged: true, deletedCount: deleted };
  }
}

/* ------------------------------------------------------------ instance save */

async function saveDocument(doc) {
  const Model = doc.constructor;
  const meta = metaOf(Model);
  const db = getDb();

  await doc.validate();
  for (const hook of meta.hooks) await hook.call(doc, doc);

  if (doc.isNew) {
    stamp(Model, doc, true);
    const { id, data } = docToPlain(doc);
    const { creates } = uniqueChanges(meta, id, null, data);
    const batch = db.batch();
    batch.create(colOf(Model).doc(id), data);
    for (const c of creates) batch.create(c.ref, c.data);
    try {
      await batch.commit();
    } catch (err) {
      throw await mapWriteError(Model, err, creates);
    }
    doc.$isNew = false;
    doc.$locals.fsOrig = clone(data);
    doc.$locals.fsPartial = false;
    if (typeof doc.$__reset === 'function') doc.$__reset();
    return doc;
  }

  let { id, data } = docToPlain(doc);
  const orig = doc.$locals.fsOrig || {};
  const partial = !!doc.$locals.fsPartial;
  if (!diffFields(orig, data, partial)) return doc;

  stamp(Model, doc, false);
  ({ data } = docToPlain(doc));
  const payload = diffFields(orig, data, partial);
  const { creates, deletes } = uniqueChanges(meta, id, orig, data);
  const ref = colOf(Model).doc(id);

  if (!creates.length && !deletes.length) {
    await ref.update(payload);
  } else {
    try {
      await db.runTransaction(async (t) => {
        for (const c of creates) {
          if ((await t.get(c.ref)).exists) throw duplicateError(meta, c.field, c.value);
        }
        t.update(ref, payload);
        for (const c of creates) t.create(c.ref, c.data);
        for (const d of deletes) t.delete(d.ref);
      });
    } catch (err) {
      throw await mapWriteError(Model, err, creates);
    }
  }

  doc.$locals.fsOrig = partial ? { ...orig, ...clone(data) } : clone(data);
  if (typeof doc.$__reset === 'function') doc.$__reset();
  return doc;
}

async function deleteDocument(doc) {
  const Model = doc.constructor;
  const id = String(doc._id);
  const deleted = await deleteById(Model, id, null);
  return deleted ? doc : null;
}

/* -------------------------------------------------------------- definition */

/**
 * @param {string} name        Mongoose model name (must match `ref:` values)
 * @param {mongoose.Schema} schema
 * @param {object} [options]
 * @param {string} [options.collection]  Firestore collection name
 * @param {Function[]} [options.beforeSave] hooks run (in order) after validation, before every save()
 */
function defineModel(name, schema, options = {}) {
  schema.set('versionKey', false);
  schema.set('autoIndex', false);
  schema.set('autoCreate', false);

  const Model = mongoose.model(name, schema);

  const uniqueFields = Object.keys(schema.paths).filter(
    (p) => p !== '_id' && !p.includes('.') && schema.paths[p].options && schema.paths[p].options.unique
  );
  const idPath = schema.path('_id');

  Model.__fs = {
    collection: options.collection || name.charAt(0).toLowerCase() + name.slice(1) + 's',
    uniqueFields,
    hooks: options.beforeSave || [],
    hasTimestamps: !!schema.options.timestamps,
    idIsObjectId: !idPath || idPath.instance === 'ObjectId' || idPath.instance === 'ObjectID',
  };

  // All builtin statics (find, findOne, findById, findByIdAndUpdate, updateOne,
  // countDocuments, deleteOne, ...) build their queries from Model.Query.
  Model.Query = FsQuery;

  Model.create = async function create(docs) {
    const list = Array.isArray(docs) ? docs : [docs];
    const created = [];
    for (const d of list) {
      const doc = d instanceof Model ? d : new Model(d);
      await doc.save();
      created.push(doc);
    }
    return Array.isArray(docs) ? created : created[0];
  };
  Model.insertMany = (docs) => Model.create(docs);
  Model.aggregate = () => {
    throw new Error('Model.aggregate() is not available with Firestore; compute aggregates in JavaScript');
  };

  Model.prototype.save = function save() {
    return saveDocument(this);
  };
  Model.prototype.$save = Model.prototype.save;
  Model.prototype.deleteOne = function deleteOne() {
    return deleteDocument(this);
  };

  return Model;
}

module.exports = { defineModel, FsQuery, UNIQUE_COLLECTION };

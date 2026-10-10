/**
 * Small MongoDB-style query evaluator. Firestore can only filter on a few things
 * server-side, so the data layer pushes simple equality filters down to Firestore
 * and evaluates everything else here, on the (already narrowed) result set.
 *
 * Supported: equality (incl. array-contains and dotted paths), $eq $ne $in $nin
 * $gt $gte $lt $lte $regex/$options $exists, RegExp values, and $or / $and / $nor.
 * Anything else throws loudly instead of silently returning wrong results.
 */

const normalize = (v) => {
  if (v === null || v === undefined) return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'object' && typeof v.toHexString === 'function') return v.toHexString();
  return v;
};

const looseEquals = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // ids/numbers coming from query strings
  if (typeof na !== 'object' && typeof nb !== 'object' && na != null && nb != null) {
    return String(na) === String(nb);
  }
  return false;
};

/** All values reachable at `path`, traversing arrays like MongoDB does. */
function getValues(node, segs, i = 0) {
  if (node === undefined || node === null) return [];
  if (i === segs.length) return Array.isArray(node) ? [node, ...node] : [node];
  if (Array.isArray(node)) {
    const out = [];
    for (const el of node) out.push(...getValues(el, segs, i));
    return out;
  }
  if (typeof node !== 'object') return [];
  return getValues(node[segs[i]], segs, i + 1);
}

const compare = (a, b) => {
  const na = normalize(a);
  const nb = normalize(b);
  if (typeof na !== typeof nb) return null;
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
};

const isOperatorObject = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp) &&
  typeof v.toHexString !== 'function' && Object.keys(v).length > 0 && Object.keys(v).every((k) => k.startsWith('$'));

function matchField(values, cond) {
  const missing = values.length === 0;

  if (cond instanceof RegExp) return values.some((v) => typeof v === 'string' && cond.test(v));

  if (!isOperatorObject(cond)) {
    if (cond === null || cond === undefined) return missing || values.every((v) => v == null);
    return values.some((v) => looseEquals(v, cond));
  }

  const flags = cond.$options;
  for (const [op, arg] of Object.entries(cond)) {
    switch (op) {
      case '$options':
        break;
      case '$eq':
        if (!matchField(values, arg)) return false;
        break;
      case '$ne':
        if (matchField(values, arg)) return false;
        break;
      case '$in':
        if (!arg.some((a) => matchField(values, a))) return false;
        break;
      case '$nin':
        if (arg.some((a) => matchField(values, a))) return false;
        break;
      case '$gt':
        if (!values.some((v) => (compare(v, arg) ?? -1) > 0)) return false;
        break;
      case '$gte':
        if (!values.some((v) => (compare(v, arg) ?? -1) >= 0)) return false;
        break;
      case '$lt':
        if (!values.some((v) => (compare(v, arg) ?? 1) < 0)) return false;
        break;
      case '$lte':
        if (!values.some((v) => (compare(v, arg) ?? 1) <= 0)) return false;
        break;
      case '$regex': {
        const re = arg instanceof RegExp ? arg : new RegExp(arg, flags || '');
        if (!values.some((v) => typeof v === 'string' && re.test(v))) return false;
        break;
      }
      case '$exists':
        if (Boolean(arg) === missing) return false;
        break;
      default:
        throw new Error(`Unsupported query operator ${op} (Firestore data layer)`);
    }
  }
  return true;
}

/** @param {object} doc plain document including `_id` */
function matches(doc, filter) {
  if (!filter) return true;
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or') {
      if (!cond.some((f) => matches(doc, f))) return false;
    } else if (key === '$and') {
      if (!cond.every((f) => matches(doc, f))) return false;
    } else if (key === '$nor') {
      if (cond.some((f) => matches(doc, f))) return false;
    } else if (key.startsWith('$')) {
      throw new Error(`Unsupported top-level operator ${key} (Firestore data layer)`);
    } else if (!matchField(getValues(doc, key.split('.')), cond)) {
      return false;
    }
  }
  return true;
}

/** Sort rows in memory. `sort` is a Mongoose-style object {field: 1|-1}. */
function sortRows(rows, sort) {
  const entries = Object.entries(sort || {});
  if (!entries.length) return rows;
  return [...rows].sort((a, b) => {
    for (const [field, dir] of entries) {
      const av = getValues(a.data, field.split('.'))[0];
      const bv = getValues(b.data, field.split('.'))[0];
      let c;
      if (av == null && bv == null) c = 0;
      else if (av == null) c = -1;
      else if (bv == null) c = 1;
      else c = compare(av, bv) ?? 0;
      if (c !== 0) return Number(dir) < 0 ? -c : c;
    }
    return 0;
  });
}

/**
 * Mongoose may hand us {price: 0}, {'-price': 0} or {'+password': 1} depending on how
 * select() was called. Return a clean {path: 1|0} map (or null when nothing to project).
 */
function normalizeFields(fields) {
  if (!fields) return null;
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith('+')) continue; // force-include of a select:false path: not used here
    if (k.startsWith('-')) out[k.slice(1)] = 0;
    else out[k] = v === 0 || v === false ? 0 : 1;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Apply a Mongoose projection ({a:1,b:1} or {secret:0}) to a plain object.
 * Returns the trimmed object. `_id` is always kept.
 */
function project(data, rawFields) {
  const fields = normalizeFields(rawFields);
  if (!fields) return data;
  const entries = Object.entries(fields).filter(([k]) => k !== '_id');
  if (!entries.length) return data;
  const inclusive = entries.some(([, v]) => v === 1 || v === true);
  const top = (k) => k.split('.')[0];
  const out = {};
  if (inclusive) {
    const keep = new Set(entries.filter(([, v]) => v === 1 || v === true).map(([k]) => top(k)));
    for (const [k, v] of Object.entries(data)) if (keep.has(k) || k === '_id') out[k] = v;
  } else {
    // dotted exclusions are applied to the whole top-level key only when entire key is excluded
    const drop = new Set(entries.filter(([k, v]) => !k.includes('.') && !(v === 1 || v === true)).map(([k]) => k));
    for (const [k, v] of Object.entries(data)) if (!drop.has(k)) out[k] = v;
  }
  return out;
}

module.exports = { matches, sortRows, project, normalizeFields, normalize, isOperatorObject, getValues };

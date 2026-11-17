const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const Feedback = require('../models/Feedback');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('feedback: public submit with validation, admin-only list and status', async () => {
  assert.equal((await app.api('POST', '/api/feedback', { rating: 0 })).status, 400);
  assert.equal((await app.api('POST', '/api/feedback', { rating: 'x' })).status, 400);
  const ok = await app.api('POST', '/api/feedback', { rating: 5, condition: 'perfect', reorder: 'yes', comment: '  Bahut   badhiya  ', order: 'ORD123<script>', name: 'Riya' });
  assert.equal(ok.status, 201);
  assert.equal((await app.api('POST', '/api/feedback', { rating: 3, condition: 'bogus', reorder: 'nah' })).status, 201);
  const rows = await Feedback.find({});
  const r = rows.find((x) => x.rating === 5);
  assert.equal(r.comment, 'Bahut badhiya');
  assert.equal(r.order, 'ORD123script');
  assert.equal(rows.find((x) => x.rating === 3).condition, undefined);

  const { token: userToken } = await h.makeUser();
  assert.equal((await app.api('GET', '/api/feedback', undefined, userToken)).status, 403);
  const { token } = await h.makeAdmin();
  const list = await app.api('GET', '/api/feedback', undefined, token);
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 2);
  const upd = await app.api('PUT', `/api/feedback/${r._id}`, { status: 'handled' }, token);
  assert.equal(upd.body.status, 'handled');
});

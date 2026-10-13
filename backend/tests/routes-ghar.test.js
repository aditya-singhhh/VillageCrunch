const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const at = (iso) => { process.env.GHAR_NOW = iso; };
const box = (over = {}) => ({
  type: 'box', name: 'Ravi Kumar', phone: '9876543210', reason: 'ticket', story: 'WL 212', shareStory: true,
  address: { street: '12 MG Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' }, ...over,
});

test('ghar: sunset drops, one per person, outside Bihar only, rollover, admin review', async () => {
  process.env.GHAR_BOX_TOTAL = '4';
  process.env.GHAR_START = '2026-10-19';
  process.env.GHAR_BOX_END = '2026-10-20'; // 2 drops of 2
  const u1 = await h.makeUser();
  const u2 = await h.makeUser();
  const u3 = await h.makeUser();
  const adminU = await h.makeAdmin();

  // before the first drop (19 Oct 6 pm IST = 12:30 UTC)
  at('2026-10-19T12:00:00Z');
  let s = await app.api('GET', '/api/ghar/status');
  assert.equal(s.status, 200);
  assert.equal(s.body.box.started, false);
  assert.equal((await app.api('POST', '/api/ghar/claim', box(), u1.token)).body.code, 'NOT_STARTED');

  at('2026-10-19T13:00:00Z');
  // must be signed in
  assert.equal((await app.api('POST', '/api/ghar/claim', box())).status, 401);
  // Bihar / Jharkhand PIN is refused for boxes
  const home = await app.api('POST', '/api/ghar/claim', box({ address: { street: 'x', city: 'Patna', pincode: '800001' } }), u1.token);
  assert.equal(home.body.code, 'HOME_PIN');
  const ok = await app.api('POST', '/api/ghar/claim', box(), u1.token);
  assert.equal(ok.status, 201);
  assert.ok(ok.body.refCode);
  // same account again / same phone from another account
  assert.equal((await app.api('POST', '/api/ghar/claim', box(), u1.token)).status, 409);
  assert.equal((await app.api('POST', '/api/ghar/claim', box({ address: { street: '9 Other St', city: 'Pune', pincode: '411001' } }), u2.token)).body.code, 'ALREADY');
  assert.equal((await app.api('POST', '/api/ghar/claim', box({ phone: '9876500001', address: { street: '9 Other St', city: 'Pune', pincode: '411001' } }), u2.token)).status, 201);
  // drop 1 (2 boxes) is empty now
  const empty = await app.api('POST', '/api/ghar/claim', box({ phone: '9876500002', address: { street: '1 A', city: 'Delhi', pincode: '110001' } }), u3.token);
  assert.equal(empty.body.code, 'DROP_EMPTY');

  // next evening: drop 2 opens
  at('2026-10-20T13:00:00Z');
  s = await app.api('GET', '/api/ghar/status');
  assert.equal(s.body.box.leftNow, 2);
  assert.equal((await app.api('POST', '/api/ghar/claim', box({ phone: '9876500002', address: { street: '1 A', city: 'Delhi', pincode: '110001' } }), u3.token)).status, 201);

  // stories only appear after review
  s = await app.api('GET', '/api/ghar/status');
  assert.equal(s.body.stories.length, 0);
  assert.equal((await app.api('GET', '/api/ghar/claims', undefined, u1.token)).status, 403);
  const list = await app.api('GET', '/api/ghar/claims?type=box', undefined, adminU.token);
  assert.equal(list.body.length, 3);
  const id = list.body.find((c) => c.name === 'Ravi Kumar' && c.phone === '9876543210')._id;
  assert.equal((await app.api('PUT', `/api/ghar/claims/${id}`, { status: 'approved' }, adminU.token)).status, 200);
  s = await app.api('GET', '/api/ghar/status');
  assert.deepEqual(s.body.stories.map((x) => x.name), ['Ravi']);
  assert.equal(s.body.stories[0].phone, undefined); // no private data
  const csv = await app.api('GET', '/api/ghar/claims.csv', undefined, adminU.token);
  assert.equal(csv.status, 200);
  assert.match(csv.body, /Bengaluru/);

  // after the last drop day everything closes
  at('2026-10-21T13:00:00Z');
  assert.equal((await app.api('POST', '/api/ghar/claim', box({ phone: '9876500003' }), adminU.token)).body.code, 'CLOSED');
});

test('ghar: letters wall — open to all, moderated, safe video links only', async () => {
  at('2026-10-25T06:00:00Z');
  const adminU = await h.makeAdmin();
  const letter = { name: 'Priya Singh', city: 'Pune', reason: 'leave', message: 'Maa, is baar nahi aa paayi. Ghat pe mera diya jala dena.' };
  assert.equal((await app.api('POST', '/api/ghar/chitthi', { ...letter, message: 'hi' })).body.code, 'MESSAGE');
  assert.equal((await app.api('POST', '/api/ghar/chitthi', { ...letter, videoLink: 'https://evil.example/x' })).body.code, 'LINK');
  const ok = await app.api('POST', '/api/ghar/chitthi', { ...letter, videoLink: 'https://www.instagram.com/reel/abc/' });
  assert.equal(ok.status, 201);
  // video-only letter is fine
  assert.equal((await app.api('POST', '/api/ghar/chitthi', { name: 'Aman', videoLink: 'https://youtu.be/xyz' })).status, 201);
  // not shown until approved
  let s = await app.api('GET', '/api/ghar/status');
  assert.equal(s.body.letters.length, 0);
  assert.equal(s.body.chitthi.written, 2);
  const list = await app.api('GET', '/api/ghar/claims?type=chitthi', undefined, adminU.token);
  const mine = list.body.find((c) => c.name === 'Priya Singh');
  await app.api('PUT', `/api/ghar/claims/${mine._id}`, { status: 'approved' }, adminU.token);
  s = await app.api('GET', '/api/ghar/status');
  assert.equal(s.body.letters.length, 1);
  assert.equal(s.body.letters[0].name, 'Priya');
  assert.match(s.body.letters[0].videoLink, /instagram/);
  // closes after Chhath
  at('2026-11-17T06:00:00Z');
  assert.equal((await app.api('POST', '/api/ghar/chitthi', letter)).body.code, 'CLOSED');
});

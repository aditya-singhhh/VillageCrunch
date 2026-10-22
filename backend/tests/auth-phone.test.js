const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const authRouter = require('../routes/auth');

let app;
test.before(async () => {
  app = await h.start();
  // Fake Firebase: token "ok:<phone>" verifies to that phone number
  authRouter.__setPhoneVerifier(async (t) => {
    if (!t.startsWith('ok:')) throw new Error('bad token');
    return { phone_number: t.slice(3) };
  });
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const tok = (p) => `ok:${p}`.padEnd(24, ' ');

test('phone OTP: new number asks for name, then creates account; same number logs back in', async () => {
  const phone = `+9198${String(Date.now()).slice(-8)}`;
  assert.equal((await app.api('POST', '/api/auth/phone', { idToken: 'short' })).status, 400);
  assert.equal((await app.api('POST', '/api/auth/phone', { idToken: 'bad-token-that-is-long-enough' })).status, 401);

  const first = await app.api('POST', '/api/auth/phone', { idToken: tok(phone) });
  assert.equal(first.status, 200);
  assert.equal(first.body.needName, true);

  const created = await app.api('POST', '/api/auth/phone', { idToken: tok(phone), name: '  Ravi   Kumar ' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.name, 'Ravi Kumar');
  assert.equal(created.body.phone, phone.slice(-10));
  assert.ok(created.body.token);
  assert.equal(created.body.password, undefined);

  const again = await app.api('POST', '/api/auth/phone', { idToken: tok(phone) });
  assert.equal(again.status, 200);
  assert.equal(again.body._id, created.body._id);

  // the token works on protected routes
  assert.equal((await app.api('GET', '/api/orders/myorders', undefined, again.body.token)).status, 200);
});

test('phone OTP: logs into an existing password account with the same phone', async () => {
  const u = await h.makeUser();
  const res = await app.api('POST', '/api/auth/phone', { idToken: tok(`+91${u.user.phone}`) });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(String(res.body._id), String(u.user._id));
});

test('phone OTP: rejects non-Indian numbers', async () => {
  const res = await app.api('POST', '/api/auth/phone', { idToken: tok('+14155550123'), name: 'Sam' });
  assert.equal(res.status, 400);
});

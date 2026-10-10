const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const reg = (over = {}) => ({ name: 'Eve', email: `eve${h.uniq()}@x.com`, phone: `98${String(Math.random()).slice(2, 10)}`, password: 'longenough1', ...over });

test('register: role from the client is ignored; password rules; duplicates', async () => {
  const body = reg({ role: 'admin' });
  const r = await app.api('POST', '/api/auth/register', body);
  assert.equal(r.status, 201);
  assert.equal(r.body.role, 'user');
  assert.ok(r.body.token);
  assert.equal((await h.models.User.findOne({ email: body.email })).role, 'user');

  assert.equal((await app.api('POST', '/api/auth/register', reg({ password: '123' }))).status, 400);
  const dupEmail = await app.api('POST', '/api/auth/register', { ...reg(), email: body.email });
  assert.equal(dupEmail.status, 400);
  assert.match(dupEmail.body.message, /Email already registered/);
  const dupPhone = await app.api('POST', '/api/auth/register', { ...reg(), phone: body.phone });
  assert.match(dupPhone.body.message, /Phone number already registered/);
});

test('login, profile (no secrets leaked), operator-injection payloads rejected', async () => {
  const body = reg();
  await app.api('POST', '/api/auth/register', body);

  const bad = await app.api('POST', '/api/auth/login', { emailOrPhone: body.email, password: 'wrong-password' });
  assert.equal(bad.status, 401);
  const injected = await app.api('POST', '/api/auth/login', { emailOrPhone: { $gt: '' }, password: { $gt: '' } });
  assert.equal(injected.status, 400);

  const ok = await app.api('POST', '/api/auth/login', { emailOrPhone: body.email.toUpperCase(), password: body.password });
  assert.equal(ok.status, 200);
  const byPhone = await app.api('POST', '/api/auth/login', { emailOrPhone: body.phone, password: body.password });
  assert.equal(byPhone.status, 200);

  const profile = await app.api('GET', '/api/auth/profile', undefined, ok.body.token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.email, body.email);
  for (const f of ['password', 'resetPasswordToken', 'resetPasswordOTP', 'resetPasswordOTPExpire']) {
    assert.equal(profile.body[f], undefined, `${f} must not be returned`);
  }
  assert.equal((await app.api('GET', '/api/auth/profile')).status, 401);
});

test('admin login only works for admins; admin-only user routes', async () => {
  const { user, token } = await h.makeAdmin();
  const plain = await h.makeUser();
  assert.equal((await app.api('POST', '/api/auth/admin/login', { emailOrPhone: user.email, password: 'password123' })).status, 200);
  assert.equal((await app.api('POST', '/api/auth/admin/login', { emailOrPhone: plain.user.email, password: 'password123' })).status, 401);

  assert.equal((await app.api('GET', '/api/auth/all-users', undefined, plain.token)).status, 403);
  const all = await app.api('GET', '/api/auth/all-users', undefined, token);
  assert.equal(all.status, 200);
  assert.ok(all.body.length >= 2);
  assert.equal(all.body[0].password, undefined);

  const victim = await h.makeUser();
  assert.equal((await app.api('DELETE', `/api/auth/${victim.user._id}`, undefined, plain.token)).status, 403);
  assert.equal((await app.api('DELETE', `/api/auth/${victim.user._id}`, undefined, token)).status, 200);
  assert.equal(await h.models.User.findById(String(victim.user._id)), null);
  // a deleted user's token stops working
  assert.equal((await app.api('GET', '/api/auth/profile', undefined, victim.token)).status, 401);
});

test('profile update: changing the password needs the current one', async () => {
  const { token } = await h.makeUser();
  const noCurrent = await app.api('PUT', '/api/auth/profile', { password: 'brandnew123' }, token);
  assert.equal(noCurrent.status, 400);
  const wrong = await app.api('PUT', '/api/auth/profile', { password: 'brandnew123', currentPassword: 'nope' }, token);
  assert.equal(wrong.status, 400);
  const ok = await app.api('PUT', '/api/auth/profile', { password: 'brandnew123', currentPassword: 'password123', name: 'Renamed' }, token);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.name, 'Renamed');
  const login = await app.api('POST', '/api/auth/login', { emailOrPhone: ok.body.email, password: 'brandnew123' });
  assert.equal(login.status, 200);
  assert.equal(login.body.name, 'Renamed');
});

test('forgot password: no account enumeration; phone OTP stored hashed, locked after 5 bad tries, full reset works', async () => {
  const unknown = await app.api('POST', '/api/auth/forgot-password', { identifier: 'nobody@nowhere.com' });
  assert.equal(unknown.status, 200);
  const unknownPhone = await app.api('POST', '/api/auth/forgot-password', { identifier: '9000000000' });
  assert.equal(unknownPhone.status, 200);

  const { user } = await h.makeUser();
  h.sent.sms.length = 0;
  const res = await app.api('POST', '/api/auth/forgot-password', { identifier: user.phone });
  assert.equal(res.status, 200);
  assert.equal(res.body.phone, undefined, 'phone number must not be echoed');
  assert.equal(h.sent.sms.length, 1);
  const otp = h.sent.sms[0].message.match(/\b(\d{6})\b/)[1];

  const stored = h.fake.raw('users', String(user._id)).resetPasswordOTP;
  assert.notEqual(stored, otp);
  assert.match(stored, /^[a-f0-9]{64}$/);

  // wrong guesses are counted
  for (let i = 0; i < 5; i += 1) {
    const w = await app.api('POST', '/api/auth/verify-otp', { phone: user.phone, otp: '000000' });
    assert.equal(w.status, 400);
  }
  const locked = await app.api('POST', '/api/auth/verify-otp', { phone: user.phone, otp });
  assert.equal(locked.status, 429, 'even the right OTP is refused after too many attempts');

  // request a fresh OTP and complete the flow
  h.sent.sms.length = 0;
  await app.api('POST', '/api/auth/forgot-password', { identifier: user.phone });
  const otp2 = h.sent.sms[0].message.match(/\b(\d{6})\b/)[1];
  const verified = await app.api('POST', '/api/auth/verify-otp', { phone: user.phone, otp: otp2 });
  assert.equal(verified.status, 200);
  assert.ok(verified.body.resetToken);
  assert.equal(verified.body.userId, undefined);

  assert.equal((await app.api('PUT', `/api/auth/reset-password/${verified.body.resetToken}`, { password: 'x' })).status, 400);
  const reset = await app.api('PUT', `/api/auth/reset-password/${verified.body.resetToken}`, { password: 'freshpassword1' });
  assert.equal(reset.status, 200);
  assert.equal((await app.api('POST', '/api/auth/login', { emailOrPhone: user.email, password: 'freshpassword1' })).status, 200);
  // the token is single use
  assert.equal((await app.api('PUT', `/api/auth/reset-password/${verified.body.resetToken}`, { password: 'another1234' })).status, 400);
});

test('forgot password by email stores only a hash of the reset token', async () => {
  const { user } = await h.makeUser();
  h.sent.emails.length = 0;
  const res = await app.api('POST', '/api/auth/forgot-password', { identifier: user.email });
  assert.equal(res.status, 200);
  assert.equal(res.body.resetToken, undefined);
  const mail = h.sent.emails.find((e) => e.type === 'reset');
  assert.ok(mail && mail.token);
  const stored = h.fake.raw('users', String(user._id)).resetPasswordToken;
  assert.notEqual(stored, mail.token);
  assert.equal((await app.api('PUT', `/api/auth/reset-password/${mail.token}`, { password: 'emailreset123' })).status, 200);
});

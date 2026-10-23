const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const pin = require('../routes/pincode');

let app;
test.before(async () => {
  app = await h.start();
  pin.__setLookup(async (p) => (p === '851204' ? { pincode: p, city: 'Khagaria', state: 'Bihar', areas: ['Chandpura'] } : null));
});
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('pincode: valid PIN fills city and state; bad and unknown PINs are rejected', async () => {
  const ok = await app.api('GET', '/api/pincode/851204');
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.body.city, ok.body.state], ['Khagaria', 'Bihar']);
  assert.equal((await app.api('GET', '/api/pincode/12345')).status, 400);
  assert.equal((await app.api('GET', '/api/pincode/012345')).status, 400);
  assert.equal((await app.api('GET', '/api/pincode/999999')).status, 404);
});

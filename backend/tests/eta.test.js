const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const pincode = require('../routes/pincode');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('delivery estimate: Delhivery days, not served, and fallback', async () => {
  pincode.__setEta(async (pin) => (pin === '400059' ? { served: true, cod: true, tat: 5 } : pin === '799001' ? { served: false } : null));
  const ok = await app.api('GET', '/api/pincode/400059/eta');
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.body.days, [6, 8]);
  assert.equal(ok.body.source, 'delhivery');
  const no = await app.api('GET', '/api/pincode/799001/eta');
  assert.equal(no.body.served, false);
  const fb = await app.api('GET', '/api/pincode/110001/eta');
  assert.equal(fb.body.source, 'estimate');
  assert.equal((await app.api('GET', '/api/pincode/12/eta')).status, 400);
});

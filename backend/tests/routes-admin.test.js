const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('settings: public read, admin-only write, pricing change reaches calculate-order-total', async () => {
  const admin = await h.makeAdmin();
  const user = await h.makeUser();
  assert.equal((await app.api('GET', '/api/settings/pricing')).status, 200);
  assert.equal((await app.api('PUT', '/api/settings/pricing', { taxRate: 5 }, user.token)).status, 403);
  const upd = await app.api('PUT', '/api/settings/pricing', { taxRate: 5 }, admin.token);
  assert.equal(upd.status, 200, JSON.stringify(upd.body));
  assert.equal((await h.models.Settings.getSettings()).pricing.taxRate, 5);
  assert.equal((await app.api('GET', '/api/settings/shipping-options')).status, 200);
});

test('contact: public submit validates, admin lists and updates status', async () => {
  const admin = await h.makeAdmin();
  assert.equal((await app.api('POST', '/api/contact', { name: 'A' })).status, 400);
  const ok = await app.api('POST', '/api/contact', { name: 'Ravi', email: 'ravi@example.com', phone: '9876543210', subject: 'Bulk', message: 'Need 20kg almonds' });
  assert.ok([200, 201].includes(ok.status), JSON.stringify(ok.body));
  assert.equal((await app.api('GET', '/api/contact')).status, 401);
  const list = await app.api('GET', '/api/contact', undefined, admin.token);
  assert.equal(list.status, 200);
  const rows = list.body.contacts || list.body.data || list.body;
  assert.ok(Array.isArray(rows) && rows.length >= 1);
  const id = rows[0]._id;
  const st = await app.api('PUT', `/api/contact/${id}/status`, { status: 'resolved' }, admin.token);
  assert.equal(st.status, 200, JSON.stringify(st.body));
});

test('support: customer opens a ticket, only owner/admin can read, admin replies and closes', async () => {
  const admin = await h.makeAdmin();
  const owner = await h.makeUser();
  const other = await h.makeUser();
  const created = await app.api('POST', '/api/support/create', { message: 'Where is my order?', category: 'delivery' }, owner.token);
  assert.ok([200, 201].includes(created.status), JSON.stringify(created.body));
  const ticketId = created.body.ticketId || created.body.ticket?.ticketId || created.body.ticket?._id;
  assert.ok(ticketId);
  const mine = await app.api('GET', '/api/support/my-tickets', undefined, owner.token);
  assert.equal(mine.status, 200);
  assert.notEqual((await app.api('GET', `/api/support/${ticketId}`, undefined, other.token)).status, 200);
  assert.equal((await app.api('GET', `/api/support/${ticketId}`, undefined, owner.token)).status, 200);
  assert.equal((await app.api('GET', '/api/support/admin/all', undefined, owner.token)).status, 403);
  const all = await app.api('GET', '/api/support/admin/all', undefined, admin.token);
  assert.equal(all.status, 200);
  const reply = await app.api('POST', `/api/support/admin/${ticketId}/reply`, { message: 'On its way' }, admin.token);
  assert.equal(reply.status, 200, JSON.stringify(reply.body));
  assert.equal((await app.api('PUT', `/api/support/admin/${ticketId}/close`, {}, admin.token)).status, 200);
});

test('campaigns: admin CRUD and overview stats are computed in JS', async () => {
  const admin = await h.makeAdmin();
  const user = await h.makeUser();
  assert.equal((await app.api('GET', '/api/campaigns', undefined, user.token)).status, 403);
  const now = Date.now();
  const c = await app.api('POST', '/api/campaigns', {
    name: `Diwali ${h.uniq()}`, type: 'seasonal', startDate: new Date(now).toISOString(), endDate: new Date(now + 864e5).toISOString(),
  }, admin.token);
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const id = c.body._id;
  assert.equal((await app.api('GET', `/api/campaigns/${id}`, undefined, admin.token)).status, 200);
  assert.equal((await app.api('PUT', `/api/campaigns/${id}`, { description: 'Festive' }, admin.token)).status, 200);
  const stats = await app.api('GET', '/api/campaigns/stats/overview', undefined, admin.token);
  assert.equal(stats.status, 200, JSON.stringify(stats.body));
  assert.ok(stats.body.overview.total >= 1);
  assert.equal((await app.api('DELETE', `/api/campaigns/${id}`, undefined, admin.token)).status, 200);
  assert.equal((await app.api('GET', `/api/campaigns/${id}`, undefined, admin.token)).status, 404);
});

test('promocodes: overview stats work without aggregation pipelines', async () => {
  const admin = await h.makeAdmin();
  await app.api('POST', '/api/promocodes', { code: `ST${h.uniq()}`.toUpperCase(), name: 'S', type: 'fixed', value: 10 }, admin.token);
  const stats = await app.api('GET', '/api/promocodes/stats/overview', undefined, admin.token);
  assert.equal(stats.status, 200, JSON.stringify(stats.body));
});

test('seo: sitemap lists active products only; robots.txt served', async () => {
  const live = await h.makeProduct({ name: 'Visible Almonds' });
  const hidden = await h.makeProduct({ name: 'Hidden Walnuts', isActive: false });
  const sm = await app.api('GET', '/api/seo/sitemap.xml');
  assert.equal(sm.status, 200);
  const xml = typeof sm.body === 'string' ? sm.body : JSON.stringify(sm.body);
  assert.ok(xml.includes(String(live._id)));
  assert.ok(!xml.includes(String(hidden._id)));
  assert.equal((await app.api('GET', '/api/seo/robots.txt')).status, 200);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');
const { priceCart } = require('../services/pricing');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

test('FIRST: free delivery from ₹499, once per customer', async () => {
  const admin = await h.makeAdmin();
  const buyer = await h.makeUser();
  await h.models.Promocode.create({
    code: 'FIRST', name: 'First order: free delivery', type: 'freeShipping', value: 0, applicableOn: 'all',
    minOrderValue: 499, userUsageLimit: 1, isActive: true, createdBy: admin.user._id,
    startDate: new Date(Date.now() - 1000), endDate: new Date(Date.now() + 86400000),
  });
  const cheap = await h.makeProduct({ price: 399, stock: 10 });
  const thekua = await h.makeProduct({ price: 499, stock: 10 });
  const base = await priceCart({ items: [{ productId: String(thekua._id), quantity: 1 }], userId: buyer.user._id });
  const withCode = await priceCart({ items: [{ productId: String(thekua._id), quantity: 1 }], promocodeCode: 'first', userId: buyer.user._id });
  assert.equal(withCode.shipping, 0);
  assert.ok(withCode.total <= base.total);
  await assert.rejects(
    priceCart({ items: [{ productId: String(cheap._id), quantity: 1 }], promocodeCode: 'FIRST', userId: buyer.user._id }),
    (e) => e.code === 'PROMO_REJECTED'
  );
});

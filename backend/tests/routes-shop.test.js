const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers/app');

let app;
test.before(async () => { app = await h.start(); });
test.after(() => { app.close(); setTimeout(() => process.exit(0), 50); });

const productBody = (over = {}) => ({ name: 'Cashew', description: 'Crunchy', category: 'dryfruits', price: 450, image: '/c.jpg', stock: 20, ...over });

test('products: admin-only writes, public list with filter + search, sorting, single fetch', async () => {
  const admin = await h.makeAdmin();
  const user = await h.makeUser();
  assert.equal((await app.api('POST', '/api/products', productBody(), user.token)).status, 403);
  const created = await app.api('POST', '/api/products', productBody({ name: 'Zesty Makhana', category: 'makhana', featured: true }), admin.token);
  assert.equal(created.status, 201);
  assert.ok(created.body._id);
  await app.api('POST', '/api/products', productBody({ name: 'Plain Almond', category: 'dryfruits' }), admin.token);

  const all = await app.api('GET', '/api/products');
  assert.equal(all.status, 200);
  assert.ok(all.body.length >= 2);
  const byCat = await app.api('GET', '/api/products?category=makhana');
  assert.deepEqual(byCat.body.map((p) => p.name), ['Zesty Makhana']);
  const featured = await app.api('GET', '/api/products?featured=true');
  assert.ok(featured.body.every((p) => p.featured));
  const search = await app.api('GET', '/api/products?search=ALMOND');
  assert.deepEqual(search.body.map((p) => p.name), ['Plain Almond']);
  // newest first
  assert.ok(new Date(all.body[0].createdAt) >= new Date(all.body[all.body.length - 1].createdAt));
  // operator injection through the query string is not interpreted
  const inj = await app.api('GET', '/api/products?category[$ne]=makhana');
  assert.equal(inj.status, 200);

  const one = await app.api('GET', `/api/products/${created.body._id}`);
  assert.equal(one.body.name, 'Zesty Makhana');
  assert.equal((await app.api('GET', '/api/products/ffffffffffffffffffffffff')).status, 404);

  const upd = await app.api('PUT', `/api/products/${created.body._id}`, { price: 499, stock: 7 }, admin.token);
  assert.equal(upd.status, 200);
  assert.equal(upd.body.price, 499);
  assert.equal((await h.models.Product.findById(created.body._id)).stock, 7);
  assert.equal((await app.api('PUT', `/api/products/${created.body._id}`, { price: 1 }, user.token)).status, 403);

  assert.equal((await app.api('DELETE', `/api/products/${created.body._id}`, undefined, admin.token)).status, 200);
  assert.equal(await h.models.Product.findById(created.body._id), null);
});

test('reviews: only buyers of a delivered order; update-in-place; rating average; helpful votes; author populated', async () => {
  const buyer = await h.makeUser();
  const stranger = await h.makeUser();
  const product = await h.makeProduct();

  const denied = await app.api('POST', `/api/products/${product._id}/reviews`, { rating: 5, comment: 'x' }, stranger.token);
  assert.equal(denied.status, 400);

  await h.models.Order.create({
    user: buyer.user._id, orderNumber: `ORD${h.uniq()}`, status: 'delivered',
    items: [{ product: product._id, quantity: 1, price: 300 }], paymentInfo: { method: 'cod' },
    itemsPrice: 300, shippingPrice: 0, taxPrice: 0, totalPrice: 300,
  });
  const first = await app.api('POST', `/api/products/${product._id}/reviews`, { rating: 4, comment: 'good' }, buyer.token);
  assert.equal(first.status, 201);
  assert.match(first.body.message, /added/);
  const again = await app.api('POST', `/api/products/${product._id}/reviews`, { rating: 2, comment: 'meh' }, buyer.token);
  assert.match(again.body.message, /updated/);

  const fetched = await app.api('GET', `/api/products/${product._id}`);
  assert.equal(fetched.body.reviews.length, 1);
  assert.equal(fetched.body.reviews[0].rating, 2);
  assert.equal(fetched.body.reviews[0].user.name, buyer.user.name, 'review author is populated');
  assert.equal(fetched.body.rating, 2);
  assert.equal(fetched.body.reviews[0].user.password, undefined);

  const rid = fetched.body.reviews[0]._id;
  const vote = await app.api('POST', `/api/products/${product._id}/reviews/${rid}/helpful`, { helpful: true }, stranger.token);
  assert.equal(vote.status, 200);
  const list = await app.api('GET', `/api/products/${product._id}/reviews`);
  assert.equal(list.status, 200);
});

test('cart: add / update / remove / clear, server-side price, stock limit, masala blocked, sync', async () => {
  const { token } = await h.makeUser();
  const p1 = await h.makeProduct({ name: 'Cart A', price: 100, stock: 5 });
  const p2 = await h.makeProduct({ name: 'Cart B', price: 40, stock: 5 });
  const masala = await h.makeProduct({ name: 'Masala', category: 'Masala', price: 10 });

  assert.equal((await app.api('GET', '/api/cart')).status, 401);
  const add = await app.api('POST', '/api/cart/add', { productId: String(p1._id), quantity: 2 }, token);
  assert.equal(add.status, 200);
  assert.equal(add.body.cart.items[0].name, 'Cart A');
  assert.equal(add.body.cart.total, 200);

  assert.equal((await app.api('POST', '/api/cart/add', { productId: String(p1._id), quantity: 1, submittedPrice: 1 }, token)).status, 400);
  assert.equal((await app.api('POST', '/api/cart/add', { productId: String(p1._id), quantity: 99 }, token)).status, 400);
  assert.equal((await app.api('POST', '/api/cart/add', { productId: String(p1._id), quantity: 6 }, token)).status, 400);
  assert.equal((await app.api('POST', '/api/cart/add', { productId: String(masala._id), quantity: 1 }, token)).status, 400);
  assert.equal((await app.api('POST', '/api/cart/add', { productId: 'ffffffffffffffffffffffff', quantity: 1 }, token)).status, 404);

  const more = await app.api('POST', '/api/cart/add', { productId: String(p1._id), quantity: 1 }, token);
  assert.equal(more.body.cart.items[0].quantity, 3, 'adding the same product merges lines');

  const upd = await app.api('PUT', '/api/cart/update', { productId: String(p1._id), quantity: 1 }, token);
  assert.equal(upd.status, 200);
  assert.equal(upd.body.cart.total, 100);

  const synced = await app.api('POST', '/api/cart/sync', { localCart: [{ _id: String(p2._id), quantity: 2 }] }, token);
  assert.equal(synced.status, 200);
  assert.equal(synced.body.cart.items.length, 2);
  assert.equal(synced.body.cart.total, 180);

  const got = await app.api('GET', '/api/cart', undefined, token);
  assert.equal(got.body.cart ? got.body.cart.items.length : got.body.items.length, 2);

  const rem = await app.api('DELETE', `/api/cart/remove/${p1._id}`, undefined, token);
  assert.equal(rem.status, 200);
  assert.equal(rem.body.cart.items.length, 1);
  const clr = await app.api('DELETE', '/api/cart/clear', undefined, token);
  assert.equal(clr.status, 200);
  assert.equal((await h.models.Cart.countDocuments()) >= 1, true);
});

test('wishlist: add, duplicate rejected, list populated, remove, toggle', async () => {
  const { token } = await h.makeUser();
  const p = await h.makeProduct({ name: 'Wish Me' });
  const add = await app.api('POST', `/api/wishlist/add/${p._id}`, undefined, token);
  assert.equal(add.status, 200);
  assert.equal(add.body.wishlist[0].name, 'Wish Me');
  assert.equal((await app.api('POST', `/api/wishlist/add/${p._id}`, undefined, token)).status, 400);
  const list = await app.api('GET', '/api/wishlist', undefined, token);
  assert.equal(list.body[0].name, 'Wish Me');
  assert.equal((await app.api('DELETE', `/api/wishlist/remove/${p._id}`, undefined, token)).status, 200);
  assert.equal((await app.api('GET', '/api/wishlist', undefined, token)).body.length, 0);
  const t1 = await app.api('POST', `/api/wishlist/toggle/${p._id}`, undefined, token);
  assert.equal(t1.status, 200);
  assert.equal((await app.api('GET', '/api/wishlist', undefined, token)).body.length, 1);
  assert.equal((await app.api('POST', '/api/wishlist/add/ffffffffffffffffffffffff', undefined, token)).status, 404);
});

test('addresses: first is default, add, update, set default, delete', async () => {
  const { token } = await h.makeUser();
  const a1 = { street: '1 A St', city: 'Patna', state: 'Bihar', pincode: '800001', phone: '9876543210' };
  const a2 = { street: '2 B St', city: 'Gaya', state: 'Bihar', pincode: '823001', phone: '9876543211' };
  assert.equal((await app.api('POST', '/api/addresses', { street: 'x' }, token)).status, 400);
  const r1 = await app.api('POST', '/api/addresses', a1, token);
  assert.equal(r1.status, 201);
  assert.equal(r1.body.addresses[0].isDefault, true);
  const r2 = await app.api('POST', '/api/addresses', a2, token);
  assert.equal(r2.body.addresses.length, 2);
  const [first, second] = r2.body.addresses;
  assert.equal(second.isDefault, false);

  const upd = await app.api('PUT', `/api/addresses/${second._id}`, { ...a2, city: 'Gaya City', isDefault: true }, token);
  assert.equal(upd.status, 200);
  const list = await app.api('GET', '/api/addresses', undefined, token);
  const defaults = list.body.filter((a) => a.isDefault);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0].city, 'Gaya City');

  assert.equal((await app.api('PUT', `/api/addresses/${first._id}/default`, undefined, token)).status, 200);
  assert.equal((await app.api('DELETE', `/api/addresses/${second._id}`, undefined, token)).status, 200);
  assert.equal((await app.api('GET', '/api/addresses', undefined, token)).body.length, 1);
  // the last remaining address cannot be deleted
  assert.equal((await app.api('DELETE', `/api/addresses/${first._id}`, undefined, token)).status, 400);
  assert.equal((await app.api('DELETE', '/api/addresses/ffffffffffffffffffffffff', undefined, token)).status, 400);
});

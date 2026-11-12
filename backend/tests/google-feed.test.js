const test = require('node:test');
const assert = require('node:assert/strict');
const { buildGoogleFeed } = require('../services/googleFeed');

const base = 'https://villagecrunch.in';
const now = new Date('2026-11-13T06:00:00Z');

test('google feed: live products with real price, preorder date, and escaping', () => {
  const xml = buildGoogleFeed([
    { _id: 'a1', name: 'Thekua · Regular · Jaggery (400 g)', description: '<p>Atta & gud</p>', price: 299, originalPrice: 399, image: '/packaging/x.jpg?v=1', images: ['/packaging/x.jpg?v=1', '/packaging/y.jpg'], stock: 20, packGroup: 'thekua', weight: '400g', category: 'thekua', shipsFrom: '2026-11-16' },
    { _id: 'a2', name: 'Shipped now', description: 'd', price: 499, image: 'https://cdn.example/z.jpg', stock: 5, shipsFrom: '2026-11-10' },
    { _id: 'a3', name: 'Sold out', description: 'd', price: 199, image: '/z.jpg', stock: 0 },
    { _id: 'a4', name: 'Hidden', description: 'd', price: 199, image: '/z.jpg', stock: 3, isActive: false },
  ], base, now);
  assert.match(xml, /<g:id>a1<\/g:id>/);
  assert.match(xml, /<g:price>299.00 INR<\/g:price>/);
  assert.doesNotMatch(xml, /sale_price|399.00/); // only the real selling price is listed
  assert.match(xml, /<g:availability>preorder<\/g:availability>\n<g:availability_date>2026-11-16T09:00\+05:30/);
  assert.match(xml, /<g:image_link>https:\/\/villagecrunch.in\/packaging\/x.jpg\?v=1<\/g:image_link>/);
  assert.equal((xml.match(/additional_image_link/g) || []).length, 2); // one extra image (open + close tag)
  assert.match(xml, /Atta &amp; gud/);
  assert.match(xml, /<g:link>https:\/\/villagecrunch.in\/product\/a1<\/g:link>/);
  assert.match(xml, /<g:id>a2<\/g:id>[\s\S]*?<g:availability>in_stock/);
  assert.match(xml, /<g:id>a3<\/g:id>[\s\S]*?<g:availability>out_of_stock/);
  assert.doesNotMatch(xml, /Hidden/);
});

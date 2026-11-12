/**
 * Google Merchant Center product feed (RSS 2.0 with the g: namespace).
 * Lists every live product with its real selling price.
 */
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
  // drop control characters Merchant Center rejects
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

const plain = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const abs = (base, url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Food, Beverages & Tobacco > Food Items > Snack Foods
const SNACK_CATEGORY = '423';

const availability = (p) => (Number(p.stock) > 0 ? 'in_stock' : 'out_of_stock');

function buildGoogleFeed(products, baseUrl) {
  const items = (products || [])
    .filter((p) => p && p.isActive !== false && !p.isBundle && Number(p.price) > 0 && p.image)
    .map((p) => {
      const id = String(p._id || p.id);
      const extra = (p.images || []).filter((u) => u && u !== p.image).slice(0, 10);
      const desc = plain(p.description).slice(0, 4900) || plain(p.name);
      const lines = [
        `<g:id>${esc(id)}</g:id>`,
        `<g:title>${esc(plain(p.name).slice(0, 150))}</g:title>`,
        `<g:description>${esc(desc)}</g:description>`,
        `<g:link>${esc(`${baseUrl}/product/${id}`)}</g:link>`,
        `<g:image_link>${esc(abs(baseUrl, p.image))}</g:image_link>`,
        ...extra.map((u) => `<g:additional_image_link>${esc(abs(baseUrl, u))}</g:additional_image_link>`),
        `<g:availability>${availability(p)}</g:availability>`,
        `<g:price>${Number(p.price).toFixed(2)} INR</g:price>`,
        '<g:brand>VillageCrunch</g:brand>',
        '<g:condition>new</g:condition>',
        '<g:identifier_exists>no</g:identifier_exists>',
        `<g:google_product_category>${SNACK_CATEGORY}</g:google_product_category>`,
        p.category ? `<g:product_type>${esc(p.category)}</g:product_type>` : '',
        p.packGroup ? `<g:item_group_id>${esc(p.packGroup)}</g:item_group_id>` : '',
        p.weight ? `<g:size>${esc(p.weight)}</g:size>` : '',
      ].filter(Boolean);
      return `<item>\n${lines.join('\n')}\n</item>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>VillageCrunch</title>
<link>${esc(baseUrl)}</link>
<description>Homemade Bihari thekua and snacks from Munger, Bihar</description>
${items.join('\n')}
</channel>
</rss>
`;
}

module.exports = { buildGoogleFeed };

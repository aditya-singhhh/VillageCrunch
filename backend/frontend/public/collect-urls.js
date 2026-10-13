// URL Collection Script for Google Search Console Indexing
// Run this script in your browser console on villagecrunch.in

console.log('🔍 Collecting URLs for Google Search Console Indexing...\n');

// Base URL
const baseUrl = window.location.origin;

// Static Important URLs
const staticUrls = [
  '/',
  '/products',
  '/about', 
  '/contact',
  '/shipping-policy',
  '/returns-policy'
];

console.log('📋 TIER 1 - Critical Pages (Submit First):');
staticUrls.forEach(url => {
  console.log(`${baseUrl}${url}`);
});

console.log('\n📦 TIER 2 - Category Pages:');
// Category URLs - update these based on your actual categories
const categories = [
  'dry-fruits',
  'makhana', 
  'thekua',
  'nuts',
  'dates',
  'cashews',
  'almonds',
  'pistachios'
];

categories.forEach(category => {
  console.log(`${baseUrl}/products?category=${category}`);
});

// Function to collect product URLs (run this on /products page)
if (window.location.pathname === '/products' || window.location.pathname === '/') {
  console.log('\n🛍️ TIER 3 - Product Pages (Top 20):');
  
  setTimeout(() => {
    // Try different selectors for product links
    const selectors = [
      'a[href*="/product/"]',
      '[href*="/product/"]', 
      '.product-card a',
      '[data-product-id] a'
    ];
    
    let productLinks = [];
    
    for (const selector of selectors) {
      const links = Array.from(document.querySelectorAll(selector));
      if (links.length > 0) {
        productLinks = links
          .map(link => link.href)
          .filter(url => url.includes('/product/'))
          .filter((url, index, arr) => arr.indexOf(url) === index) // Remove duplicates
          .slice(0, 20);
        break;
      }
    }
    
    if (productLinks.length > 0) {
      productLinks.forEach(url => {
        console.log(url);
      });
      
      console.log(`\n✅ Found ${productLinks.length} product URLs`);
    } else {
      console.log('\n⚠️ No product URLs found automatically.');
      console.log('💡 Make sure you are on the products page with products loaded.');
      console.log('💡 You can also manually add product URLs like: ' + baseUrl + '/product/PRODUCT_ID');
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`Static pages: ${staticUrls.length}`);
    console.log(`Category pages: ${categories.length}`);
    console.log(`Product pages: ${productLinks.length}`);
    console.log(`Total URLs to index: ${staticUrls.length + categories.length + productLinks.length}`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Copy the URLs above');
    console.log('2. Go to Google Search Console → URL Inspection');
    console.log('3. Paste each URL and click "REQUEST INDEXING"');
    console.log('4. Start with TIER 1, then TIER 2, then TIER 3');
    console.log('5. Space out requests (don\'t submit all at once)');
    
  }, 2000); // Wait 2 seconds for page to load
} else {
  console.log('\n💡 To collect product URLs:');
  console.log('1. Navigate to /products page');
  console.log('2. Wait for products to load');
  console.log('3. Run this script again');
}

console.log('\n🔗 Sitemap URL:');
console.log(`${baseUrl}/sitemap.xml`);

console.log('\n📝 Copy these URLs and use them in Google Search Console URL Inspection tool!');

// Export function to copy URLs to clipboard (if supported)
function copyUrlsToClipboard() {
  const allUrls = [
    ...staticUrls.map(url => baseUrl + url),
    ...categories.map(cat => `${baseUrl}/products?category=${cat}`)
  ];
  
  const urlText = allUrls.join('\n');
  
  if (navigator.clipboard) {
    navigator.clipboard.writeText(urlText).then(() => {
      console.log('✅ URLs copied to clipboard!');
    });
  } else {
    console.log('📋 Clipboard not supported. Copy URLs manually.');
  }
}

console.log('\n🤖 Run copyUrlsToClipboard() to copy static and category URLs to clipboard!');
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import FilterPanel, { SORT_OPTIONS, describePrice } from '../components/FilterPanel';
import FilterSheet from '../components/FilterSheet';
import { getProducts } from '../utils/api';
import { formatCategory, discountPercent } from '../utils/format';

const num = (v) => (v === '' || v == null ? null : Number(v));

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // All filter state lives in the URL, so it survives reload, back/forward and sharing
  const filters = useMemo(() => ({
    categories: (searchParams.get('category') || '').split(',').filter(Boolean),
    min: searchParams.get('min') || '',
    max: searchParams.get('max') || '',
    sort: SORT_OPTIONS.some((o) => o.value === searchParams.get('sort')) ? searchParams.get('sort') : 'featured',
    stock: searchParams.get('stock') === '1',
  }), [searchParams]);
  const urlSearch = searchParams.get('search') || '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const pushedSearch = useRef(urlSearch);

  const update = (patch, { replace = false } = {}) => {
    const next = { ...filters, search: urlSearch, ...patch };
    const q = {};
    if (next.categories.length) q.category = next.categories.join(',');
    if (next.min !== '') q.min = next.min;
    if (next.max !== '') q.max = next.max;
    if (next.sort !== 'featured') q.sort = next.sort;
    if (next.stock) q.stock = '1';
    if (next.search) q.search = next.search;
    setSearchParams(q, { replace: replace || 'min' in patch || 'max' in patch || 'search' in patch });
  };
  const clearAll = () => { setSearchInput(''); pushedSearch.current = ''; setSearchParams({}); };

  useEffect(() => {
    let alive = true;
    getProducts()
      .then((data) => { if (alive) setAll(Array.isArray(data) ? data : data.products || []); })
      .catch((error) => console.error('Error fetching products:', error))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Search box: debounce into the URL; follow URL changes made elsewhere (header search, back button)
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== urlSearch) { pushedSearch.current = searchInput.trim(); update({ search: searchInput.trim() }); }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  useEffect(() => {
    if (urlSearch !== pushedSearch.current) { pushedSearch.current = urlSearch; setSearchInput(urlSearch); }
  }, [urlSearch]);

  const categories = useMemo(() => [...new Set(all.map((p) => p.category).filter(Boolean))].sort(), [all]);
  const counts = useMemo(() => all.reduce((m, p) => ({ ...m, [p.category]: (m[p.category] || 0) + 1 }), {}), [all]);

  const visible = useMemo(() => {
    const term = urlSearch.trim().toLowerCase();
    const min = num(filters.min);
    const max = num(filters.max);
    let list = all.filter((p) => {
      if (term && !`${p.name} ${p.description || ''}`.toLowerCase().includes(term)) return false;
      if (filters.categories.length && !filters.categories.includes(p.category)) return false;
      if (min != null && p.price < min) return false;
      if (max != null && p.price > max) return false;
      if (filters.stock && !(p.stock > 0)) return false;
      return true;
    });
    list = [...list];
    if (filters.sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (filters.sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (filters.sort === 'discount') list.sort((a, b) => discountPercent(b.price, b.originalPrice) - discountPercent(a.price, a.originalPrice));
    return list;
  }, [all, filters, urlSearch]);

  const selectedCategory = filters.categories.length === 1 ? filters.categories[0] : 'all';
  const searchTerm = urlSearch;

  // Active filter chips
  const active = [];
  filters.categories.forEach((c) => active.push({ key: `c-${c}`, label: formatCategory(c), remove: () => update({ categories: filters.categories.filter((x) => x !== c) }) }));
  if (filters.min || filters.max) active.push({ key: 'price', label: describePrice(filters.min, filters.max), remove: () => update({ min: '', max: '' }) });
  if (filters.stock) active.push({ key: 'stock', label: 'In stock', remove: () => update({ stock: false }) });
  if (searchTerm) active.push({ key: 'q', label: `"${searchTerm}"`, remove: () => { setSearchInput(''); pushedSearch.current = ''; update({ search: '' }); } });
  const activeCount = active.length + (filters.sort !== 'featured' ? 1 : 0);

  const panelProps = { filters, onChange: (patch) => update(patch), categories, counts };

  // Dynamic SEO based on category and search
  const getSEOData = () => {
    if (selectedCategory && selectedCategory !== 'all') {
      return {
        title: `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} - Premium Quality Online`,
        description: `Buy premium ${selectedCategory} online at VillageCrunch. Fresh, natural, and authentic ${selectedCategory} with fast delivery across India. Shop now!`,
        keywords: `${selectedCategory} online, buy ${selectedCategory}, premium ${selectedCategory}, natural ${selectedCategory}`,
        url: `/products?category=${encodeURIComponent(selectedCategory)}`,
        canonical: `/products?category=${encodeURIComponent(selectedCategory)}`,
        noIndex: false
      };
    } else if (searchTerm) {
      return {
        title: `Search Results for "${searchTerm}" - VillageCrunch Products`,
        description: `Find ${searchTerm} and related products at VillageCrunch. Premium quality dry fruits, makhana, and traditional snacks.`,
        keywords: `${searchTerm}, search products, dry fruits search`,
        url: `/products?search=${encodeURIComponent(searchTerm)}`,
        canonical: '/products',
        noIndex: true
      };
    } else {
      return {
        title: 'All Products - Premium Dry Fruits, Makhana & Traditional Snacks',
        description: 'Browse our complete collection of premium dry fruits, roasted makhana, thekua, and authentic Bihari snacks. Quality guaranteed with fast delivery.',
        keywords: 'all products, dry fruits collection, makhana varieties, thekua types, premium snacks',
        url: '/products',
        canonical: '/products',
        noIndex: false
      };
    }
  };

  const seoData = getSEOData();

  const title = selectedCategory !== 'all' ? formatCategory(selectedCategory) : 'Shop all';

  return (
    <div className="pb-10">
      <SEOHead
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        url={seoData.url}
        canonical={seoData.canonical}
        noIndex={seoData.noIndex}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          ...(selectedCategory !== 'all' ? [{ name: selectedCategory, url: `/products?category=${selectedCategory}` }] : [])
        ]}
      />

      <div className="container-page pt-5 md:pt-8 flex items-end justify-between gap-4">
        <h1 className="page-title">{title}</h1>
        <p className="text-sm text-ink-soft pb-1" aria-live="polite">{loading ? '' : `${visible.length} item${visible.length === 1 ? '' : 's'}`}</p>
      </div>

      {/* Mobile / tablet toolbar */}
      <div className="lg:hidden sticky top-14 md:top-[72px] z-30 bg-paper/95 backdrop-blur border-b border-line mt-4">
        <div className="container-page py-2.5 flex items-center gap-2">
          <button
            onClick={() => setSheetOpen(true)}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-line text-sm font-semibold text-ink flex-shrink-0"
            aria-haspopup="dialog"
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            Filter &amp; sort
            {activeCount > 0 && <span className="min-w-[20px] h-5 px-1 rounded-full bg-action text-white text-xs leading-5 text-center">{activeCount}</span>}
          </button>
          <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x" role="group" aria-label="Quick category filter">
            {categories.map((c) => {
              const on = filters.categories.includes(c);
              return (
                <button
                  key={c}
                  aria-pressed={on}
                  onClick={() => update({ categories: on ? filters.categories.filter((x) => x !== c) : [...filters.categories, c] })}
                  className={`chip snap-start ${on ? 'chip-active' : ''}`}
                >
                  {formatCategory(c)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container-page pt-5 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
        {/* Desktop sidebar */}
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-[96px] max-h-[calc(100vh-112px)] overflow-y-auto pr-1">
            <div className="flex items-center justify-between h-9">
              <h2 className="font-display font-semibold text-lg">Filters</h2>
              {activeCount > 0 && <button onClick={clearAll} className="text-sm font-semibold text-action hover:underline underline-offset-4">Clear all</button>}
            </div>
            <FilterPanel {...panelProps} />
          </div>
        </aside>

        <div className="min-w-0">
          <form onSubmit={(e) => e.preventDefault()} role="search" className="relative mb-3">
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-mute pointer-events-none" aria-hidden="true" />
            <input
              id="product-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products"
              enterKeyHint="search"
              className="input-field pl-11"
            />
          </form>

          {active.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-4" aria-label="Active filters">
              {active.map((a) => (
                <li key={a.key}>
                  <button onClick={a.remove} className="inline-flex items-center gap-1.5 h-9 pl-3 pr-2 rounded-full bg-action-tint text-action-dark text-sm font-medium" aria-label={`Remove filter ${a.label}`}>
                    {a.label} <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
              <li><button onClick={clearAll} className="h-9 px-2 text-sm font-semibold text-action hover:underline underline-offset-4">Clear all</button></li>
            </ul>
          )}

          {filters.categories.includes('masala') && (
            <div className="mb-5 rounded-lg border border-line bg-cream p-4">
              <span className="badge bg-brand">Coming soon</span>
              <p className="mt-2 text-sm text-ink-soft">Masala items cannot be ordered yet.</p>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-line overflow-hidden">
                  <div className="aspect-square skeleton rounded-none"></div>
                  <div className="p-3 space-y-2">
                    <div className="h-4 skeleton"></div>
                    <div className="h-4 skeleton w-2/3"></div>
                    <div className="h-11 skeleton mt-3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Search className="w-10 h-10 mx-auto text-ink-mute mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h2 className="font-display text-xl font-semibold text-ink mb-4">
                {searchTerm ? `No products match "${searchTerm}"` : 'No products found'}
              </h2>
              <button onClick={clearAll} className="btn-primary">Clear filters</button>
            </div>
          )}
        </div>
      </div>

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onClear={clearAll}
        resultCount={visible.length}
        activeCount={activeCount}
        {...panelProps}
      />
    </div>
  );
};

export default Products;

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import SEOHead from '../components/SEOHead';
import { getProducts, getAllProducts } from '../utils/api';
import { formatCategory } from '../utils/format';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState('featured');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');

  // Fetch all products to extract categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllProducts();
        const allProducts = data.products || data || [];
        const uniqueCategories = [...new Set(allProducts.map(product => product.category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {};
        if (selectedCategory !== 'all') params.category = selectedCategory;
        if (searchTerm.trim()) params.search = searchTerm;

        const data = await getProducts(params);
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategory, searchTerm]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    const next = {};
    if (category !== 'all') next.category = category;
    if (searchInput.trim()) next.search = searchInput.trim();
    setSearchParams(next);
  };

  // Debounce the search box (300ms)
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Keep state in sync when the URL changes (header search, footer links, back button)
  const urlCategory = searchParams.get('category') || 'all';
  const urlSearch = searchParams.get('search') || '';
  useEffect(() => {
    setSelectedCategory(urlCategory);
    setSearchInput(urlSearch);
    setSearchTerm(urlSearch);
  }, [urlCategory, urlSearch]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, sortBy]);

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
          ...(selectedCategory && selectedCategory !== 'all' ? [{ name: selectedCategory, url: `/products?category=${selectedCategory}` }] : [])
        ]}
      />
      
      {/* Heading */}
      <div className="container-page pt-6 md:pt-10">
        <h1 className="page-title">{selectedCategory !== 'all' ? formatCategory(selectedCategory) : 'Shop all products'}</h1>
        <p className="mt-1 text-ink-soft">Dry fruits, makhana and thekua, packed fresh and sent across India.</p>
      </div>

      {/* Search + category chips */}
      <div className="sticky top-14 md:top-[72px] z-30 bg-paper/95 backdrop-blur border-b border-line mt-4">
        <div className="container-page py-3 space-y-3 md:space-y-0 md:flex md:items-center md:gap-4">
          <form onSubmit={(e) => e.preventDefault()} role="search" className="relative md:w-72 md:order-2 md:ml-auto flex-shrink-0">
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
          <div className="flex gap-2 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:order-1" role="group" aria-label="Filter by category">
            <button
              onClick={() => handleCategoryChange('all')}
              aria-pressed={selectedCategory === 'all'}
              className={`chip snap-start ${selectedCategory === 'all' ? 'chip-active' : ''}`}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                aria-pressed={selectedCategory === category}
                className={`chip snap-start ${selectedCategory === category ? 'chip-active' : ''}`}
              >
                {formatCategory(category)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page pt-5">
        {selectedCategory === 'masala' && (
          <div className="mb-6 rounded-lg border border-line bg-cream p-5">
            <span className="badge bg-brand">Coming soon</span>
            <h2 className="mt-3 text-xl font-display font-semibold text-ink">Masala section is on the way</h2>
            <p className="mt-1 text-sm text-ink-soft">
              We are preparing the masala range now. You can browse the section, but these items cannot be ordered yet.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-busy="true" aria-label="Loading products">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-line overflow-hidden">
                <div className="aspect-square skeleton rounded-none"></div>
                <div className="p-3 space-y-2">
                  <div className="h-3 skeleton w-1/3"></div>
                  <div className="h-4 skeleton"></div>
                  <div className="h-4 skeleton w-2/3"></div>
                  <div className="h-11 skeleton mt-3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length > 0 ? (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-ink-soft" aria-live="polite">
                {sortedProducts.length} product{sortedProducts.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="sort" className="text-sm text-ink-soft">Sort</label>
                <select
                  id="sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field h-11 w-auto py-0 text-sm"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {sortedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <Search className="w-10 h-10 mx-auto text-ink-mute mb-3" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="font-display text-xl font-semibold text-ink mb-1">
              {searchTerm ? `No products match "${searchTerm}"` : 'No products found'}
            </h2>
            <p className="text-ink-soft mb-6">Try a different search or category.</p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchInput('');
                setSearchTerm('');
                setSearchParams({});
              }}
              className="btn-primary"
            >
              {searchTerm ? 'Clear search' : 'View all products'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, getProducts, createReview, getUserOrders, toggleWishlist, getWishlist } from '../utils/api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Leaf, RefreshCw, CreditCard, ChevronLeft, ChevronRight, ChevronDown, Minus, Plus, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import SEOHead from '../components/SEOHead';
import ProductCard from '../components/ProductCard';
import useStoreSettings from '../hooks/useStoreSettings';
import { formatINR, formatCategory, discountPercent, unitPrice, averageRating } from '../utils/format';
import { imgSrc, imgProps } from '../utils/img';
import { trackViewItem } from '../utils/analytics';
import ImageLightbox from '../components/ImageLightbox';
import ThekuaStory from '../components/ThekuaStory';
import DeliveryEstimate from '../components/DeliveryEstimate';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useCart();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  // Product page view, for Meta / Google ad optimisation
  useEffect(() => {
    if (!product?._id) return;
    try { trackViewItem({ productId: product._id, name: product.name, category: product.category, price: product.price }); } catch (_) { /* ignore */ }
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [allProducts, setAllProducts] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [canReview, setCanReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  });
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [added, setAdded] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const { settings } = useStoreSettings();

  useEffect(() => {
    fetchProduct();
    fetchAllProducts();
    setSelectedImage(0); // Reset image selection when product changes
  }, [id]);

  useEffect(() => {
    if (user && product) {
      checkUserCanReview();
      checkWishlistStatus();
    }
  }, [user, product]);

  const checkWishlistStatus = async () => {
    try {
      const wishlistItems = await getWishlist();
      setIsInWishlist(wishlistItems.some(item => item._id === product._id));
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
    }
  };

  // Add keyboard navigation for carousel
  useEffect(() => {
    if (!product) return;
    
    const images = [];
    if (product.image) images.push(product.image);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
        if (img && img !== product.image) images.push(img);
      });
    }

    const handleKeyPress = (e) => {
      if (images.length > 1) {
        if (e.key === 'ArrowLeft') {
          setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1);
        } else if (e.key === 'ArrowRight') {
          setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [product]);

  // Auto-play carousel when there are multiple images
  useEffect(() => {
    if (!product) return;
    
    const images = [];
    if (product.image) images.push(product.image);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
        if (img && img !== product.image) images.push(img);
      });
    }

    // Start auto-play if there are multiple images
    if (images.length > 1) {
      setIsAutoPlaying(true);
    }

    if (images.length > 1 && isAutoPlaying) {
      const interval = setInterval(() => {
        setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
      }, 4000);
      
      return () => clearInterval(interval);
    }
  }, [product, isAutoPlaying]);

  const checkUserCanReview = async () => {
    try {
      const orders = await getUserOrders();
      setUserOrders(orders);
      
      // Check if user has purchased this product and it's delivered
      const hasPurchased = Array.isArray(orders) && orders.some(order => 
        order && 
        order.status === 'delivered' && 
        Array.isArray(order.items) && 
        order.items.some(item => {
          // Add comprehensive null checks
          if (!item || !item.product) {
            return false;
          }
          
          // Get product ID safely
          let itemProductId;
          if (typeof item.product === 'object' && item.product._id) {
            itemProductId = item.product._id;
          } else if (typeof item.product === 'string') {
            itemProductId = item.product;
          } else {
            return false;
          }
          
          const currentProductId = product?._id || id;
          return itemProductId === currentProductId;
        })
      );
      
      // Allow users to review if they've purchased the product (can update existing reviews)
      setCanReview(hasPurchased);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanReview(false); // Set to false on error to be safe
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      
      // First try to get from backend
      try {
        const data = await getProduct(id);
        setProduct(data);
        return;
      } catch (error) {
        // Try local products as fallback
      }
      
      // If not found in backend, try to find in local products by generated ID
      const allProducts = await getProducts();
      const foundProduct = allProducts.find(p => {
        const generatedId = p.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        return p._id === id || generatedId === id;
      });
      
      if (foundProduct) {
        setProduct(foundProduct);
      } else {
        toast.error('Product not found');
        navigate('/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Unable to fetch product details');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProducts = async () => {
    try {
      const data = await getProducts();
      setAllProducts(data);
    } catch (error) {
      console.error('Error fetching all products:', error);
    }
  };

  const handleAddToCart = () => {
    if (product.category === 'masala') {
      toast.error('Masala items are coming soon and cannot be purchased yet');
      return;
    }

    if (product.stock === 0) {
      toast.error('Product is out of stock');
      return;
    }
    
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      toast.error('Please login to add to wishlist');
      return;
    }

    if (!product._id) {
      toast.error('Cannot add this product to wishlist');
      return;
    }

    setIsTogglingWishlist(true);
    try {
      await toggleWishlist(product._id);
      setIsInWishlist(!isInWishlist);
      toast.success(isInWishlist ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      toast.error('Failed to update wishlist');
    } finally {
      setIsTogglingWishlist(false);
    }
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= Math.min(product.stock, 10)) {
      setQuantity(newQuantity);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      const response = await createReview(id, reviewForm);
      // Show appropriate message based on backend response
      const message = response.data?.message || 'Review submitted successfully!';
      toast.success(message);
      setShowReviewForm(false);
      setReviewForm({ rating: 5, comment: '' });
      fetchProduct(); // Refresh product to show new review
      setCanReview(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  // Enhanced review submission handler for the new ReviewForm component
  const handleEnhancedReviewSubmit = async (reviewData) => {
    setIsSubmittingReview(true);
    try {
      const response = await createReview(id, reviewData);
      const message = response.data?.message || 'Review submitted successfully!';
      toast.success(message);
      setShowReviewForm(false);
      fetchProduct(); // Refresh product to show new review
      setCanReview(false);
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  // Swipe handlers for mobile carousel
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd || !product) return;
    
    // Calculate images array
    const images = [];
    if (product.image) images.push(product.image);
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach(img => {
        if (img && img !== product.image) images.push(img);
      });
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (images.length > 1) {
      if (isLeftSwipe) {
        setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1);
      } else if (isRightSwipe) {
        setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1);
      }
    }
  };

  if (loading) {
    return (
      <div className="container-page py-6" aria-busy="true" aria-label="Loading product">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square skeleton" />
          <div className="space-y-4">
            <div className="h-4 skeleton w-1/3" />
            <div className="h-8 skeleton w-3/4" />
            <div className="h-8 skeleton w-1/3" />
            <div className="h-24 skeleton" />
            <div className="h-12 skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  // Gallery order comes from product.images (so a real photo can lead);
  // the card image is added only if the list doesn't already include it.
  const images = [];
  (Array.isArray(product.images) ? product.images : []).forEach((img) => { if (img && !images.includes(img)) images.push(img); });
  if (product.image && !images.includes(product.image)) images.unshift(product.image);
  
  // Drop duplicate entries (main image is often repeated in `images`)
  const uniqueImages = images.filter((img, i) => images.indexOf(img) === i);
  images.length = 0;
  images.push(...uniqueImages);

  // If no images at all, use a placeholder
  if (images.length === 0) {
    images.push('/placeholder-product.jpg');
  }

  // Sizes and bundles of the same product (products sharing a packGroup)
  const packOptions = product.packGroup
    ? allProducts.filter(p => p.packGroup === product.packGroup).sort((a, b) => (a.packOrder || 0) - (b.packOrder || 0))
    : [];
  const sizeOptions = packOptions.filter(p => !p.isBundle);
  // Price per 100 g for each size, so the best-value pack can be shown clearly
  const gramsOf = (w) => { const m = String(w || '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kg|g|gm|gms|gram|grams)$/); return m ? parseFloat(m[1]) * (m[2] === 'kg' ? 1000 : 1) : 0; };
  const per100 = (o) => { const g = gramsOf(o.weight); return g && Number(o.price) ? (Number(o.price) / g) * 100 : null; };
  const bestValue = sizeOptions.length > 1
    ? sizeOptions.reduce((best, o) => (per100(o) && (!best || per100(o) < per100(best)) ? o : best), null)
    : null;
  const showBetterValue = bestValue && bestValue._id !== product._id && !product.isBundle && sizeOptions.some((o) => o._id === product._id);
  const bundleOptions = packOptions.filter(p => p.isBundle);

  const relatedProducts = allProducts
    .filter(p => p.category === product.category && (p._id || p.name) !== (product._id || product.name) && (!product.packGroup || p.packGroup !== product.packGroup))
    .slice(0, 4);
  const isMasalaProduct = product.category === 'masala';

  const avg = averageRating(product.reviews);
  const reviewCount = product.reviews?.length || 0;
  const discount = discountPercent(product.price, product.originalPrice);
  const perUnit = unitPrice(product.price, product.weight);
  const outOfStock = product.stock === 0;
  const maxQty = Math.max(1, Math.min(product.stock || 1, 10));
  const taxRate = settings?.pricing?.taxRate;
  const canBuy = !isMasalaProduct && !outOfStock;
  const longDesc = (product.description || '').length > 90;

  const stepper = (
    <div className="inline-flex items-center border border-[#CDBBA4] rounded-md bg-white flex-shrink-0" role="group" aria-label="Quantity">
      <button
        onClick={() => handleQuantityChange(quantity - 1)}
        disabled={quantity <= 1}
        aria-label="Decrease quantity"
        className="w-11 h-12 inline-flex items-center justify-center text-ink disabled:text-sand"
      ><Minus className="w-4 h-4" /></button>
      <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
      <button
        onClick={() => handleQuantityChange(quantity + 1)}
        disabled={quantity >= maxQty}
        aria-label="Increase quantity"
        className="w-11 h-12 inline-flex items-center justify-center text-ink disabled:text-sand"
      ><Plus className="w-4 h-4" /></button>
    </div>
  );

  const inCart = !!product?._id && (cartItems || []).some((i) => i._id === product._id);
  const goToCart = () => navigate('/cart');
  const addLabel = added ? 'Added ✓' : `Add to cart \u00b7 ${formatINR(product.price * quantity)}`;

  return (
    <div className="pb-6 md:pb-12">
      <SEOHead 
        title={`${product.name} - Buy Online at VillageCrunch`}
        description={`${product.description || `Buy premium ${product.name} online at VillageCrunch`}. Fresh, natural, and authentic quality. Price: ₹${product.price}. Fast delivery across India.`}
        keywords={`${product.name}, buy ${product.name} online, ${product.category}, natural ${product.category}, no preservatives, Bihar`}
        url={`/product/${product._id}`}
        image={product.image}
        type="product"
        product={{
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          category: product.category,
          inStock: product.inStock,
          reviews: product.reviews,
          averageRating: product.reviews?.length > 0 ? (averageRating(product.reviews) || 0).toFixed(1) : 5,
          _id: product._id
        }}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          { name: product.category, url: `/products?category=${product.category}` },
          { name: product.name, url: `/product/${product._id}` }
        ]}
      />
      

      <div className="container-page pt-4 md:pt-6">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-ink-soft mb-3 md:mb-5">
          <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <li><Link to="/" className="hover:text-action inline-flex items-center min-h-[32px]">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to={`/products?category=${product.category}`} className="hover:text-action inline-flex items-center min-h-[32px]">{formatCategory(product.category)}</Link></li>
            <li aria-hidden="true" className="hidden sm:inline">/</li>
            <li className="hidden sm:inline text-ink truncate max-w-[24ch]" aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] gap-6 md:gap-10 items-start [&>*]:min-w-0">
          {/* Gallery */}
          <div className="md:flex md:gap-4 md:flex-row-reverse">
            <div
              className="relative flex-1 group"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => setIsAutoPlaying(false)}
              onMouseLeave={() => {
                if (product && images.length > 1) {
                  setIsAutoPlaying(true);
                }
              }}
            >
              <div className="aspect-square bg-cream rounded-lg overflow-hidden">
                <img
                  {...imgProps(images[selectedImage], '(min-width: 1024px) 50vw, 100vw')}
                  alt={product.name}
                  width="800"
                  height="800"
                  fetchpriority="high"
                  decoding="async"
                  className={`w-full h-full object-cover select-none cursor-zoom-in ${outOfStock ? 'opacity-60' : ''}`}
                  onClick={() => { setIsAutoPlaying(false); setLightbox(true); }}
                  onError={(e) => {
                    e.target.src = '/placeholder-product.jpg';
                  }}
                  draggable={false}
                />
              </div>
              {discount > 0 && canBuy && <span className="badge bg-leaf absolute top-3 left-3 text-sm px-2.5 py-1">{discount}% OFF</span>}

              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage(prev => prev === 0 ? images.length - 1 : prev - 1)}
                    className="hidden md:inline-flex absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-card"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-6 h-6 text-ink" />
                  </button>
                  <button
                    onClick={() => setSelectedImage(prev => prev === images.length - 1 ? 0 : prev + 1)}
                    className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-card"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-6 h-6 text-ink" />
                  </button>
                  <div className="md:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex" role="group" aria-label="Choose image">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className="w-6 h-6 inline-flex items-center justify-center"
                        aria-label={`Go to image ${index + 1}`}
                        aria-current={selectedImage === index}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${selectedImage === index ? 'bg-brand' : 'bg-brand/30'}`} />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="hidden md:flex md:flex-col gap-2 mt-0">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`Show image ${index + 1}`}
                    className={`flex-shrink-0 w-[72px] h-[72px] rounded-md border-2 overflow-hidden bg-cream ${
                      selectedImage === index ? 'border-action' : 'border-line hover:border-sand'
                    }`}
                  >
                    <img
                      src={imgSrc(img, 400)}
                      alt=""
                      width="72" height="72" loading="lazy" decoding="async"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/placeholder-product.jpg'; }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy box */}
          <div className="md:sticky md:top-24">
            <h1 className=" font-display font-bold text-2xl leading-[30px] md:text-[32px] md:leading-[38px] text-ink">{product.name}</h1>

            {reviewCount > 0 && (
              <a href="#reviews" className="mt-2 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-action min-h-[32px]">
                <Star className="w-4 h-4 text-gold fill-current" aria-hidden="true" />
                <span className="font-semibold text-ink">{avg.toFixed(1)}</span>
                <span>({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
              </a>
            )}

            {/* Price */}
            <div className="mt-4">
              <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
                <span className="text-[28px] md:text-[32px] leading-9 font-semibold text-ink tabular-nums">{formatINR(product.price)}</span>
                {product.originalPrice > product.price && (
                  <>
                    <span className="text-lg text-ink-mute line-through tabular-nums">{formatINR(product.originalPrice)}</span>
                    <span className="text-sm font-semibold text-leaf">{discount}% OFF</span>
                  </>
                )}
              </div>
              <p className="text-sm text-ink-mute mt-1">
                {perUnit && <span>{perUnit}</span>}
                {perUnit && <span> &middot; </span>}
                <span>{settings?.pricing?.pricesIncludeTax === false && taxRate > 0 ? `+ ${taxRate}% GST at checkout` : 'Inclusive of all taxes'}</span>
              </p>
              {!outOfStock && ['thekua', 'gifts'].includes(product.category) && (
                <p className="mt-2 text-sm text-ink-soft">
                  <span className="font-medium text-ink">Made fresh in desi ghee after you order</span> · ships in 1–2 days ·{' '}
                  <button type="button" onClick={() => toast.success('FIRST is applied automatically at checkout on your first order', { duration: 3000 })}
                    className="font-medium text-leaf underline decoration-dotted underline-offset-4">first order: free delivery</button>
                </p>
              )}
            </div>

            {/* Pack sizes and bundles */}
            {packOptions.length > 1 && (
              <div className="mt-4 space-y-3">
                {[['Choose a pack size', sizeOptions], ['Bundles & gift packs', bundleOptions]].map(([title, opts]) => opts.length > 0 && (
                  <div key={title}>
                    <p className="text-sm font-semibold text-ink mb-2">{title}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {opts.map((o) => {
                        const active = o._id === product._id;
                        const isBest = bestValue && o._id === bestValue._id;
                        const unit = !o.isBundle && per100(o);
                        return (
                          <Link
                            key={o._id}
                            to={`/product/${o._id}`}
                            aria-current={active ? 'true' : undefined}
                            className={`relative block rounded-md border-2 px-3 py-2 min-h-[44px] transition-colors ${active ? 'border-brand bg-action-tint' : isBest ? 'border-leaf bg-leaf-tint/40 hover:border-leaf' : 'border-line bg-white hover:border-brand/60'}`}
                          >
                            {isBest && <span className="absolute -top-2.5 right-2 rounded-full bg-leaf px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Best value</span>}
                            <span className="block text-sm font-semibold text-ink">{o.packLabel || o.weight}</span>
                            <span className="block text-sm text-ink-soft">{formatINR(o.price)}{unit ? <span className="text-xs text-ink-mute"> · {formatINR(unit)}/100 g</span> : null}</span>
                            {o.packNote && <span className="block text-xs font-semibold text-leaf">{o.packNote}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Weight + stock */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {product.weight && packOptions.length <= 1 && (
                <span className="inline-flex items-center h-10 px-4 rounded-md border-2 border-brand bg-action-tint text-brand text-sm font-semibold">{product.weight}</span>
              )}
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${outOfStock ? 'text-berry' : 'text-leaf'}`}>
                {outOfStock ? 'Out of stock' : (<><Check className="w-4 h-4" aria-hidden="true" /> In stock</>)}
              </span>
            </div>
            {showBetterValue && (
              <Link to={`/product/${bestValue._id}`} className="mt-3 flex items-center justify-between gap-3 rounded-md border border-leaf/40 bg-leaf-tint/50 px-3 py-2 text-sm">
                <span className="text-ink-soft">
                  <b className="text-ink">{bestValue.packLabel || bestValue.weight}</b> for {formatINR(bestValue.price)}: just {formatINR(per100(bestValue))}/100 g{bestValue.packNote ? ` · ${bestValue.packNote}` : ''}
                </span>
                <span className="font-semibold text-leaf whitespace-nowrap">Choose →</span>
              </Link>
            )}

            {!isMasalaProduct && <DeliveryEstimate />}

            {/* Description */}
            {product.description && (
              <div className="mt-4">
                <p className={`text-ink-soft leading-relaxed ${!descOpen && longDesc ? 'line-clamp-2' : ''}`}>{product.description}</p>
                {longDesc && (
                  <button onClick={() => setDescOpen((v) => !v)} className="text-sm font-medium text-action hover:underline min-h-[44px]" aria-expanded={descOpen}>
                    {descOpen ? 'Show less' : 'Read more'}
                  </button>
                )}
              </div>
            )}

            {/* Desktop buy row */}
            <div className="hidden md:block mt-5">
              {isMasalaProduct ? (
                <div className="rounded-md bg-cream px-5 py-4 text-sm font-medium text-ink-soft">
                  Coming soon. This masala item is not available for purchase yet.
                </div>
              ) : (
                <div className="flex gap-3">
                  {canBuy && !(inCart && !added) && stepper}
                  {inCart && !added ? (
                    <button onClick={goToCart} className="btn-primary flex-1">
                      <ShoppingCart className="w-5 h-5" aria-hidden="true" /> In your cart · Go to checkout
                    </button>
                  ) : (
                    <button
                      onClick={handleAddToCart}
                      disabled={outOfStock}
                      className="btn-primary flex-1"
                    >
                      {outOfStock ? 'Out of stock' : (<><ShoppingCart className="w-5 h-5" aria-hidden="true" /> {addLabel}</>)}
                    </button>
                  )}
                  {user && product._id && (
                    <button
                      onClick={handleToggleWishlist}
                      disabled={isTogglingWishlist}
                      className={`w-12 h-12 rounded-md border-[1.5px] inline-flex items-center justify-center disabled:opacity-50 ${
                        isInWishlist ? 'bg-berry-tint border-berry text-berry' : 'bg-white border-brand text-brand hover:bg-cream'
                      }`}
                      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      aria-pressed={isInWishlist}
                    >
                      <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current' : ''}`} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Mobile wishlist */}
            {user && product._id && (
              <button
                onClick={handleToggleWishlist}
                disabled={isTogglingWishlist}
                className="md:hidden mt-3 inline-flex items-center gap-2 min-h-[44px] text-sm font-medium text-brand disabled:opacity-50"
                aria-pressed={isInWishlist}
              >
                <Heart className={`w-5 h-5 ${isInWishlist ? 'fill-current text-berry' : ''}`} />
                {isInWishlist ? 'Saved to wishlist' : 'Save to wishlist'}
              </button>
            )}

            {/* Trust strip */}
            <ul className="mt-5 grid grid-cols-3 gap-2 border-y border-line py-4 text-center">
              <li className="flex flex-col items-center gap-1.5 text-[13px] leading-4 text-ink-soft">
                <Leaf className="w-6 h-6 text-leaf" strokeWidth={1.75} aria-hidden="true" />
                Packed fresh
              </li>
              <li>
                <Link to="/returns-policy" className="flex flex-col items-center gap-1.5 text-[13px] leading-4 text-ink-soft hover:text-action">
                  <RefreshCw className="w-6 h-6 text-leaf" strokeWidth={1.75} aria-hidden="true" />
                  Easy returns
                </Link>
              </li>
              <li className="flex flex-col items-center gap-1.5 text-[13px] leading-4 text-ink-soft">
                <CreditCard className="w-6 h-6 text-leaf" strokeWidth={1.75} aria-hidden="true" />
                Secure UPI &amp; card
              </li>
            </ul>

            {/* Accordions */}
            <div className="mt-2 divide-y divide-line">
              {product.benefits?.length > 0 && (
                <details className="group">
                  <summary className="flex items-center justify-between min-h-[52px] cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    Benefits <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <ul className="pb-4 space-y-2">
                    {product.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2.5 text-ink-soft">
                        <Check className="w-4 h-4 mt-1 text-leaf flex-shrink-0" aria-hidden="true" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {product.ingredients?.length > 0 && (
                <details className="group">
                  <summary className="flex items-center justify-between min-h-[52px] cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    Ingredients <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="pb-4 text-ink-soft">{product.ingredients.join(', ')}</p>
                </details>
              )}
              <details className="group">
                <summary className="flex items-center justify-between min-h-[52px] cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  Shipping &amp; returns <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <p className="pb-4 text-ink-soft">
                  <Link to="/shipping-policy" className="text-action underline underline-offset-2">Shipping</Link>{' · '}
                  <Link to="/returns-policy" className="text-action underline underline-offset-2">Returns</Link>
                </p>
              </details>
            </div>
          </div>
        </div>

        {product.category === 'thekua' && <ThekuaStory />}

        {/* Reviews */}
        <section id="reviews" className="mt-10 md:mt-14 scroll-mt-24" aria-label="Customer reviews">
          {showReviewForm && (
            <div className="mb-8">
              <ReviewForm
                product={product}
                existingReview={product?.reviews?.find(review => {
                  const reviewUserId = review.user._id || review.user;
                  return reviewUserId === user?._id;
                })}
                onSubmit={handleEnhancedReviewSubmit}
                onCancel={() => setShowReviewForm(false)}
                isSubmitting={isSubmittingReview}
              />
            </div>
          )}
          <ReviewList
            productId={product._id}
            onWriteReview={canReview ? () => setShowReviewForm(true) : null}
          />
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-10 md:mt-14" aria-label="Related products">
            <h2 className="section-title !mb-4">More {formatCategory(product.category).toLowerCase()}</h2>
            <div className="flex gap-3 overflow-x-auto snap-x scroll-pl-4 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible pb-1">
              {relatedProducts.map((rp) => (
                <div key={rp._id || rp.name} className="flex-none w-44 snap-start md:w-auto">
                  <ProductCard product={rp} compact />
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {lightbox && <ImageLightbox images={images} start={selectedImage} alt={product.name} onClose={() => setLightbox(false)} />}

      {/* Sticky buy bar (mobile) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-raised p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {isMasalaProduct ? (
          <p className="text-sm font-medium text-ink-soft text-center py-3">Coming soon. Not available for purchase yet.</p>
        ) : (
          <div className="flex items-center gap-3">
            {inCart && !added ? (
              <button onClick={goToCart} className="btn-primary flex-1 px-3">
                In your cart · Go to checkout →
              </button>
            ) : (
              <>
                {canBuy && stepper}
                <button onClick={handleAddToCart} disabled={outOfStock} className="btn-primary flex-1 px-3">
                  {outOfStock ? 'Out of stock' : addLabel}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;

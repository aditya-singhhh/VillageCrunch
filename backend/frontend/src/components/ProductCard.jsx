import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { createReview, toggleWishlist, getWishlist } from '../utils/api';
import { formatINR, discountPercent, averageRating } from '../utils/format';
import toast from 'react-hot-toast';

const ProductCard = ({ product, showQuickRating = false, userCanRate = false, onRatingSubmit, compact = false }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [added, setAdded] = useState(false);
  const addedTimer = useRef(null);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  // Check if product is in wishlist on component mount
  useEffect(() => {
    if (user && product._id) {
      checkWishlistStatus();
    }
  }, [user, product._id]);

  const checkWishlistStatus = async () => {
    try {
      const wishlistItems = await getWishlist();
      setIsInWishlist(wishlistItems.some(item => item._id === product._id));
    } catch (error) {
      console.error('Failed to check wishlist status:', error);
    }
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart(product);
    setAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

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

  const handleQuickRating = async (e, rating) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please login to rate products');
      return;
    }

    if (!userCanRate) {
      toast.error('You can only rate products you have purchased and received');
      return;
    }

    setIsSubmittingRating(true);
    try {
      await createReview(product._id, {
        rating,
        comment: `Quick rating: ${rating} star${rating !== 1 ? 's' : ''}`
      });
      toast.success('Thank you for your rating!');
      if (onRatingSubmit) onRatingSubmit();
    } catch (error) {
      toast.error('Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
      setHoveredRating(0);
    }
  };

  const avg = averageRating(product.reviews);
  const reviewCount = product.reviews?.length || 0;
  const isMasalaProduct = product.category === 'masala';
  const outOfStock = product.stock === 0;
  const discount = discountPercent(product.price, product.originalPrice);

  // Generate a fallback ID if _id is missing (for products from JSON file)
  const productId = product._id || product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <article className="relative flex flex-col h-full bg-white rounded-lg border border-line shadow-card overflow-hidden zoom-on-hover hover:border-sand transition-colors">
      <div className="relative aspect-square bg-cream overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          width="400"
          height="400"
          loading="lazy"
          decoding="async"
          className={`zoom-img w-full h-full object-cover ${outOfStock ? 'opacity-50' : ''}`}
        />
        {discount > 0 && !outOfStock && !isMasalaProduct && (
          <span className="badge bg-leaf absolute top-2 left-2">{discount}% OFF</span>
        )}
        {isMasalaProduct && (
          <span className="badge bg-brand absolute top-2 left-2">Coming soon</span>
        )}
        {outOfStock && (
          <span className="badge bg-ink absolute top-2 left-2">Out of stock</span>
        )}
      </div>

      {/* Wishlist button (above the stretched link) */}
      {user && product._id && (
        <button
          onClick={handleToggleWishlist}
          disabled={isTogglingWishlist}
          className="absolute top-0 right-0 z-10 w-11 h-11 inline-flex items-center justify-center disabled:opacity-50"
          aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isInWishlist}
        >
          <span className="w-8 h-8 rounded-full bg-white/90 shadow-card inline-flex items-center justify-center">
            <Heart className={`w-[18px] h-[18px] ${isInWishlist ? 'text-berry fill-current' : 'text-ink-soft'}`} />
          </span>
        </button>
      )}

      <div className={`flex flex-col flex-1 ${compact ? 'p-2.5' : 'p-3'}`}>
        <h3 className="font-sans text-base font-semibold leading-snug text-ink line-clamp-2 min-h-[2.75rem] text-[15px]">
          <Link
            to={`/product/${productId}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-focus"
          >
            {product.name}
          </Link>
        </h3>

        <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-ink-soft">
          {product.weight && <span className="inline-block px-2 py-0.5 bg-cream rounded-sm text-xs font-medium">{product.weight}</span>}
          {showQuickRating && userCanRate ? (
            <span className="relative z-10 inline-flex items-center" onMouseLeave={() => setHoveredRating(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={(e) => handleQuickRating(e, n)}
                  onMouseEnter={() => setHoveredRating(n)}
                  disabled={isSubmittingRating}
                  className="w-6 h-8 inline-flex items-center justify-center disabled:opacity-50"
                  aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
                >
                  <Star className={`w-4 h-4 ${n <= (hoveredRating || Math.round(avg || 0)) ? 'text-gold fill-current' : 'text-sand'}`} />
                </button>
              ))}
            </span>
          ) : (
            reviewCount > 0 && (
              <span className="inline-flex items-center gap-1" aria-label={`Rated ${avg.toFixed(1)} out of 5 from ${reviewCount} review${reviewCount !== 1 ? 's' : ''}`}>
                <Star className="w-3.5 h-3.5 text-gold fill-current" aria-hidden="true" />
                <span className="font-medium text-ink">{avg.toFixed(1)}</span>
                <span className="text-ink-mute">({reviewCount})</span>
              </span>
            )
          )}
        </div>

        <div className="mt-2">
          <div className="flex items-baseline flex-wrap gap-x-2">
            <span className="text-lg font-semibold text-ink tabular-nums">{formatINR(product.price)}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-ink-mute line-through tabular-nums">{formatINR(product.originalPrice)}</span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-3">
          {isMasalaProduct ? (
            <div className="w-full h-11 inline-flex items-center justify-center rounded-md bg-cream text-sm font-medium text-ink-soft">
              Not available yet
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={outOfStock}
              aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}
              className={`relative z-10 w-full h-11 rounded-md text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed ${
                outOfStock
                  ? 'bg-cream text-ink-mute'
                  : added
                    ? 'bg-leaf text-white'
                    : 'bg-action text-white hover:bg-action-dark active:scale-[.98]'
              }`}
            >
              {outOfStock ? 'Out of stock' : added ? (<><Check className="w-4 h-4" /> Added</>) : (<><ShoppingCart className="w-4 h-4" /> Add to cart</>)}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default ProductCard;

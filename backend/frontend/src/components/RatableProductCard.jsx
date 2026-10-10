import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatINR, discountPercent } from '../utils/format';
import { createReview, getUserOrders } from '../utils/api';
import toast from 'react-hot-toast';

const RatableProductCard = ({ product, orderId }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [canRate, setCanRate] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    checkRatingEligibility();
  }, [user, product]);

  const checkRatingEligibility = async () => {
    if (!user || !product) return;

    try {
      // Check if user has delivered orders with this product
      const orders = await getUserOrders();
      const hasDeliveredProduct = orders.some(order => 
        order.status === 'delivered' && 
        order.items.some(item => {
          const itemProductId = item.product._id || item.product;
          const currentProductId = product._id;
          return itemProductId === currentProductId;
        })
      );

      // Check if user has already reviewed this product
      const hasReviewed = product.reviews?.some(review => {
        const reviewUserId = review.user._id || review.user;
        return reviewUserId === user._id;
      });

      setCanRate(hasDeliveredProduct && !hasReviewed);
      setHasRated(hasReviewed);
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
    }
  };

  const handleQuickRating = async (rating) => {
    if (!user) {
      toast.error('Please login to rate products');
      return;
    }

    if (!canRate) {
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
      setCanRate(false);
      setHasRated(true);
      // Refresh the product data
      window.location.reload(); // Simple refresh - could be improved with state management
    } catch (error) {
      toast.error('Failed to submit rating');
      console.error('Rating error:', error);
    } finally {
      setIsSubmittingRating(false);
      setHoveredRating(0);
    }
  };

  const calculateAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const averageRating = calculateAverageRating(product.reviews);
  const reviewCount = product.reviews?.length || 0;
  const productId = product._id || product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const isMasalaProduct = product.category === 'masala';

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    toast.success('Added to cart', { duration: 1500 });
  };

  const discount = discountPercent(product.price, product.originalPrice);
  return (
    <div className="bg-white rounded-lg border border-line shadow-card overflow-hidden">
      <Link to={`/product/${productId}`} className="block">
        <div className="relative overflow-hidden aspect-[4/3] bg-cream">
          <img
            src={product.image}
            alt={product.name}
            width="400" height="300" loading="lazy" decoding="async"
            className={`w-full h-full object-cover ${product.stock === 0 ? 'opacity-50' : ''}`}
          />
          {discount > 0 && (
            <span className="badge bg-leaf absolute top-2 left-2">Save {discount}%</span>
          )}
          {product.stock === 0 && <span className="badge bg-ink absolute top-2 right-2">Out of stock</span>}
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/product/${productId}`}>
          <h3 className="font-sans text-base font-semibold text-ink mb-1 line-clamp-2 hover:text-action transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-ink-soft mb-3">{product.weight}</p>

        {/* Rating Section */}
        <div className="mb-4">
          {canRate ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-ink">Rate this product:</p>
              <div 
                className="flex items-center space-x-1"
                onMouseLeave={() => setHoveredRating(0)}
              >
                {[1, 2, 3, 4, 5].map((starNum) => (
                  <button
                    key={starNum}
                    onClick={() => handleQuickRating(starNum)}
                    onMouseEnter={() => setHoveredRating(starNum)}
                    disabled={isSubmittingRating}
                    className="w-9 h-11 inline-flex items-center justify-center disabled:opacity-50"
                    aria-label={`Rate ${starNum} star${starNum !== 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        starNum <= hoveredRating
                          ? 'text-gold fill-current' 
                          : starNum <= averageRating
                          ? 'text-gold fill-current'
                          : 'text-sand'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-ink-soft">
                  {hoveredRating > 0 ? `${hoveredRating} star${hoveredRating !== 1 ? 's' : ''}` : 'Click to rate'}
                </span>
              </div>
            </div>
          ) : reviewCount > 0 ? (
            <div className="flex items-center">
              <div className="flex text-gold">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < Math.floor(averageRating) ? 'fill-current' : ''}`}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-ink-soft">
                ({averageRating}) • {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </span>
              {hasRated && (
                <span className="ml-2 text-xs text-leaf">✓ You rated this</span>
              )}
            </div>
          ) : (
            <div className="text-sm text-ink-mute">No ratings yet</div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xl font-semibold text-ink tabular-nums">
              {formatINR(product.price)}
            </span>
            {product.originalPrice > product.price && (
              <span className="ml-2 text-sm text-ink-mute line-through tabular-nums">
                {formatINR(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {isMasalaProduct ? (
          <div className="w-full h-11 inline-flex items-center justify-center rounded-md bg-cream text-sm font-medium text-ink-soft">
            Not available for purchase yet
          </div>
        ) : (
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className={`w-full h-11 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
              product.stock === 0
                ? 'bg-cream text-ink-mute cursor-not-allowed'
                : 'bg-action text-white hover:bg-action-dark'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>{product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RatableProductCard;
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, Star, X } from 'lucide-react';
import { getMyOrders, createReview, getProduct } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { formatINR } from '../utils/format';

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [userRatings, setUserRatings] = useState({}); // Store user's ratings for products

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const data = await getMyOrders();
      setOrders(data);
      
      // Fetch user ratings for all products in orders
      await fetchUserRatings(data);
    } catch (error) {
      toast.error('Failed to load orders');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRatings = async (orders) => {
    const ratings = {};
    const productIds = new Set();

    // Collect all unique product IDs from orders
    orders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product?._id || item.product;
        if (productId) {
          productIds.add(productId);
        }
      });
    });

    // Fetch product details to get user's reviews
    for (const productId of productIds) {
      try {
        const product = await getProduct(productId);
        // Find user's review for this product
        const userReview = product.reviews?.find(review => {
          const reviewUserId = review.user._id || review.user;
          return reviewUserId === user._id;
        });
        
        if (userReview) {
          ratings[productId] = {
            rating: userReview.rating,
            comment: userReview.comment,
            hasReviewed: true
          };
        }
      } catch (error) {
        console.error(`Error fetching product ${productId}:`, error);
      }
    }

    setUserRatings(ratings);
  };

  const getUserRating = (productId) => {
    return userRatings[productId]?.rating || 0;
  };

  const hasUserReviewed = (productId) => {
    return userRatings[productId]?.hasReviewed || false;
  };

  const handleOpenRating = (product, orderId) => {
    setSelectedProduct(product);
    setSelectedOrderId(orderId);
    setShowRatingModal(true);
    
    // Set existing rating and comment if user has already reviewed
    const productId = product.product?._id || product.product || product._id;
    const existingRating = userRatings[productId];
    
    if (existingRating) {
      setRating(existingRating.rating);
      setComment(existingRating.comment || '');
    } else {
      setRating(5);
      setComment('');
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedProduct || !comment.trim()) {
      toast.error('Please provide a rating and comment');
      return;
    }

    setSubmittingReview(true);
    try {
      // Use the product ID from the selected product
      const productId = selectedProduct.product?._id || selectedProduct.product || selectedProduct._id;
      
      const response = await createReview(productId, {
        rating,
        comment: comment.trim()
      });

      // Update local user ratings
      setUserRatings(prev => ({
        ...prev,
        [productId]: {
          rating: rating,
          comment: comment.trim(),
          hasReviewed: true
        }
      }));

      // Show appropriate message based on backend response
      const message = response.data?.message || 'Thank you for your review!';
      toast.success(message);
      setShowRatingModal(false);
      setSelectedProduct(null);
      setSelectedOrderId(null);
      
      // Optionally refresh orders to update any UI indicators
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
      console.error('Review submission error:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleQuickRating = async (product, orderId, ratingValue) => {
    try {
      const productId = product.product?._id || product.product || product._id;
      
      const response = await createReview(productId, {
        rating: ratingValue,
        comment: `Quick rating: ${ratingValue} star${ratingValue !== 1 ? 's' : ''}`
      });

      // Update local user ratings
      setUserRatings(prev => ({
        ...prev,
        [productId]: {
          rating: ratingValue,
          comment: `Quick rating: ${ratingValue} star${ratingValue !== 1 ? 's' : ''}`,
          hasReviewed: true
        }
      }));

      // Show appropriate message based on backend response
      const message = response.data?.message || 'Thank you for your rating!';
      toast.success(message);
      fetchOrders(); // Refresh to update UI
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit rating');
      console.error('Quick rating error:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-action-tint text-action-dark',
      confirmed: 'bg-cream text-brand',
      processing: 'bg-cream text-brand',
      shipped: 'bg-cream text-brand',
      delivered: 'bg-leaf-tint text-leaf',
      cancelled: 'bg-berry-tint text-berry',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'shipped':
        return <Truck className="w-4 h-4" aria-hidden="true" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" aria-hidden="true" />;
      default:
        return <Package className="w-4 h-4" aria-hidden="true" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-desi-gold"></div>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-2">
          <h1 className="page-title">My orders</h1>
          <Link to="/rate-products" className="btn-ghost -ml-3 sm:ml-0 justify-start h-11">
            <Star className="w-4 h-4" aria-hidden="true" /> Rate your products
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 panel">
            <Package className="w-12 h-12 mx-auto text-ink-mute mb-4" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-xl font-display font-semibold text-ink mb-2">No orders yet</h2>
            <p className="text-ink-soft mb-6">Your orders will show up here once you place one.</p>
            <Link to="/products" className="btn-primary">Start shopping</Link>
          </div>
        ) : (
          <div className="space-y-5 max-w-3xl">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg border border-line shadow-card overflow-hidden">
                <div className="bg-cream px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-xs text-ink-soft">Order</p>
                    <p className="font-semibold text-ink text-sm break-all">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Placed on</p>
                    <p className="font-medium text-sm">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-ink-soft">Total</p>
                    <p className="font-semibold text-ink tabular-nums">{formatINR(order.totalPrice)}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    <span className="capitalize">{order.status}</span>
                  </span>
                </div>

                {/* Consumption Reminder for Delivered Orders */}
                {order.status === 'delivered' && (
                  <div className="bg-leaf-tint mx-4 sm:mx-6 mt-4 p-3 rounded-md">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-leaf flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-leaf">Delivered</p>
                        <p className="text-sm text-ink-soft">Enjoyed it? Rate your products below.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 sm:p-6">
                  <div className="space-y-3 mb-5">
                    {order.items.map((item, index) => {
                      // Safe product ID generation with null checks
                      const productId = item.product?._id || item.product || 
                        item.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 
                        `product-${index}`;
                      
                      return (
                        <Link 
                          key={index} 
                          to={`/product/${productId}`}
                          className="flex items-start gap-3 p-2 -mx-2 rounded-lg hover:bg-paper transition-colors group"
                        >
                          <img
                            src={item.image || '/placeholder-product.jpg'}
                            alt={item.name || 'Product'}
                            width="56" height="56" loading="lazy" decoding="async"
                            className="w-14 h-14 object-cover rounded-md bg-cream flex-shrink-0"
                            onError={(e) => {
                              e.target.src = '/placeholder-product.jpg';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ink line-clamp-2 leading-snug group-hover:text-action transition-colors">
                              {item.name || 'Unknown Product'}
                            </p>
                            <p className="text-sm text-ink-soft">
                              Qty {item.quantity || 1}{item.weight ? ` · ${item.weight}` : ''}
                            </p>
                            
                            {/* Add rating option for delivered items */}
                            {order.status === 'delivered' && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-3">
                                {/* Quick Star Rating */}
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-ink-soft">
                                    {hasUserReviewed(item.product?._id || item.product) ? 'Your rating:' : 'Quick rate:'}
                                  </span>
                                  {[1, 2, 3, 4, 5].map((star) => {
                                    const productId = item.product?._id || item.product;
                                    const userRating = getUserRating(productId);
                                    const isRated = star <= userRating;
                                    
                                    return (
                                      <button
                                        key={star}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleQuickRating(item, order._id, star);
                                        }}
                                        className="w-7 h-8 inline-flex items-center justify-center"
                                        aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                        title={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                                      >
                                        <Star 
                                          className={`w-4 h-4 transition-colors ${
                                            isRated 
                                              ? 'text-gold fill-current' 
                                              : 'text-sand hover:text-gold hover:fill-current'
                                          }`} 
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                                
                                {/* Detailed Review Button */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenRating(item, order._id);
                                  }}
                                  className="text-sm font-medium text-action hover:underline min-h-[32px]"
                                >
                                  {hasUserReviewed(item.product?._id || item.product) ? 'Update Review' : 'Write Review'}
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-ink tabular-nums whitespace-nowrap">
                            {formatINR((item.price || 0) * (item.quantity || 1))}
                          </p>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/order/${order._id}`}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      View details
                    </Link>
                    {order.trackingNumber && (
                      <button className="btn-secondary">
                        Track Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-ink">
                {hasUserReviewed(selectedProduct.product?._id || selectedProduct.product || selectedProduct._id) 
                  ? 'Update Your Review' 
                  : 'Write a Review'}
              </h3>
              <button
                onClick={() => setShowRatingModal(false)}
                className="text-ink-mute hover:text-ink-soft"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <img
                src={selectedProduct.image || '/placeholder-product.jpg'}
                alt={selectedProduct.name || 'Product'}
                className="w-16 h-16 object-cover rounded-lg mx-auto mb-2"
              />
              <h4 className="text-center font-semibold text-ink">
                {selectedProduct.name || 'Unknown Product'}
              </h4>
            </div>

            <form onSubmit={handleSubmitReview}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-soft mb-2">
                  Your Rating
                </label>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="focus:outline-none  transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? 'text-desi-gold fill-current'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-ink-soft mt-1">
                  {rating} star{rating !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-soft mb-2">
                  Your Review
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-[#CDBBA4] rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                  placeholder="Share your experience with this product..."
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={submittingReview || !comment.trim()}
                  className="flex-1 bg-action text-white py-2 px-4 rounded-lg hover:bg-action-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingReview 
                    ? 'Submitting...' 
                    : hasUserReviewed(selectedProduct.product?._id || selectedProduct.product || selectedProduct._id)
                      ? 'Update Review'
                      : 'Submit Review'
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowRatingModal(false)}
                  className="px-4 py-2 border border-[#CDBBA4] text-ink-soft rounded-lg hover:bg-cream transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
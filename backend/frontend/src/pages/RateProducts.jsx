import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, Package, ShoppingBag } from 'lucide-react';
import { getUserOrders, getProducts, createReview } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const RateProducts = () => {
  const { user } = useAuth();
  const [deliveredProducts, setDeliveredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingRating, setSubmittingRating] = useState({});

  useEffect(() => {
    if (user) {
      fetchDeliveredProducts();
    }
  }, [user]);

  const fetchDeliveredProducts = async () => {
    try {
      const [orders, allProducts] = await Promise.all([
        getUserOrders(),
        getProducts()
      ]);

      // Get all delivered products that user hasn't rated yet
      const deliveredItems = [];
      
      orders.forEach(order => {
        if (order.status === 'delivered') {
          order.items.forEach(item => {
            // Find full product details
            const fullProduct = allProducts.find(p => p._id === (item.product._id || item.product));
            if (fullProduct) {
              // Check if user hasn't rated this product yet
              const hasRated = fullProduct.reviews?.some(review => 
                (review.user._id || review.user) === user._id
              );

              if (!hasRated) {
                // Check if product is already in the list (user might have ordered same product multiple times)
                const existingProduct = deliveredItems.find(dp => dp._id === fullProduct._id);
                if (!existingProduct) {
                  deliveredItems.push({
                    ...fullProduct,
                    orderDate: order.createdAt,
                    orderId: order._id
                  });
                }
              }
            }
          });
        }
      });

      setDeliveredProducts(deliveredItems);
    } catch (error) {
      console.error('Error fetching delivered products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRating = async (productId, rating) => {
    setSubmittingRating(prev => ({ ...prev, [productId]: true }));
    
    try {
      await createReview(productId, {
        rating,
        comment: `Quick rating: ${rating} star${rating !== 1 ? 's' : ''}`
      });
      
      toast.success('Thank you for your rating!');
      
      // Remove the product from the list since it's now rated
      setDeliveredProducts(prev => prev.filter(p => p._id !== productId));
    } catch (error) {
      toast.error('Failed to submit rating');
      console.error('Rating error:', error);
    } finally {
      setSubmittingRating(prev => ({ ...prev, [productId]: false }));
    }
  };

  const StarRating = ({ productId, onRate, isSubmitting }) => {
    const [hoveredRating, setHoveredRating] = useState(0);

    return (
      <div 
        className="flex items-center space-x-1"
        onMouseLeave={() => setHoveredRating(0)}
      >
        {[1, 2, 3, 4, 5].map((starNum) => (
          <button
            key={starNum}
            onClick={() => onRate(productId, starNum)}
            onMouseEnter={() => setHoveredRating(starNum)}
            disabled={isSubmitting}
            className="focus:outline-none  transition-all disabled:opacity-50"
            title={`Rate ${starNum} star${starNum !== 1 ? 's' : ''}`}
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                starNum <= hoveredRating
                  ? 'text-desi-gold fill-current' 
                  : 'text-gray-300 hover:text-desi-gold'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-ink-soft">
          {hoveredRating > 0 ? `${hoveredRating} star${hoveredRating !== 1 ? 's' : ''}` : 'Click to rate'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-paper flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-desi-gold"></div>
      </div>
    );
  }

  return (
    <div className="bg-paper py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-ink mb-4 flex items-center">
            <Star className="w-8 h-8 text-desi-gold mr-3" />
            Rate Your Products
          </h1>
          <div className="bg-cream border border-sand rounded-lg p-6">
            <h2 className="text-xl font-semibold text-ink mb-3 flex items-center">
              🍯 Share Your Experience After Enjoying Our Products
            </h2>
            <p className="text-ink-soft mb-2">
              <strong>Perfect time to review:</strong> After you've consumed and enjoyed our dry fruits, makhana, or thekua!
            </p>
            <p className="text-ink-soft text-sm">
              ✨ Your honest feedback helps other customers make informed choices and helps us maintain our quality standards.
            </p>
          </div>
        </div>

        {deliveredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-card">
            <Package className="w-24 h-24 mx-auto text-ink-mute mb-6" />
            <h2 className="text-2xl font-display font-bold text-ink mb-4">All caught up!</h2>
            <p className="text-ink-soft mb-8">
              You've either rated all your delivered products or haven't made any purchases yet.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/products" className="btn-primary flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5" />
                <span>Browse Products</span>
              </Link>
              <Link to="/orders" className="btn-secondary">
                View Orders
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deliveredProducts.map((product) => (
              <div key={product._id} className="bg-white rounded-lg shadow-card overflow-hidden">
                <Link to={`/product/${product._id}`} className="block">
                  <div className="relative overflow-hidden h-48">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover  transition-transform duration-300"
                    />
                  </div>
                </Link>

                <div className="p-5">
                  <Link to={`/product/${product._id}`}>
                    <h3 className="text-lg font-semibold text-ink mb-2 hover:text-desi-brown transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <p className="text-sm text-ink-soft mb-2">{product.weight}</p>
                  <p className="text-xs text-ink-mute mb-2">
                    Delivered: {new Date(product.orderDate).toLocaleDateString()}
                  </p>
                  
                  <div className="bg-leaf-tint border border-leaf/30 rounded-lg p-3 mb-4">
                    <p className="text-xs text-leaf font-medium mb-1">
                      🍽️ Have you enjoyed this product?
                    </p>
                    <p className="text-xs text-leaf">
                      Rate it after consumption to help others!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium text-desi-brown">Your rating:</p>
                    <StarRating
                      productId={product._id}
                      onRate={handleQuickRating}
                      isSubmitting={submittingRating[product._id]}
                    />
                    
                    <Link
                      to={`/product/${product._id}#reviews`}
                      className="block text-center text-sm text-desi-gold hover:text-action-dark transition-colors"
                    >
                      Or write a detailed review →
                    </Link>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-desi-brown">
                        ₹{product.price}
                      </span>
                      <Link
                        to={`/product/${product._id}`}
                        className="text-sm text-desi-gold hover:text-action-dark transition-colors"
                      >
                        View Product →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RateProducts;
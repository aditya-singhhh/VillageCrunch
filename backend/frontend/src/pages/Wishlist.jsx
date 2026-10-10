import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Heart, ShoppingCart, Trash2, Package, ArrowLeft } from 'lucide-react';
import { getWishlist, removeFromWishlist } from '../utils/api';
import { formatINR } from '../utils/format';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const data = await getWishlist();
      setWishlist(data);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
      toast.error('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      setRemoving(productId);
      await removeFromWishlist(productId);
      setWishlist(wishlist.filter(item => item._id !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = (product) => {
    addToCart({
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.image || product.images?.[0],
      weight: product.weight
    });
    toast.success('Added to cart', { duration: 1500 });
  };

  if (!user) {
    return (
      <div className="bg-paper flex items-center justify-center">
        <div className="text-center bg-white p-12 rounded-lg shadow-card border border-desi-cream/50">
          <Heart className="w-16 h-16 text-berry mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-desi-brown mb-4">Access Required</h2>
          <p className="text-ink-soft mb-8">Please login to view your wishlist.</p>
          <Link 
            to="/login"
            className="bg-action text-white px-8 py-3 rounded-lg hover:bg-action-dark transition-all duration-300  font-semibold"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-desi-gold mx-auto mb-4"></div>
          <p className="text-ink-soft">Loading your wishlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/profile"
            className="inline-flex items-center space-x-2 text-brand hover:text-action min-h-[44px] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Profile</span>
          </Link>
          
          <div className="bg-white rounded-lg shadow-card p-8 border border-line">
            <div className="flex items-center space-x-4">
              <div className="bg-berry p-3 rounded-lg">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="page-title">My Wishlist</h1>
                <p className="text-ink-soft">
                  {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} in your wishlist
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wishlist Items */}
        {wishlist.length === 0 ? (
          <div className="bg-white rounded-lg shadow-card p-16 text-center border border-line">
            <div className="bg-cream rounded-full p-8 w-32 h-32 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-16 h-16 text-ink-mute" />
            </div>
            <h3 className="text-2xl font-display font-bold text-ink mb-3">Your wishlist is empty</h3>
            <p className="text-ink-soft mb-8 max-w-md mx-auto">
              Start adding products you love to your wishlist. You can easily add them to cart later!
            </p>
            <Link
              to="/products"
              className="bg-action hover:bg-action-dark text-white px-8 py-4 rounded-lg hover:shadow-card transition-all duration-300  font-semibold"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {wishlist.map((product) => (
              <article key={product._id} className="relative flex flex-col bg-white rounded-lg border border-line shadow-card overflow-hidden">
                <div className="relative aspect-square bg-cream">
                  <img
                    src={product.image || product.images?.[0]}
                    alt={product.name}
                    width="400" height="400" loading="lazy" decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => handleRemoveFromWishlist(product._id)}
                  disabled={removing === product._id}
                  className="absolute top-0 right-0 z-10 w-11 h-11 inline-flex items-center justify-center"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <span className="w-8 h-8 rounded-full bg-white/90 shadow-card inline-flex items-center justify-center text-berry">
                    {removing === product._id ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </span>
                </button>

                <div className="flex flex-col flex-1 p-3 sm:p-4">
                  <h3 className="font-sans text-base font-semibold leading-snug text-ink line-clamp-2 min-h-[2.75rem]">
                    <Link to={`/product/${product._id}`} className="hover:text-action">{product.name}</Link>
                  </h3>
                  <div className="mt-2 flex items-baseline flex-wrap gap-x-2">
                    <span className="text-lg font-semibold text-ink tabular-nums">{formatINR(product.price)}</span>
                    {product.weight && <span className="text-sm text-ink-mute">{product.weight}</span>}
                  </div>
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="btn-primary btn-sm w-full mt-auto"
                    style={{ marginTop: '12px' }}
                  >
                    <ShoppingCart className="w-4 h-4" aria-hidden="true" /> Add to cart
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
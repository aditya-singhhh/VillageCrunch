import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { 
  getCart, 
  addToCart as apiAddToCart, 
  updateCartItem as apiUpdateCartItem, 
  removeFromCart as apiRemoveFromCart, 
  clearCart as apiClearCart,
  syncCart as apiSyncCart,
  getProduct as apiGetProduct
} from '../utils/api';
import { trackAddToCart } from '../utils/analytics';

const CartContext = createContext();

const isRestrictedProduct = (product) => product?.category?.toLowerCase() === 'masala';
const filterRestrictedCartItems = (items = []) => items.filter((item) => !isRestrictedProduct(item));
// Carts keep a copy of each product from when it was added. Refresh name, price and
// photo from the live catalogue, and drop products that no longer exist, so the cart
// never shows a different price from what checkout charges.
const LIVE_FIELDS = ['name', 'price', 'originalPrice', 'image', 'images', 'weight', 'category', 'stock', 'inStock'];
const refreshFromCatalogue = async (items = []) => {
  const ids = [...new Set(items.map((i) => i._id || i.product?._id || i.product).filter(Boolean).map(String))];
  if (!ids.length) return items;
  const live = {};
  await Promise.all(ids.map(async (id) => {
    try { live[id] = await apiGetProduct(id); } catch (e) { live[id] = e?.response?.status === 404 ? null : undefined; }
  }));
  return items
    .filter((i) => {
      const p = live[String(i._id || i.product?._id || i.product)];
      return p !== null && !(p && p.isActive === false);
    })
    .map((i) => {
      const p = live[String(i._id || i.product?._id || i.product)];
      if (!p) return i;
      const fresh = {};
      for (const k of LIVE_FIELDS) if (p[k] !== undefined) fresh[k] = p[k];
      return { ...i, ...fresh };
    });
};

const MASALA_BLOCKED_MESSAGE = 'Masala items are coming soon and cannot be purchased yet';

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load cart on component mount and user changes
  useEffect(() => {
    loadCart();
  }, [user]);

  const loadCart = async () => {
    if (user) {
      // User is logged in - load from database
      try {
        setLoading(true);
        const cartData = await getCart();
        const items = filterRestrictedCartItems(cartData.items || []);
        setCartItems(items);
        refreshFromCatalogue(items).then(setCartItems).catch(() => {});
      } catch (error) {
        console.error('Error loading cart:', error);
        // Fall back to local storage if API fails
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          const filteredItems = filterRestrictedCartItems(JSON.parse(savedCart));
          setCartItems(filteredItems);
          localStorage.setItem('cart', JSON.stringify(filteredItems));
        }
      } finally {
        setLoading(false);
      }
    } else {
      // User not logged in - load from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const filteredItems = filterRestrictedCartItems(JSON.parse(savedCart));
        setCartItems(filteredItems);
        localStorage.setItem('cart', JSON.stringify(filteredItems));
        refreshFromCatalogue(filteredItems).then(setCartItems).catch(() => {});
      }
    }
  };

  // Sync local cart with database when user logs in
  const syncCartOnLogin = async (localCartItems) => {
    if (user && localCartItems.length > 0) {
      try {
        const syncResult = await apiSyncCart(filterRestrictedCartItems(localCartItems));
        setCartItems(syncResult.cart.items || []);
        // Clear local storage after successful sync
        localStorage.removeItem('cart');
        toast.success('Cart synced successfully!');
      } catch (error) {
        console.error('Error syncing cart:', error);
        toast.error('Failed to sync cart');
      }
    }
  };

  // Save to localStorage for non-logged-in users
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cart', JSON.stringify(cartItems));
    }
  }, [cartItems, user]);

  const addToCart = async (product, quantity = 1) => {
    if (isRestrictedProduct(product)) {
      toast.error(MASALA_BLOCKED_MESSAGE);
      return;
    }
    try {
      trackAddToCart({ productId: product._id, name: product.name, category: product.category, quantity, price: product.price });
    } catch (_) { /* tracking must never block the cart */ }

    if (user) {
      // User is logged in - use API
      try {
        setLoading(true);
        const result = await apiAddToCart(product._id, quantity);
        setCartItems(result.cart.items || []);
        toast.success('Added to cart', { duration: 1500 });
      } catch (error) {
        console.error('Error adding to cart:', error);
        toast.error(error.response?.data?.message || 'Failed to add item to cart');
      } finally {
        setLoading(false);
      }
    } else {
      // User not logged in - use local state with cartItemId
      setCartItems(prev => {
        const existing = prev.find((i) => i._id === product._id);
        if (existing) {
          toast.success('Added to cart', { duration: 1500 });
          return prev.map((i) => (i === existing ? { ...i, quantity: (i.quantity || 1) + quantity } : i));
        }
        const timestamp = new Date().getTime();
        const newItem = {
          ...product,
          cartItemId: `${product._id}_${timestamp}`,
          quantity
        };
        toast.success('Added to cart', { duration: 1500 });
        return [...prev, newItem];
      });
    }
  };

  const updateQuantity = async (itemIdentifier, quantity) => {
    if (quantity < 0) return;

    if (user) {
      // User is logged in - use API (itemIdentifier is productId)
      try {
        setLoading(true);
        const result = await apiUpdateCartItem(itemIdentifier, quantity);
        setCartItems(result.cart.items || []);
        if (quantity === 0) {
          toast.success('Item removed from cart');
        }
      } catch (error) {
        console.error('Error updating cart:', error);
        toast.error(error.response?.data?.message || 'Failed to update cart');
      } finally {
        setLoading(false);
      }
    } else {
      // User not logged in - use local state (itemIdentifier is cartItemId)
      if (quantity === 0) {
        setCartItems(prev => prev.filter(item => item.cartItemId !== itemIdentifier));
        toast.success('Item removed from cart');
      } else {
        setCartItems(prev =>
          prev.map(item =>
            item.cartItemId === itemIdentifier
              ? { ...item, quantity }
              : item
          )
        );
      }
    }
  };

  const removeFromCart = async (itemIdentifier) => {
    if (user) {
      // User is logged in - use API (itemIdentifier is productId)
      try {
        setLoading(true);
        const result = await apiRemoveFromCart(itemIdentifier);
        setCartItems(result.cart.items || []);
        toast.success('Item removed from cart');
      } catch (error) {
        console.error('Error removing from cart:', error);
        toast.error(error.response?.data?.message || 'Failed to remove item');
      } finally {
        setLoading(false);
      }
    } else {
      // User not logged in - use local state (itemIdentifier is cartItemId)
      setCartItems(prev => prev.filter(item => item.cartItemId !== itemIdentifier));
      toast.success('Removed from cart');
    }
  };

  const clearCart = async () => {
    if (user) {
      // User is logged in - use API
      try {
        setLoading(true);
        await apiClearCart();
        setCartItems([]);
        toast.success('Cart cleared');
      } catch (error) {
        console.error('Error clearing cart:', error);
        toast.error('Failed to clear cart');
      } finally {
        setLoading(false);
      }
    } else {
      // User not logged in - use local state
      setCartItems([]);
      localStorage.removeItem('cart');
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getCartCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        syncCartOnLogin,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Minus, ShoppingBag, Tag, CheckCircle, XCircle, Lock, X } from 'lucide-react';
import { formatINR } from '../utils/format';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { tryAutoFirst, markAutoPromoRemoved } from '../utils/autoPromo';
import { validatePromocode, calculateOrderTotal, getSettings } from '../utils/api';
import toast from 'react-hot-toast';
import { imgSrc, imgProps } from '../utils/img';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Promocode state
  const [promocodeInput, setPromocodeInput] = useState('');
  const [appliedPromocode, setAppliedPromocode] = useState(null);
  const [promocodeLoading, setPromocodeLoading] = useState(false);
  const [promocodeStatus, setPromocodeStatus] = useState(null); // For showing status messages
  const [orderTotals, setOrderTotals] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const subtotal = getCartTotal();

  // Fetch settings and calculate order totals
  useEffect(() => {
    const fetchSettingsAndCalculate = async () => {
      try {
        setLoading(true);
        
        // Fetch settings
        const settingsData = await getSettings();
        setSettings(settingsData);

        if (cartItems.length > 0) {
          // Calculate order totals with current cart
          const cartProducts = cartItems.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            price: item.price,
            category: item.category
          }));

          const totals = await calculateOrderTotal(cartProducts, 'standard', appliedPromocode);
          setOrderTotals(totals);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Use fallback values if settings fetch fails
        setSettings({
          pricing: {
            taxRate: 5,
            pricesIncludeTax: true,
            shippingCharges: {
              standard: {
                rate: 50,
                freeShippingThreshold: 500
              }
            },
            codCharges: 25
          }
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsAndCalculate();
  }, [cartItems, appliedPromocode]);

  // First order? Apply FIRST (free delivery) automatically; the server checks eligibility
  const autoTried = useRef(false);
  useEffect(() => {
    if (appliedPromocode || autoTried.current || !cartItems.length) return;
    autoTried.current = true;
    tryAutoFirst(cartItems, user?._id).then((p) => { if (p) setAppliedPromocode((cur) => cur || p); });
  }, [cartItems, appliedPromocode, user]);

  // Use calculated order totals if available, otherwise fallback to settings-based calculation
  const shipping = orderTotals?.shipping?.cost ?? 
    (settings?.pricing?.shippingCharges?.standard?.freeShippingThreshold && subtotal >= settings.pricing.shippingCharges.standard.freeShippingThreshold ? 0 : 
     settings?.pricing?.shippingCharges?.standard?.rate ?? 50);
  
  const tax = orderTotals?.tax?.amount ?? 
    (settings?.pricing?.pricesIncludeTax === false ? (subtotal * (settings?.pricing?.taxRate ?? 5) / 100) : (subtotal * (settings?.pricing?.taxRate ?? 5) / (100 + (settings?.pricing?.taxRate ?? 5))));
  
  const promocodeDiscount = orderTotals?.discount?.amount ?? 0;
  const taxIncluded = (orderTotals?.tax?.inclusive ?? settings?.pricing?.pricesIncludeTax) !== false;
  const taxAdded = taxIncluded ? 0 : tax;
  
  const total = orderTotals?.total ?? (subtotal + shipping + taxAdded - promocodeDiscount);

  // Apply promocode
  const applyPromocode = async () => {
    if (!promocodeInput.trim()) {
      setPromocodeStatus({ type: 'error', message: 'Please enter a promocode' });
      return;
    }

    try {
      setPromocodeLoading(true);
      
      // Prepare cart items for validation
      const cartProducts = cartItems.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        price: item.price,
        category: item.category
      }));

      // Validate promocode
      const validation = await validatePromocode(
        promocodeInput.toUpperCase(),
        subtotal,
        cartProducts,
        [...new Set(cartItems.map(item => item.category))], // unique categories
        user?._id
      );

      if (validation.valid) {
        // Calculate new order total with promocode object
        const promocodeData = {
          code: promocodeInput.toUpperCase(),
          type: validation.promocode.type || validation.promocode.discountType,
          discount: validation.discount
        };
        
        const orderCalculation = await calculateOrderTotal(
          cartProducts,
          'standard', // shipping method
          promocodeData
        );

        setAppliedPromocode({
          code: promocodeInput.toUpperCase(),
          description: validation.promocode.description,
          discount: validation.discount,
          discountType: validation.promocode.type || validation.promocode.discountType // Handle both field names
        });
        setOrderTotals(orderCalculation);
        setPromocodeInput('');
        setPromocodeStatus(null); // Clear any previous status
        
        toast.success(`Promocode applied! You saved ${formatINR(validation.discount)}`);
      } else {
        // Handle validation failure (valid: false)
        let statusMessage = '';
        
        if (validation.amountNeeded && validation.minOrderValue) {
          // Use the exact values from backend
          statusMessage = `Add ₹${validation.amountNeeded.toFixed(2)} more to use this promocode (minimum: ₹${validation.minOrderValue})`;
        } else if (validation.message) {
          statusMessage = validation.message;
        } else {
          statusMessage = 'Cannot apply this promocode';
        }
        
        setPromocodeStatus({ type: 'error', message: statusMessage });
      }
    } catch (error) {
      console.error('Promocode validation error:', error);
      
      // Enhanced error messaging
      const errorData = error.response?.data;
      const errorMessage = errorData?.message;
      let statusMessage = '';
      
      if (errorData && !errorData.valid) {
        // Handle specific validation errors from backend
        if (errorMessage && errorMessage.includes('Minimum order value should be ₹')) {
          // Extract minimum amount and calculate how much more is needed
          const match = errorMessage.match(/₹([\d,]+(?:\.\d{2})?)/);
          if (match) {
            const minAmount = parseFloat(match[1].replace(/,/g, ''));
            const currentAmount = subtotal;
            const needAmount = minAmount - currentAmount;
            statusMessage = `Add ₹${needAmount.toFixed(2)} more to use this promocode (minimum: ₹${minAmount})`;
          } else {
            statusMessage = 'Minimum order value not met for this promocode';
          }
        } else if (errorMessage && (errorMessage.includes('already used') || errorMessage.includes('usage limit') || errorMessage.includes('exceeded'))) {
          statusMessage = 'You have already used this promocode';
        } else if (errorMessage && errorMessage.includes('not applicable')) {
          // Enhanced messaging for product/category specific promocodes
          if (errorMessage.includes('cart items')) {
            statusMessage = 'This promocode is only valid for specific products/categories not in your cart';
          } else {
            statusMessage = 'This promocode is not applicable to your current selection';
          }
        } else if (errorMessage && (errorMessage.includes('expired') || errorMessage.includes('not valid') || errorMessage.includes('does not exist'))) {
          statusMessage = 'Invalid or expired promocode';
        } else if (errorMessage) {
          statusMessage = errorMessage;
        } else {
          statusMessage = 'Cannot apply this promocode';
        }
      } else if (error.response?.status === 404) {
        statusMessage = 'Invalid promocode code';
      } else {
        statusMessage = 'Unable to validate promocode. Please try again.';
      }
      
      setPromocodeStatus({ type: 'error', message: statusMessage });
    } finally {
      setPromocodeLoading(false);
    }
  };

  // Remove promocode
  const removePromocode = async () => {
    if (appliedPromocode?.auto) markAutoPromoRemoved();
    try {
      // Recalculate without promocode
      const cartProducts = cartItems.map(item => ({
        productId: item._id,
        quantity: item.quantity,
        price: item.price,
        category: item.category
      }));

      const orderCalculation = await calculateOrderTotal(cartProducts, 'standard', null);
      
      setAppliedPromocode(null);
      setPromocodeStatus(null); // Clear status when removing promocode
      setOrderTotals(orderCalculation);
      toast.success('Promocode removed');
    } catch (error) {
      console.error('Error removing promocode:', error);
      // Fallback to basic calculation
      setAppliedPromocode(null);
      setOrderTotals(null);
    }
  };

  const handleCheckout = () => {
 {
      // Guests can check out too (name + phone at checkout)
      navigate('/checkout', { 
        state: { 
          appliedPromocode,
          orderTotals 
        }
      });
    }
  };

  if (loading && !settings) {
    return (
      <div className="container-page py-10" aria-busy="true" aria-label="Loading cart">
        <div className="h-9 skeleton w-48 mb-6" />
        <div className="space-y-3">
          <div className="h-28 skeleton" />
          <div className="h-28 skeleton" />
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-ink-mute mb-4" strokeWidth={1.5} aria-hidden="true" />
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Your cart is empty</h1>
        <p className="text-ink-soft mb-6">Add some dry fruits, makhana or thekua to get started.</p>
        <Link to="/products" className="btn-primary">Start shopping</Link>
      </div>
    );
  }

  const freeThreshold = settings?.pricing?.shippingCharges?.standard?.freeShippingThreshold;
  const remainingForFree = freeThreshold ? Math.max(0, freeThreshold - subtotal) : 0;
  const idOf = (item) => (user ? item._id : item.cartItemId);

  return (
    <div className="pb-6 lg:pb-12">
      <div className="container-page pt-6 md:pt-10">
        <h1 className="page-title mb-5 md:mb-8">Your cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] gap-6 lg:gap-10 items-start [&>*]:min-w-0">
          {/* Items */}
          <div className="space-y-5">
            {shipping > 0 && freeThreshold > 0 && remainingForFree > 0 && (
              <div className="panel !p-4">
                <p className="text-sm text-ink">Add <strong>{formatINR(remainingForFree)}</strong> more for free delivery</p>
                <div className="mt-2 h-2 rounded-full bg-cream overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={freeThreshold} aria-valuenow={Math.min(subtotal, freeThreshold)} aria-label="Progress to free delivery">
                  <div className="h-full bg-leaf" style={{ width: `${Math.min(100, (subtotal / freeThreshold) * 100)}%` }} />
                </div>
              </div>
            )}

            <ul className="bg-white rounded-lg border border-line shadow-card divide-y divide-line">
              {cartItems.map((item) => (
                <li key={idOf(item)} className="p-3 sm:p-5 flex gap-3 sm:gap-4">
                  <Link to={`/product/${item._id}`} className="flex-shrink-0" aria-label={item.name}>
                    <img
                      src={imgSrc(item.image || (item.images && item.images[0]), 400) || '/placeholder-image.jpg'}
                      alt=""
                      width="80" height="80" loading="lazy" decoding="async"
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-md bg-cream"
                    />
                  </Link>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/product/${item._id}`} className="font-semibold text-ink hover:text-action line-clamp-2 leading-snug">{item.name}</Link>
                        <p className="text-sm text-ink-mute mt-0.5">{item.weight} &middot; {formatINR(item.price)} each</p>
                      </div>
                      <p className="font-semibold tabular-nums whitespace-nowrap">{formatINR(item.price * item.quantity)}</p>
                    </div>
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#CDBBA4] rounded-md bg-white" role="group" aria-label={`Quantity for ${item.name}`}>
                        <button
                          onClick={() => updateQuantity(idOf(item), item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="w-11 h-11 inline-flex items-center justify-center disabled:text-sand"
                        ><Minus className="w-4 h-4" /></button>
                        <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(idOf(item), item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          aria-label="Increase quantity"
                          className="w-11 h-11 inline-flex items-center justify-center disabled:text-sand"
                        ><Plus className="w-4 h-4" /></button>
                      </div>
                      <button
                        onClick={() => removeFromCart(idOf(item))}
                        className="min-h-[44px] px-2 text-sm font-medium text-berry hover:underline"
                        aria-label={`Remove ${item.name} from cart`}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Promocode */}
            <div className="panel">
              <h2 className="flex items-center gap-2 font-semibold text-ink mb-3">
                <Tag className="w-4 h-4" aria-hidden="true" /> Have a promo code?
              </h2>
              {appliedPromocode ? (
                <div className="flex items-center justify-between gap-3 bg-leaf-tint border border-leaf/30 rounded-md px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle className="w-5 h-5 text-leaf flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-semibold text-leaf truncate">{appliedPromocode.code}</p>
                      {appliedPromocode.description && <p className="text-sm text-ink-soft">{appliedPromocode.description}</p>}
                    </div>
                  </div>
                  <button onClick={removePromocode} className="w-11 h-11 inline-flex items-center justify-center text-ink-soft hover:text-berry flex-shrink-0" aria-label={`Remove promo code ${appliedPromocode.code}`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <label htmlFor="promo" className="sr-only">Promo code</label>
                    <input
                      id="promo"
                      type="text"
                      placeholder="Enter code"
                      autoCapitalize="characters"
                      value={promocodeInput}
                      onChange={(e) => {
                        setPromocodeInput(e.target.value.toUpperCase());
                        setPromocodeStatus(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && applyPromocode()}
                      className="input-field min-w-0 flex-1"
                      disabled={promocodeLoading}
                    />
                    <button
                      onClick={applyPromocode}
                      disabled={promocodeLoading || !promocodeInput.trim()}
                      className="btn-secondary flex-shrink-0 px-5"
                      aria-busy={promocodeLoading}
                    >
                      {promocodeLoading ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-brand/30 border-t-brand" aria-label="Validating"></span>
                      ) : 'Apply'}
                    </button>
                  </div>
                  {promocodeStatus && (
                    <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-berry bg-berry-tint rounded-md p-3">
                      <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                      <span>{promocodeStatus.message}</span>
                    </p>
                  )}
                </>
              )}
            </div>

            <Link to="/products" className="btn-ghost -ml-3">&larr; Continue shopping</Link>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24" aria-label="Order summary">
            <div className="panel">
              <h2 className="font-display text-xl font-semibold mb-4">Order summary</h2>
              <dl className="space-y-2.5 text-[15px]">
                <div className="flex justify-between"><dt className="text-ink-soft">Subtotal ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})</dt><dd className="tabular-nums">{formatINR(subtotal)}</dd></div>
                {appliedPromocode && promocodeDiscount > 0 && (
                  <div className="flex justify-between text-leaf"><dt className="flex items-center gap-1 min-w-0"><Tag className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" /><span className="truncate">Promo ({appliedPromocode.code})</span></dt><dd className="tabular-nums">-{formatINR(promocodeDiscount)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd className={`tabular-nums ${shipping === 0 ? 'text-leaf font-medium' : ''}`}>{shipping === 0 ? 'Free' : formatINR(shipping)}</dd></div>
                {settings?.pricing?.taxRate > 0 && (
                  <div className={`flex justify-between ${taxIncluded ? 'text-sm text-ink-mute' : ''}`}><dt className={taxIncluded ? '' : 'text-ink-soft'}>{taxIncluded ? 'Includes' : ''} GST ({settings.pricing.taxRate}%)</dt><dd className="tabular-nums">{formatINR(tax)}</dd></div>
                )}
              </dl>
              <div className="border-t border-line mt-4 pt-4 flex justify-between items-baseline">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-semibold tabular-nums">{formatINR(total)}</span>
              </div>
              {appliedPromocode && promocodeDiscount > 0 && (
                <p className="text-sm text-leaf mt-1 text-right">You saved {formatINR(promocodeDiscount)} with {appliedPromocode.code}</p>
              )}
              <button onClick={handleCheckout} className="btn-primary w-full mt-5 hidden lg:inline-flex">Proceed to checkout</button>
              <p className="hidden lg:flex items-center justify-center gap-1.5 text-sm text-ink-soft mt-3">
                <Lock className="w-4 h-4" aria-hidden="true" /> Secure checkout
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky checkout bar (mobile) */}
      <div className="lg:hidden fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-30 bg-white border-t border-line shadow-raised px-4 py-3">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="leading-tight">
            <p className="text-xs text-ink-mute">Total</p>
            <p className="text-lg font-semibold tabular-nums">{formatINR(total)}</p>
          </div>
          <button onClick={handleCheckout} className="btn-primary flex-1">Checkout</button>
        </div>
      </div>
    </div>
  );
};

export default Cart;

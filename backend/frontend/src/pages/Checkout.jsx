import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, createPaymentOrder, verifyPayment, calculateOrderTotal, getSettings, saveAddressFromCheckout, getUserProfile, getUserAddresses, getRazorpayKey, lookupPincode } from '../utils/api';
import { MapPin, Plus, CheckCircle, Lock, ChevronDown, Phone } from 'lucide-react';
import { formatINR } from '../utils/format';
import toast from 'react-hot-toast';
import { imgSrc, imgProps } from '../utils/img';
import { trackBeginCheckout, trackPurchase } from '../utils/analytics';

// Utility function to wait for Razorpay to load
const waitForRazorpay = () => {
  return new Promise((resolve, reject) => {
    // If Razorpay is already loaded, resolve immediately
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    // Try to load Razorpay dynamically if not available
    const loadRazorpayScript = () => {
      return new Promise((scriptResolve, scriptReject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => scriptResolve(true);
        script.onerror = () => scriptReject(new Error('Failed to load Razorpay script'));
        document.head.appendChild(script);
      });
    };

    const maxWaitTime = 15000; // Increase to 15 seconds
    const checkInterval = 200; // Increase check interval to 200ms
    let totalWaitTime = 0;
    let scriptLoadAttempted = false;

    const checkRazorpay = async () => {
      if (window.Razorpay) {
        resolve(true);
      } else if (totalWaitTime >= maxWaitTime) {
        reject(new Error('Razorpay failed to load within 15 seconds. Please check your internet connection and try again.'));
      } else {
        // If we've waited 3 seconds and Razorpay isn't loaded, try loading it dynamically
        if (totalWaitTime >= 3000 && !scriptLoadAttempted) {
          scriptLoadAttempted = true;
          try {
            await loadRazorpayScript();
          } catch (error) {
            console.error('Failed to load Razorpay script dynamically:', error);
          }
        }
        totalWaitTime += checkInterval;
        setTimeout(checkRazorpay, checkInterval);
      }
    };

    // Start checking
    checkRazorpay();
  });
};

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, getCartTotal, clearCart } = useCart();
  // Tell Meta / Google once that checkout started (for ad optimisation)
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !cartItems?.length) return;
    checkoutTracked.current = true;
    try {
      trackBeginCheckout({
        value: getCartTotal(),
        items: cartItems.map((i) => ({ productId: i._id, name: i.name, category: i.category, quantity: i.quantity, price: i.price })),
      });
    } catch (_) { /* ignore */ }
  }, [cartItems]); // eslint-disable-line react-hooks/exhaustive-deps
  const { user, updateUser, loading: authLoading } = useAuth();

  // Orders belong to an account: send visitors who aren't logged in to log in first,
  // instead of letting them fill the whole form and fail at the end.
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?redirect=/checkout', { replace: true });
  }, [authLoading, user]);

  // Get promocode data from navigation state (from Cart page)
  const [appliedPromocode, setAppliedPromocode] = useState(location.state?.appliedPromocode || null);
  const [orderTotals, setOrderTotals] = useState(location.state?.orderTotals || null);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [giftMessage, setGiftMessage] = useState('');
  const [isGift, setIsGift] = useState(false);
  const [shippingInfo, setShippingInfo] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [saveNewAddress, setSaveNewAddress] = useState(true); // Auto-save new addresses

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay');
  // Online payment shows only when real Razorpay keys are configured on the server
  const [onlineEnabled, setOnlineEnabled] = useState(true);
  useEffect(() => {
    getRazorpayKey()
      .then((d) => {
        const on = d?.enabled !== false && !!d?.key;
        setOnlineEnabled(on);
        if (!on) setPaymentMethod('cod');
      })
      .catch(() => {});
  }, []);
  


  // Fetch settings and recalculate if no order totals from cart
  useEffect(() => {
    const fetchSettingsAndCalculate = async () => {
      try {
        setSettingsLoading(true);
        
        // Fetch settings
        const settingsData = await getSettings();
        setSettings(settingsData);

        // If no order totals from cart, calculate them
        if (!orderTotals && cartItems.length > 0) {
          const cartProducts = cartItems.map(item => ({
            productId: item._id,
            quantity: item.quantity,
            price: item.price,
            category: item.category
          }));

          const totals = await calculateOrderTotal(cartProducts, 'standard', appliedPromocode, paymentMethod);
          setOrderTotals(totals);
        }
      } catch (error) {
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
        setSettingsLoading(false);
      }
    };

    fetchSettingsAndCalculate();
  }, [cartItems, appliedPromocode, orderTotals]);

  // Function to fetch and set up addresses
  const fetchUserAddresses = async () => {
    if (!user) return;
    
    try {
      const addressesData = await getUserAddresses();
      
      setAddresses(addressesData || []);
      
      if (addressesData && addressesData.length > 0) {
        const defaultAddressIndex = addressesData.findIndex(addr => addr.isDefault);
        if (defaultAddressIndex !== -1) {
          const defaultAddress = addressesData[defaultAddressIndex];
          setSelectedAddress(defaultAddressIndex);
          setUseNewAddress(false);
          setShippingInfo({
            name: user.name || '',
            phone: defaultAddress.phone || user.phone || '',
            street: defaultAddress.street,
            city: defaultAddress.city,
            state: defaultAddress.state,
            pincode: defaultAddress.pincode,
          });
        } else {
          // User has addresses but none is default, show first address
          const firstAddress = addressesData[0];
          setSelectedAddress(0);
          setUseNewAddress(false);
          setShippingInfo({
            name: user.name || '',
            phone: firstAddress.phone || user.phone || '',
            street: firstAddress.street,
            city: firstAddress.city,
            state: firstAddress.state,
            pincode: firstAddress.pincode,
          });
        }
      } else {
        // No saved addresses, user must enter new address
        setUseNewAddress(true);
        setSelectedAddress(null);
        setShippingInfo({
          name: user?.name || '',
          phone: user?.phone || '',
          street: '',
          city: '',
          state: '',
          pincode: '',
        });
      }
    } catch (error) {
      // Fallback to empty state
      setAddresses([]);
      setUseNewAddress(true);
      setSelectedAddress(null);
      setShippingInfo({
        name: user?.name || '',
        phone: user?.phone || '',
        street: '',
        city: '',
        state: '',
        pincode: '',
      });
    }
  };

  // Fetch addresses from API when component mounts or user changes
  useEffect(() => {
    fetchUserAddresses();
  }, [user]);  const subtotal = getCartTotal();
  
  // Use calculated order totals if available, otherwise fallback to settings-based calculation
  const shipping = orderTotals?.shipping?.cost ?? 
    (settings?.pricing?.shippingCharges?.standard?.freeShippingThreshold && subtotal >= settings.pricing.shippingCharges.standard.freeShippingThreshold ? 0 : 
     settings?.pricing?.shippingCharges?.standard?.rate ?? 50);
  
  const tax = orderTotals?.tax?.amount ?? 
    (settings?.pricing?.pricesIncludeTax === false ? (subtotal * (settings?.pricing?.taxRate ?? 5) / 100) : (subtotal * (settings?.pricing?.taxRate ?? 5) / (100 + (settings?.pricing?.taxRate ?? 5))));
  
  const promocodeDiscount = orderTotals?.discount?.amount ?? 0;
  const taxIncluded = (orderTotals?.tax?.inclusive ?? settings?.pricing?.pricesIncludeTax) !== false;
  const taxAdded = taxIncluded ? 0 : tax;
  
  // Add COD charges if payment method is COD
  const codCharges = paymentMethod === 'cod' ? (settings?.pricing?.codCharges ?? 0) : 0;
  
  // Server totals exclude COD unless requested; add the COD charge for the chosen method
  const total = orderTotals
    ? orderTotals.total - (orderTotals.codCharge || 0) + codCharges
    : subtotal + shipping + taxAdded + codCharges - promocodeDiscount;

  // Typing a 6-digit PIN fills city and state (unless the customer typed their own)
  const pinFill = useRef({ city: '', state: '' });
  const handleChange = (e) => {
    const { name } = e.target;
    const value = name === 'pincode' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value;
    setShippingInfo((prev) => ({ ...prev, [name]: value }));
    if (name === 'pincode' && value.length === 6) {
      lookupPincode(value).then((r) => {
        if (!r) return;
        setShippingInfo((prev) => {
          if (prev.pincode !== value) return prev;
          const next = { ...prev };
          if (!prev.city || prev.city === pinFill.current.city) next.city = r.city;
          if (!prev.state || prev.state === pinFill.current.state) next.state = r.state;
          pinFill.current = { city: r.city, state: r.state };
          return next;
        });
      });
    }
  };

  const handleAddressSelect = (address, index) => {
    setSelectedAddress(index);
    setUseNewAddress(false);
    setShippingInfo({
      name: user.name || '',
      phone: address.phone || user.phone || '',
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
    });
  };

  const handleNewAddress = () => {
    setSelectedAddress(null);
    setUseNewAddress(true);
    setShippingInfo({
      name: user?.name || '',
      phone: user?.phone || '',
      street: '',
      city: '',
      state: '',
      pincode: '',
    });
  };

  const handleCOD = async () => {
    try {
      setLoading(true);

      // Save new address if user is using a new address and wants to save it
      if (useNewAddress && saveNewAddress) {
        try {
          
          const savedAddress = await saveAddressFromCheckout({
            street: shippingInfo.street,
            city: shippingInfo.city,
            state: shippingInfo.state,
            pincode: shippingInfo.pincode,
            phone: shippingInfo.phone,
            saveAddress: true
          });
          
          // Refresh addresses from API to get updated list
          await fetchUserAddresses();
          
          if (savedAddress.message.includes('already exists')) {
            toast.success('Address already in your saved addresses!', { duration: 2000 });
          } else {
            toast.success('Address saved for future orders!', { duration: 2000 });
          }
        } catch (addressError) {
          // Don't fail the order if address saving fails
          toast.error('Address could not be saved, but order will continue');
        }
      }

      // Create order in database with COD payment method
      const orderData = {
        items: cartItems.map(item => ({
          product: item._id,    
          name: item.name,
          image: item.image,
          quantity: item.quantity,
          price: item.price,
          weight: item.weight,
        })),
        giftMessage: isGift ? giftMessage : undefined,
        shippingAddress: {
          name: shippingInfo.name,
          phone: shippingInfo.phone,
          street: shippingInfo.street,
          city: shippingInfo.city,
          state: shippingInfo.state,
          pincode: shippingInfo.pincode,
        },
        paymentInfo: {
          method: 'cod',
          razorpayOrderId: null,
          razorpayPaymentId: null,
          razorpaySignature: null,
        },
        itemsPrice: subtotal,
        shippingPrice: shipping,
        taxPrice: tax,
        totalPrice: total,
        promocode: appliedPromocode ? {
          code: appliedPromocode.code,
          discount: promocodeDiscount,
          description: appliedPromocode.description
        } : null,
        promocodeDiscount: promocodeDiscount,
      };

      try {
        const order = await createOrder(orderData);

        try {
          trackPurchase({
            orderId: order._id,
            value: Number(order.totalPrice) || getCartTotal(),
            items: cartItems.map((i) => ({ productId: i._id, name: i.name, category: i.category, quantity: i.quantity, price: i.price })),
          });
        } catch (_) { /* tracking must never block an order */ }

        // Clear cart and redirect
        clearCart();
        toast.success('Order placed successfully! You can pay at delivery. 🎉');
        navigate(`/order/${order._id}`);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Order creation failed. Please try again.');
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.street || 
        !shippingInfo.city || !shippingInfo.state || !shippingInfo.pincode) {
      toast.error('Please fill all shipping details');
      return;
    }

    if (paymentMethod === 'cod') {
      handleCOD();
      return;
    }

    setLoading(true);

    try {
      // Wait for Razorpay to load before proceeding
      await waitForRazorpay();
      
      // Create Razorpay order
      const paymentOrderData = await createPaymentOrder(cartItems, appliedPromocode);

      // Razorpay options with all payment methods
      const options = {
        key: paymentOrderData.keyId,
        amount: paymentOrderData.amount,
        currency: paymentOrderData.currency,
        order_id: paymentOrderData.orderId,
        name: 'VillageCrunch',
        description: 'Thekua, makhana & sattu from Bihar',
        image: `${window.location.origin}/favicon.svg`,
        
        // Enable all payment methods
        config: {
          display: {
            blocks: {
              // UPI Payment Options
              banks: {
                name: 'All payment methods',
                instruments: [
                  {
                    method: 'upi',
                    flows: ['qr', 'collect', 'intent']
                  },
                  {
                    method: 'card'
                  },
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'wallet'
                  }
                ]
              }
            },
            sequence: ['block.banks'],
            preferences: {
              show_default_blocks: true
            }
          }
        },
        
        // Payment methods preferences
        method: {
          upi: true,           // Enable UPI
          card: true,          // Enable Credit/Debit Cards
          netbanking: true,    // Enable Internet Banking
          wallet: true,        // Enable Wallets (Paytm, PhonePe, etc.)
          emi: false,          // Disable EMI (enable if needed)
          cardless_emi: false, // Disable Cardless EMI
          paylater: false      // Disable Pay Later options
        },
        
        // Handler for successful payment
        handler: async function (response) {
          try {
            // Save new address if user is using a new address and wants to save it
            if (useNewAddress && saveNewAddress) {
              try {
                const savedAddress = await saveAddress({
                  street: shippingInfo.street,
                  city: shippingInfo.city,
                  state: shippingInfo.state,
                  pincode: shippingInfo.pincode,
                  phone: shippingInfo.phone,
                  saveAddress: true
                });
                
                // Refresh user profile to get updated addresses
                try {
                  const updatedProfile = await getUserProfile();
                  updateUser(updatedProfile);
                } catch (profileError) {
                  // Silent error handling for profile refresh
                }
                
                if (savedAddress.message.includes('already exists')) {
                  toast.success('Address already in your saved addresses!', { duration: 2000 });
                } else {
                  toast.success('Address saved for future orders!', { duration: 2000 });
                }
              } catch (addressError) {
                // Don't fail the order if address saving fails
                toast.error('Address could not be saved, but order will continue');
              }
            }

            // Verify payment
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            // Create order in database
            // Validate cart items before creating order
            const validatedItems = cartItems.map(item => {
              if (!item._id || !item.quantity || !item.price) {
                throw new Error(`Invalid item structure: ${JSON.stringify(item)}`);
              }
              return {
                product: item._id,
                name: item.name || 'Unknown Product',
                image: item.image || item.images?.[0] || '',
                quantity: parseInt(item.quantity),
                price: parseFloat(item.price),
                weight: item.weight || '',
              };
            });
            
            // Validate shipping info
            if (!shippingInfo.name || !shippingInfo.phone) {
              throw new Error('Name and phone number are required for shipping');
            }
            
            const orderData = {
              items: validatedItems,
              giftMessage: isGift ? giftMessage : undefined,
              shippingAddress: {
                name: shippingInfo.name.trim(),
                phone: shippingInfo.phone.trim(),
                street: shippingInfo.street.trim(),
                city: shippingInfo.city.trim(),
                state: shippingInfo.state.trim(),
                pincode: shippingInfo.pincode.trim(),
              },
              paymentInfo: {
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                method: 'Online',
              },
              itemsPrice: parseFloat(subtotal) || 0,
              shippingPrice: parseFloat(shipping) || 0,
              taxPrice: parseFloat(tax) || 0,
              totalPrice: parseFloat(total) || 0,
              promocode: appliedPromocode ? {
                code: appliedPromocode.code,
                discount: parseFloat(promocodeDiscount) || 0,
                description: appliedPromocode.description
              } : null,
              promocodeDiscount: parseFloat(promocodeDiscount) || 0,
            };

            const order = await createOrder(orderData);

            try {
              trackPurchase({
                orderId: order._id,
                value: Number(order.totalPrice) || getCartTotal(),
                items: cartItems.map((i) => ({ productId: i._id, name: i.name, category: i.category, quantity: i.quantity, price: i.price })),
              });
            } catch (_) { /* tracking must never block an order */ }

            // Clear cart and redirect
            clearCart();
            toast.success('Order placed successfully! 🎉');
            navigate(`/order/${order._id}`);
          } catch (error) {
            const errorMessage = error.response?.data?.message || 'Order creation failed';
            toast.error(`Payment successful but order creation failed: ${errorMessage}. Please contact support with payment ID: ${response.razorpay_payment_id}`);
          }
        },
        
        // Prefill customer details
        prefill: {
          name: shippingInfo.name,
          email: user?.email || '',
          contact: shippingInfo.phone,
        },
        
        // Notes for reference
        notes: {
          address: `${shippingInfo.street}, ${shippingInfo.city}, ${shippingInfo.state} - ${shippingInfo.pincode}`,
          customer_name: shippingInfo.name,
        },
        
        // Theme customization
        theme: {
          color: '#D4AF37', // Desi Gold color
          backdrop_color: '#F5E6D3'
        },
        
        // Modal options
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
            setLoading(false);
          },
          escape: true,
          backdropclose: false
        },
        
        // Retry options
        retry: {
          enabled: true,
          max_count: 3
        }
      };

      // Check if Razorpay is loaded
      if (!window.Razorpay) {
        toast.error('Payment system not available. Please refresh the page and try again.');
        setLoading(false);
        return;
      }

      const razorpay = new window.Razorpay(options);
      
      // Open Razorpay checkout
      razorpay.open();

      // Handle payment failure
      razorpay.on('payment.failed', function (response) {
        toast.error('Payment failed. Please try again.');
        setLoading(false);
      });

    } catch (error) {
      if (error.message && error.message.includes('Razorpay failed to load')) {
        toast.error('Payment system is loading. Please wait a moment and try again.');
      } else {
        toast.error('Payment initialization failed. Please try again.');
      }
      
      setLoading(false);
    } finally {
      // Reset loading if payment modal is dismissed
      setTimeout(() => setLoading(false), 1000);
    }
  };

  if (cartItems.length === 0) {
    navigate('/cart');
    return null;
  }

  const readOnlyAddress = !useNewAddress && selectedAddress !== null;
  const showForm = useNewAddress || addresses.length === 0;
  const payLabel = paymentMethod === 'cod'
    ? `Place order · ${formatINR(total)}`
    : `Pay ${formatINR(total)}`;
  const taxRate = settings?.pricing?.taxRate;

  const submitContent = loading ? (
    <>
      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white" aria-hidden="true"></span>
      Processing...
    </>
  ) : payLabel;

  const summaryRows = (
    <>
      <ul className="space-y-3 mb-4">
        {cartItems.map((item) => (
          <li key={item._id || item.cartItemId} className="flex items-center gap-3">
            <img
              src={imgSrc(item.image, 400)}
              alt=""
              width="56" height="56" loading="lazy" decoding="async"
              className="w-14 h-14 object-cover rounded-md bg-cream flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{item.name}</p>
              <p className="text-sm text-ink-mute">Qty {item.quantity}{item.weight ? ` · ${item.weight}` : ''}</p>
            </div>
            <p className="font-semibold text-sm tabular-nums">{formatINR(item.price * item.quantity)}</p>
          </li>
        ))}
      </ul>
      <dl className="border-t border-line pt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{formatINR(subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd className={`tabular-nums ${shipping === 0 ? 'text-leaf font-medium' : ''}`}>{shipping === 0 ? 'Free' : formatINR(shipping)}</dd></div>
        {taxRate > 0 && (
          <div className={`flex justify-between ${taxIncluded ? 'text-sm text-ink-mute' : ''}`}><dt className={taxIncluded ? '' : 'text-ink-soft'}>{taxIncluded ? 'Includes' : ''} GST ({taxRate}%)</dt><dd className="tabular-nums">{formatINR(tax)}</dd></div>
        )}
        {paymentMethod === 'cod' && codCharges > 0 && (
          <div className="flex justify-between"><dt className="text-ink-soft">COD charges</dt><dd className="tabular-nums">{formatINR(codCharges)}</dd></div>
        )}
        {appliedPromocode && (
          <div className="flex justify-between text-leaf"><dt>Promocode ({appliedPromocode.code})</dt><dd className="tabular-nums">-{formatINR(promocodeDiscount)}</dd></div>
        )}
      </dl>
      <div className="border-t border-line mt-4 pt-4 flex justify-between items-baseline">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-xl font-semibold tabular-nums">{formatINR(total)}</span>
      </div>
      {appliedPromocode && promocodeDiscount > 0 && (
        <p className="text-sm text-leaf mt-1 text-right">You saved {formatINR(promocodeDiscount)}</p>
      )}
      {cartItems.some((i) => ['thekua', 'gifts'].includes(i.category)) && (
        <p className="mt-3 rounded-md bg-action-tint px-3 py-2 text-sm text-ink-soft">
          Thekua is made fresh after you order and ships in 1–2 days.
        </p>
      )}
    </>
  );

  const sectionHead = (n, title) => (
    <h2 className="flex items-center gap-3 font-display text-xl font-semibold text-ink mb-4">
      <span className="w-7 h-7 rounded-full bg-brand text-white text-sm font-sans font-semibold inline-flex items-center justify-center" aria-hidden="true">{n}</span>
      {title}
    </h2>
  );

  return (
    <div className="pb-6 lg:pb-12">
      <div className="container-page pt-6 md:pt-10">
        <h1 className="page-title mb-5 md:mb-8">Checkout</h1>

        {/* Mobile collapsible summary */}
        <details className="lg:hidden mb-5 bg-white border border-line rounded-lg shadow-card group">
          <summary className="flex items-center justify-between min-h-[56px] px-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2 text-sm font-medium text-action">
              Order summary ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
              <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
            <span className="font-semibold tabular-nums">{formatINR(total)}</span>
          </summary>
          <div className="px-4 pb-4">{summaryRows}</div>
        </details>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] [&>*]:min-w-0 gap-6 lg:gap-10 items-start">
          <form id="checkout-form" onSubmit={handlePayment} className="space-y-5 max-w-xl lg:max-w-none">
            {/* 1. Contact */}
            <section className="panel" aria-labelledby="co-contact">
              <div id="co-contact">{sectionHead(1, 'Contact')}</div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="co-name" className="field-label">Full name <span className="text-ink-mute font-normal">(required)</span></label>
                  <input id="co-name" type="text" name="name" value={shippingInfo.name} onChange={handleChange} required
                    autoComplete="name" className="input-field" readOnly={readOnlyAddress} />
                </div>
                <div>
                  <label htmlFor="co-phone" className="field-label">Phone number <span className="text-ink-mute font-normal">(required)</span></label>
                  <input id="co-phone" type="tel" inputMode="numeric" name="phone" value={shippingInfo.phone} onChange={handleChange} required
                    autoComplete="tel-national" maxLength={10} className="input-field" readOnly={readOnlyAddress} />
                </div>
              </div>
            </section>

            {/* 2. Delivery address */}
            <section className="panel" aria-labelledby="co-address">
              <div id="co-address">{sectionHead(2, 'Delivery address')}</div>

              {addresses.length > 0 && (
                <div className="space-y-3 mb-5" role="radiogroup" aria-label="Saved addresses">
                  {addresses.map((address, index) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selectedAddress === index}
                      key={address._id || index}
                      onClick={() => handleAddressSelect(address, index)}
                      className={`w-full text-left p-4 border-[1.5px] rounded-lg transition-colors flex items-start gap-3 ${
                        selectedAddress === index ? 'border-action bg-action-tint' : 'border-line bg-white hover:border-sand'
                      }`}
                    >
                      <MapPin className="w-5 h-5 mt-0.5 text-brand flex-shrink-0" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block font-medium text-ink">
                          {address.street}
                          {address.isDefault && <span className="ml-2 align-middle badge bg-brand">Default</span>}
                        </span>
                        <span className="block text-sm text-ink-soft">{address.city}, {address.state} - {address.pincode}</span>
                        <span className="block text-sm text-ink-mute">Contact: {address.phone || user?.phone}</span>
                      </span>
                      {selectedAddress === index && <CheckCircle className="w-5 h-5 text-action flex-shrink-0" aria-hidden="true" />}
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={useNewAddress}
                    onClick={handleNewAddress}
                    className={`w-full p-4 border-[1.5px] border-dashed rounded-lg flex items-center justify-center gap-2 font-medium min-h-[56px] transition-colors ${
                      useNewAddress ? 'border-action bg-action-tint text-action-dark' : 'border-sand text-brand hover:border-brand'
                    }`}
                  >
                    <Plus className="w-5 h-5" aria-hidden="true" /> Use a new address
                  </button>
                </div>
              )}

              {showForm && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="co-pin" className="field-label">PIN code <span className="text-ink-mute font-normal">(required)</span></label>
                    <input id="co-pin" type="text" inputMode="numeric" name="pincode" value={shippingInfo.pincode} onChange={handleChange} required
                      autoComplete="postal-code" maxLength={6} pattern="[0-9]{6}" title="6-digit PIN code" className="input-field" />
                  </div>
                  <div className="hidden sm:block" aria-hidden="true"></div>
                  <div>
                    <label htmlFor="co-city" className="field-label">City <span className="text-ink-mute font-normal">(required)</span></label>
                    <input id="co-city" type="text" name="city" value={shippingInfo.city} onChange={handleChange} required
                      autoComplete="address-level2" className="input-field" />
                  </div>
                  <div>
                    <label htmlFor="co-state" className="field-label">State <span className="text-ink-mute font-normal">(required)</span></label>
                    <input id="co-state" type="text" name="state" value={shippingInfo.state} onChange={handleChange} required
                      autoComplete="address-level1" className="input-field" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="co-street" className="field-label">House / flat and street <span className="text-ink-mute font-normal">(required)</span></label>
                    <input id="co-street" type="text" name="street" value={shippingInfo.street} onChange={handleChange} required
                      autoComplete="address-line1" className="input-field" placeholder="House/Flat No., Street name" />
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-3 min-h-[44px] cursor-pointer">
                    <input type="checkbox" checked={saveNewAddress} onChange={(e) => setSaveNewAddress(e.target.checked)}
                      className="w-6 h-6 rounded border-[#CDBBA4] text-action focus:ring-action" />
                    <span className="text-ink">Save this address for next time</span>
                  </label>
                  {addresses.length > 0 && (
                    <p className="sm:col-span-2 text-sm"><Link to="/profile" className="text-action underline underline-offset-2">Manage saved addresses</Link></p>
                  )}
                </div>
              )}
              <div className="mt-5 pt-5 border-t border-line">
                <label className="flex items-center gap-3 text-ink font-medium">
                  <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="w-5 h-5" />
                  Yeh ek tohfa hai (this is a gift)
                </label>
                {isGift && (
                  <div className="mt-3">
                    <label htmlFor="gift-msg" className="block text-sm text-ink-soft mb-1">Card pe aapka sandesh (we print it on the card in the box; no prices inside)</label>
                    <textarea id="gift-msg" rows="3" maxLength={300} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)}
                      className="input-field" placeholder="Shubh Deepawali! Aapke liye Bihar se kuch meetha. — Riya" />
                    <p className="text-xs text-ink-mute mt-1">{giftMessage.length}/300 · Deliver to the person's address above.</p>
                  </div>
                )}
              </div>
            </section>

            {/* 3. Payment */}
            <section className="panel" aria-labelledby="co-pay">
              <div id="co-pay">{sectionHead(3, 'Payment')}</div>
              <div className="space-y-3" role="radiogroup" aria-label="Payment method">
                {onlineEnabled && (
                <label className={`flex items-start gap-3 p-4 border-[1.5px] rounded-lg cursor-pointer transition-colors min-h-[64px] ${
                  paymentMethod === 'razorpay' ? 'border-action bg-action-tint' : 'border-line hover:border-sand'
                }`}>
                  <input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === 'razorpay'}
                    onChange={(e) => setPaymentMethod(e.target.value)} className="mt-0.5 w-5 h-5 text-action focus:ring-action" />
                  <span>
                    <span className="block font-medium text-ink">UPI / Cards / Net banking</span>
                    <span className="block text-sm text-ink-soft">Secure payment by Razorpay</span>
                  </span>
                </label>
                )}
                {!onlineEnabled && (
                <label className={`flex items-start gap-3 p-4 border-[1.5px] rounded-lg cursor-pointer transition-colors min-h-[64px] ${
                  paymentMethod === 'cod' ? 'border-action bg-action-tint' : 'border-line hover:border-sand'
                }`}>
                  <input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)} className="mt-0.5 w-5 h-5 text-action focus:ring-action" />
                  <span>
                    <span className="block font-medium text-ink">Cash on delivery</span>
                    <span className="block text-sm text-ink-soft">
                      Pay when the parcel arrives
                      {settings?.pricing?.codCharges > 0 && ` (+ ${formatINR(settings.pricing.codCharges)} COD charges)`}
                    </span>
                  </span>
                </label>
                )}
              </div>

              <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full mt-6 hidden lg:inline-flex">
                {submitContent}
              </button>
              <p className="hidden lg:flex items-center justify-center gap-1.5 text-sm text-ink-soft mt-3">
                <Lock className="w-4 h-4" aria-hidden="true" /> Secure checkout
              </p>
            </section>

            {/* Trust row */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-ink-soft px-1">
              {onlineEnabled && <span className="inline-flex items-center gap-1.5 min-h-[32px]"><Lock className="w-4 h-4 text-leaf" aria-hidden="true" /> Payments secured by Razorpay</span>}
              <Link to="/returns-policy" className="inline-flex items-center min-h-[32px] hover:text-action underline underline-offset-2">7-day returns</Link>
              <a href="tel:+916203009518" className="inline-flex items-center gap-1.5 min-h-[32px] hover:text-action"><Phone className="w-4 h-4" aria-hidden="true" /> Need help? Call us</a>
            </div>
          </form>

          {/* Desktop summary */}
          <aside className="hidden lg:block panel sticky top-24" aria-label="Order summary">
            <h2 className="font-display text-xl font-semibold mb-4">Order summary</h2>
            {summaryRows}
          </aside>
        </div>
      </div>

      {/* Sticky pay bar (mobile) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-raised px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 max-w-xl mx-auto">
          <div className="leading-tight">
            <p className="text-xs text-ink-mute">Total</p>
            <p className="text-lg font-semibold tabular-nums">{formatINR(total)}</p>
          </div>
          <button type="submit" form="checkout-form" disabled={loading} aria-busy={loading} className="btn-primary flex-1">
            {submitContent}
          </button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-xs text-ink-soft mt-1.5">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Secure checkout &middot; Easy returns
        </p>
      </div>
    </div>
  );
};

export default Checkout;

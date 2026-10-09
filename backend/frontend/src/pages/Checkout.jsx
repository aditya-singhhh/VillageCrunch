import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, createPaymentOrder, verifyPayment, calculateOrderTotal, getSettings, saveAddressFromCheckout, getUserProfile, getUserAddresses } from '../utils/api';
import { MapPin, Plus, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const { user, updateUser } = useAuth();

  // Get promocode data from navigation state (from Cart page)
  const [appliedPromocode, setAppliedPromocode] = useState(location.state?.appliedPromocode || null);
  const [orderTotals, setOrderTotals] = useState(location.state?.orderTotals || null);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

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
            taxRate: 18,
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
    (subtotal * (settings?.pricing?.taxRate ?? 18) / 100);
  
  const promocodeDiscount = orderTotals?.discount?.amount ?? 0;
  
  // Add COD charges if payment method is COD
  const codCharges = paymentMethod === 'cod' ? (settings?.pricing?.codCharges ?? 0) : 0;
  
  // Server totals exclude COD unless requested; add the COD charge for the chosen method
  const total = orderTotals
    ? orderTotals.total - (orderTotals.codCharge || 0) + codCharges
    : subtotal + shipping + tax + codCharges - promocodeDiscount;

  const handleChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value,
    });
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
        description: 'Premium Indian Dry Fruits & Snacks',
        image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=200&h=200&fit=crop',
        
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

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Shipping Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-8 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Delivery Address</h2>

              {/* Address Selection */}
              {addresses.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Delivery Address</h3>
                  <div className="space-y-3">
                    {addresses.map((address, index) => (
                      <div
                        key={address._id || index}
                        onClick={() => handleAddressSelect(address, index)}
                        className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                          selectedAddress === index
                            ? 'border-desi-gold bg-desi-cream/30'
                            : 'border-gray-200 hover:border-desi-cream'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <MapPin className="w-4 h-4 text-desi-brown" />
                              {address.isDefault && (
                                <span className="bg-desi-gold text-white text-xs px-2 py-1 rounded-full font-medium">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="font-medium text-gray-900">{address.street}</p>
                            <p className="text-gray-600 text-sm">
                              {address.city}, {address.state} - {address.pincode}
                            </p>
                          </div>
                          {selectedAddress === index && (
                            <CheckCircle className="w-5 h-5 text-desi-gold" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add New Address Option */}
                    <div
                      onClick={handleNewAddress}
                      className={`p-4 border-2 border-dashed rounded-lg cursor-pointer transition ${
                        useNewAddress
                          ? 'border-desi-gold bg-desi-cream/30'
                          : 'border-gray-300 hover:border-desi-gold'
                      }`}
                    >
                      <div className="flex items-center justify-center space-x-2 text-desi-brown">
                        <Plus className="w-5 h-5" />
                        <span className="font-medium">Use New Address</span>
                        {useNewAddress && <CheckCircle className="w-5 h-5 text-desi-gold" />}
                      </div>
                    </div>
                  </div>

                  {addresses.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-gray-600 mb-4">
                        No saved addresses found. (Debug: user.addresses = {user?.addresses?.length || 'undefined'})
                      </p>
                      <Link
                        to="/profile"
                        className="text-desi-gold hover:text-yellow-600 font-medium"
                      >
                        Add addresses in your profile
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Address Summary */}
              {!useNewAddress && selectedAddress !== null && addresses[selectedAddress] && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Delivery Address</h3>
                  <div className="bg-desi-cream/20 border border-desi-gold rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <MapPin className="w-5 h-5 text-desi-brown mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">{addresses[selectedAddress].street}</p>
                        <p className="text-gray-600">
                          {addresses[selectedAddress].city}, {addresses[selectedAddress].state} - {addresses[selectedAddress].pincode}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Contact: {addresses[selectedAddress].phone || user.phone}
                        </p>
                        {addresses[selectedAddress].isDefault && (
                          <span className="inline-block bg-desi-gold text-white text-xs px-2 py-1 rounded-full font-medium mt-1">
                            Default Address
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Address Form */}
              {(useNewAddress || addresses.length === 0) && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {addresses.length > 0 ? 'New Address Details' : 'Shipping Information'}
                    </h3>
                    {addresses.length > 0 && (
                      <Link
                        to="/profile"
                        className="text-sm text-desi-gold hover:text-yellow-600 font-medium"
                      >
                        Manage addresses in profile
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Contact and Address Form */}
            <form onSubmit={handlePayment} className="bg-white rounded-xl shadow-md p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={shippingInfo.name}
                    onChange={handleChange}
                    required
                    className="input-field"
                    readOnly={!useNewAddress && selectedAddress !== null}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shippingInfo.phone}
                    onChange={handleChange}
                    required
                    className="input-field"
                    readOnly={!useNewAddress && selectedAddress !== null}
                  />
                </div>

                {(useNewAddress || addresses.length === 0) && (
                  <>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        name="street"
                        value={shippingInfo.street}
                        onChange={handleChange}
                        required
                        className="input-field"
                        placeholder="House/Flat No., Street Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={shippingInfo.city}
                        onChange={handleChange}
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        name="state"
                        value={shippingInfo.state}
                        onChange={handleChange}
                        required
                        className="input-field"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PIN Code *
                      </label>
                      <input
                        type="text"
                        name="pincode"
                        value={shippingInfo.pincode}
                        onChange={handleChange}
                        required
                        className="input-field"
                      />
                    </div>

                    {/* Save Address Checkbox */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-3 p-4 border border-desi-cream rounded-lg bg-desi-cream/10">
                        <input
                          type="checkbox"
                          checked={saveNewAddress}
                          onChange={(e) => setSaveNewAddress(e.target.checked)}
                          className="h-4 w-4 text-desi-gold border-gray-300 rounded focus:ring-desi-gold"
                        />
                        <div>
                          <p className="font-medium text-gray-900">Save this address for future orders</p>
                          <p className="text-sm text-gray-600">
                            This address will be added to your profile for quick checkout next time
                          </p>
                        </div>
                      </label>
                    </div>
                  </>
                )}

                {selectedAddress !== null && !useNewAddress && (
                  <div className="md:col-span-2">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Selected Address:</h4>
                      <p className="text-gray-700">
                        {shippingInfo.street}<br />
                        {shippingInfo.city}, {shippingInfo.state} - {shippingInfo.pincode}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
                <div className="space-y-4">
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-desi-brown focus:ring-desi-brown"
                    />
                    <div>
                      <p className="font-medium">Online Payment</p>
                      <p className="text-sm text-gray-500">Pay securely with UPI, Card, or Net Banking</p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-desi-brown focus:ring-desi-brown"
                    />
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-gray-500">
                        Pay with cash when your order arrives
                        {codCharges > 0 && ` (+ ₹${codCharges} COD charges)`}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-8 btn-primary flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    {paymentMethod === 'cod' ? 'Place Order - Cash on Delivery' : `Pay ₹${total.toFixed(2)}`}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item._id} className="flex items-center space-x-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 mb-4">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'FREE' : `₹${Number(shipping).toFixed(2)}`}</span>
                </div>
                {settings && settings.pricing.taxRate > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>Tax ({settings.pricing.taxRate}% GST)</span>
                    <span>₹{Number(tax).toFixed(2)}</span>
                  </div>
                )}
                {paymentMethod === 'cod' && settings && settings.pricing.codCharges > 0 && (
                  <div className="flex justify-between text-gray-700">
                    <span>COD Charges</span>
                    <span>₹{Number(settings.pricing.codCharges).toFixed(2)}</span>
                  </div>
                )}
                {appliedPromocode && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center">
                      💰 Promocode Discount ({appliedPromocode.code})
                    </span>
                    <span>-₹{Number(promocodeDiscount).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-desi-brown">₹{Number(total).toFixed(2)}</span>
                </div>
                {appliedPromocode && (
                  <div className="text-sm text-green-600 mt-1 text-right">
                    You saved ₹{Number(promocodeDiscount).toFixed(2)}!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
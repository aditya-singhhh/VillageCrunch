import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ Products
export const getProducts = async (params = {}) => {
  const { data } = await axios.get(`${API_URL}/products`, { params });
  return data;
};

export const getProduct = async (id) => {
  const { data } = await axios.get(`${API_URL}/products/${id}`);
  return data;
};

export const createProductReview = async (productId, review) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/products/${productId}/reviews`, review, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

// Alias for createProductReview
export const createReview = createProductReview;

// Upload review images
export const uploadReviewImages = async (images) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  
  images.forEach(image => {
    formData.append('images', image);
  });

  const { data } = await axios.post(`${API_URL}/products/reviews/upload-images`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
};

// Get product reviews with pagination
export const getProductReviews = async (productId, params = {}) => {
  const { data } = await axios.get(`${API_URL}/products/${productId}/reviews`, {
    params
  });
  return data;
};

// Mark review as helpful
export const markReviewHelpful = async (productId, reviewId, helpful) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(
    `${API_URL}/products/${productId}/reviews/${reviewId}/helpful`,
    { helpful },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return data;
};

// ✅ Orders (User)
export const createOrder = async (orderData) => {
  const { data } = await axios.post(`${API_URL}/orders`, orderData);
  return data;
};

export const getMyOrders = async () => {
  const token = localStorage.getItem('token'); // or wherever you store the JWT
  const { data } = await axios.get(`${API_URL}/orders/myorders`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};

// Alias for getMyOrders
export const getUserOrders = getMyOrders;

export const getOrder = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return data;
};


export const updateOrderToPaid = async (orderId, paymentDetails) => {
  const { data } = await axios.put(`${API_URL}/orders/${orderId}/pay`, paymentDetails, {
    withCredentials: true,
  });
  return data;
};

// ✅ Admin APIs
export const getAllOrders = async () => {
  const { data } = await axios.get(`${API_URL}/orders`, { withCredentials: true });
  return data;
};

export const updateOrderStatus = async (orderId, payload) => {
  const { data } = await axios.put(`${API_URL}/admin/orders/${orderId}/status`, payload, {
    withCredentials: true,
  });
  return data;
};

export const getAdminOrderById = async (orderId) => {
  const { data } = await axios.get(`${API_URL}/admin/orders/${orderId}`, { withCredentials: true });
  return data;
};

export const getOrderStats = async () => {
  const { data } = await axios.get(`${API_URL}/admin/orders/stats`, { withCredentials: true });
  return data;
};

// ✅ Payments
// The server computes the amount from the cart; only items + promocode are sent.
export const createPaymentOrder = async (cartItems, promocode = null) => {
  const { data } = await axios.post(`${API_URL}/payment/create-order`, {
    cartItems: cartItems.map((i) => ({ productId: i._id || i.productId || i.product, quantity: i.quantity })),
    promocode: promocode?.code || null,
  });
  return data;
};

export const verifyPayment = async (paymentData) => {
  const { data } = await axios.post(`${API_URL}/payment/verify`, paymentData);
  return data;
};

export const getRazorpayKey = async () => {
  const { data } = await axios.get(`${API_URL}/payment/key`);
  return data;
};

// Forgot Password
export const forgotPassword = async (identifier) => {
  const { data } = await axios.post(`${API_URL}/auth/forgot-password`, { identifier });
  return data;
};

export const verifyOTP = async (phone, otp) => {
  const { data } = await axios.post(`${API_URL}/auth/verify-otp`, { phone, otp });
  return data;
};

export const resetPassword = async (resetToken, password) => {
  const { data } = await axios.put(`${API_URL}/auth/reset-password/${resetToken}`, { password });
  return data;
};

// ✅ Contact APIs
export const submitContactForm = async (formData) => {
  const { data } = await api.post('/contact', formData);
  return data;
};

export const getContacts = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/contact`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateContactStatus = async (contactId, status) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/contact/${contactId}/status`, 
    { status }, 
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

// ✅ Admin Product Management APIs
export const getAllProducts = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/products`, {
    params: { all: true },
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const addProduct = async (productData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/products`, productData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateProduct = async (productId, productData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/products/${productId}`, productData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteProduct = async (productId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${API_URL}/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ✅ Promocode Management APIs
export const getPromocodes = async (params = {}) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/promocodes`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

export const getPromocode = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/promocodes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const createPromocode = async (promocodeData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/promocodes`, promocodeData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updatePromocode = async (id, promocodeData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/promocodes/${id}`, promocodeData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deletePromocode = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${API_URL}/promocodes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const validatePromocode = async (code, orderValue, products = [], categories = [], userId = null) => {
  const { data } = await axios.post(`${API_URL}/promocodes/validate`, {
    code,
    orderValue,
    products,
    categories,
    userId,
  });
  return data;
};

export const getPromocodeStats = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/promocodes/stats/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ✅ Campaign Management APIs
export const getCampaigns = async (params = {}) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/campaigns`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return data;
};

export const getCampaign = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/campaigns/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const createCampaign = async (campaignData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/campaigns`, campaignData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateCampaign = async (id, campaignData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/campaigns/${id}`, campaignData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteCampaign = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${API_URL}/campaigns/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateCampaignStatus = async (id, status) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/campaigns/${id}/status`, 
    { status }, 
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
};

export const getCampaignAnalytics = async (id) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/campaigns/${id}/analytics`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getCampaignStats = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/campaigns/stats/overview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ✅ Settings Management APIs
export const getSettings = async () => {
  const { data } = await axios.get(`${API_URL}/settings`);
  return data;
};

export const updateSettings = async (settingsData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/settings`, settingsData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const getPricingSettings = async () => {
  const { data } = await axios.get(`${API_URL}/settings/pricing`);
  return data;
};

export const updatePricingSettings = async (pricingData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/settings/pricing`, pricingData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const calculateOrderTotal = async (items, shippingMethod = 'standard', promocode = null, paymentMethod = null) => {
  const { data } = await axios.post(`${API_URL}/settings/calculate-order-total`, {
    items,
    shippingMethod,
    promocode: promocode?.code || null,
    paymentMethod,
  });
  return data;
};

export const getShippingOptions = async (orderValue) => {
  const { data } = await axios.get(`${API_URL}/settings/shipping-options`, {
    params: { orderValue },
  });
  return data;
};

// ✅ Cart Management
export const getCart = async () => {
  const { data } = await api.get('/cart');
  return data;
};

export const addToCart = async (productId, quantity = 1) => {
  const { data } = await api.post('/cart/add', {
    productId,
    quantity,
  });
  return data;
};

export const updateCartItem = async (productId, quantity) => {
  const { data } = await api.put('/cart/update', {
    productId,
    quantity,
  });
  return data;
};

export const removeFromCart = async (productId) => {
  const { data } = await api.delete(`/cart/remove/${productId}`);
  return data;
};

export const clearCart = async () => {
  const { data } = await api.delete('/cart/clear');
  return data;
};

export const syncCart = async (localCart) => {
  const { data } = await api.post('/cart/sync', {
    localCart,
  });
  return data;
};

// ✅ Image Upload APIs
export const uploadProductImage = async (imageFile) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const { data } = await axios.post(`${API_URL}/products/upload-image`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
  });
  return data;
};

export const uploadProductImages = async (imageFiles) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  
  // Append multiple files
  imageFiles.forEach(file => {
    formData.append('images', file);
  });
  
  const { data } = await axios.post(`${API_URL}/products/upload-images`, formData, {
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    },
  });
  return data;
};

// ✅ Address Management
export const getUserAddresses = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/addresses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const addAddress = async (addressData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/addresses`, addressData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const updateAddress = async (addressId, addressData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/addresses/${addressId}`, addressData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const deleteAddress = async (addressId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${API_URL}/addresses/${addressId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const setDefaultAddress = async (addressId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.put(`${API_URL}/addresses/${addressId}/default`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const saveAddressFromCheckout = async (addressData) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/addresses/save-from-checkout`, addressData, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Get current user profile
export const getUserProfile = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/auth/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Get user stats
export const getUserStats = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/auth/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// ✅ Wishlist Management
export const getWishlist = async () => {
  const token = localStorage.getItem('token');
  const { data } = await axios.get(`${API_URL}/wishlist`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const addToWishlist = async (productId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/wishlist/add/${productId}`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const removeFromWishlist = async (productId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.delete(`${API_URL}/wishlist/remove/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

export const toggleWishlist = async (productId) => {
  const token = localStorage.getItem('token');
  const { data } = await axios.post(`${API_URL}/wishlist/toggle/${productId}`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
};

// Chhath "Ghar" campaign
export const getGharStatus = async () => (await api.get('/ghar/status')).data;
export const claimGhar = async (payload) => (await api.post('/ghar/claim', payload)).data;
export const getMyGhar = async () => (await api.get('/ghar/mine')).data;
export const postChitthi = async (payload) => (await api.post('/ghar/chitthi', payload)).data;
export const getGharClaims = async (params = {}) => (await api.get('/ghar/claims', { params })).data;
export const updateGharClaim = async (id, payload) => (await api.put(`/ghar/claims/${id}`, payload)).data;
export const downloadGharCsv = async (type) => (await api.get('/ghar/claims.csv', { params: { type }, responseType: 'blob' })).data;

// Export the axios instance as default
export default api;

// PIN code -> { city, state } (India Post directory, via our API). Returns null when unknown.
/** Save the shopper's phone (and cart) as soon as it's typed at checkout. Never throws. */
export const saveCheckoutLead = async (lead) => {
  try { await axios.post(`${API_URL}/leads`, lead); } catch (_) { /* ignore */ }
};

export const lookupPincode = async (pin) => {
  try {
    const { data } = await axios.get(`${API_URL}/pincode/${pin}`);
    return data;
  } catch (_) {
    return null;
  }
};

// ✅ Checkout leads (admin)
export const getLeads = async () => (await api.get('/leads')).data;
export const updateLead = async (id, status) => (await api.put(`/leads/${id}`, { status })).data;

import { useState, useEffect, useRef } from 'react';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Edit,
  MapPin,
  Phone,
  User,
  MessageSquare,
  Mail,
  Calendar,
  Eye,
  Plus,
  Trash2,
  Save,
  Upload,
  Star,
  DollarSign,
  Hash,
  Percent,
  AlertCircle,
  Users,
  Tag,
  Settings,
  BarChart3,
  ShoppingBag,
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  getContacts, 
  updateContactStatus as updateContactStatusAPI,
  getAllProducts,
  addProduct as addProductAPI,
  updateProduct as updateProductAPI,
  deleteProduct as deleteProductAPI,
  getPromocodes,
  createPromocode,
  updatePromocode,
  deletePromocode,
  validatePromocode,
  getPromocodeStats,
  getSettings,
  updateSettings,
  getPricingSettings,
  updatePricingSettings,
  uploadProductImage,
  uploadProductImages
} from '../utils/api';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const Admin = () => {
  // ✅ Helper functions for image handling
  const isFullUrl = (imagePath) => {
    return imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'));
  };

  const getDisplayImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (isFullUrl(imagePath)) return imagePath;
    // Convert relative path to same-origin absolute URL for display
    return `${window.location.origin}${imagePath}`;
  };

  const getStorageImagePath = (imageInput) => {
    if (!imageInput) return '';
    if (isFullUrl(imageInput)) {
      const currentOrigin = window.location.origin;
      if (imageInput.startsWith(currentOrigin)) {
        return imageInput.replace(currentOrigin, '');
      }
      // Keep external URLs as-is
      return imageInput;
    }
    // If it starts with /, it's already a proper path
    if (imageInput.startsWith('/')) return imageInput;
    // Add leading slash if missing
    return `/${imageInput}`;
  };

  // ✅ Price calculation helpers
  const calculateDiscountedPrice = (originalPrice, discountPercent) => {
    if (!originalPrice || !discountPercent) return '';
    const original = parseFloat(originalPrice);
    const discount = parseFloat(discountPercent);
    if (original <= 0 || discount <= 0) return '';
    return Math.round(original * (1 - discount / 100));
  };

  const calculateDiscountFromPrices = (originalPrice, finalPrice) => {
    if (!originalPrice || !finalPrice) return '';
    const original = parseFloat(originalPrice);
    const final = parseFloat(finalPrice);
    if (original <= 0 || final <= 0 || final >= original) return '';
    return Math.round(((original - final) / original) * 100);
  };

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [products, setProducts] = useState([]);
  const [promocodes, setPromocodes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showPromocodeModal, setShowPromocodeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [contactFilterStatus, setContactFilterStatus] = useState('all');
  const [productFilterCategory, setProductFilterCategory] = useState('all');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [selectedPromocode, setSelectedPromocode] = useState(null);
  const [loadingPromocodes, setLoadingPromocodes] = useState(false);
  const [promocodeSearchTerm, setPromocodeSearchTerm] = useState('');

  // ✅ New state for category and image management
  const [categories, setCategories] = useState([]);
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageInputMode, setImageInputMode] = useState('url'); // 'url' or 'upload'
  const [additionalImageUrl, setAdditionalImageUrl] = useState('');
  
  // Refs
  const fileInputRef = useRef(null);
  const multipleFileInputRef = useRef(null);

  // Product form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    discount: '',
    category: '',
    stock: '',
    weight: '',
    image: '',
    images: [],
    isActive: true,
  });

  // Promocode form state
  const [promocodeForm, setPromocodeForm] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    applicationType: 'all',
    applicableProducts: [],
    applicableCategories: [],
    minOrderValue: '',
    maxDiscountAmount: '',
    usageLimit: '',
    userUsageLimit: '',
    isActive: true,
    validFrom: '',
    validUntil: '',
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    pricing: {
      currency: 'INR',
      currencySymbol: '₹',
      taxRate: 18,
      shippingCharges: {
        standard: { 
          rate: 50, 
          freeShippingThreshold: 500,
          freeShippingEnabled: true
        },
        express: { rate: 100, freeShippingThreshold: 1000 },
        overnight: { rate: 200, freeShippingThreshold: 2000 },
      },
      codCharges: 25,
    },
    business: {
      companyName: 'Premium Dry Fruits Store',
      email: 'villagecrunchcontact@gmail.com',
      phone: '+91 9876543210',
      address: '123 Business District, Delhi, India',
      gstNumber: '07AAACH7409R1Z5',
    },
    notifications: {
      orderConfirmation: true,
      statusUpdates: true,
      promotions: true,
      lowStock: true,
    },
  });

  // ✅ Status configurations
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Pending',
    },
    confirmed: {
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Confirmed',
    },
    processing: {
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      label: 'Processing',
    },
    shipped: {
      icon: Truck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      label: 'Shipped',
    },
    delivered: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Delivered',
    },
    cancelled: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Cancelled',
    },
  };

  // Contact status configurations
  const contactStatusConfig = {
    pending: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      label: 'Pending',
    },
    'in-progress': {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'In Progress',
    },
    resolved: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Resolved',
    },
  };

  // Toggle expanded order state
  const toggleOrderExpanded = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // ✅ Fetch all orders
  useEffect(() => {
    fetchOrders();
  }, []);

  // ✅ Fetch contacts when tab changes
  useEffect(() => {
    if (activeTab === 'contacts') {
      fetchContacts();
    }
  }, [activeTab]);

  // ✅ Fetch products when tab changes
  useEffect(() => {
    if (activeTab === 'products' || activeTab === 'promocodes') {
      fetchProducts();
    }
  }, [activeTab]);

  // ✅ Fetch promocodes when tab changes
  useEffect(() => {
    if (activeTab === 'promocodes') {
      fetchPromocodes();
    }
  }, [activeTab]);

  // ✅ Fetch settings when tab changes
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

 const fetchOrders = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please login first");
      window.location.href = "/login";
      return;
    }

    const { data } = await axios.get(`${API_URL}/orders`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    setOrders(data);
  } catch (error) {
    console.error("Error fetching orders:", error);
    toast.error("Failed to load orders");
  } finally {
    setLoading(false);
  }
};

const fetchContacts = async () => {
  try {
    setContactsLoading(true);
    const response = await getContacts();
    setContacts(response.data || []);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    toast.error("Failed to load contacts");
  } finally {
    setContactsLoading(false);
  }
};

const fetchProducts = async () => {
  try {
    setLoadingProducts(true);
    const data = await getAllProducts();
    const products = data.products || data || [];
    setProducts(products);
    
    // ✅ Extract unique categories from products
    const uniqueCategories = [...new Set(products.map(product => product.category).filter(Boolean))];
    setCategories(uniqueCategories.sort());
  } catch (error) {
    console.error('Failed to fetch products:', error);
    toast.error('Failed to fetch products');
  } finally {
    setLoadingProducts(false);
  }
};

// ✅ Fetch Promocodes
const fetchPromocodes = async () => {
  try {
    setLoadingPromocodes(true);
    const data = await getPromocodes();
    setPromocodes(data.promocodes || data || []);
  } catch (error) {
    console.error('Failed to fetch promocodes:', error);
    toast.error('Failed to fetch promocodes');
  } finally {
    setLoadingPromocodes(false);
  }
};

// ✅ Fetch Settings
const fetchSettings = async () => {
  try {
    const data = await getSettings();
    setSettings(data.settings || data || {});
    // Update form with fetched settings, ensuring proper structure
    if (data.settings || data) {
      const fetchedSettings = data.settings || data;
      setSettingsForm(prevForm => ({
        ...prevForm,
        pricing: {
          ...prevForm.pricing,
          ...(fetchedSettings.pricing || {}),
          shippingCharges: {
            ...prevForm.pricing.shippingCharges,
            ...(fetchedSettings.pricing?.shippingCharges || {}),
            standard: {
              ...prevForm.pricing.shippingCharges.standard,
              ...(fetchedSettings.pricing?.shippingCharges?.standard || {})
            }
          }
        },
        business: {
          ...prevForm.business,
          ...(fetchedSettings.business || {})
        },
        notifications: {
          ...prevForm.notifications,
          ...(fetchedSettings.notifications || {})
        }
      }));
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    toast.error('Failed to fetch settings');
  }
};

// ✅ Image Upload Function
const handleImageUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    toast.error('Please upload a valid image file (JPEG, PNG, WebP)');
    return;
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    toast.error('Image size should be less than 5MB');
    return;
  }

  try {
    setUploadingImage(true);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('image', file);

    // Upload to backend
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/products/upload-image`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    const imageUrl = response.data.imageUrl;
    
    // Update product form with uploaded image URL
    setProductForm(prev => ({
      ...prev,
      image: imageUrl
    }));

    toast.success('Image uploaded successfully!');
  } catch (error) {
    console.error('Error uploading image:', error);
    toast.error(error.response?.data?.message || 'Failed to upload image');
  } finally {
    setUploadingImage(false);
  }
};

// ✅ Handle Category Selection
const handleCategoryChange = (e) => {
  const value = e.target.value;
  if (value === '__ADD_CUSTOM__') {
    setIsAddingCustomCategory(true);
    setCustomCategory('');
  } else {
    setIsAddingCustomCategory(false);
    setProductForm(prev => ({ ...prev, category: value }));
  }
};

// ✅ Handle Custom Category
const addCustomCategory = () => {
  if (customCategory.trim()) {
    const newCategory = customCategory.trim();
    setProductForm(prev => ({ ...prev, category: newCategory }));
    
    // Add to available categories if not already present
    if (!categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory].sort());
    }
    
    setIsAddingCustomCategory(false);
    setCustomCategory('');
    toast.success(`Category "${newCategory}" added!`);
  }
};

// ✅ Add/Update Product
const addProduct = async (e) => {
  e.preventDefault();
  try {
    setAddingProduct(true);
    
    const productData = {
      ...productForm,
      price: Number(productForm.price),
      originalPrice: productForm.originalPrice ? Number(productForm.originalPrice) : null,
      discount: productForm.discount ? Number(productForm.discount) : null,
      stock: Number(productForm.stock),
      image: getStorageImagePath(productForm.image), // Convert to proper storage format
    };

    if (editingProduct) {
      await updateProductAPI(editingProduct._id, productData);
      toast.success('Product updated successfully!');
    } else {
      await addProductAPI(productData);
      toast.success('Product added successfully!');
    }

    fetchProducts();
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      discount: '',
      category: '',
      stock: '',
      weight: '',
      image: '',
      isActive: true
    });
  } catch (error) {
    console.error('Error saving product:', error);
    toast.error('Failed to save product');
  } finally {
    setAddingProduct(false);
  }
};

// ✅ Edit Product
const editProduct = (product) => {
  setEditingProduct(product);
  setProductForm({
    name: product.name || '',
    description: product.description || '',
    price: product.price || '',
    originalPrice: product.originalPrice || '',
    discount: product.discount || '',
    category: product.category || '',
    stock: product.stock || '',
    weight: product.weight || '',
    image: getDisplayImageUrl(product.image) || '',
    isActive: product.isActive !== false
  });
  setShowProductModal(true);
};

// ✅ Delete Product
const deleteProduct = async (productId) => {
  if (!window.confirm('Are you sure you want to delete this product?')) {
    return;
  }

  try {
    setDeletingProduct(productId);
    await deleteProductAPI(productId);
    toast.success('Product deleted successfully!');
    fetchProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
    toast.error('Failed to delete product');
  } finally {
    setDeletingProduct(null);
  }
};

// ✅ Promocode Management Functions
const addPromocode = async (e) => {
  e.preventDefault();
  
  console.log('🔍 Promocode form validation:', {
    applicationType: promocodeForm.applicationType,
    applicableProducts: promocodeForm.applicableProducts,
    applicableCategories: promocodeForm.applicableCategories,
    productsLength: promocodeForm.applicableProducts.length,
    categoriesLength: promocodeForm.applicableCategories.length
  });
  
  // Validation for specific application types
  if (promocodeForm.applicationType === 'product' && promocodeForm.applicableProducts.length === 0) {
    toast.error('Please select at least one product for this promocode');
    return;
  }
  
  if (promocodeForm.applicationType === 'category' && promocodeForm.applicableCategories.length === 0) {
    toast.error('Please select at least one category for this promocode');
    return;
  }
  
  try {
    const promocodeData = {
      code: promocodeForm.code,
      name: promocodeForm.code, // Use code as name for now
      description: promocodeForm.description,
      type: promocodeForm.discountType, // Map discountType to type
      value: Number(promocodeForm.discountValue), // Map discountValue to value
      applicableOn: promocodeForm.applicationType, // Map applicationType to applicableOn
      categories: promocodeForm.applicableCategories || [],
      products: promocodeForm.applicableProducts || [],
      minOrderValue: promocodeForm.minOrderValue ? Number(promocodeForm.minOrderValue) : 0,
      maxDiscount: promocodeForm.maxDiscountAmount ? Number(promocodeForm.maxDiscountAmount) : null,
      usageLimit: promocodeForm.usageLimit ? Number(promocodeForm.usageLimit) : null,
      userUsageLimit: promocodeForm.userUsageLimit ? Number(promocodeForm.userUsageLimit) : null,
      isActive: promocodeForm.isActive,
      startDate: promocodeForm.validFrom ? new Date(promocodeForm.validFrom + 'T00:00:00.000Z') : new Date(),
      endDate: promocodeForm.validUntil ? new Date(promocodeForm.validUntil + 'T23:59:59.999Z') : null,
    };

    console.log('Creating promocode with data:', promocodeData);
    console.log('User token exists:', !!localStorage.getItem('token'));

    if (selectedPromocode) {
      await updatePromocode(selectedPromocode._id, promocodeData);
      toast.success('Promocode updated successfully!');
    } else {
      const result = await createPromocode(promocodeData);
      console.log('Promocode creation result:', result);
      toast.success('Promocode created successfully!');
    }

    fetchPromocodes();
    setShowPromocodeModal(false);
    setSelectedPromocode(null);
    resetPromocodeForm();
  } catch (error) {
    console.error('Full error object:', error);
    console.error('Error response:', error.response);
    console.error('Error message:', error.message);
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    toast.error(error.response?.data?.message || 'Failed to save promocode');
  }
};

const deletePromocodeHandler = async (promocodeId) => {
  if (!window.confirm('Are you sure you want to delete this promocode?')) {
    return;
  }

  try {
    await deletePromocode(promocodeId);
    toast.success('Promocode deleted successfully!');
    fetchPromocodes();
  } catch (error) {
    console.error('Error deleting promocode:', error);
    toast.error('Failed to delete promocode');
  }
};

const resetPromocodeForm = () => {
  setPromocodeForm({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    applicationType: 'all',
    applicableProducts: [],
    applicableCategories: [],
    minOrderValue: '',
    maxDiscountAmount: '',
    usageLimit: '',
    userUsageLimit: '',
    isActive: true,
    validFrom: '',
    validUntil: '',
  });
};

// ✅ Settings Management Functions
const saveSettings = async (e) => {
  e.preventDefault();
  try {
    await updateSettings(settingsForm);
    toast.success('Settings updated successfully!');
    setShowSettingsModal(false);
    fetchSettings();
  } catch (error) {
    console.error('Error saving settings:', error);
    toast.error('Failed to save settings');
  }
};

  // ✅ Update order status
  const updateOrderStatus = async (orderId, newStatus, trackingNumber = '') => {
    try {
      setUpdatingStatus(true);
      await axios.put(
        `${API_URL}/orders/${orderId}/status`,
        { status: newStatus, trackingNumber },
        { withCredentials: true }
      );

      toast.success(`Order updated to ${statusConfig[newStatus].label}`);
      fetchOrders();
      setShowModal(false);
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ✅ Update contact status
  const updateContactStatus = async (contactId, newStatus) => {
    try {
      setUpdatingStatus(true);
      await updateContactStatusAPI(contactId, newStatus);
      toast.success(`Contact updated to ${contactStatusConfig[newStatus].label}`);
      fetchContacts();
      setShowContactModal(false);
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error('Failed to update contact');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ✅ Product Management Functions
  const handleProductFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProductForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setProductForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      price: '',
      originalPrice: '',
      discount: '',
      category: '',
      stock: '',
      weight: '',
      image: '',
      images: [],
      isActive: true,
    });
    setEditingProduct(null);
    setAdditionalImageUrl('');
  };

  // ✅ Image Upload Functions

  const handleMultipleImagesUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploadingImage(true);
      const response = await uploadProductImages(files);
      setProductForm(prev => ({ 
        ...prev, 
        images: [...prev.images, ...response.imageUrls] 
      }));
      toast.success(`${files.length} images uploaded successfully!`);
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addImageFromUrl = (url) => {
    if (!url.trim()) return;
    setProductForm(prev => ({
      ...prev,
      images: [...prev.images, url.trim()]
    }));
  };

  const handleProductFormSubmit = async (e) => {
    e.preventDefault();
    if (editingProduct) {
      await handleUpdateProduct();
    } else {
      await handleAddProduct();
    }
  };

  const handleAddProduct = async () => {
    try {
      setSavingProduct(true);
      const token = localStorage.getItem("token");
      
      const productData = {
        ...productForm,
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        stock: Number(productForm.stock),
        image: getStorageImagePath(productForm.image),
        images: productForm.images.map(img => getStorageImagePath(img)),
        nutritionalInfo: {
          calories: Number(productForm.nutritionalInfo?.calories) || 0,
          protein: Number(productForm.nutritionalInfo?.protein) || 0,
          carbs: Number(productForm.nutritionalInfo?.carbs) || 0,
          fat: Number(productForm.nutritionalInfo?.fat) || 0,
          fiber: Number(productForm.nutritionalInfo?.fiber) || 0,
        }
      };

      console.log('Product form data being sent:', productData);
      console.log('Main image:', productData.image);
      console.log('Additional images:', productData.images);

      const response = await axios.post(`${API_URL}/products`, productData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('Product creation response:', response.data);
      toast.success('Product added successfully!');
      fetchProducts();
      setShowAddProductModal(false);
      resetProductForm();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleUpdateProduct = async () => {
    try {
      setSavingProduct(true);
      const token = localStorage.getItem("token");
      
      const productData = {
        ...productForm,
        price: Number(productForm.price),
        originalPrice: Number(productForm.originalPrice),
        stock: Number(productForm.stock),
        image: getStorageImagePath(productForm.image),
        images: productForm.images.map(img => getStorageImagePath(img)),
        nutritionalInfo: {
          calories: Number(productForm.nutritionalInfo?.calories) || 0,
          protein: Number(productForm.nutritionalInfo?.protein) || 0,
          carbs: Number(productForm.nutritionalInfo?.carbs) || 0,
          fat: Number(productForm.nutritionalInfo?.fat) || 0,
          fiber: Number(productForm.nutritionalInfo?.fiber) || 0,
        }
      };

      console.log('Updating product with ID:', editingProduct._id);
      console.log('Product data being updated:', productData);

      await axios.put(`${API_URL}/products/${editingProduct._id}`, productData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Product updated successfully!');
      fetchProducts();
      setShowProductModal(false);
      setSelectedProduct(null);
      resetProductForm();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const openProductEditModal = (product) => {
    setSelectedProduct(product);
    setEditingProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      originalPrice: product.originalPrice || '',
      discount: product.discount || '',
      category: product.category || '',
      stock: product.stock || '',
      weight: product.weight || '',
      image: product.image || '',
      images: product.images || [],
      isActive: product.isActive !== undefined ? product.isActive : true,
    });
    setShowProductModal(true);
  };

  // ✅ Filtered orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress?.phone.includes(searchTerm);

    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // ✅ Filtered contacts
  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.subject.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = contactFilterStatus === 'all' || contact.status === contactFilterStatus;
    return matchesSearch && matchesFilter;
  });

  // ✅ Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    processing: orders.filter((o) => o.status === 'processing').length,
    shipped: orders.filter((o) => o.status === 'shipped').length,
    delivered: orders.filter((o) => o.status === 'delivered').length,
  };

  // ✅ Contact Stats
  const contactStats = {
    total: contacts.length,
    pending: contacts.filter((c) => c.status === 'pending').length,
    inProgress: contacts.filter((c) => c.status === 'in-progress').length,
    resolved: contacts.filter((c) => c.status === 'resolved').length,
  };

  // ✅ Product Stats
  const productStats = {
    total: products.length,
    active: products.filter((p) => p.isActive !== false).length,
    outOfStock: products.filter((p) => p.stock <= 0).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= 10).length,
  };

  // Get unique categories for filter
  const filterCategories = [...new Set(products.map(p => p.category))].filter(Boolean);

  // ✅ Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(productSearchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    
    const matchesStock = !stockFilter || 
                        (stockFilter === 'in-stock' && product.stock > 10) ||
                        (stockFilter === 'low-stock' && product.stock > 0 && product.stock <= 10) ||
                        (stockFilter === 'out-of-stock' && product.stock <= 0);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-desi-brown"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-desi-brown mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 mb-6">Manage orders and customer inquiries</p>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-desi-gold text-desi-brown'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Package className="w-5 h-5 inline-block mr-2" />
              Orders Management
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'contacts'
                  ? 'border-desi-gold text-desi-brown'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <MessageSquare className="w-5 h-5 inline-block mr-2" />
              Contact Management
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'products'
                  ? 'border-desi-gold text-desi-brown'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Hash className="w-5 h-5 inline-block mr-2" />
              Products Management
            </button>
            <button
              onClick={() => setActiveTab('promocodes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'promocodes'
                  ? 'border-desi-gold text-desi-brown'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Tag className="w-5 h-5 inline-block mr-2" />
              Promocodes
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-desi-gold text-desi-brown'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5 inline-block mr-2" />
              Settings
            </button>
          </nav>
        </div>

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <>
            {/* ✅ Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {[
            ['Total Orders', stats.total, Package, 'border-desi-gold'],
            ['Pending', stats.pending, Clock, 'border-yellow-500'],
            ['Processing', stats.processing, Package, 'border-indigo-500'],
            ['Shipped', stats.shipped, Truck, 'border-purple-500'],
            ['Delivered', stats.delivered, CheckCircle, 'border-green-500'],
          ].map(([label, value, Icon, border]) => (
            <div key={label} className={`bg-white rounded-xl shadow-md p-6 border-l-4 ${border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{label}</p>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <Icon className="w-8 h-8 text-desi-gold" />
              </div>
            </div>
          ))}
        </div>

        {/* ✅ Filters and Search */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 grid md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by order number, name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-desi-gold"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-desi-gold appearance-none"
            >
              <option value="all">All Status</option>
              {Object.entries(statusConfig).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          </div>
        </div>

        {/* ✅ Orders Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-desi-cream">
                <tr>
                  {['Order #', 'Customer', 'Date', 'Products & Items', 'Total', 'Payment', 'Status', 'Actions'].map(
                    (head) => (
                      <th key={head} className="px-6 py-4 text-left text-sm font-semibold text-desi-brown">
                        {head}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const status = statusConfig[order.status];
                  const StatusIcon = status.icon;
                  return (
                    <tr key={order._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono font-semibold">#{order.orderNumber}</td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">{order.user?.name || order.shippingAddress?.name}</p>
                          <p className="text-sm text-gray-600">{order.user?.email}</p>
                          <p className="text-sm text-gray-500">{order.user?.phone || order.shippingAddress?.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="space-y-2">
                          <p className="font-medium text-gray-900">{order.items.length} items</p>
                          <div className="space-y-1">
                            {/* Always show first 2 items with details */}
                            {order.items?.slice(0, 2).map((item, index) => (
                              <div key={index} className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border">
                                <div className="font-medium truncate">
                                  {item.product?.name || item.name || 'Product'}
                                </div>
                                <div className="text-gray-500 flex justify-between">
                                  <span>Qty: {item.quantity}</span>
                                  <span>₹{item.price}</span>
                                </div>
                                {item.weight && (
                                  <div className="text-gray-400 text-xs">{item.weight}</div>
                                )}
                              </div>
                            ))}
                            
                            {/* Expandable section for remaining items */}
                            {expandedOrders.has(order._id) && order.items.length > 2 && (
                              <div className="space-y-1">
                                {order.items.slice(2).map((item, index) => (
                                  <div key={index + 2} className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded border">
                                    <div className="font-medium truncate">
                                      {item.product?.name || item.name || 'Product'}
                                    </div>
                                    <div className="text-gray-500 flex justify-between">
                                      <span>Qty: {item.quantity}</span>
                                      <span>₹{item.price}</span>
                                    </div>
                                    {item.weight && (
                                      <div className="text-gray-400 text-xs">{item.weight}</div>
                                    )}
                                  </div>
                                ))}
                                {/* Order summary when expanded */}
                                <div className="text-xs bg-desi-cream px-2 py-1 rounded border border-desi-gold mt-2">
                                  <div className="flex justify-between font-medium text-desi-brown">
                                    <span>Order Total:</span>
                                    <span>₹{order.totalPrice.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Clickable expand/collapse button */}
                            {order.items?.length > 2 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleOrderExpanded(order._id);
                                }}
                                className="text-xs text-desi-gold hover:text-desi-brown font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-yellow-50 transition-colors"
                              >
                                {expandedOrders.has(order._id) ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    +{order.items.length - 2} more items
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold">₹{order.totalPrice.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {order.paymentInfo.method.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full ${status.bgColor} ${status.color}`}>
                          <StatusIcon className="w-4 h-4 mr-2" />
                          <span className="text-sm font-semibold">{status.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowModal(true);
                          }}
                          className="text-desi-gold hover:text-yellow-600"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ✅ Edit Order Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-desi-gold to-yellow-600 p-6 text-white flex justify-between">
              <h2 className="text-2xl font-bold">Order Details</h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:text-gray-200">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Details */}
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 text-desi-brown flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Customer Account Details */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-3">Account Details</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {selectedOrder.user?.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedOrder.user?.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {selectedOrder.user?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Shipping Address */}
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-3">Shipping Address</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Deliver To:</strong> {selectedOrder.shippingAddress?.name}</p>
                      <p><Phone className="w-4 h-4 inline mr-2" />{selectedOrder.shippingAddress?.phone}</p>
                      <p><MapPin className="w-4 h-4 inline mr-2" />
                        {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 text-desi-brown flex items-center">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Order Summary
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span><strong>Order #:</strong></span>
                    <span className="font-mono font-bold">#{selectedOrder.orderNumber}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span><strong>Order Date:</strong></span>
                    <span>{new Date(selectedOrder.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span><strong>Payment Method:</strong></span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      selectedOrder.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedOrder.paymentInfo?.method?.toUpperCase()} {selectedOrder.isPaid ? '(Paid)' : '(Pending)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span><strong>Items:</strong></span>
                    <span>{selectedOrder.items?.length || 0} items</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                    <span>Total Amount:</span>
                    <span className="text-desi-brown">₹{selectedOrder.totalPrice?.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Ordered Products */}
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 text-desi-brown flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Ordered Products
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items?.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center space-x-4">
                        {/* Product Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {item.product?.image || item.image ? (
                            <img 
                              src={item.product?.image || item.image} 
                              alt={item.product?.name || item.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                            <Package className="w-6 h-6" />
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-1">
                                {item.product?.name || item.name || 'Product Name Not Available'}
                              </h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                {item.weight && (
                                  <p><strong>Weight:</strong> {item.weight}</p>
                                )}
                                <p><strong>Unit Price:</strong> ₹{item.price?.toFixed(2)}</p>
                                <p><strong>Quantity:</strong> {item.quantity}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-desi-brown">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-500">
                                ₹{item.price} × {item.quantity}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No product details available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update */}
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-4 text-desi-brown">Update Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(statusConfig).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => updateOrderStatus(selectedOrder._id, key)}
                        disabled={updatingStatus || selectedOrder.status === key}
                        className={`p-4 rounded-lg border-2 transition ${
                          selectedOrder.status === key
                            ? `${cfg.borderColor} ${cfg.bgColor}`
                            : 'border-gray-200 hover:border-desi-gold'
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${cfg.color}`} />
                        <p className="text-sm font-semibold">{cfg.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
          </>
        )}
      
        {/* Contacts Tab Content */}
        {activeTab === 'contacts' && (
          <>
            {/* Contact Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                ['Total Contacts', contactStats.total, MessageSquare, 'border-desi-gold'],
                ['Pending', contactStats.pending, Clock, 'border-yellow-500'],
                ['In Progress', contactStats.inProgress, Edit, 'border-blue-500'],
                ['Resolved', contactStats.resolved, CheckCircle, 'border-green-500'],
              ].map(([label, value, Icon, borderClass]) => (
                <div key={label} className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${borderClass}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{label}</p>
                      <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                    <Icon className="w-8 h-8 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>

            {/* Contact Filters */}
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex-1 max-w-lg">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or subject..."
                      className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <select
                      className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                      value={contactFilterStatus}
                      onChange={(e) => setContactFilterStatus(e.target.value)}
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Contacts Table */}
            {contactsLoading ? (
              <div className="bg-white p-8 rounded-lg shadow-sm text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-desi-brown mx-auto mb-2"></div>
                <p className="text-gray-500">Loading contacts...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Info</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredContacts.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No contacts found
                        </td>
                      </tr>
                    ) : (
                      filteredContacts.map((contact) => {
                        const statusCfg = contactStatusConfig[contact.status];
                        return (
                          <tr key={contact._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Mail className="w-4 h-4 mr-1" />
                                  {contact.email}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="w-4 h-4 mr-1" />
                                  {contact.phone}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{contact.subject}</div>
                              <div className="text-sm text-gray-500 truncate max-w-xs">
                                {contact.message.length > 50 
                                  ? contact.message.substring(0, 50) + '...' 
                                  : contact.message
                                }
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusCfg.bgColor} ${statusCfg.color} ${statusCfg.borderColor} border`}>
                                {statusCfg.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                {new Date(contact.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              <button
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setShowContactModal(true);
                                }}
                                className="text-desi-brown hover:text-desi-gold flex items-center space-x-1"
                              >
                                <Eye className="w-4 h-4" />
                                <span>View</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* 🛍️ Products Management Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            {/* Product Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Products */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-600 text-sm font-medium">Total Products</p>
                    <p className="text-2xl font-bold text-blue-800">{productStats.total}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Hash className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Active Products */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-600 text-sm font-medium">Active Products</p>
                    <p className="text-2xl font-bold text-green-800">{productStats.active}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Out of Stock */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-600 text-sm font-medium">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-800">{productStats.outOfStock}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Low Stock */}
              <div className="bg-white p-6 rounded-xl shadow-lg border border-yellow-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-600 text-sm font-medium">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-800">{productStats.lowStock}</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <AlertCircle className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Products Controls */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-desi-brown">Products Management</h2>
                <button
                  onClick={() => {
                    setProductForm({
                      name: '',
                      description: '',
                      price: '',
                      originalPrice: '',
                      discount: '',
                      category: '',
                      stock: '',
                      weight: '',
                      image: '',
                      images: [],
                      isActive: true
                    });
                    setEditingProduct(null);
                    setAdditionalImageUrl('');
                    setShowProductModal(true);
                  }}
                  className="bg-desi-gold text-desi-brown px-4 py-2 rounded-lg hover:bg-yellow-500 transition flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Product</span>
                </button>
              </div>

              {/* Search and Filter */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                  />
                </div>
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                  >
                    <option value="">All Categories</option>
                    {filterCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={stockFilter}
                    onChange={(e) => setStockFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                  >
                    <option value="">All Stock Levels</option>
                    <option value="in-stock">In Stock</option>
                    <option value="low-stock">Low Stock</option>
                    <option value="out-of-stock">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Products Table */}
              {loadingProducts ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-desi-gold mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading products...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Hash className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">No products found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {product.image ? (
                                <div className="relative mr-4">
                                  <img
                                    src={getDisplayImageUrl(product.image)}
                                    alt={product.name}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                  {product.images && product.images.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-desi-gold text-desi-brown text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                      +{product.images.length}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center mr-4">
                                  <Hash className="w-6 h-6 text-gray-500" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">{product.name}</div>
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </div>
                                {product.images && product.images.length > 0 && (
                                  <div className="text-xs text-blue-600 mt-1">
                                    {product.images.length + 1} image{product.images.length + 1 !== 1 ? 's' : ''} total
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">₹{product.price}</span>
                                {product.originalPrice && product.originalPrice > product.price && (
                                  <span className="text-xs text-gray-500 line-through">₹{product.originalPrice}</span>
                                )}
                                {product.discount && (
                                  <span className="text-xs text-green-600">-{product.discount}%</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className={`text-sm font-medium ${
                                product.stock <= 0 ? 'text-red-600' :
                                product.stock <= 10 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {product.stock}
                              </span>
                              {product.stock <= 0 && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Out of Stock
                                </span>
                              )}
                              {product.stock > 0 && product.stock <= 10 && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Low Stock
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              product.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {product.isActive !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openProductEditModal(product)}
                                className="text-indigo-600 hover:text-indigo-900 p-1"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete Product"
                                disabled={deletingProduct === product._id}
                              >
                                {deletingProduct === product._id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 📧 Contact Details Modal */}
        {showContactModal && selectedContact && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-desi-brown">Contact Details</h2>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Contact Info */}
                <div>
                  <h3 className="font-bold text-lg mb-4 text-desi-brown flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Contact Information
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p><strong>Name:</strong> {selectedContact.name}</p>
                    <p><strong>Email:</strong> {selectedContact.email}</p>
                    <p><strong>Phone:</strong> {selectedContact.phone}</p>
                    <p><strong>Subject:</strong> {selectedContact.subject}</p>
                    <p><strong>Date:</strong> {new Date(selectedContact.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h3 className="font-bold text-lg mb-4 text-desi-brown">Message</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedContact.message}</p>
                  </div>
                </div>

                {/* Status Update */}
                <div className="border-t pt-4">
                  <h3 className="font-bold text-lg mb-4 text-desi-brown">Update Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Object.entries(contactStatusConfig).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => updateContactStatus(selectedContact._id, key)}
                        disabled={updatingStatus || selectedContact.status === key}
                        className={`p-3 rounded-lg border-2 transition ${
                          selectedContact.status === key
                            ? `${cfg.bgColor} ${cfg.borderColor} ${cfg.color}`
                            : 'border-gray-200 hover:border-gray-300'
                        } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="text-center">
                          <div className={`text-sm font-medium ${selectedContact.status === key ? cfg.color : 'text-gray-700'}`}>
                            {cfg.label}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🛍️ Product Add/Edit Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-desi-brown">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <button
                  onClick={() => {
                    setShowProductModal(false);
                    setEditingProduct(null);
                    setProductForm({
                      name: '',
                      description: '',
                      price: '',
                      originalPrice: '',
                      discount: '',
                      category: '',
                      stock: '',
                      weight: '',
                      image: '',
                      isActive: true
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleProductFormSubmit} className="p-6 space-y-6">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="Enter product name"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent resize-none"
                    placeholder="Enter product description"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  {isAddingCustomCategory ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                        placeholder="Enter custom category"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addCustomCategory}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Add
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCustomCategory(false);
                            setCustomCategory('');
                          }}
                          className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <select
                      required
                      value={productForm.category}
                      onChange={handleCategoryChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category, index) => (
                        <option key={index} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value="__ADD_CUSTOM__">+ Add Custom Category</option>
                    </select>
                  )}
                </div>

                {/* Price & Stock Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price (₹) *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={productForm.price}
                        onChange={(e) => {
                          const finalPrice = e.target.value;
                          setProductForm(prev => {
                            const newDiscount = calculateDiscountFromPrices(prev.originalPrice, finalPrice);
                            return {
                              ...prev,
                              price: finalPrice,
                              discount: newDiscount || prev.discount
                            };
                          });
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.stock}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight/Package Size
                  </label>
                  <input
                    type="text"
                    value={productForm.weight}
                    onChange={(e) => setProductForm(prev => ({ ...prev, weight: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="e.g., 250g, 500g, 1kg"
                  />
                </div>

                {/* Original Price & Discount Row */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>💡 Smart Pricing:</strong> Enter original price and discount % to auto-calculate final price, 
                    or enter final price to auto-calculate discount %.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Original Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Price (₹)
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productForm.originalPrice}
                        onChange={(e) => {
                          const originalPrice = e.target.value;
                          setProductForm(prev => {
                            const newPrice = calculateDiscountedPrice(originalPrice, prev.discount);
                            return {
                              ...prev,
                              originalPrice,
                              price: newPrice || prev.price
                            };
                          });
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                        placeholder="0.00"
                      />
                    </div>
                    {productForm.originalPrice && productForm.price && parseFloat(productForm.price) < parseFloat(productForm.originalPrice) && (
                      <p className="text-xs text-green-600 mt-1">
                        You Save: ₹{Math.round(parseFloat(productForm.originalPrice) - parseFloat(productForm.price))}
                        {productForm.discount && ` (${productForm.discount}% discount)`}
                      </p>
                    )}
                  </div>

                  {/* Discount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discount (%)
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={productForm.discount}
                        onChange={(e) => {
                          const discountPercent = e.target.value;
                          setProductForm(prev => {
                            const newPrice = calculateDiscountedPrice(prev.originalPrice, discountPercent);
                            return {
                              ...prev,
                              discount: discountPercent,
                              price: newPrice || prev.price
                            };
                          });
                        }}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                        placeholder="0"
                      />
                    </div>
                    {productForm.originalPrice && productForm.discount && (
                      <p className="text-xs text-gray-600 mt-1">
                        Calculated Price: ₹{calculateDiscountedPrice(productForm.originalPrice, productForm.discount)}
                        {productForm.discount && ` (${productForm.discount}% off)`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Product Image
                  </label>
                  
                  {/* Toggle between URL and Upload */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        imageInputMode === 'url' 
                          ? 'bg-desi-gold text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-3 py-1 text-sm rounded-md ${
                        imageInputMode === 'upload' 
                          ? 'bg-desi-gold text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Upload Image
                    </button>
                  </div>

                  {imageInputMode === 'url' ? (
                    <div>
                      <div className="relative">
                        <Upload className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={productForm.image}
                          onChange={(e) => setProductForm(prev => ({ ...prev, image: e.target.value }))}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                          placeholder="https://example.com/image.jpg or /Product_Images/product.jpg"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Enter full URL (https://...) or relative path (/Product_Images/...)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-4">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingImage ? 'Uploading...' : 'Choose Image'}
                        </button>
                        {uploadingImage && (
                          <div className="text-sm text-gray-600">
                            Please wait while uploading...
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Upload JPG, PNG, or WebP images (max 5MB)
                      </p>
                    </div>
                  )}

                  {/* Main Image Preview */}
                  {productForm.image && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Main Image Preview:</p>
                      <img
                        src={getDisplayImageUrl(productForm.image)}
                        alt="Preview"
                        className="h-24 w-24 rounded-lg object-cover border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          e.target.style.display = 'block';
                          e.target.nextSibling.style.display = 'none';
                        }}
                      />
                      <div className="h-24 w-24 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center" style={{display: 'none'}}>
                        <span className="text-xs text-gray-500">Invalid image</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Images (Optional)
                  </label>
                  
                  {/* Add image from URL */}
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={additionalImageUrl}
                        onChange={(e) => setAdditionalImageUrl(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                        placeholder="Enter image URL..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          addImageFromUrl(additionalImageUrl);
                          setAdditionalImageUrl('');
                        }}
                        disabled={!additionalImageUrl.trim()}
                        className="px-4 py-2 bg-desi-gold text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Upload multiple images */}
                  <div className="mb-3">
                    <input
                      ref={multipleFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleMultipleImagesUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => multipleFileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Upload className="w-4 h-4" />
                      {uploadingImage ? 'Uploading...' : 'Upload Multiple Images'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      Select multiple images to upload at once
                    </p>
                  </div>

                  {/* Additional Images Grid */}
                  {productForm.images.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Additional Images:</p>
                      <div className="grid grid-cols-4 gap-2">
                        {productForm.images.map((imageUrl, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={getDisplayImageUrl(imageUrl)}
                              alt={`Additional ${index + 1}`}
                              className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={productForm.isActive}
                    onChange={(e) => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 text-desi-gold focus:ring-desi-gold border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Product is active and visible to customers
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                      setProductForm({
                        name: '',
                        description: '',
                        price: '',
                        originalPrice: '',
                        discount: '',
                        category: '',
                        stock: '',
                        weight: '',
                        image: '',
                        images: [],
                        isActive: true
                      });
                      setAdditionalImageUrl('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="bg-desi-gold text-desi-brown px-6 py-2 rounded-lg hover:bg-yellow-500 transition flex items-center space-x-2 disabled:opacity-50"
                  >
                    {savingProduct ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-desi-brown"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 🏷️ Promocodes Management Tab */}
        {activeTab === 'promocodes' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-desi-brown">Promocodes Management</h2>
                <p className="text-gray-600">Manage discount codes and promotional offers</p>
              </div>
              <button
                onClick={() => {
                  setSelectedPromocode(null);
                  resetPromocodeForm();
                  setShowPromocodeModal(true);
                }}
                className="bg-desi-gold text-desi-brown px-4 py-2 rounded-lg hover:bg-yellow-500 transition flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Promocode</span>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search promocodes..."
                  value={promocodeSearchTerm}
                  onChange={(e) => setPromocodeSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold focus:border-desi-gold"
                />
              </div>
            </div>

            {/* Promocodes List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loadingPromocodes ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-desi-gold mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading promocodes...</p>
                </div>
              ) : promocodes.length === 0 ? (
                <div className="p-8 text-center">
                  <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No promocodes found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid Until</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {promocodes
                        .filter(promocode => 
                          promocode.code.toLowerCase().includes(promocodeSearchTerm.toLowerCase()) ||
                          promocode.description.toLowerCase().includes(promocodeSearchTerm.toLowerCase())
                        )
                        .map((promocode) => (
                          <tr key={promocode._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                                  {promocode.code}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{promocode.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {promocode.type === 'percentage' ? `${promocode.value}%` : `₹${promocode.value}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(promocode.endDate).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                promocode.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {promocode.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {promocode.usageCount || 0}/{promocode.usageLimit || '∞'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedPromocode(promocode);
                                  
                                  // Extract product IDs from the products array (handle both ObjectId objects and strings)
                                  const productIds = (promocode.products || []).map(product => 
                                    typeof product === 'object' ? product._id : product
                                  );
                                  
                                  setPromocodeForm({
                                    code: promocode.code,
                                    description: promocode.description,
                                    discountType: promocode.type, // Map type back to discountType for form
                                    discountValue: promocode.value, // Map value back to discountValue for form
                                    applicationType: promocode.applicableOn, // Map applicableOn back to applicationType
                                    applicableProducts: productIds,
                                    applicableCategories: promocode.categories || [],
                                    minOrderValue: promocode.minOrderValue || '',
                                    maxDiscountAmount: promocode.maxDiscount || '',
                                    usageLimit: promocode.usageLimit || '',
                                    userUsageLimit: promocode.userUsageLimit || '',
                                    isActive: promocode.isActive,
                                    validFrom: promocode.startDate ? promocode.startDate.split('T')[0] : '',
                                    validUntil: promocode.endDate ? promocode.endDate.split('T')[0] : '',
                                  });
                                  
                                  setShowPromocodeModal(true);
                                }}
                                className="text-desi-brown hover:text-desi-gold"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deletePromocodeHandler(promocode._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ⚙️ Settings Management Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-desi-brown">Settings Management</h2>
                <p className="text-gray-600">Configure pricing, shipping, and business settings</p>
              </div>
            </div>

            {/* Settings Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consolidated Pricing & Tax Settings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Pricing & Tax Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Percentage (GST %)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={settingsForm.pricing?.taxRate ?? ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, taxRate: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      placeholder="18.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">GST percentage applied to all orders</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">COD Charges (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={settingsForm.pricing?.codCharges ?? ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        pricing: { ...prev.pricing, codCharges: Number(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      placeholder="25.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Additional charges for Cash on Delivery orders</p>
                  </div>
                </div>
              </div>

              {/* Business Settings */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-blue-600" />
                  Business Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={settingsForm.business?.companyName || ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        business: { ...prev.business, companyName: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settingsForm.business?.email || ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        business: { ...prev.business, email: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settingsForm.business?.phone || ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        business: { ...prev.business, phone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      value={settingsForm.business?.gstNumber || ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        business: { ...prev.business, gstNumber: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Shipping & Tax Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shipping Configuration */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-purple-600" />
                  Shipping Configuration
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Charge (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settingsForm.pricing?.shippingCharges?.standard?.rate ?? ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        pricing: { 
                          ...prev.pricing, 
                          shippingCharges: {
                            ...(prev.pricing?.shippingCharges || {}),
                            standard: {
                              ...(prev.pricing?.shippingCharges?.standard || {}),
                              rate: Number(e.target.value)
                            }
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      placeholder="99.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Standard shipping fee charged to customers</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Free Shipping Threshold (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={settingsForm.pricing?.shippingCharges?.standard?.freeShippingThreshold ?? ''}
                      onChange={(e) => setSettingsForm(prev => ({
                        ...prev,
                        pricing: { 
                          ...prev.pricing, 
                          shippingCharges: {
                            ...(prev.pricing?.shippingCharges || {}),
                            standard: {
                              ...(prev.pricing?.shippingCharges?.standard || {}),
                              freeShippingThreshold: Number(e.target.value)
                            }
                          }
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      placeholder="500.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Order amount above which shipping becomes free</p>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={settingsForm.pricing?.shippingCharges?.standard?.freeShippingEnabled !== false}
                        onChange={(e) => setSettingsForm(prev => ({
                          ...prev,
                          pricing: { 
                            ...prev.pricing, 
                            shippingCharges: {
                              ...(prev.pricing?.shippingCharges || {}),
                              standard: {
                                ...(prev.pricing?.shippingCharges?.standard || {}),
                                freeShippingEnabled: e.target.checked
                              }
                            }
                          }
                        }))}
                        className="rounded border-gray-300 text-desi-gold focus:ring-desi-gold"
                      />
                      <span className="text-sm font-medium text-gray-700">Enable Free Shipping</span>
                    </label>
                    <p className="text-xs text-gray-500 ml-6">Allow customers to get free shipping when they reach the threshold</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                className="bg-desi-gold text-desi-brown px-6 py-2 rounded-lg hover:bg-yellow-500 transition flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        )}

        {/* Promocode Modal */}
        {showPromocodeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedPromocode ? 'Edit Promocode' : 'Add New Promocode'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowPromocodeModal(false);
                      setSelectedPromocode(null);
                      resetPromocodeForm();
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={addPromocode} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Promocode *</label>
                      <input
                        type="text"
                        required
                        value={promocodeForm.code}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="SAVE20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                      <select
                        required
                        value={promocodeForm.discountType}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, discountType: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <textarea
                      required
                      value={promocodeForm.description}
                      onChange={(e) => setPromocodeForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      rows="2"
                      placeholder="Get 20% off on all orders above ₹500"
                    />
                  </div>

                  {/* Application Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apply To *</label>
                    <select
                      required
                      value={promocodeForm.applicationType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setPromocodeForm(prev => ({ 
                          ...prev, 
                          applicationType: newType,
                          applicableProducts: [], // Reset when changing type
                          applicableCategories: [] // Reset when changing type
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                    >
                      <option value="all">Site-wide (All Products)</option>
                      <option value="product">Specific Products</option>
                      <option value="category">Specific Categories</option>
                    </select>
                  </div>

                  {/* Product Selection - Show only when applicationType is 'product' */}
                  {promocodeForm.applicationType === 'product' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Products *</label>
                      
                      {/* Selected Products Display */}
                      {promocodeForm.applicableProducts.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-green-600 font-medium mb-2">
                            ✅ {promocodeForm.applicableProducts.length} product(s) selected:
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {promocodeForm.applicableProducts.map(productId => {
                              const product = products?.find(p => p._id === productId);
                              return product ? (
                                <div key={productId} className="bg-desi-gold bg-opacity-20 text-desi-brown px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                  <span>{product.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPromocodeForm(prev => ({
                                        ...prev,
                                        applicableProducts: prev.applicableProducts.filter(id => id !== productId)
                                      }));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    ×
                                  </button>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Product Selection Dropdown */}
                      <div className="flex gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !promocodeForm.applicableProducts.includes(e.target.value)) {
                              setPromocodeForm(prev => ({
                                ...prev,
                                applicableProducts: [...prev.applicableProducts, e.target.value]
                              }));
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        >
                          <option value="">Choose a product to add...</option>
                          {products && products.length > 0 ? (
                            products
                              .filter(product => !promocodeForm.applicableProducts.includes(product._id))
                              .map(product => (
                                <option key={product._id} value={product._id}>
                                  {product.name} - ₹{product.price} ({product.category})
                                </option>
                              ))
                          ) : (
                            <option disabled>Loading products...</option>
                          )}
                        </select>
                      </div>
                      
                      {promocodeForm.applicableProducts.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Please select at least one product
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {products?.length || 0} products available
                      </p>
                    </div>
                  )}

                  {/* Category Selection - Show only when applicationType is 'category' */}
                  {promocodeForm.applicationType === 'category' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Select Categories *</label>
                      
                      {/* Selected Categories Display */}
                      {promocodeForm.applicableCategories.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm text-green-600 font-medium mb-2">
                            ✅ {promocodeForm.applicableCategories.length} categor{promocodeForm.applicableCategories.length === 1 ? 'y' : 'ies'} selected:
                          </p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {promocodeForm.applicableCategories.map(category => (
                              <div key={category} className="bg-desi-gold bg-opacity-20 text-desi-brown px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                <span>{category.replace('-', ' ').toUpperCase()}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromocodeForm(prev => ({
                                      ...prev,
                                      applicableCategories: prev.applicableCategories.filter(cat => cat !== category)
                                    }));
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Category Selection Dropdown */}
                      <div className="flex gap-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value && !promocodeForm.applicableCategories.includes(e.target.value)) {
                              setPromocodeForm(prev => ({
                                ...prev,
                                applicableCategories: [...prev.applicableCategories, e.target.value]
                              }));
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        >
                          <option value="">Choose a category to add...</option>
                          {categories && categories.length > 0 ? (
                            categories
                              .filter(category => !promocodeForm.applicableCategories.includes(category))
                              .map(category => (
                                <option key={category} value={category}>
                                  {category.replace('-', ' ').toUpperCase()}
                                </option>
                              ))
                          ) : (
                            <option disabled>Loading categories...</option>
                          )}
                        </select>
                      </div>
                      
                      {promocodeForm.applicableCategories.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          Please select at least one category
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {categories?.length || 0} categories available
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={promocodeForm.discountValue}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, discountValue: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Min Order Value (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={promocodeForm.minOrderValue}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, minOrderValue: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={promocodeForm.maxDiscountAmount}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid From *</label>
                      <input
                        type="date"
                        required
                        value={promocodeForm.validFrom}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, validFrom: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                      <input
                        type="date"
                        required
                        value={promocodeForm.validUntil}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, validUntil: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Usage Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={promocodeForm.usageLimit}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Per User Limit</label>
                      <input
                        type="number"
                        min="1"
                        value={promocodeForm.userUsageLimit}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, userUsageLimit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-desi-gold"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={promocodeForm.isActive}
                        onChange={(e) => setPromocodeForm(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="rounded border-gray-300 text-desi-gold focus:ring-desi-gold"
                      />
                      <span className="text-sm font-medium text-gray-700">Active</span>
                    </label>
                  </div>

                  <div className="flex justify-end space-x-3 pt-6 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPromocodeModal(false);
                        setSelectedPromocode(null);
                        resetPromocodeForm();
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-desi-gold text-desi-brown px-6 py-2 rounded-lg hover:bg-yellow-500 transition flex items-center space-x-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>{selectedPromocode ? 'Update Promocode' : 'Create Promocode'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;

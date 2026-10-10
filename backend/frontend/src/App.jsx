import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ScrollProgressBar from './components/ScrollProgressBar';
import AIChatbot from './components/AIChatbot';
import AnalyticsSetup from './utils/analytics.jsx';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import About from './pages/About';
import ContactUs from './pages/ContactUs';
import ShippingPolicy from './pages/ShippingPolicy';
import ReturnsPolicy from './pages/ReturnsPolicy';
import Admin from './pages/Admin';
import Wishlist from './pages/Wishlist';
import CustomerSupport from './pages/CustomerSupport';
import ProtectedRoute from './components/ProtectedRoute';
import OrdersDetail from './pages/OrderDetail';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AnalyticsSetup />
        <ScrollToTop />
        <ScrollProgressBar />
        <AuthProvider>
          <CartProvider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-grow">
              <Routes>
                <Route path="/admin" element={<ProtectedRoute adminOnly={true}>
                  <Admin />
                </ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute>
                  <CustomerSupport />
                </ProtectedRoute>} />
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password/:resettoken" element={<ResetPassword />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/order/:id" element={<OrdersDetail />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/shipping-policy" element={<ShippingPolicy />} />
                <Route path="/returns-policy" element={<ReturnsPolicy />} />
              </Routes>
              </main>
              <Footer />
              <AIChatbot />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: '#333',
                    color: '#fff',
                  },
                  success: {
                    iconTheme: {
                      primary: '#D4AF37',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </CartProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
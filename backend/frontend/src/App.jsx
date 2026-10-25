import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ScrollProgressBar from './components/ScrollProgressBar';
import AIChatbot from './components/AIChatbot';
import BottomNav from './components/BottomNav';
import AnnouncementBar from './components/AnnouncementBar';
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
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Admin from './pages/Admin';
import Wishlist from './pages/Wishlist';
import CustomerSupport from './pages/CustomerSupport';
import ProtectedRoute from './components/ProtectedRoute';
import OrdersDetail from './pages/OrderDetail';
import Ghar from './pages/Ghar';
import Diwali from './pages/Diwali';
import AdminGhar from './pages/AdminGhar';

// Storefront shell; the admin console hides storefront-only chrome.
const Shell = () => {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith('/admin');
  const isCheckout = pathname.startsWith('/checkout');
  // Reserve room under the footer for fixed bottom bars (tab bar, buy bar, pay bar)
  let bottomPad = 'pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0';
  if (isAdmin) bottomPad = '';
  else if (isCheckout || pathname.startsWith('/product/')) bottomPad = 'pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0 lg:pb-0';
  else if (pathname.startsWith('/cart')) bottomPad = 'pb-[calc(136px+env(safe-area-inset-bottom))] md:pb-20 lg:pb-0';
  return (
    <div className={`flex flex-col min-h-screen ${isAdmin ? 'bg-paper' : 'bg-brand-dark'} ${bottomPad}`}>
      {!isAdmin && <AnnouncementBar />}
      <Navbar />
      <main id="main" className="flex-grow bg-paper min-h-[60vh]">
        <Routes>
                <Route path="/admin" element={<ProtectedRoute adminOnly={true}>
                  <Admin />
                </ProtectedRoute>} />
                <Route path="/support" element={<ProtectedRoute>
                  <CustomerSupport />
                </ProtectedRoute>} />
                <Route path="/admin/ghar" element={<ProtectedRoute adminOnly={true}><AdminGhar /></ProtectedRoute>} />
                <Route path="/ghar" element={<Ghar />} />
                <Route path="/diwali" element={<Diwali />} />
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
                <Route path="/refund-policy" element={<ReturnsPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
              </Routes>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
      {!isAdmin && <AIChatbot />}
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 96 }}
        toastOptions={{
          duration: 3000,
          style: { background: '#2B1D14', color: '#fff', borderRadius: '10px', fontSize: '15px' },
          success: { iconTheme: { primary: '#6FBF86', secondary: '#2B1D14' } },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <HelmetProvider>
      <Router>
        <AnalyticsSetup />
        <ScrollToTop />
        <ScrollProgressBar />
        <AuthProvider>
          <CartProvider>
            <Shell />
          </CartProvider>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;

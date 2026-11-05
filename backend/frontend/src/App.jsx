import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ScrollProgressBar from './components/ScrollProgressBar';
const AIChatbot = lazy(() => import('./components/AIChatbot'));
import BottomNav from './components/BottomNav';
import AnnouncementBar from './components/AnnouncementBar';
import WelcomePopup from './components/WelcomePopup';
import AnalyticsSetup from './utils/analytics.jsx';
const Home = lazy(() => import('./pages/Home'));
const Products = lazy(() => import('./pages/Products'));
import ProductDetail from './pages/ProductDetail';
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Orders = lazy(() => import('./pages/Orders'));
const Profile = lazy(() => import('./pages/Profile'));
const About = lazy(() => import('./pages/About'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy'));
const ReturnsPolicy = lazy(() => import('./pages/ReturnsPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Admin = lazy(() => import('./pages/Admin'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const CustomerSupport = lazy(() => import('./pages/CustomerSupport'));
import ProtectedRoute from './components/ProtectedRoute';
const OrdersDetail = lazy(() => import('./pages/OrderDetail'));
const Ghar = lazy(() => import('./pages/Ghar'));
const Diwali = lazy(() => import('./pages/Diwali'));
const AdminGhar = lazy(() => import('./pages/AdminGhar'));

// The chat assistant loads only after the page is idle, so it never slows the first screen.
const LateChatbot = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // also warm up the cart and checkout pages, so the buy flow stays instant
    const go = () => { setShow(true); import('./pages/Cart'); import('./pages/Checkout'); };
    // wait for the page (and its main photo) to finish, then a little more
    let t;
    const later = () => { t = setTimeout(go, 3000); };
    if (document.readyState === 'complete') later(); else window.addEventListener('load', later, { once: true });
    return () => { clearTimeout(t); window.removeEventListener('load', later); };
  }, []);
  return show ? <Suspense fallback={null}><AIChatbot /></Suspense> : null;
};

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
      {!isAdmin && <WelcomePopup />}
      <Navbar />
      <main id="main" className="flex-grow bg-paper min-h-[60vh]">
        <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
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
        </Suspense>
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <BottomNav />}
      {!isAdmin && <LateChatbot />}
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

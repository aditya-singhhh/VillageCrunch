import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Search, Phone, Package, Heart, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Logo from './Logo';
import CartDrawer from './CartDrawer';

const SHOP_LINKS = [
  { to: '/products', label: 'Shop all' },
  { to: '/products?category=dry-fruits', label: 'Dry fruits' },
  { to: '/products?category=makhana', label: 'Makhana' },
  { to: '/products?category=thekua', label: 'Thekua' },
];

const DESKTOP_LINKS = [
  ...SHOP_LINKS,
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
];

const isDesktop = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

const Navbar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [query, setQuery] = useState('');
  const { user, logout } = useAuth();
  const { getCartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const drawerRef = useRef(null);
  const menuBtnRef = useRef(null);
  const searchRef = useRef(null);
  const count = getCartCount();

  // Close overlays on route change
  useEffect(() => {
    setDrawerOpen(false);
    setCartOpen(false);
    setShowUserMenu(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  // Drawer: ESC, scroll lock, focus trap
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const node = drawerRef.current;
    const focusables = () => node ? node.querySelectorAll('a[href],button:not([disabled])') : [];
    focusables()[0]?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
      if (e.key === 'Tab') {
        const f = focusables();
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      menuBtnRef.current?.focus();
    };
  }, [drawerOpen]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setShowUserMenu(false);
    setDrawerOpen(false);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
    setSearchOpen(false);
  };

  const onCartClick = (e) => {
    if (isDesktop()) {
      e.preventDefault();
      setCartOpen(true);
    }
  };

  const cartBadge = count > 0 && (
    <span
      aria-hidden="true"
      className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-action text-white text-[11px] leading-[18px] text-center font-semibold"
    >
      {count}
    </span>
  );

  const navLinkCls = ({ isActive }) =>
    `relative inline-flex items-center h-[72px] text-[15px] font-medium transition-colors hover:text-action ${
      isActive ? 'text-action' : 'text-ink'
    }`;

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-line">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-raised"
      >
        Skip to content
      </a>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-[72px] gap-2">
          {/* Mobile: hamburger */}
          <button
            ref={menuBtnRef}
            onClick={() => setDrawerOpen(true)}
            className="icon-btn md:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="w-6 h-6" strokeWidth={1.75} />
          </button>

          <Logo className="max-md:absolute max-md:left-1/2 max-md:-translate-x-1/2 md:text-[26px]" />

          {/* Desktop nav */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-7 lg:gap-8">
            {DESKTOP_LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                end={l.to === '/products'}
                className={() => {
                  const here = location.pathname + location.search;
                  const active = l.to.includes('?')
                    ? here === l.to
                    : l.to === '/products'
                      ? location.pathname === '/products' && !location.search.includes('category=')
                      : location.pathname === l.to;
                  return navLinkCls({ isActive: active }) + (active ? ' after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-action' : '');
                }}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="icon-btn"
              aria-label="Search products"
              aria-expanded={searchOpen}
            >
              <Search className="w-5 h-5" strokeWidth={1.75} />
            </button>

            <Link
              to="/cart"
              onClick={onCartClick}
              className="icon-btn relative"
              aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            >
              <ShoppingCart className="w-5 h-5" strokeWidth={1.75} />
              {cartBadge}
            </Link>

            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowUserMenu((v) => !v)}
                  className="inline-flex items-center gap-2 h-11 px-3 rounded-full text-brand hover:bg-cream text-sm font-medium"
                  aria-haspopup="menu"
                  aria-expanded={showUserMenu}
                  aria-label="Account menu"
                >
                  <User className="w-5 h-5" strokeWidth={1.75} />
                  <span className="max-w-[120px] truncate">{user.name}</span>
                </button>
                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} aria-hidden="true" />
                    <div role="menu" className="absolute right-0 mt-2 w-52 z-20 bg-white border border-line rounded-lg shadow-raised py-2">
                      <Link role="menuitem" to="/profile" className="block px-4 py-2.5 text-sm hover:bg-cream">My profile</Link>
                      <Link role="menuitem" to="/orders" className="block px-4 py-2.5 text-sm hover:bg-cream">My orders</Link>
                      <Link role="menuitem" to="/wishlist" className="block px-4 py-2.5 text-sm hover:bg-cream">Wishlist</Link>
                      {user.role === 'admin' && (
                        <Link role="menuitem" to="/admin" className="block px-4 py-2.5 text-sm hover:bg-cream">Admin</Link>
                      )}
                      <button role="menuitem" onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm text-berry hover:bg-berry-tint flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-ghost hidden md:inline-flex h-11">Login</Link>
            )}
          </div>
        </div>

        {/* Search row */}
        {searchOpen && (
          <form onSubmit={submitSearch} role="search" className="pb-3 px-2 sm:px-0 animate-fade-in">
            <label htmlFor="header-search" className="sr-only">Search products</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-mute pointer-events-none" aria-hidden="true" />
              <input
                id="header-search"
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search almonds, makhana, thekua..."
                className="input-field pl-11"
                enterKeyHint="search"
              />
            </div>
          </form>
        )}
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={() => setDrawerOpen(false)} aria-hidden="true" />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-paper shadow-raised flex flex-col animate-drawer-left"
          >
            <div className="flex items-center justify-between h-14 px-3 border-b border-line">
              <Logo />
              <button onClick={() => setDrawerOpen(false)} className="icon-btn" aria-label="Close menu">
                <X className="w-6 h-6" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <p className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-mute">Shop</p>
              {SHOP_LINKS.map((l) => (
                <Link key={l.label} to={l.to} className="flex items-center h-12 px-5 text-base font-medium hover:bg-cream">{l.label}</Link>
              ))}
              <div className="my-2 border-t border-line" />
              <Link to="/about" className="flex items-center h-12 px-5 text-base font-medium hover:bg-cream">About</Link>
              <Link to="/contact" className="flex items-center h-12 px-5 text-base font-medium hover:bg-cream">Contact</Link>
              <div className="my-2 border-t border-line" />
              {user ? (
                <>
                  <Link to="/orders" className="flex items-center gap-3 h-12 px-5 text-base hover:bg-cream"><Package className="w-5 h-5 text-ink-soft" /> My orders</Link>
                  <Link to="/wishlist" className="flex items-center gap-3 h-12 px-5 text-base hover:bg-cream"><Heart className="w-5 h-5 text-ink-soft" /> Wishlist</Link>
                  <Link to="/profile" className="flex items-center gap-3 h-12 px-5 text-base hover:bg-cream"><UserCircle className="w-5 h-5 text-ink-soft" /> Profile</Link>
                  {user.role === 'admin' && (
                    <Link to="/admin" className="flex items-center gap-3 h-12 px-5 text-base hover:bg-cream"><User className="w-5 h-5 text-ink-soft" /> Admin</Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-3 h-12 px-5 text-base text-berry hover:bg-berry-tint">
                    <LogOut className="w-5 h-5" /> Logout
                  </button>
                </>
              ) : (
                <div className="px-5 py-3 flex flex-col gap-2">
                  <Link to="/login" className="btn-primary w-full">Login</Link>
                  <Link to="/register" className="btn-secondary w-full">Create account</Link>
                </div>
              )}
            </div>
            <div className="border-t border-line px-5 py-4">
              <a href="tel:+916203009518" className="inline-flex items-center gap-2 h-11 text-sm font-medium text-brand">
                <Phone className="w-4 h-4" /> +91 62030 09518
              </a>
            </div>
          </div>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
};

export default Navbar;

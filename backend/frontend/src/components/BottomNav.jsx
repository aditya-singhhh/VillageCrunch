import { NavLink, useLocation } from 'react-router-dom';
import { Home, Store, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const HIDDEN_ON = ['/checkout', '/admin', '/product/'];

const BottomNav = () => {
  const { pathname } = useLocation();
  const { getCartCount } = useCart();
  const { user } = useAuth();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;
  // Product pages have their own sticky buy bar; tab bar stays but is covered by it
  const count = getCartCount();
  const items = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/products', label: 'Shop', icon: Store },
    { to: '/cart', label: 'Cart', icon: ShoppingCart, badge: count },
    { to: user ? '/profile' : '/login', label: user ? 'Account' : 'Login', icon: User },
  ];
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line shadow-raised pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 h-14">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `h-full flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                  isActive ? 'text-action' : 'text-ink-soft'
                }`
              }
            >
              <span className="relative">
                <Icon className="w-6 h-6" strokeWidth={1.75} aria-hidden="true" />
                {badge > 0 && (
                  <span
                    aria-label={`${badge} items in cart`}
                    className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-action text-white text-[11px] leading-[18px] text-center font-semibold"
                  >
                    {badge}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default BottomNav;

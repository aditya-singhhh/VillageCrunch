import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { X, LogOut, Phone, Package, Heart, UserCircle, User } from 'lucide-react';
import Logo from './Logo';
import useOverlay from '../hooks/useOverlay';

/**
 * Mobile navigation drawer.
 * Rendered in a portal on document.body: the sticky header uses backdrop-filter, which makes
 * it the containing block for `position: fixed` children, so a drawer rendered inside the
 * header was clipped to the header's 56px height (this was the "sidebar not working" bug).
 */
const MobileMenu = ({ open, onClose, links, user, onLogout }) => {
  const panelRef = useOverlay(open, onClose);
  if (!open) return null;
  const row = 'flex items-center gap-3 h-12 px-5 text-base hover:bg-cream';
  return createPortal(
    <div className="md:hidden fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className="absolute left-0 top-0 bottom-0 w-[85%] max-w-xs bg-paper shadow-raised flex flex-col animate-drawer-left outline-none"
      >
        <div className="flex items-center justify-between h-14 px-3 border-b border-line flex-shrink-0">
          <span onClick={onClose}><Logo /></span>
          <button onClick={onClose} className="icon-btn" aria-label="Close menu">
            <X className="w-6 h-6" strokeWidth={1.75} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain py-2">
          <p className="px-5 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-ink-mute">Shop</p>
          {links.map((l) => (
            <Link key={l.label} to={l.to} onClick={onClose} className={`${row} font-medium`}>{l.label}</Link>
          ))}
          <div className="my-2 border-t border-line" />
          <Link to="/about" onClick={onClose} className={`${row} font-medium`}>About</Link>
          <Link to="/contact" onClick={onClose} className={`${row} font-medium`}>Contact</Link>
          <div className="my-2 border-t border-line" />
          {user ? (
            <>
              <Link to="/orders" onClick={onClose} className={row}><Package className="w-5 h-5 text-ink-soft" /> My orders</Link>
              <Link to="/wishlist" onClick={onClose} className={row}><Heart className="w-5 h-5 text-ink-soft" /> Wishlist</Link>
              <Link to="/profile" onClick={onClose} className={row}><UserCircle className="w-5 h-5 text-ink-soft" /> Profile</Link>
              {user.role === 'admin' && (
                <Link to="/admin" onClick={onClose} className={row}><User className="w-5 h-5 text-ink-soft" /> Admin</Link>
              )}
              <button onClick={onLogout} className="w-full flex items-center gap-3 h-12 px-5 text-base text-berry hover:bg-berry-tint">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </>
          ) : (
            <div className="px-5 py-3 flex flex-col gap-2">
              <Link to="/login" onClick={onClose} className="btn-primary w-full">Login</Link>
              <Link to="/register" onClick={onClose} className="btn-secondary w-full">Create account</Link>
            </div>
          )}
        </div>
        <div className="border-t border-line px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] flex-shrink-0">
          <a href="tel:+916203009518" className="inline-flex items-center gap-2 h-11 text-sm font-medium text-brand">
            <Phone className="w-4 h-4" /> +91 62030 09518
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default MobileMenu;

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Mail, Phone, ChevronDown } from 'lucide-react';
import Logo from './Logo';

const SHOP = [
  { to: '/products', label: 'All products' },
  { to: '/products?category=makhana', label: 'Makhana' },
  { to: '/products?category=thekua', label: 'Thekua' },
  { to: '/products?category=sattu', label: 'Sattu' },
];
const HELP = [
  { to: '/shipping-policy', label: 'Shipping policy' },
  { to: '/returns-policy', label: 'Returns & refunds' },
  { to: '/contact', label: 'Contact us' },
  { to: '/about', label: 'About us' },
  { to: '/support', label: 'Support' },
];

const linkCls = 'inline-flex items-center min-h-[44px] md:min-h-0 md:py-1.5 text-[15px] text-cream/90 hover:text-white hover:underline underline-offset-4';

const useIsDesktop = () => {
  const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null;
  const [desktop, setDesktop] = useState(mq ? mq.matches : true);
  useEffect(() => {
    if (!mq) return undefined;
    const on = (e) => setDesktop(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return desktop;
};

// Accordion on mobile, always-open columns from md up
const Section = ({ title, children }) => {
  const desktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const isOpen = desktop || open;
  return (
  <details className="group border-b border-white/10 md:border-0" open={isOpen}>
    <summary
      onClick={(e) => { e.preventDefault(); if (!desktop) setOpen((v) => !v); }}
      className="flex items-center justify-between min-h-[48px] cursor-pointer list-none md:cursor-default md:pointer-events-none font-display font-semibold text-lg text-cream [&::-webkit-details-marker]:hidden">
      {title}
      <ChevronDown className="w-5 h-5 md:hidden transition-transform group-open:rotate-180" aria-hidden="true" />
    </summary>
    <div className="pb-3 md:pb-0">{children}</div>
  </details>
  );
};

const Footer = () => (
  <footer className="bg-brand-dark text-cream mt-0">
    <div className="max-w-[1560px] mx-auto px-4 sm:px-6 lg:px-10 pt-8 md:pt-10 pb-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-x-10 gap-y-2 md:gap-y-8">
        <div className="mb-4 md:mb-0">
          <Logo light size="text-[26px]" />
          <div className="flex gap-1 mt-4 -ml-2">
            <a href="https://www.instagram.com/village_crunch/" target="_blank" rel="noopener noreferrer" aria-label="VillageCrunch on Instagram" className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="https://facebook.com/villagecrunch" target="_blank" rel="noopener noreferrer" aria-label="VillageCrunch on Facebook" className="inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-white/10">
              <Facebook className="w-5 h-5" />
            </a>
          </div>
        </div>

        <Section title="Shop">
          <ul>{SHOP.map((l) => <li key={l.label}><Link to={l.to} className={linkCls}>{l.label}</Link></li>)}</ul>
        </Section>
        <Section title="Help">
          <ul>{HELP.map((l) => <li key={l.label}><Link to={l.to} className={linkCls}>{l.label}</Link></li>)}</ul>
        </Section>
        <Section title="Contact">
          <ul>
            <li>
              <a href="tel:+916203009518" className={linkCls}><Phone className="w-4 h-4 mr-2" aria-hidden="true" />+91 62030 09518</a>
            </li>
            <li>
              <a href="mailto:villagecrunchcontact@gmail.com" className={`${linkCls} break-all`}><Mail className="w-4 h-4 mr-2 flex-shrink-0" aria-hidden="true" />villagecrunchcontact@gmail.com</a>
            </li>
          </ul>
        </Section>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-[13px] text-[#D9C7AE]">
        <p>&copy; {new Date().getFullYear()} VillageCrunch. All rights reserved.</p>
        <p>UPI · Cards · COD</p>
      </div>
    </div>
  </footer>
);

export default Footer;

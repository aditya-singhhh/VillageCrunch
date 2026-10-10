import { Link } from 'react-router-dom';

/** Text wordmark (no raster) */
const Logo = ({ className = '', size = 'text-[22px]', light = false }) => (
  <Link
    to="/"
    aria-label="VillageCrunch home"
    className={`inline-flex items-center font-display font-bold leading-none tracking-tight ${size} ${className}`}
  >
    <span className={light ? 'text-cream' : 'text-brand'}>Village</span>
    <span className={light ? 'text-[#F4A26B]' : 'text-action'}>Crunch</span>
  </Link>
);

export default Logo;

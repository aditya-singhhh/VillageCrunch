import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
  const { pathname, state } = useLocation();

  useEffect(() => {
    // Scroll to top instantly when route changes (not when switching pack/type on a product page)
    if (state?.keepScroll) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
};

export default ScrollToTop;
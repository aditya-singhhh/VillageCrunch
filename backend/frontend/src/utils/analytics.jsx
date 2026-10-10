import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Google Analytics Configuration
// Use import.meta.env for Vite instead of process.env
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
const FACEBOOK_PIXEL_ID = import.meta.env.VITE_FACEBOOK_PIXEL_ID || 'YOUR_PIXEL_ID';

// Google Analytics Helper Functions
export const gtag = (...args) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...args);
  }
};

export const pageview = (url, title) => {
  gtag('config', GA_MEASUREMENT_ID, {
    page_title: title,
    page_location: url,
  });
};

export const event = (action, { event_category, event_label, value }) => {
  gtag('event', action, {
    event_category,
    event_label,
    value,
  });
};

// Facebook Pixel Helper Functions
export const fbPixel = (eventType, data = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventType, data);
  }
};

// E-commerce tracking events
export const trackPurchase = (purchaseData) => {
  // Google Analytics Enhanced E-commerce
  gtag('event', 'purchase', {
    transaction_id: purchaseData.orderId,
    value: purchaseData.value,
    currency: 'INR',
    items: purchaseData.items.map(item => ({
      item_id: item.productId,
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
    }))
  });

  // Facebook Pixel Purchase
  fbPixel('Purchase', {
    value: purchaseData.value,
    currency: 'INR',
    content_ids: purchaseData.items.map(item => item.productId),
    content_type: 'product',
    num_items: purchaseData.items.length
  });
};

export const trackAddToCart = (productData) => {
  // Google Analytics
  gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: productData.price * productData.quantity,
    items: [{
      item_id: productData.productId,
      item_name: productData.name,
      category: productData.category,
      quantity: productData.quantity,
      price: productData.price,
    }]
  });

  // Facebook Pixel
  fbPixel('AddToCart', {
    value: productData.price * productData.quantity,
    currency: 'INR',
    content_ids: [productData.productId],
    content_name: productData.name,
    content_category: productData.category,
    content_type: 'product'
  });
};

export const trackViewItem = (productData) => {
  // Google Analytics
  gtag('event', 'view_item', {
    currency: 'INR',
    value: productData.price,
    items: [{
      item_id: productData.productId,
      item_name: productData.name,
      category: productData.category,
      price: productData.price,
    }]
  });

  // Facebook Pixel
  fbPixel('ViewContent', {
    value: productData.price,
    currency: 'INR',
    content_ids: [productData.productId],
    content_name: productData.name,
    content_category: productData.category,
    content_type: 'product'
  });
};

export const trackSearch = (searchTerm, results) => {
  // Google Analytics
  gtag('event', 'search', {
    search_term: searchTerm,
    number_of_results: results
  });

  // Facebook Pixel
  fbPixel('Search', {
    search_string: searchTerm,
    content_category: 'product'
  });
};

export const trackBeginCheckout = (checkoutData) => {
  // Google Analytics
  gtag('event', 'begin_checkout', {
    currency: 'INR',
    value: checkoutData.value,
    items: checkoutData.items.map(item => ({
      item_id: item.productId,
      item_name: item.name,
      category: item.category,
      quantity: item.quantity,
      price: item.price,
    }))
  });

  // Facebook Pixel
  fbPixel('InitiateCheckout', {
    value: checkoutData.value,
    currency: 'INR',
    content_ids: checkoutData.items.map(item => item.productId),
    content_category: 'product',
    num_items: checkoutData.items.length
  });
};

// Hook for tracking page views
export const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const url = `${window.location.origin}${location.pathname}${location.search}`;
    const title = document.title;
    
    // Track page view
    pageview(url, title);
    
    // Facebook Pixel page view
    fbPixel('PageView');
    
  }, [location]);
};

// Component to load analytics scripts
const AnalyticsSetup = () => {
  useEffect(() => {
    // Load Google Analytics
    if (GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX') {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GA_MEASUREMENT_ID}', {
          page_title: document.title,
          page_location: window.location.href,
          send_page_view: true
        });
      `;
      document.head.appendChild(script2);
    }

    // Load Facebook Pixel only if it is not already present in the HTML head
    if (!window.fbq && FACEBOOK_PIXEL_ID && FACEBOOK_PIXEL_ID !== 'YOUR_PIXEL_ID') {
      const script3 = document.createElement('script');
      script3.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${FACEBOOK_PIXEL_ID}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script3);

      // Add noscript fallback
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = '1';
      img.width = '1';
      img.style.display = 'none';
      img.src = `https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    }

  }, []);

  return null;
};

export default AnalyticsSetup;

// HOC to wrap components with analytics
export const withAnalytics = (Component) => {
  return (props) => {
    usePageTracking();
    return <Component {...props} />;
  };
};

// Setup instructions for implementation:
// 1. Create environment variables:
//    - REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX
//    - REACT_APP_FACEBOOK_PIXEL_ID=123456789
//
// 2. Add AnalyticsSetup to your App.jsx:
//    import AnalyticsSetup from './utils/analytics';
//
// 3. Use tracking functions in components:
//    import { trackAddToCart, trackViewItem } from './utils/analytics';
//
// 4. For Google Search Console:
//    - Add meta tag to index.html
//    - Submit sitemap.xml to Search Console: https://villagecrunch.me/sitemap.xml
//
// 5. Additional SEO Tools to consider:
//    - Microsoft Clarity for user behavior analytics
//    - Hotjar for heatmaps and recordings
//    - GTM (Google Tag Manager) for easier tag management
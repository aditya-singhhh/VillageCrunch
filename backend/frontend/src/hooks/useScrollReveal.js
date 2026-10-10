import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for scroll-based reveal animations
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1)
 * @param {string} options.rootMargin - Root margin for intersection observer
 * @returns {Object} - Ref and visibility state
 */
export const useScrollReveal = (options = {}) => {
  const { threshold = 0.1, rootMargin = '0px' } = options;
  const ref = useRef(null);
  const unsupported = typeof window === 'undefined' || !('IntersectionObserver' in window) ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Content must never stay hidden: default to visible when we cannot observe.
  const [isVisible, setIsVisible] = useState(unsupported);

  useEffect(() => {
    const element = ref.current;
    if (!element || unsupported) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Once visible, stop observing
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin]);

  return { ref, isVisible };
};

/**
 * Custom hook for lazy loading images
 * @returns {Object} - Image ref, loaded state, and error state
 */
export const useLazyImage = () => {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const imgElement = entry.target;
          const src = imgElement.dataset.src;
          
          if (src) {
            imgElement.src = src;
            imgElement.onload = () => setLoaded(true);
            imgElement.onerror = () => setError(true);
          }
          
          observer.unobserve(imgElement);
        }
      },
      { threshold: 0.01, rootMargin: '50px' }
    );

    observer.observe(img);

    return () => {
      if (img) {
        observer.unobserve(img);
      }
    };
  }, []);

  return { imgRef, loaded, error };
};

/**
 * Custom hook for smooth scroll to element
 * @returns {Function} - Scroll to element function
 */
export const useSmoothScroll = () => {
  const scrollToElement = (elementId, offset = 0) => {
    const element = document.getElementById(elementId);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return scrollToElement;
};

/**
 * Custom hook to track scroll progress
 * @returns {number} - Scroll progress (0-100)
 */
export const useScrollProgress = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const progress = (scrollTop / scrollHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress(); // Initial calculation

    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return scrollProgress;
};

export default useScrollReveal;

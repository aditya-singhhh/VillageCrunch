import { useEffect, useRef } from 'react';

// Shared scroll-lock counter so stacked/overlapping overlays never leave the page locked
let locks = 0;
let savedOverflow = '';
const lockScroll = () => {
  if (locks === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  locks += 1;
};
const unlockScroll = () => {
  locks = Math.max(0, locks - 1);
  if (locks === 0) document.body.style.overflow = savedOverflow;
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Behaviour shared by every drawer / sheet: scroll lock, Escape to close,
 * focus trap, and focus return to the element that opened it.
 * Attach the returned ref to the dialog panel.
 */
export default function useOverlay(open, onClose) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    lockScroll();
    const panel = panelRef.current;
    const focusables = () => (panel ? [...panel.querySelectorAll(FOCUSABLE)] : []);
    (focusables()[0] || panel)?.focus?.();
    const onKey = (e) => {
      if (e.key === 'Escape') { closeRef.current?.(); return; }
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      if (opener && document.contains(opener)) opener.focus?.();
    };
  }, [open]);

  return panelRef;
}

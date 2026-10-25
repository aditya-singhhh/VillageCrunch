import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { imgSrc } from '../utils/img';
import useOverlay from '../hooks/useOverlay';

/** Full-screen photo viewer: swipe between photos, pinch to zoom (native). */
const ImageLightbox = ({ images, start = 0, alt = '', onClose }) => {
  const ref = useOverlay(true, onClose);
  const track = useRef(null);
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = el.clientWidth * start;
  }, [start]);

  return createPortal(
    <div className="fixed inset-0 z-[90] bg-black/95 animate-fade-in" role="dialog" aria-modal="true" aria-label="Photos" ref={ref} tabIndex={-1}>
      <button onClick={onClose} className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white/15 text-white inline-flex items-center justify-center" aria-label="Close photos">
        <X className="w-6 h-6" />
      </button>
      <div ref={track} className="h-full w-full flex overflow-x-auto snap-x snap-mandatory scrollbar-none">
        {images.map((src, i) => (
          <div key={src + i} className="flex-none w-full h-full snap-center flex items-center justify-center p-2">
            <img src={imgSrc(src, 1200)} alt={`${alt} – photo ${i + 1}`} className="max-w-full max-h-full object-contain select-none" style={{ touchAction: 'pinch-zoom' }} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <p className="absolute bottom-4 inset-x-0 text-center text-sm text-white/70">Swipe for more photos · pinch to zoom</p>
      )}
    </div>,
    document.body
  );
};

export default ImageLightbox;

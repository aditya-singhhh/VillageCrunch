import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useOverlay from '../hooks/useOverlay';
import FilterPanel from './FilterPanel';

/** Mobile "Filter & Sort" bottom sheet (portal, so no ancestor can clip it). */
const FilterSheet = ({ open, onClose, onClear, resultCount, activeCount, ...panelProps }) => {
  const ref = useOverlay(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="lg:hidden fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink/50 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Filter and sort"
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] bg-white rounded-t-lg shadow-raised flex flex-col animate-sheet-up outline-none"
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-line flex-shrink-0">
          <h2 className="font-display font-semibold text-lg">Filter &amp; sort</h2>
          <button onClick={onClose} className="icon-btn -mr-2" aria-label="Close filters"><X className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4">
          <FilterPanel {...panelProps} />
        </div>
        <div className="flex gap-3 p-4 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-line flex-shrink-0">
          <button onClick={onClear} disabled={!activeCount} className="btn-secondary flex-1">Clear all</button>
          <button onClick={onClose} className="btn-primary flex-[2]">Show {resultCount} item{resultCount === 1 ? '' : 's'}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default FilterSheet;

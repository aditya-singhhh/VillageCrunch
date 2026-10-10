import { formatCategory, formatINR } from '../utils/format';

export const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'discount', label: 'Biggest discount' },
];

export const PRICE_PRESETS = [
  { label: 'Under ₹250', min: '', max: '249' },
  { label: '₹250 to ₹500', min: '250', max: '500' },
  { label: '₹500 to ₹750', min: '500', max: '750' },
  { label: 'Above ₹750', min: '751', max: '' },
];

const Group = ({ title, children }) => (
  <fieldset className="py-4 border-b border-line last:border-0">
    <legend className="font-semibold text-[15px] text-ink mb-2 float-left w-full">{title}</legend>
    <div className="clear-both">{children}</div>
  </fieldset>
);

const check = 'flex items-center gap-3 min-h-[44px] md:min-h-[36px] cursor-pointer text-[15px] text-ink';

/**
 * Filter controls shared by the desktop sidebar and the mobile bottom sheet.
 * `filters` = { categories: string[], min, max, sort, stock }, all driven from the URL.
 */
const FilterPanel = ({ filters, onChange, categories, counts, showSort = true }) => {
  const toggleCat = (c) => {
    const set = new Set(filters.categories);
    set.has(c) ? set.delete(c) : set.add(c);
    onChange({ categories: [...set] });
  };
  const presetActive = (p) => filters.min === p.min && filters.max === p.max;

  return (
    <div>
      {showSort && (
        <Group title="Sort by">
          <label htmlFor="filter-sort" className="sr-only">Sort by</label>
          <select id="filter-sort" value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })} className="input-field h-11 text-[15px]">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Group>
      )}

      <Group title="Category">
        {categories.map((c) => (
          <label key={c} className={check}>
            <input type="checkbox" className="w-5 h-5" checked={filters.categories.includes(c)} onChange={() => toggleCat(c)} />
            <span className="flex-1">{formatCategory(c)}</span>
            <span className="text-sm text-ink-mute tabular-nums">{counts[c] || 0}</span>
          </label>
        ))}
      </Group>

      <Group title="Price">
        {PRICE_PRESETS.map((p) => (
          <label key={p.label} className={check}>
            <input
              type="radio"
              name="price-preset"
              className="w-5 h-5"
              checked={presetActive(p)}
              onChange={() => onChange({ min: p.min, max: p.max })}
            />
            {p.label}
          </label>
        ))}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1">
            <label htmlFor="price-min" className="sr-only">Minimum price</label>
            <input id="price-min" type="number" inputMode="numeric" min="0" placeholder="Min ₹" value={filters.min}
              onChange={(e) => onChange({ min: e.target.value })} className="input-field h-11 px-3 text-[15px]" />
          </div>
          <span className="text-ink-mute" aria-hidden="true">to</span>
          <div className="flex-1">
            <label htmlFor="price-max" className="sr-only">Maximum price</label>
            <input id="price-max" type="number" inputMode="numeric" min="0" placeholder="Max ₹" value={filters.max}
              onChange={(e) => onChange({ max: e.target.value })} className="input-field h-11 px-3 text-[15px]" />
          </div>
        </div>
      </Group>

      <Group title="Availability">
        <label className={check}>
          <input type="checkbox" className="w-5 h-5" checked={filters.stock} onChange={(e) => onChange({ stock: e.target.checked })} />
          In stock only
        </label>
      </Group>
    </div>
  );
};

export const describePrice = (min, max) => {
  if (min && max) return `${formatINR(min)} to ${formatINR(max)}`;
  if (min) return `Above ${formatINR(min)}`;
  if (max) return `Under ${formatINR(max)}`;
  return '';
};

export default FilterPanel;

import { useEffect, useState } from 'react';
import { Tag, CheckCircle } from 'lucide-react';
import { getOffers } from '../utils/autoPromo';
import { formatINR } from '../utils/format';

/**
 * "Offers for you" list in the cart: every public offer with what it saves on this cart.
 * Eligible ones get an Apply button; others say why (add ₹X more / already used).
 */
const AvailableOffers = ({ cartItems, userId, appliedCode, onApply, onRemove, busy }) => {
  const [offers, setOffers] = useState([]);
  const key = cartItems.map((i) => `${i._id}:${i.quantity}`).join(',');

  useEffect(() => {
    let live = true;
    getOffers(cartItems, userId).then((o) => { if (live) setOffers(o); }).catch(() => {});
    return () => { live = false; };
  }, [key, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = offers.filter((o) => !o.used);
  if (!shown.length) return null;

  return (
    <div className="mb-4">
      <p className="text-sm font-semibold text-ink mb-2">Offers for you</p>
      <ul className="space-y-2">
        {shown.map((o) => {
          const applied = appliedCode === o.code;
          return (
            <li
              key={o.code}
              className={`flex items-center gap-3 rounded-md border px-3 py-2 ${applied ? 'border-leaf bg-leaf-tint' : 'border-line bg-white'}`}
            >
              <Tag className={`w-4 h-4 flex-shrink-0 ${applied ? 'text-leaf' : 'text-brand'}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold text-sm tracking-wide">{o.code}</p>
                <p className="text-sm text-ink-soft">{o.description}</p>
                {o.valid && o.discount > 0 && (
                  <p className="text-sm font-semibold text-leaf">You save {formatINR(o.discount)}</p>
                )}
                {!o.valid && o.amountNeeded > 0 && (
                  <p className="text-xs text-ink-mute">Add {formatINR(o.amountNeeded)} more to use this</p>
                )}
              </div>
              {applied ? (
                <span className="flex flex-col items-end gap-0.5 flex-shrink-0">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-leaf">
                    <CheckCircle className="w-4 h-4" aria-hidden="true" /> Applied
                  </span>
                  {onRemove && (
                    <button type="button" onClick={onRemove} className="text-xs text-ink-soft underline min-h-[32px] px-1" aria-label={`Remove ${o.code}`}>
                      Remove
                    </button>
                  )}
                </span>
              ) : o.valid ? (
                <button
                  type="button"
                  onClick={() => onApply(o.code)}
                  disabled={busy}
                  className="btn-secondary btn-sm flex-shrink-0"
                >
                  Apply
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AvailableOffers;

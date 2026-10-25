import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { imgProps } from '../utils/img';

const STEPS = [
  ['Gud wala atta', 'Whole wheat atta, jaggery, coconut, saunf and elaichi. No maida, no refined sugar.'],
  ['Pressed in a wooden sancha', 'Each piece is pressed by hand in a wooden mould, the way it is made for Chhath at home.'],
  ['Fried in desi ghee after you order', 'We make your batch only after the order comes in, then pack and ship it in 1–2 days.'],
];

const FAQ = [
  ['When will it ship?', 'We fry your thekua fresh after the order comes in and dispatch it in 1–2 days. Delivery time after that depends on your city.'],
  ['What is in it?', 'Whole wheat atta, jaggery (gur), desi ghee, suji, dry coconut, saunf and elaichi. Contains wheat and milk. No preservatives.'],
  ['How should I store it?', 'Keep it in an airtight container in a cool, dry place, away from sunlight. Close the pack well after opening.'],
  ['How do I pay?', 'UPI, cards or net banking (secure, by Razorpay), or cash on delivery.'],
  ['What if something is wrong with my order?', <>Message us and we will sort it out. See our <Link to="/returns-policy" className="text-action underline underline-offset-2">returns policy</Link>.</>],
];

/** "How it's made" + FAQ for thekua product pages. */
const ThekuaStory = () => (
  <section className="mt-10 md:mt-14" aria-labelledby="made-title">
    <h2 id="made-title" className="section-title !mb-4">How your thekua is made</h2>
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5 md:gap-8 items-start">
      <div className="grid grid-cols-2 gap-3">
        <img {...imgProps('/packaging/real-thekua-mould.jpg', '(min-width: 768px) 25vw, 50vw')} alt="Thekua dough pressed in a wooden sancha" width="600" height="600" loading="lazy" decoding="async" className="w-full aspect-square object-cover rounded-lg" />
        <img {...imgProps('/packaging/real-thekua-basket.jpg', '(min-width: 768px) 25vw, 50vw')} alt="Freshly fried thekua in a basket" width="600" height="600" loading="lazy" decoding="async" className="w-full aspect-square object-cover rounded-lg" />
      </div>
      <ol className="space-y-4">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="w-8 h-8 rounded-full bg-action text-white font-semibold inline-flex items-center justify-center flex-shrink-0">{i + 1}</span>
            <span>
              <span className="block font-semibold text-ink">{t}</span>
              <span className="block text-ink-soft text-[15px]">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>

    <h2 className="section-title !mt-10 !mb-2">Questions</h2>
    <div className="divide-y divide-line border-y border-line">
      {FAQ.map(([q, a]) => (
        <details key={q} className="group">
          <summary className="flex items-center justify-between min-h-[52px] cursor-pointer list-none font-semibold text-ink [&::-webkit-details-marker]:hidden">
            {q} <ChevronDown className="w-5 h-5 transition-transform group-open:rotate-180 flex-shrink-0" aria-hidden="true" />
          </summary>
          <p className="pb-4 text-ink-soft">{a}</p>
        </details>
      ))}
    </div>
  </section>
);

export default ThekuaStory;

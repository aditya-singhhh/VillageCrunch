import { Link } from 'react-router-dom';
import SEOHead from './SEOHead';

export const BUSINESS = {
  name: 'VillageCrunch',
  address: 'Tetarabad, Chandpura, Sadar, Khagaria, Bihar 851204, India',
  email: 'villagecrunchcontact@gmail.com',
  phone: '+91 62030 09518',
  fssai: '21225010005205',
};

/** Plain, readable policy page: title, last-updated date and numbered sections. */
const LegalPage = ({ title, path, updated, intro, sections }) => (
  <div className="bg-paper py-10 md:py-14">
    <SEOHead title={`${title} | VillageCrunch`} description={intro} url={path} />
    <article className="max-w-3xl mx-auto px-4">
      <h1 className="page-title">{title}</h1>
      <p className="mt-1 text-sm text-ink-mute">Last updated: {updated}</p>
      <p className="mt-5 text-ink-soft leading-relaxed">{intro}</p>
      {sections.map(([h, body], i) => (
        <section key={h} className="mt-8">
          <h2 className="font-display text-xl font-semibold text-ink">{i + 1}. {h}</h2>
          <div className="mt-2 space-y-3 text-ink-soft leading-relaxed">{body}</div>
        </section>
      ))}
      <section className="mt-10 rounded-lg bg-white border border-line p-5 text-[15px] text-ink-soft">
        <p className="font-semibold text-ink">{BUSINESS.name}</p>
        <p>{BUSINESS.address}</p>
        <p>Email: <a className="text-action underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> · Phone: <a className="text-action underline" href="tel:+916203009518">{BUSINESS.phone}</a></p>
        <p>FSSAI Lic. No. {BUSINESS.fssai}</p>
        <p className="mt-2">See also: <Link className="text-action underline" to="/terms">Terms</Link> · <Link className="text-action underline" to="/privacy">Privacy</Link> · <Link className="text-action underline" to="/returns-policy">Cancellation & refunds</Link> · <Link className="text-action underline" to="/shipping-policy">Shipping</Link></p>
      </section>
    </article>
  </div>
);

export default LegalPage;

import { Link } from 'react-router-dom';
import LegalPage, { BUSINESS } from '../components/LegalPage';

const ReturnsPolicy = () => (
  <LegalPage
    title="Cancellation & Refunds Policy"
    path="/returns-policy"
    updated="13 November 2026"
    intro={`Our thekua is food made fresh for your order, so we can't take back opened packs. But if anything is wrong with what reaches you, we will make it right: a fresh pack or a full refund, your choice.`}
    sections={[
      ['Cancelling an order', <>
        <p>You can cancel <b>free of charge before your order is shipped</b>. Message or call us at {BUSINESS.phone} or email {BUSINESS.email} with your order number. If you paid online, we refund the full amount.</p>
        <p>Once an order has been shipped it can't be cancelled. Refusing a shipped parcel is treated as a failed delivery (see our <Link className="text-action underline" to="/shipping-policy">Shipping policy</Link>).</p>
      </>],
      ['If something is wrong: our 7-day guarantee', <>
        <p>Tell us within <b>7 days of delivery</b> if your order:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>arrived damaged, crushed or with many broken pieces,</li>
          <li>has a wrong or missing item,</li>
          <li>has a quality problem, such as tasting stale or off, or being past its best-before date.</li>
        </ul>
        <p>Send a photo (or short video) of the pack and the product, with your order number, on WhatsApp {BUSINESS.phone} or email {BUSINESS.email}. We will <b>send a fresh pack or refund you in full</b>, whichever you prefer. You don't need to send the product back.</p>
      </>],
      ['What we can\'t refund', <>
        <ul className="list-disc pl-5 space-y-1">
          <li>Opened or partly eaten packs because of personal taste preference, since this is food made to order.</li>
          <li>Small cracks in a few pieces, which can happen with a hard, handmade sweet.</li>
          <li>Claims made more than 7 days after delivery.</li>
          <li>Delays caused by the courier, festivals or weather, when the product itself is fine.</li>
        </ul>
      </>],
      ['How refunds are paid', <>
        <p>Online payments are refunded to the <b>same UPI, card or bank account</b> through Razorpay. We start the refund within 2 working days of approving it; the bank usually credits it in 5–7 working days.</p>
        <p>For cash-on-delivery orders, we refund by UPI or bank transfer to details you share with us.</p>
        <p>Delivery charges and the cash-on-delivery charge are refunded too when the problem was our fault (damaged, wrong, missing or quality issue).</p>
      </>],
      ['Promo codes', <p key="pc">If an order placed with a promo code is cancelled or refunded, we refund the amount you actually paid. A one-time code used on that order may not be reusable.</p>],
      ['Contact', <p key="c">WhatsApp/phone {BUSINESS.phone} · Email {BUSINESS.email}. We reply within 1 working day.</p>],
    ]}
  />
);

export default ReturnsPolicy;

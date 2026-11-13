import { Link } from 'react-router-dom';
import LegalPage, { BUSINESS } from '../components/LegalPage';

const ShippingPolicy = () => (
  <LegalPage
    title="Shipping Policy"
    path="/shipping-policy"
    updated="13 November 2026"
    intro={`${BUSINESS.name} makes thekua fresh in small batches in Munger, Bihar and ships across India through Delhivery. This page explains when your order leaves us, how long delivery takes and what it costs.`}
    sections={[
      ['Made fresh, then shipped', <>
        <p>Thekua is made in small batches after you order, cooled fully and packed in sealed pouches. Most orders are dispatched within <b>1–3 working days</b> of being placed.</p>
        <p>We do not cook on major festival days (for example during Chhath Puja). Orders placed then are made in the first batch after the festival, and we will tell you the dispatch date on WhatsApp or phone.</p>
      </>],
      ['Courier and delivery time', <>
        <p>All orders are shipped from Munger, Bihar by <b>Delhivery</b>. Delivery time depends on your PIN code. As a guide, after dispatch:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Bihar, Jharkhand: about 2–4 days</li>
          <li>Kolkata and eastern India: about 4–6 days</li>
          <li>Delhi NCR and northern India: about 5–7 days</li>
          <li>Mumbai, Pune, Hyderabad, Bangalore and southern/western India: about 7–10 days</li>
        </ul>
        <p>Enter your PIN code on any product page to see the expected delivery dates from Delhivery for your address. These are estimates; weather, holidays or courier delays can add a day or two.</p>
      </>],
      ['Where we deliver', <p key="w">We deliver to PIN codes that Delhivery serves across India. If your PIN code is not served, the product page will tell you before you order. We do not ship outside India at the moment.</p>],
      ['Delivery charges', <>
        <p><b>Your first order ships free.</b> For other orders, any delivery charge is shown clearly at checkout before you pay.</p>
        <p>Cash on delivery (where available) has an extra <b>₹49</b> handling charge, shown at checkout. Paying online avoids it.</p>
      </>],
      ['Tracking your order', <p key="t">Once your order is shipped we send the tracking number on WhatsApp/SMS. You can also see the status any time under <Link className="text-action underline" to="/orders">My orders</Link>.</p>],
      ['Address and delivery attempts', <>
        <p>Please give a complete address with landmark and a phone number that is reachable. Delhivery will call before delivering.</p>
        <p>If delivery fails because the address is wrong, nobody is available after the courier's attempts, or a cash-on-delivery parcel is refused, the parcel comes back to us. For prepaid orders we can re-ship (the extra shipping is charged) or refund the order amount minus the shipping cost both ways. We may not offer cash on delivery on future orders after a refused parcel.</p>
      </>],
      ['Packaging', <p key="p">Each pack is sealed in a food-grade pouch and shipped in a carton to protect it on the way. Thekua is a hard, dry sweet and travels well, but a few pieces can crack in transit. If your pack arrives damaged, see our <Link className="text-action underline" to="/returns-policy">Cancellation & refunds policy</Link>.</p>],
      ['Questions', <p key="q">For anything about your delivery, contact us at {BUSINESS.email} or {BUSINESS.phone} (WhatsApp works too). We reply within 1 working day.</p>],
    ]}
  />
);

export default ShippingPolicy;

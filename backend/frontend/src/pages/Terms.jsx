import { Link } from 'react-router-dom';
import LegalPage, { BUSINESS } from '../components/LegalPage';

const Terms = () => (
  <LegalPage
    title="Terms & Conditions"
    path="/terms"
    updated="23 October 2026"
    intro={`These terms apply when you use villagecrunch.in or buy from ${BUSINESS.name}. By placing an order you agree to them.`}
    sections={[
      ['Who we are', <p key="a">{BUSINESS.name} makes and sells traditional Bihari food products such as thekua, makhana and sattu, from {BUSINESS.address}.</p>],
      ['Products and prices', <>
        <p>All prices are in Indian Rupees (₹) and are the final price for the product. Delivery charges, if any, are shown at checkout before you pay.</p>
        <p>Product photos are for illustration. Because our food is handmade, colour, shape and size can vary slightly from piece to piece.</p>
      </>],
      ['Orders', <>
        <p>You need an account (mobile number with OTP, or email and password) to place an order. An order is confirmed once we send you an order number on the site.</p>
        <p>We may cancel an order if a product is unavailable, the address is outside our delivery area, or we suspect misuse. If you have already paid, we refund the full amount to the original payment method.</p>
      </>],
      ['Payment', <p key="p">Online payments are processed securely by Razorpay (UPI, cards, net banking, wallets). We never see or store your card or UPI PIN. Cash on delivery may be offered on some orders.</p>],
      ['Made fresh and delivery', <p key="d">Thekua and gift boxes are made fresh after you order and are usually dispatched within 1–2 days. Delivery times depend on your location. See our <Link className="text-action underline" to="/shipping-policy">Shipping policy</Link>.</p>],
      ['Cancellations, returns and refunds', <p key="r">Please see our <Link className="text-action underline" to="/returns-policy">Cancellation & refunds policy</Link> for when you can cancel, return or get a refund, and how long refunds take.</p>],
      ['Offers and promo codes', <p key="o">Promo codes such as FIRST have their own conditions (minimum order, one use per customer, end date) shown with the offer. We may change or end an offer at any time; orders already placed keep the price shown at checkout.</p>],
      ['Food safety and allergens', <p key="f">Our thekua contains wheat and milk (desi ghee). Please read the ingredients and allergen information on the product page and pack before eating. Store in a cool, dry place and eat before the best-before date.</p>],
      ['Your account', <p key="c">Keep your login private. You are responsible for orders placed from your account. Tell us at {BUSINESS.email} if you think someone else has used it.</p>],
      ['Liability', <p key="l">Our responsibility for any order is limited to the amount you paid for it, except where the law says otherwise.</p>],
      ['Changes and governing law', <p key="g">We may update these terms; the version on this page applies to new orders. These terms are governed by the laws of India, and courts at Khagaria, Bihar have jurisdiction.</p>],
      ['Contact', <p key="ct">Questions or complaints: {BUSINESS.email} or {BUSINESS.phone}. We reply within 2 working days.</p>],
    ]}
  />
);

export default Terms;

import LegalPage, { BUSINESS } from '../components/LegalPage';

const Privacy = () => (
  <LegalPage
    title="Privacy Policy"
    path="/privacy"
    updated="23 October 2026"
    intro={`This policy explains what personal information ${BUSINESS.name} collects on villagecrunch.in, why, and the choices you have.`}
    sections={[
      ['What we collect', <>
        <p><strong>Account:</strong> your name, mobile number and, if you add it, your email address.</p>
        <p><strong>Orders:</strong> delivery address, items ordered, gift messages and payment status. Payments are handled by Razorpay; we do not receive or store card numbers, UPI PINs or bank passwords.</p>
        <p><strong>Usage:</strong> pages visited and items added to cart, through cookies and similar tools (including the Meta Pixel), so we can measure our ads and improve the site.</p>
      </>],
      ['How we use it', <p key="u">To create your account and log you in (including sending an OTP by SMS through Google Firebase), process and deliver orders, send order updates, answer your questions, prevent fraud, and understand which products and ads work.</p>],
      ['Who we share it with', <p key="s">Only with services that help us run the shop: Razorpay (payments), our courier partners (name, phone and address for delivery), Google Firebase / Google Cloud (hosting, login and storage) and Meta (ad measurement). We do not sell your personal information.</p>],
      ['How long we keep it', <p key="k">Order records are kept as long as the law requires for accounts and tax. You can ask us to delete your account at any time; we will remove what we are not required to keep.</p>],
      ['Your choices', <p key="c">You can see and edit your details on your profile page, ask for a copy of your data, or ask us to delete it, by writing to {BUSINESS.email}. You can block or clear cookies in your browser settings.</p>],
      ['Security', <p key="sec">The site uses HTTPS. Passwords are stored only in hashed form, and access to order data is limited to people who need it to fulfil your order.</p>],
      ['Children', <p key="ch">Our site is meant for adults. We do not knowingly collect information from children under 18.</p>],
      ['Changes', <p key="chg">We will post any changes to this policy on this page with a new date.</p>],
      ['Contact / grievance officer', <p key="g">For privacy questions or complaints, write to {BUSINESS.email} or call {BUSINESS.phone}. We respond within 2 working days.</p>],
    ]}
  />
);

export default Privacy;

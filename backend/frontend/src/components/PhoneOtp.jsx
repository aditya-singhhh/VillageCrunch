import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// Firebase is loaded only when someone actually uses OTP, so other pages stay light.
let firebaseAuth = null;
const getFirebaseAuth = async () => {
  if (firebaseAuth) return firebaseAuth;
  const [{ initializeApp, getApps }, authMod] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  // Firebase Hosting serves this project's public web config at a reserved URL.
  const config = await fetch('/__/firebase/init.json').then((r) => {
    if (!r.ok) throw new Error('config');
    return r.json();
  });
  const app = getApps()[0] || initializeApp(config);
  const auth = authMod.getAuth(app);
  auth.languageCode = 'en';
  firebaseAuth = { auth, ...authMod };
  return firebaseAuth;
};

const friendly = (err) => {
  const code = err?.code || '';
  if (code.includes('invalid-verification-code')) return 'That code is not right. Please check and try again.';
  if (code.includes('code-expired')) return 'The code has expired. Please send a new one.';
  if (code.includes('too-many-requests')) return 'Too many tries. Please wait a few minutes and try again.';
  if (code.includes('invalid-phone-number')) return 'Please enter a valid 10-digit mobile number.';
  if (code.includes('operation-not-allowed')) return 'OTP is temporarily unavailable. Please log in with email & password for now.';
  if (code.includes('quota-exceeded')) return 'We could not send an SMS right now. Please use password login for now.';
  return err?.response?.data?.message || 'Something went wrong. Please try again.';
};

/**
 * Phone number -> 6-digit SMS code -> logged in.
 * New customers are asked for their name once, then their account is created.
 */
const PhoneOtp = ({ onDone, cta = 'Continue' }) => {
  const { loginWithPhone } = useAuth();
  const { syncCartOnLogin } = useCart();
  const [step, setStep] = useState('phone'); // phone | code | name
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const confirmation = useRef(null);
  const idToken = useRef(null);
  const verifier = useRef(null);
  const codeInput = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => () => { try { verifier.current?.clear(); } catch (_) { /* ignore */ } }, []);

  const sendCode = async () => {
    const ten = phone.replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(ten)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    setBusy(true);
    try {
      const fb = await getFirebaseAuth();
      if (!verifier.current) {
        verifier.current = new fb.RecaptchaVerifier(fb.auth, 'otp-recaptcha', { size: 'invisible' });
      }
      confirmation.current = await fb.signInWithPhoneNumber(fb.auth, `+91${ten}`, verifier.current);
      setStep('code');
      setCode('');
      setResendIn(30);
      toast.success(`Code sent to +91 ${ten}`);
      setTimeout(() => codeInput.current?.focus(), 50);
    } catch (err) {
      console.error('OTP send failed', err);
      try { verifier.current?.clear(); } catch (_) { /* ignore */ }
      verifier.current = null;
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const finish = async (withName) => {
    const result = await loginWithPhone(idToken.current, withName);
    if (result.needName) {
      setStep('name');
      return;
    }
    if (result.localCart?.length) await syncCartOnLogin(result.localCart);
    toast.success(result.isNew ? 'Welcome to VillageCrunch!' : 'Logged in');
    onDone?.();
  };

  const verifyCode = async (e) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      toast.error('Please enter the 6-digit code');
      return;
    }
    setBusy(true);
    try {
      const cred = await confirmation.current.confirm(code);
      idToken.current = await cred.user.getIdToken();
      await finish();
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast.error('Please enter your name');
      return;
    }
    setBusy(true);
    try {
      await finish(name.trim());
    } catch (err) {
      toast.error(friendly(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {step === 'phone' && (
        <form onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-4">
          <div>
            <label htmlFor="otp-phone" className="field-label">Mobile number</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-line bg-paper text-ink-soft">+91</span>
              <input
                id="otp-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-field !rounded-l-none"
                placeholder="10-digit mobile number"
                required
              />
            </div>
            <p className="field-help">We'll send you a 6-digit code by SMS. No password needed.</p>
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full">
            {busy ? 'Sending code...' : 'Send OTP'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label htmlFor="otp-code" className="field-label">Enter the code sent to +91 {phone}</label>
            <input
              id="otp-code"
              ref={codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input-field text-center text-2xl tracking-[0.5em] tabular-nums"
              placeholder="------"
              required
            />
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full">
            {busy ? 'Checking...' : cta}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="btn-ghost h-11 px-0" onClick={() => { setStep('phone'); setCode(''); }}>
              Change number
            </button>
            <button type="button" className="btn-ghost h-11 px-0" disabled={resendIn > 0 || busy} onClick={sendCode}>
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}

      {step === 'name' && (
        <form onSubmit={saveName} className="space-y-4">
          <div>
            <label htmlFor="otp-name" className="field-label">Your name</label>
            <input
              id="otp-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Full name"
              required
              autoFocus
            />
            <p className="field-help">Number verified. Just your name and you're in.</p>
          </div>
          <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary w-full">
            {busy ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      )}

      <div id="otp-recaptcha" />
    </div>
  );
};

export default PhoneOtp;

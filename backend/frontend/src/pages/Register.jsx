import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { AuthShell, PasswordInput } from '../components/AuthShell';

const Register = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const { syncCartOnLogin } = useCart();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      
      // Sync cart if user had items in local storage
      if (result.localCart && result.localCart.length > 0) {
        await syncCartOnLogin(result.localCart);
      }
      
      toast.success('Account created successfully!');
      navigate(redirect);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Join us for premium Indian delights">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reg-name" className="field-label">Full name</label>
          <input id="reg-name" type="text" name="name" value={formData.name} onChange={handleChange} required
            autoComplete="name" className="input-field" placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="reg-phone" className="field-label">Phone number</label>
          <input id="reg-phone" type="tel" inputMode="numeric" name="phone" value={formData.phone} onChange={handleChange} required
            autoComplete="tel-national" className="input-field" placeholder="10-digit mobile number" />
        </div>
        <div>
          <label htmlFor="reg-email" className="field-label">Email address</label>
          <input id="reg-email" type="email" name="email" value={formData.email} onChange={handleChange} required
            autoComplete="email" autoCapitalize="none" className="input-field" placeholder="you@example.com" />
        </div>
        <PasswordInput
          id="reg-password" label="Password" name="password" value={formData.password} onChange={handleChange}
          autoComplete="new-password" minLength={6} help="At least 6 characters."
        />
        <PasswordInput
          id="reg-confirm" label="Confirm password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
          autoComplete="new-password"
        />

        <div className="flex items-start gap-3 min-h-[44px]">
          <input id="reg-terms" type="checkbox" required className="w-6 h-6 mt-0.5 rounded border-[#CDBBA4] flex-shrink-0" />
          <label htmlFor="reg-terms" className="text-sm text-ink-soft leading-6">
            I agree to the{' '}
            <Link to="/terms" className="text-action underline underline-offset-2">Terms &amp; Conditions</Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-action underline underline-offset-2">Privacy Policy</Link>
          </label>
        </div>

        <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full">
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-ink-soft">
        Already have an account?{' '}
        <Link to={`/login${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="text-action font-semibold underline underline-offset-2">Log in</Link>
      </p>
    </AuthShell>
  );
};

export default Register;

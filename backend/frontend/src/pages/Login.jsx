import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { AuthShell, PasswordInput } from '../components/AuthShell';

const Login = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
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
    setLoading(true);

    try {
      const result = await login(formData.emailOrPhone, formData.password);
      
      // Sync cart if user had items in local storage
      if (result.localCart && result.localCart.length > 0) {
        await syncCartOnLogin(result.localCart);
      }
      
      toast.success('Logged in successfully!');
      navigate(redirect);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue shopping">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="login-id" className="field-label">Email or phone number</label>
          <input
            id="login-id"
            type="text"
            name="emailOrPhone"
            value={formData.emailOrPhone}
            onChange={handleChange}
            required
            className="input-field"
            placeholder="Email or phone number"
            autoComplete="username"
            autoCapitalize="none"
            aria-describedby="login-id-help"
          />
          <p id="login-id-help" className="field-help">You can use either your email address or phone number.</p>
        </div>

        <PasswordInput
          id="login-password"
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end">
          <Link to="/forgot-password" className="btn-ghost h-11 whitespace-nowrap px-0">Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} aria-busy={loading} className="btn-primary w-full">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-sm text-ink-mute" aria-hidden="true">
        <span className="flex-1 border-t border-line" /> New to VillageCrunch? <span className="flex-1 border-t border-line" />
      </div>
      <Link to={`/register${redirect !== '/' ? `?redirect=${redirect}` : ''}`} className="btn-secondary w-full">
        Create an account
      </Link>
    </AuthShell>
  );
};

export default Login;

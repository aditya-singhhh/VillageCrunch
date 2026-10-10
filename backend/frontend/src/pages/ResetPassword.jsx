import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resetPassword } from '../utils/api';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const { resettoken } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    // Validate token on component mount
    validateToken();
  }, [resettoken]);

  const validateToken = async () => {
    try {
      // You can add a route to validate token without resetting
      setTokenValid(true);
    } catch (error) {
      setTokenValid(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      const data = await resetPassword(resettoken, formData.password);

      toast.success('Password reset successful! Logging you in...');
      
      // Auto-login after successful password reset
      if (data.token) {
        // Set the token and user data
        localStorage.setItem('token', data.token);
        // You might need to fetch user data here or modify the backend to return user data
        setTimeout(() => {
          navigate('/');
          window.location.reload(); // Refresh to update auth state
        }, 1000);
      } else {
        navigate('/login');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="bg-paper flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto h-16 w-16 bg-berry-tint rounded-full flex items-center justify-center">
            <XCircle className="h-8 w-8 text-berry" />
          </div>
          <h2 className="mt-6 text-3xl font-display font-bold text-ink">
            Invalid or Expired Link
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          
          <div className="mt-6 space-y-3">
            <Link
              to="/forgot-password"
              className="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-desi-brown hover:bg-action-dark transition"
            >
              Request New Reset Link
            </Link>
            <Link
              to="/login"
              className="w-full inline-flex justify-center py-2 px-4 border border-[#CDBBA4] rounded-lg shadow-sm text-sm font-medium text-ink-soft bg-white hover:bg-cream transition"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-desi-cream rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-desi-brown" />
          </div>
          <h2 className="mt-6 text-3xl font-display font-bold text-ink">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white py-8 px-4 shadow-card rounded-lg">
            <div className="space-y-6">
              {/* New Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink-soft mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-mute w-5 h-5" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10 pr-10 block w-full px-3 py-2 border border-[#CDBBA4] rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-ink-mute" />
                    ) : (
                      <Eye className="h-5 w-5 text-ink-mute" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-ink-mute">
                  Must be at least 6 characters long
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-soft mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-mute w-5 h-5" />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pl-10 pr-10 block w-full px-3 py-2 border border-[#CDBBA4] rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-ink-mute" />
                    ) : (
                      <Eye className="h-5 w-5 text-ink-mute" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Match Indicator */}
              {formData.password && formData.confirmPassword && (
                <div className="flex items-center text-sm">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                      <span className="text-leaf">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-berry mr-2" />
                      <span className="text-berry">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || formData.password !== formData.confirmPassword}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-desi-brown hover:bg-action-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-desi-gold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Resetting Password...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-ink-soft hover:text-desi-gold transition"
          >
            Remember your password? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
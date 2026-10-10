import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, ArrowLeft, CheckCircle, Smartphone } from 'lucide-react';
import { forgotPassword, verifyOTP } from '../utils/api';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('input'); // 'input', 'otp-sent', 'email-sent'
  const [method, setMethod] = useState(null); // 'email' or 'phone'
  const [resetToken, setResetToken] = useState('');
  const navigate = useNavigate();

  const isEmail = identifier.includes('@');
  const isPhone = /^[6-9]\d{9}$/.test(identifier);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!identifier) {
      toast.error('Please enter your email or phone number');
      return;
    }

    if (!isEmail && !isPhone) {
      toast.error('Please enter a valid email address or 10-digit phone number');
      return;
    }

    try {
      setLoading(true);
      const data = await forgotPassword(identifier);
      
      setMethod(data.method);
      
      if (data.method === 'email') {
        setStep('email-sent');
        toast.success('Password reset email sent successfully!');
        
        // Only show token in development mode if email service failed
        if (data.resetToken) {
          console.log('Reset Token (for development):', data.resetToken);
          toast.success(`Development Mode - Reset Token: ${data.resetToken}`, { duration: 15000 });
        }
      } else if (data.method === 'phone') {
        setStep('otp-sent');
        toast.success('OTP sent to your phone number!');
        
        // Only show OTP in development mode via console (not in UI)
        if (process.env.NODE_ENV === 'development' && data.otp) {
          console.log('OTP (for development testing):', data.otp);
        }
      }
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const data = await verifyOTP(identifier, otp);
      
      setResetToken(data.resetToken);
      toast.success('OTP verified! Redirecting to reset password...');
      
      // Navigate to reset password page with token
      setTimeout(() => {
        navigate(`/reset-password/${data.resetToken}`);
      }, 1000);
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      const data = await forgotPassword(identifier);
      toast.success('OTP resent successfully!');
      
      // Only log in development, no toast notification
      if (process.env.NODE_ENV === 'development' && data.otp) {
        console.log('New OTP (for development testing):', data.otp);
      }
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input Screen
  if (step === 'otp-sent') {
    return (
      <div className="bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-leaf-tint rounded-full flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-leaf" />
            </div>
            <h2 className="mt-6 text-3xl font-display font-bold text-ink">
              Enter OTP
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              We've sent a 6-digit OTP to{' '}
              <span className="font-semibold text-desi-brown">{identifier}</span>
            </p>
            <p className="mt-2 text-xs text-ink-mute">
              The OTP will expire in 10 minutes for security.
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
            <div className="bg-white py-8 px-4 shadow-card rounded-lg">
              <div className="space-y-6">
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-ink-soft mb-2">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    maxLength="6"
                    pattern="\d{6}"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="block w-full px-3 py-3 border border-[#CDBBA4] rounded-lg text-center text-2xl tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="000000"
                    autoComplete="off"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-desi-brown hover:bg-action-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-desi-gold disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    'Verify OTP'
                  )}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-desi-gold hover:text-action-dark font-medium text-sm disabled:opacity-50"
                  >
                    Didn't receive OTP? Resend
                  </button>
                </div>
              </div>
            </div>
          </form>

          <div className="text-center space-y-2">
            <button
              onClick={() => {
                setStep('input');
                setOtp('');
              }}
              className="inline-flex items-center text-sm text-ink-soft hover:text-desi-gold transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Try different number
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Email Sent Success Screen
  if (step === 'email-sent') {
    return (
      <div className="bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-leaf-tint rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-leaf" />
            </div>
            <h2 className="mt-6 text-3xl font-display font-bold text-ink">
              Check Your Email
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              We've sent password reset instructions to{' '}
              <span className="font-semibold text-desi-brown">{identifier}</span>
            </p>
            <p className="mt-2 text-xs text-ink-mute">
              The reset link will expire in 10 minutes for security.
            </p>
          </div>

          <div className="bg-white py-8 px-4 shadow-card rounded-lg">
            <div className="text-center space-y-4">
              <p className="text-sm text-ink-soft">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              
              <button
                onClick={() => {
                  setStep('input');
                  setIdentifier('');
                }}
                className="text-desi-gold hover:text-action-dark font-medium text-sm"
              >
                Try different email
              </button>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-ink-soft hover:text-desi-gold transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Input Screen
  return (
    <div className="bg-paper flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-desi-cream rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-desi-brown" />
          </div>
          <h2 className="mt-6 text-3xl font-display font-bold text-ink">
            Forgot Password?
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Enter your email address or phone number and we'll send you instructions to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white py-8 px-4 shadow-card rounded-lg">
            <div className="space-y-6">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-ink-soft mb-2">
                  Email Address or Phone Number
                </label>
                <div className="relative">
                  {isEmail ? (
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-mute w-5 h-5" />
                  ) : (
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-mute w-5 h-5" />
                  )}
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="email tel"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="pl-10 block w-full px-3 py-2 border border-[#CDBBA4] rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-desi-gold focus:border-transparent"
                    placeholder="email@example.com or 9876543210"
                  />
                </div>
                <p className="text-xs text-ink-mute mt-2">
                  {isEmail && '📧 We will send reset link to your email'}
                  {isPhone && '📱 We will send OTP to your phone'}
                  {!isEmail && !isPhone && 'Enter email or 10-digit phone number'}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-desi-brown hover:bg-action-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-desi-gold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    {isEmail ? 'Send Reset Link' : isPhone ? 'Send OTP' : 'Continue'}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="text-center space-y-2">
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-ink-soft hover:text-desi-gold transition"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
          
          <p className="text-sm text-ink-soft">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-desi-gold hover:text-action-dark">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
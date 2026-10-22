const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../config/email');
const { sendSMS } = require('../config/sms');

// Generate JWT
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '180d' });

// Fields that must never be sent to clients
const SENSITIVE_FIELDS = '-password -resetPasswordToken -resetPasswordExpire -resetPasswordOTP -resetPasswordOTPExpire -resetPasswordOTPAttempts';

const hashValue = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// Cryptographically secure 6-digit OTP
const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const isValidEmail = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const isValidPhone = (p) => typeof p === 'string' && /^[0-9+\-\s]{10,15}$/.test(p);

// 🧩 REGISTER (customers only)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !isValidEmail(email) || !isValidPhone(phone)) {
      return res.status(400).json({ message: 'Valid name, email and phone are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) return res.status(400).json({ message: 'Email already registered' });

    const phoneExists = await User.findOne({ phone });
    if (phoneExists) return res.status(400).json({ message: 'Phone number already registered' });

    const user = await User.create({
      name,
      email,
      password,
      phone,
      role: 'user', // SECURITY: role is never accepted from the client; promote admins via script
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 🧩 PHONE OTP LOGIN / SIGNUP
// The browser verifies the phone number with Firebase (SMS OTP) and sends us the
// resulting Firebase ID token. We trust only the phone number Firebase put in that
// token. Existing customers are logged in; new ones are asked for their name once.
let verifyPhoneToken = async (idToken) => {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp(process.env.FIREBASE_PROJECT_ID ? { projectId: process.env.FIREBASE_PROJECT_ID } : undefined);
  }
  return admin.auth().verifyIdToken(idToken);
};
router.__setPhoneVerifier = (fn) => { verifyPhoneToken = fn; }; // tests only

const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  token: generateToken(user._id),
});

router.post('/phone', async (req, res) => {
  try {
    const { idToken, name } = req.body || {};
    if (typeof idToken !== 'string' || idToken.length < 20) {
      return res.status(400).json({ message: 'Phone verification is required' });
    }
    let decoded;
    try {
      decoded = await verifyPhoneToken(idToken);
    } catch (e) {
      return res.status(401).json({ message: 'OTP verification expired. Please try again.' });
    }
    const ten = String(decoded.phone_number || '').replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(ten)) {
      return res.status(400).json({ message: 'Please use an Indian mobile number' });
    }

    let user = (await User.findOne({ phone: ten })) || (await User.findOne({ phone: `+91${ten}` }));
    if (!user) {
      const clean = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
      if (clean.length < 2) return res.json({ needName: true });
      user = await User.create({
        name: clean,
        email: `${ten}@phone.villagecrunch.in`, // placeholder until the customer adds an email
        password: crypto.randomBytes(24).toString('hex'), // never used; they log in with OTP
        phone: ten,
        role: 'user',
      });
      return res.status(201).json(userPayload(user));
    }
    res.json(userPayload(user));
  } catch (error) {
    console.error('Phone login error:', error.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

// 🧩 LOGIN (User or Admin)
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (typeof emailOrPhone !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email/phone and password are required' });
    }

    // Check if it's an email or phone number
    const isEmail = emailOrPhone.includes('@');
    
    let user;
    if (isEmail) {
      user = await User.findOne({ email: emailOrPhone.toLowerCase() });
    } else {
      user = await User.findOne({ phone: emailOrPhone });
    }

    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email/phone or password' });
    }
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Login failed' });
  }
});

// 🧩 ADMIN LOGIN (optional separate endpoint)
router.post('/admin/login', async (req, res) => {
  try {
    const { emailOrPhone, password } = req.body;
    if (typeof emailOrPhone !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email/phone and password are required' });
    }

    // Check if it's an email or phone number
    const isEmail = emailOrPhone.includes('@');
    
    let admin;
    if (isEmail) {
      admin = await User.findOne({ email: emailOrPhone.toLowerCase(), role: 'admin' });
    } else {
      admin = await User.findOne({ phone: emailOrPhone, role: 'admin' });
    }
    
    if (admin && (await admin.comparePassword(password))) {
      res.json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        token: generateToken(admin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🧩 PROFILE (Private)
router.get('/profile', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select(SENSITIVE_FIELDS).populate('wishlist');
  res.json(user);
});

// 🧩 GET USER STATS (Private)
router.get('/stats', protect, async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    // Count total orders for the user
    const totalOrders = await Order.countDocuments({ user: req.user._id });
    
    // Get user with wishlist
    const user = await User.findById(req.user._id).populate('wishlist');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      totalOrders,
      totalAddresses: user.addresses?.length || 0,
      wishlistCount: user.wishlist?.length || 0,
      memberSince: user.createdAt
    });
  } catch (error) {
    console.error('Stats fetch error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🧩 UPDATE PROFILE (Private)
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    user.name = req.body.name || user.name;
    user.email = req.body.email ? String(req.body.email).toLowerCase() : user.email;
    user.phone = req.body.phone || user.phone;
    
    // Handle addresses with phone number validation
    if (req.body.addresses) {
      // Ensure all addresses have phone numbers
      const addressesWithPhone = req.body.addresses.map(address => ({
        ...address,
        phone: address.phone || user.phone // Use address phone or fallback to user phone
      }));
      user.addresses = addressesWithPhone;
    }
    
    if (req.body.password) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      if (!req.body.currentPassword || !(await user.comparePassword(req.body.currentPassword))) {
        return res.status(400).json({ message: 'Current password is required and must be correct to set a new password' });
      }
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      addresses: updatedUser.addresses,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// 🧩 GET ALL USERS (Admin only)
router.get('/all-users', protect, admin, async (req, res) => {
  const users = await User.find().select(SENSITIVE_FIELDS);
  res.json(users);
});

// 🧩 DELETE USER (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  await user.deleteOne();
  res.json({ message: 'User deleted successfully' });
});

// 🧩 FORGOT PASSWORD - Email or Phone
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body; // Can be email or phone
    
    if (!identifier || typeof identifier !== 'string') {
      return res.status(400).json({ message: 'Please provide email or phone number' });
    }

    // Check if identifier is email or phone
    const isEmail = identifier.includes('@');
    
    let user;
    if (isEmail) {
      user = await User.findOne({ email: identifier.toLowerCase() });
    } else {
      user = await User.findOne({ phone: identifier });
    }

    if (!user) {
      // Generic response so attackers cannot discover which accounts exist
      return res.json({
        method: isEmail ? 'email' : 'phone',
        message: 'If an account exists for this identifier, reset instructions have been sent.'
      });
    }

    if (isEmail) {
      // EMAIL-BASED RESET: Generate reset token and send email
      const resetToken = crypto.randomBytes(20).toString('hex');

      // Hash token and set to resetPasswordToken field
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      // Set expire time (10 minutes)
      user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

      await user.save();

      try {
        // Send password reset email
        await sendPasswordResetEmail(user.email, resetToken, user.name);
        
        res.json({
          method: 'email',
          message: 'Password reset email sent successfully. Please check your email for instructions.',
        });

      } catch (emailError) {
        // If email fails, clean up the reset token
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        console.error('Email send error:', emailError);
        
        // In development, still provide the token if email fails
        if (process.env.NODE_ENV === 'development' && process.env.EXPOSE_DEV_RESET_TOKEN === 'true') {
          return res.json({
            method: 'email',
            message: 'Email service unavailable. Here is your reset token for development:',
            resetToken,
            resetUrl: `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
          });
        }

        return res.status(500).json({ 
          message: 'Email could not be sent. Please try again later.' 
        });
      }
      
    } else {
      // PHONE-BASED RESET: Generate 6-digit OTP
      const otp = generateOTP();
      
      // Store only a hash of the OTP
      user.resetPasswordOTP = hashValue(otp);
      user.resetPasswordOTPAttempts = 0;
      user.resetPasswordOTPExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
      
      await user.save();
      
      // TODO: In production, integrate SMS service (Twilio, MSG91, etc.)
      // For now, just log OTP in development mode for testing
      if (process.env.NODE_ENV === 'development' && process.env.EXPOSE_DEV_RESET_TOKEN === 'true') {
        console.log(`OTP for ${user.phone}: ${otp}`);
      }
      
      // Send the OTP by SMS (provider chosen via SMS_SERVICE; failures are logged, response stays generic)
      try {
        await sendSMS(user.phone, `Your VillageCrunch password reset OTP is: ${otp}. Valid for 10 minutes. Do not share it with anyone.`);
      } catch (smsError) {
        console.error('OTP SMS failed:', smsError.message);
      }
      
      res.json({
        method: 'phone',
        message: 'If an account exists for this identifier, reset instructions have been sent.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// 🧩 VERIFY OTP (for phone-based reset)
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ message: 'Phone number and OTP are required' });
    }
    
    const user = await User.findOne({
      phone: String(phone),
      resetPasswordOTPExpire: { $gt: Date.now() }
    });

    if (!user || !user.resetPasswordOTP) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Lock out after 5 wrong attempts
    if ((user.resetPasswordOTPAttempts || 0) >= 5) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpire = undefined;
      user.resetPasswordOTPAttempts = 0;
      await user.save();
      return res.status(429).json({ message: 'Too many attempts. Please request a new OTP.' });
    }

    const submitted = Buffer.from(hashValue(otp));
    const stored = Buffer.from(user.resetPasswordOTP);
    if (submitted.length !== stored.length || !crypto.timingSafeEqual(submitted, stored)) {
      user.resetPasswordOTPAttempts = (user.resetPasswordOTPAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Generate a temporary token for password reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    
    // Clear OTP
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpire = undefined;
    user.resetPasswordOTPAttempts = 0;
    
    await user.save();
    
    res.json({
      message: 'OTP verified successfully',
      resetToken
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
});

// 🧩 RESET PASSWORD
router.put('/reset-password/:resettoken', async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      message: 'Password reset successful',
      token: generateToken(user._id)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

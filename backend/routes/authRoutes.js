const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requestMagicLink, verifyMagicLink } = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

// ⚡ NEW IMPORTS REQUIRED FOR CHECK-EMAIL & GOOGLE AUTH
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google Client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const forgotPasswordLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 3, 
  message: { message: "Too many reset requests, try again later." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many incorrect guesses. Suspended for 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth mappings
router.get('/me', verifyToken, authController.getMe);
router.post('/logout', authController.logout);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/magic-link/request', requestMagicLink);
router.post('/magic-link/verify', verifyMagicLink);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.patch('/reset-password', resetPasswordLimiter, authController.resetPassword);
router.patch('/sync-playback', verifyToken, authController.syncPlayback);

// ⚡ CHECK-EMAIL ROUTE (Now bug-free because User is imported!)
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(200).json({ exists: true });
    }
    return res.status(200).json({ exists: false });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// ⚡ NEW GOOGLE AUTH ROUTE
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    // 1. Verify the token with Google's servers
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload(); 

    // 2. Check if this user already exists in Groove's database
    let user = await User.findOne({ email: payload.email });

    if (!user) {
      // 3. If they don't exist, instantly create an account for them
      user = new User({
        email: payload.email,
        profileName: payload.name,
        // Generate a massive random password since they will use Google to log in
        password: Math.random().toString(36).slice(-12), 
        isEmailVerified: true 
      });
      await user.save();
    }

    // 4. Issue your standard Groove JWT Token
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    // 5. Send the secure HTTP-Only cookie back to the browser
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ 
      userId: user._id, 
      email: user.email, 
      role: user.role 
    });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

module.exports = router;
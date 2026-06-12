const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

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
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.patch('/reset-password', resetPasswordLimiter, authController.resetPassword);
router.patch('/sync-playback', verifyToken, authController.syncPlayback);

// Profile & interaction endpoints mapped to base /api/users context inside index.js
router.get('/user-profile/:id', authController.getUserProfile);
router.patch('/toggle-like', verifyToken, authController.toggleLikeSong);

module.exports = router;
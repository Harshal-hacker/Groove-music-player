const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Helper function to generate token and set cookie
const sendAuthCookie = (res, user) => {
  const payload = { userId: user._id, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  return token;
};

// ✅ NEW WAY: Explicit secure routing
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password').populate('activeSession.trackId'); 
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = (req, res) => {
  res.clearCookie('auth_token');
  res.status(200).json({ message: "Logged out successfully" });
};

exports.signup = async (req, res) => {
  try {
    const { email, password, profileName, dob, gender } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email is already registered." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ email, password: hashedPassword, profileName, dob, gender });
    await newUser.save();
    
    // ⚡ Capture the token here
    const token = sendAuthCookie(res, newUser);
    
    // ⚡ Add the token to the JSON response
    res.status(201).json({ 
      userId: newUser._id, 
      role: newUser.role, 
      token: token, 
      message: "Account created successfully!" 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during sign up." });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid Email or Password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid Email or Password" });

    // ⚡ Capture the token here
    const token = sendAuthCookie(res, user);
    
    // ⚡ Add the token to the JSON response
    res.status(200).json({ 
      message: "Login successful", 
      userId: user._id, 
      role: user.role, 
      token: token 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during login" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.toggleLikeSong = async (req, res) => {
  try {
    const userId = req.user.userId;
    const songId = req.body.songId || req.body.id; 

    if (!songId) {
      return res.status(400).json({ message: "Song ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Check if the song is already liked
    const isLiked = user.likedSongs && user.likedSongs.some(id => id.toString() === songId.toString());

    // ⚡ THE FIX: Use MongoDB Atomic Operators! 
    // This bypasses full document validation, so legacy accounts missing a "profileName" won't crash.
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      isLiked 
        ? { $pull: { likedSongs: songId } }      // If liked, remove it
        : { $addToSet: { likedSongs: songId } }, // If not liked, add it
      { new: true } // Return the freshly updated document
    );

    res.status(200).json({ likedSongs: updatedUser.likedSongs });
  } catch (err) {
    console.error("🔥 Toggle Like Error:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "If an account exists, a reset code has been sent." });

    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    await User.updateOne(
      { email: user.email }, 
      { $set: { resetPasswordToken: resetToken, resetPasswordExpires: Date.now() + 15 * 60 * 1000 } }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Groove - Password Reset Code',
      text: `Your reset code is: ${resetToken}\n\nThis code expires in 15 minutes.`
    };

    transporter.sendMail(mailOptions, (error) => {
      if (error) return res.status(500).json({ message: "Failed to send email." });
      res.json({ message: "If an account exists, a reset code has been sent." });
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired code." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword }, $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } }
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.syncPlayback = async (req, res) => {
  try {
    const { trackId, time, playlistId } = req.body;
    await User.findByIdAndUpdate(req.user.userId, { 
      $set: { 'activeSession.trackId': trackId, 'activeSession.currentTime': time, 'activeSession.playlistId': playlistId } 
    });
    res.status(200).json({ message: "Synced" });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
};

// 1. GENERATE AND SEND THE OTP
exports.requestMagicLink = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    // Security Best Practice: Always send the same success message 
    // even if the user doesn't exist. This prevents hackers from guessing emails.
    if (!user) return res.status(200).json({ message: "If an account exists, a code has been sent." });

    // Generate a random 6-digit code (e.g., 492019)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save it to the database, set to expire in 15 minutes
    user.magicLinkOtp = otp;
    user.magicLinkOtpExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Groove - Your Login Code',
      text: `Welcome back to the studio.\n\nYour one-time login code is: ${otp}\n\nThis code expires in 15 minutes.`
    };

    // ⚡ THE FIX: "Fire and Forget"
    // 1. We tell Node to start sending the email in the background...
    transporter.sendMail(mailOptions, (error) => {
      if (error) console.error("Background Email Failed:", error);
    });

    // 2. ...but we instantly respond to the frontend BEFORE the email finishes sending!
    // This makes the UI slide to Step 3 immediately with zero lag.
    return res.status(200).json({ message: "If an account exists, a code has been sent." });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


// 2. VERIFY THE OTP AND LOG THEM IN
exports.verifyMagicLink = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find the user with that exact email, that exact code, AND ensure it hasn't expired
    const user = await User.findOne({ 
      email: email, 
      magicLinkOtp: otp, 
      magicLinkOtpExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code." });

    // The code was correct! Clear the OTP fields so it can't be used again.
    user.magicLinkOtp = null;
    user.magicLinkOtpExpires = null;
    await user.save();

    // Use your existing helper function to set the cookie and generate the token!
    const token = sendAuthCookie(res, user);
    
    res.status(200).json({ 
      message: "Login successful", 
      userId: user._id, 
      role: user.role, 
      token: token 
    });
  } catch (err) {
    res.status(500).json({ message: "Server error during verification" });
  }
};
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
};

// Configuration for Mailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
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
    
    sendAuthCookie(res, newUser);
    res.status(201).json({ userId: newUser._id, role: newUser.role, message: "Account created successfully!" });
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

    sendAuthCookie(res, user);
    res.status(200).json({ message: "Login successful", userId: user._id, role: user.role });
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
    const { userId, songId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const index = user.likedSongs.findIndex(id => id.toString() === songId);
    if (index > -1) {
      user.likedSongs.splice(index, 1); 
    } else {
      user.likedSongs.push(songId); 
    }

    await user.save();
    res.json({ likedSongs: user.likedSongs });
  } catch (err) {
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
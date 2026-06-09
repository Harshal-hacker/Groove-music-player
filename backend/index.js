require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');     
const jwt = require('jsonwebtoken');       // <-- ADDED FOR JWT
const cookieParser = require('cookie-parser'); // <-- ADDED FOR COOKIES

const app = express();

const corsOptions = {
  origin: true, 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // CRITICAL: This allows cookies to pass between frontend and backend
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser()); // <-- ADDED: Tells Express how to read incoming cookies

const PORT = process.env.PORT || 5000;
const Playlist = require('./models/Playlist');
const User = require('./models/User'); 

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log("Checking Cloudinary Config...");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);

// 2. Setup Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groove_music',
    resource_type: 'auto', 
  },
});

// 3. Initialize the 'upload' middleware
const upload = multer({ storage: storage });

// Connect to MongoDB Cloud
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ Database connection failed:', err));

// Define the Blueprint (Schema) for a Song
const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  src: { type: String, required: true },
  cover: { type: String, required: true },
  duration: { type: Number },
  isLiked: { type: Boolean, default: false },
  isLossless: { type: Boolean, default: false }
});

const Song = mongoose.model('Song', songSchema);


// =========================================================================
// SECURITY MIDDLEWARE & TOKEN HELPERS
// =========================================================================

// Helper function to generate token and set the cookie
const sendAuthCookie = (res, user) => {
  const payload = { userId: user._id, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

  res.cookie('auth_token', token, {
    httpOnly: true,  // JavaScript cannot access this cookie (Stops XSS)
    // secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    // sameSite: 'strict', // Stops CSRF attacks
    secure: true,    // CRITICAL: Must be true for sameSite: 'none' to work
    sameSite: 'none',// CRITICAL: Allows Vercel to talk to Render
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 Days
  });
};

// Middleware to protect routes that require a logged-in user
const verifyToken = (req, res, next) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "Access Denied. No token provided." });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified; // Attaches { userId, role } to the request
    next();
  } catch (err) {
    res.clearCookie('auth_token');
    res.status(401).json({ message: "Invalid or expired token." });
  }
};


// =========================================================================
// USER MANAGEMENTS & AUTH PATHS
// =========================================================================

// --- NEW: SILENT AUTHENTICATION CHECKER ---
// Frontend calls this on page load to see if a valid cookie exists
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    // Make sure .populate('activeSession.trackId') is here!
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('activeSession.trackId'); 
      
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.status(200).json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// --- NEW: LOGOUT ROUTE ---
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('auth_token'); // Destroys the cookie
  res.status(200).json({ message: "Logged out successfully" });
});


// Account Creation Endpoint (Sign Up)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, profileName, dob, gender } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword,
      profileName,
      dob,
      gender
    });

    await newUser.save();
    
    // Send the secure JWT cookie instantly upon signup
    sendAuthCookie(res, newUser);
    
    res.status(201).json({ 
      userId: newUser._id, 
      role: newUser.role,
      message: "Account created successfully!" 
    });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ message: "Server error during sign up." });
  }
});

// Account Verification Endpoint (Log In)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    // Send the secure JWT cookie
    sendAuthCookie(res, user);

    res.status(200).json({ 
      message: "Login successful", 
      userId: user._id,
      role: user.role
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
});

// Route to get user profile data
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to register heart indicators
app.patch('/api/users/toggle-like', async (req, res) => {
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
});

// =========================================================================
// SONG TRACK PATHS & API ENDPOINTS
// =========================================================================

// Fetch songs from the database
app.get('/api/songs', async (request, response) => {
  try {
    const allSongs = await Song.find(); 
    response.json(allSongs);
  } catch (error) {
    console.error("The REAL database error is:", error); 
    response.status(500).json({ error: "Failed to fetch songs" });
  }
});

// Add a new song to the database (Upload)
app.post('/api/songs/upload', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, artist, duration, userId } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') }, 
      artist: { $regex: new RegExp(`^${artist.trim()}$`, 'i') } 
    });

    if (existingSong) {
      return res.status(200).json(existingSong); 
    }

    if (!req.files['audio']) {
      return res.status(400).json({ message: "Audio file is required for new track uploads." });
    }

    const newSong = new Song({
      title: title.trim(),
      artist: artist.trim(),
      duration: duration ? parseFloat(duration) : 0, 
      src: req.files['audio'][0].path,
      cover: req.files['cover'] ? req.files['cover'][0].path : "https://res.cloudinary.com/your_cloud/image/upload/v1/Groove.png", 
    });

    await newSong.save();
    res.status(201).json(newSong);

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/songs/:id/duration', async (req, res) => {
  try {
    const { duration } = req.body;
    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      { duration: duration },
      { returnDocument: 'after' }
    );
    res.json(updatedSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/songs/:id', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, artist } = req.body;
    let updateData = { title, artist };

    if (req.files) {
      if (req.files['audio']) updateData.src = req.files['audio'][0].path;
      if (req.files['cover']) updateData.cover = req.files['cover'][0].path;
    }

    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { returnDocument: 'after' } 
    );

    if (!updatedSong) return res.status(404).json({ message: "Song not found" });
    res.status(200).json(updatedSong);
  } catch (error) {
    console.error("Update Error:", error);
    res.status(500).json({ message: "Server error during update", error: error.message });
  }
});

app.delete('/api/songs/:id', async (req, res) => {
  try {
    const { userId } = req.query; 

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) return res.status(404).json({ message: "Song not found" });

    res.status(200).json({ message: "Song deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// PASSWORD RESET ENDPOINTS
// =========================================================================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 3, 
  message: { message: "Too many password reset requests from this IP, please try again after an hour." },
  standardHeaders: true, 
  legacyHeaders: false, 
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many incorrect guesses. Your IP has been blocked for 15 minutes for security." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.json({ message: "If an account exists, a reset code has been sent." });
    }

    const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
    
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; 
    await User.updateOne(
      { email: user.email }, 
      { 
        $set: { 
          resetPasswordToken: resetToken, 
          resetPasswordExpires: Date.now() + 15 * 60 * 1000 
        } 
      }
    );

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Groove - Password Reset Code',
      text: `We received a request to reset your password.\n\nYour reset code is: ${resetToken}\n\nThis code will expire in 15 minutes. If you didn't request this, you can safely ignore this email.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email error:", error);
        return res.status(500).json({ message: "Failed to send email." });
      }
      res.json({ message: "If an account exists, a reset code has been sent." });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.patch('/api/auth/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({ 
      resetPasswordToken: token, 
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { password: user.password },
        $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } 
      }
    );

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// =========================================================================
// PLAYLISTS COMPILATION ENDPOINTS
// =========================================================================

app.post('/api/playlists/curated', async (req, res) => {
  try { 
    const { name, userId, category } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    const newCurated = new Playlist({
      name: name || "Curated Edition Mix",
      createdBy: userId,
      isReadyMade: true,
      category: category || "Featured",
      songIds: []
    });

    const saved = await newCurated.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlists/bulk-curate', async (req, res) => {
  try {
    const { playlistName, songIds, userId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const bulkPlaylist = new Playlist({
      name: playlistName || "Bulk Curated Release",
      createdBy: userId,
      isReadyMade: true,
      songIds: songIds, 
      playlistCover: "/Groove.png"
    });

    await bulkPlaylist.save();
    res.status(201).json(bulkPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/playlists', async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const newPlaylist = new Playlist({ name, createdBy });
    const savedPlaylist = await newPlaylist.save();
    res.status(201).json(savedPlaylist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/playlists', async (req, res) => {
  const { userId } = req.query;
  
  try {
    let queryCondition = {};
    const hasValidUser = userId && userId !== 'null' && userId !== 'undefined' && userId.trim() !== '';

    if (hasValidUser) {
      queryCondition = {
        $or: [
          { createdBy: userId },
          { followers: userId },
          { isReadyMade: true }
        ]
      };
    } else {
      queryCondition = { isReadyMade: true };
    }

    const playlists = await Playlist.find(queryCondition).populate('songIds');
    res.status(200).json(playlists);
  } catch (err) {
    console.error("Critical Playlist Fetch Error:", err);
    res.status(500).json({ message: "Internal server error fetching collections." });
  }
});

app.patch('/api/playlists/:id/rename', async (req, res) => {
  try {
    const { name } = req.body;
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id, 
      { name }, 
      { new: true }
    );
    res.json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/playlists/:id/add-song', async (req, res) => {
  try {
    const { songId, userId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) return res.status(404).json({ error: "Not found" });

    if (playlist.isReadyMade) {
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Ready-made playlists cannot be modified by standard users." });
      }
    }

    playlist.songIds.addToSet(songId);
    await playlist.save();
    
    const freshlyPopulatedPlaylist = await Playlist.findById(req.params.id).populate('songIds');
    res.json(freshlyPopulatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/playlists/:id/remove-song', async (req, res) => {
  try {
    const { songId } = req.body;
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $pull: { songIds: songId } }, 
      { returnDocument: 'after' }     
    ).populate('songIds');            
    
    res.json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/playlists/:id/follow', async (req, res) => {
  const { userId } = req.body;
  const playlistId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID context is required." });
  }

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: "Target playlist not found." });

    const isFollowing = playlist.followers.includes(userId);

    if (isFollowing) {
      playlist.followers = playlist.followers.filter(id => String(id) !== String(userId));
    } else {
      playlist.followers.push(userId);
    }

    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId).populate('songIds');
    res.status(200).json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/api/playlists/:id', async (req, res) => {
  try {
    const deletedPlaylist = await Playlist.findByIdAndDelete(req.params.id);
    if (!deletedPlaylist) return res.status(404).json({ message: "Playlist not found in DB" });
    
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/users/:id/playback', async (req, res) => {
  try {
    const { songId, currentTime } = req.body;
    
    await User.findByIdAndUpdate(req.params.id, {
      $set: { 
        'lastPlayback.songId': songId, 
        'lastPlayback.currentTime': currentTime 
      }
    });
    
    res.status(200).json({ message: "Playback synced successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================================
// CROSS-DEVICE SYNC ENDPOINT
// =========================================================================
app.patch('/api/user/sync-playback', verifyToken, async (req, res) => {
  try {
    const { trackId, time, playlistId } = req.body; // Add playlistId
    const userId = req.user.userId;

    await User.findByIdAndUpdate(userId, { 
      $set: { 
        'activeSession.trackId': trackId,
        'activeSession.currentTime': time,
        'activeSession.playlistId': playlistId // Save it!
      } 
    });
    res.status(200).json({ message: "Synced" });
  } catch (err) { res.status(500).json({ error: "Failed" }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
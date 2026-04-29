require('dotenv').config(); // 1. Loads your secret password from the .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const corsOptions = {
  origin: [
    'http://localhost:5173',                  // Your local React app
    'https://your-groove-frontend.onrender.com', // YOUR LIVE FRONTEND LINK
    'https://groove-music-player-rho.vercel.app'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
const PORT = process.env.PORT || 5000;
const Playlist = require('./models/Playlist');
const User = require('./models/User'); // Must be imported
const bcrypt = require('bcryptjs');     // Must be installed via npm

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
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "FOUND" : "MISSING");

// 2. Setup Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'groove_music',
    resource_type: 'auto', // CRITICAL: Allows both .mp3 and .jpg files
  },
});

// 3. Initialize the 'upload' middleware (This fixes your error!)
const upload = multer({ storage: storage });

// 2. Connect to MongoDB Cloud
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch((err) => console.error('❌ Database connection failed:', err));

// 3. Define the Blueprint (Schema) for a Song
const songSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  src: { type: String, required: true },
  cover: { type: String, required: true },
  duration: { type: Number },
  isLiked: { type: Boolean, default: false } 
});

// 4. Create the Model (This creates a 'songs' collection in your database)
const Song = mongoose.model('Song', songSchema);

// 5. The GET Route: Fetch songs from the database
app.get('/api/songs', async (request, response) => {
  try {
    const allSongs = await Song.find(); 
    response.json(allSongs);
  } catch (error) {
    // THIS is the new line. It will print the exact database error to your terminal!
    console.error("The REAL database error is:", error); 
    
    response.status(500).json({ error: "Failed to fetch songs" });
  }
});

// 1. Route to get user info (The GET error)
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user); // Sends back the likedSongs array
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Route to toggle likes (The PATCH error)
app.patch('/api/users/toggle-like', async (req, res) => {
  try {
    const { userId, songId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Use string comparison for safety
    const index = user.likedSongs.findIndex(id => id.toString() === songId);
    
    if (index > -1) {
      user.likedSongs.splice(index, 1); // Remove if exists
    } else {
      user.likedSongs.push(songId); // Add if not
    }

    await user.save();
    res.json({ likedSongs: user.likedSongs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTH ROUTES ---

// 1. SIGNUP ROUTE
// In your backend index.js
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("SIGNUP ERROR:", err); // Look at your terminal for this!
    res.status(500).json({ message: "Database error. Check your connection." });
  }
});

// 2. LOGIN ROUTE
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the user in the database
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    // 2. COMPARE the plain text password with the hashed one in DB
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid Email or Password" });
    }

    // 3. If successful, send the userId back
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

// 6. The POST Route: Add a new song to the database
// In your backend index.js
app.post('/api/songs/upload', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, artist, duration, userId } = req.body; // Extract userId from the form data

    // 1. ADMIN CHECK (The Security Gate)
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Only Admins can upload songs." });
    }

    // 2. SONG UPLOAD LOGIC (Only runs if user is admin)
    const newSong = new Song({
      title,
      artist,
      duration: duration ? parseFloat(duration) : 0, 
      src: req.files['audio'][0].path,  // Cloudinary URL
      cover: req.files['cover'][0].path, // Cloudinary URL
    });

    await newSong.save();
    res.status(201).json(newSong);

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a song by its ID
app.delete('/api/songs/:id', async (req, res) => {
  try {
    // Look for userId in the URL query instead of req.body
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

// --- 1. DELETE THE REDUNDANT ROUTES FIRST ---
// Delete the old app.put('/api/songs/:id') 
// Delete the old app.patch('/api/songs/:id/duration')
// Delete the old app.patch('/api/songs/:id') WITHOUT the upload.fields

// --- 2. ADD THIS ORGANIZED BLOCK ---

// A. Specific sub-routes MUST come before generic ones
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

// B. The Main Update Route (Handles the "Save Changes" button)
// This MUST have upload.fields to read the Title and Artist from your FormData
app.patch('/api/songs/:id', upload.fields([{ name: 'audio' }, { name: 'cover' }]), async (req, res) => {
  try {
    const { title, artist } = req.body;
    let updateData = { title, artist };

    // Update Cloudinary links only if NEW files were actually sent
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

// C. Keep your Playlist routes below the song routes

// Get all playlists
app.get('/api/playlists', async (req, res) => {
  try {
    const { userId } = req.query;
    const query = userId ? { createdBy: userId } : { _id: null };

    // CRITICAL: Add .populate('songIds') to get the full song objects
    const playlists = await Playlist.find(query).populate('songIds'); 
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new playlist
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

// DELETE a playlist by ID
app.delete('/api/playlists/:id', async (req, res) => {
  console.log("Delete request received for ID:", req.params.id); // Debug log
  try {
    const deletedPlaylist = await Playlist.findByIdAndDelete(req.params.id);
    if (!deletedPlaylist) {
      return res.status(404).json({ message: "Playlist not found in DB" });
    }
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/playlists/:id/add-song', async (req, res) => {
  try {
    const { songId } = req.body;
    
    // $addToSet ensures no duplicate IDs are added to the array
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { songIds: songId } },
      { new: true }
    );

    if (!updatedPlaylist) return res.status(404).json({ error: "Playlist not found" });
    
    res.json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

app.patch('/api/playlists/:id/remove-song', async (req, res) => {
  try {
    const { songId } = req.body;
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $pull: { songIds: songId } }, // $pull removes the ID from the array
      { new: true }
    ).populate('songIds');
    
    res.json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
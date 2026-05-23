require('dotenv').config(); // 1. Loads your secret password from the .env file
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

const corsOptions = {
  origin: true, // Dynamically accepts your live deployed frontend URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
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

    // Admin authorization validation check logic
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    // Duplicate tracking item checker
    const existingSong = await Song.findOne({ title, artist });
    if (existingSong) {
      return res.status(200).json(existingSong); 
    }

    const newSong = new Song({
      title,
      artist,
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

// Update an individual track audio duration mapping parameter hook explicitly
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

// Main Track updates handler (Handles metadata/artwork visual saves)
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

// Delete a single music track document from the Atlas engine data trees
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
// USER MANAGEMENTS & AUTH PATHS
// =========================================================================

// Route to get user profile data packet structures safely
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to register heart indicators to accounts (Toggle Likes)
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

// Account Creation Endpoint (Sign Up)
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
    console.error("SIGNUP ERROR:", err); 
    res.status(500).json({ message: "Database error. Check your connection." });
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

// =========================================================================
// PLAYLISTS COMPILATION ENDPOINTS (FIXED ORDER PRIORITY LOGIC)
// =========================================================================

// --- CRITICAL FIX 1: EXPLICIT NAMESPACE POST PATHS SET HIGHEST IN STREAM TREE ---

// ADMIN ONLY: CREATE DIRECT CURATED READY-MADE PLAYLIST CONTAINER
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

// ADMIN ONLY: BUNDLE BULK TRACKS INTO INSTANT READY-MADE PLAYLIST
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

// Standard user inline manual custom playlist compilation handler
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

// --- CRITICAL FIX 2: GLOBAL LIST READ GETTERS PLACED BELOW EXPLICIT SEED ROUTERS ---

// Get all library playlists (Serves curated mixes to guests, personal rows to logged-in accounts)
app.get('/api/playlists', async (req, res) => {
  const { userId } = req.query;
  
  try {
    let queryCondition = {};
    const hasValidUser = userId && 
                         userId !== 'null' && 
                         userId !== 'undefined' && 
                         userId.trim() !== '';

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

// --- CRITICAL FIX 3: GENERIC VARIABLE PARAMETER SLUGS (:id) PLACED LOWEST ON THE GRID ---

// Rename a custom playlist text heading identifier node
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

// Insert a specific song reference inside child relational collection indexes
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

// Drop a song reference from an active music playlist dashboard collection index
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

// Toggle follow action maps for public curated playlists row collections
app.patch('/api/playlists/:id/follow', async (req, res) => {
  const { userId } = req.body;
  const playlistId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID context is required." });
  }

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
      return res.status(404).json({ message: "Target playlist not found." });
    }

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
    console.error("Library sync failure:", err);
    res.status(500).json({ message: err.message });
  }
});

// Clear a collection structural element array entirely (Delete Playlist)
app.delete('/api/playlists/:id', async (req, res) => {
  console.log("Delete request received for ID:", req.params.id); 
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
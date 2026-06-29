require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser'); 
const User = require('./models/User');

// 🛡️ IMPORT THE SHIELD
const { verifyToken } = require('./middleware/authMiddleware');
const authController = require('./controllers/authController');

const songRoutes = require('./routes/songRoutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');

const app = express();

const corsOptions = {
  origin: true, 
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, 
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser()); 

const PORT = process.env.PORT || 5000;

app.use('/api/songs', songRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.patch('/api/users/toggle-like', verifyToken, authController.toggleLikeSong);
app.post('/api/users/:id/like', verifyToken, authController.toggleLikeSong);
app.get('/api/users/user-profile/:id', authController.getUserProfile);

// 🛡️ ADDED verifyToken and Identity Check!
app.patch('/api/users/:id/playback', verifyToken, async (req, res) => {
  try {
    // Prevent users from saving data to someone else's account
    if (req.user.userId !== req.params.id) {
      return res.status(403).json({ message: "Forbidden: Cannot update another user's playback." });
    }

    const { songId, currentTime, playlistId } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      {
        activeSession: {
          trackId: songId,
          currentTime: currentTime,
          playlistId: playlistId
        }
      },
      { returnDocument: 'after' }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "Playback synced successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
    // 🎤 ADDED YOUR MESSAGE BACK!
    console.log("✅ Connected to MongoDB Database");
  }
};

if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
}

module.exports = { app, connectDB };
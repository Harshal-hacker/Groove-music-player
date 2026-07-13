require('dotenv').config(); 
const express = require('express');
const http = require('http'); // ⚡ 1. Import Node's HTTP module
const { Server } = require('socket.io'); // ⚡ 1. Import Socket.io

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
const albumRoutes = require('./routes/albumRoutes');

const app = express();
const server = http.createServer(app);

// ⚡ THE MASTER WHITELIST
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:5174',
  'https://groove-music-player-rho.vercel.app' // No trailing slash!
];

// ⚡ 1. Apply to Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, 
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  }
});

app.set('io', io); 

io.on('connection', (socket) => {
  console.log('🟢 A device connected:', socket.id);

  socket.on('joinRoom', (userId) => {
    socket.join(userId.toString());
    console.log(`🔒 User ${userId} joined their secure room`);
  });

  socket.on('disconnect', () => {
    console.log('🔴 A device disconnected');
  });
});

// ⚡ 2. Apply to Express
const corsOptions = {
  origin: allowedOrigins, 
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'keepalive']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(cookieParser());

const PORT = process.env.PORT || 5000;

app.use('/api/songs', songRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/playlists', playlistRoutes);
app.patch('/api/users/toggle-like', verifyToken, authController.toggleLikeSong);
app.post('/api/users/:id/like', verifyToken, authController.toggleLikeSong);
app.get('/api/users/user-profile/:id', authController.getUserProfile);
app.get('/api/users/:id/liked-songs', verifyToken, authController.getLikedSongs);

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

// ==========================================
// SERVER STARTUP BLOCK (FORCED START)
// ==========================================

const connectDB = async () => {
  if (mongoose.connection.readyState === 0) {
    try {
      console.log("⏳ Connecting to database...");
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ Connected to MongoDB Database");
    } catch (err) {
      console.warn("⚠️ MongoDB Error:", err.message);
      console.warn("⚠️ Running server without database connectivity.");
    }
  }
};

// ⚡ FORCED START: No 'if' checks. We tell it to start immediately.
console.log("🚀 Booting up the server...");
connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server & WebSockets running on port ${PORT}`);
  });
});

module.exports = { app, connectDB };
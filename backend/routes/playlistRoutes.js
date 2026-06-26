const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🛡️ IMPORT THE SHIELD

// Creation & Fetching
router.post('/curated', verifyToken, playlistController.createCurated);
router.post('/bulk-curate', verifyToken, playlistController.bulkCurate);
router.post('/', verifyToken, playlistController.createPlaylist);
router.get('/', playlistController.getPlaylists); // 📖 Left public so guests can view homepage playlists

// ⚡ Add these two routes to your backend!

// 1. Get Admin/Featured Playlists for the Home Screen
router.get('/admin', authenticateUser, async (req, res) => {
  try {
    // For now, let's just fetch ALL playlists to make sure the UI works.
    // Later, you can filter this by: Playlist.find({ createdBy: "ADMIN_ID" })
    const adminPlaylists = await Playlist.find().limit(10); 
    res.status(200).json(adminPlaylists);
  } catch (err) {
    console.error("Admin Playlist Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. Get the logged-in User's personal Library
router.get('/me', authenticateUser, async (req, res) => {
  try {
    // Fetch only playlists where the creator matches the logged-in user's ID
    const myPlaylists = await Playlist.find({ createdBy: req.user._id });
    res.status(200).json(myPlaylists);
  } catch (err) {
    console.error("User Library Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Modification
router.patch('/:id/rename', verifyToken, playlistController.renamePlaylist);
router.patch('/:id/add-song', verifyToken, playlistController.addSong);
router.patch('/:id/remove-song', verifyToken, playlistController.removeSong);
router.patch('/:id/follow', verifyToken, playlistController.followPlaylist);
router.patch('/:id/edit', verifyToken, playlistController.editPlaylistDetails);

// Deletion
router.delete('/:id', verifyToken, playlistController.deletePlaylist);

module.exports = router;
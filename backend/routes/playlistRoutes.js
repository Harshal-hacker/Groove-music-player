const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🛡️ IMPORT THE SHIELD

// Creation & Fetching
router.post('/curated', verifyToken, playlistController.createCurated);
router.post('/bulk-curate', verifyToken, playlistController.bulkCurate);
router.post('/', verifyToken, playlistController.createPlaylist);
router.get('/admin', playlistController.getAdminPlaylists);
router.get('/user', verifyToken, playlistController.getUserLibrary);
router.get('/', playlistController.getPlaylists); // 📖 Left public so guests can view homepage playlists

// Modification
router.patch('/:id/rename', verifyToken, playlistController.renamePlaylist);
router.patch('/:id/add-song', verifyToken, playlistController.addSong);
router.patch('/:id/remove-song', verifyToken, playlistController.removeSong);
router.patch('/:id/follow', verifyToken, playlistController.followPlaylist);
router.patch('/:id/edit', verifyToken, playlistController.editPlaylistDetails);

// Deletion
router.delete('/:id', verifyToken, playlistController.deletePlaylist);

module.exports = router;
require('dotenv').config(); 
const express = require('express');
const router = express.Router();

// ⚡ FIX 1: Import the entire controller as one object so songController.xxx works!
const songController = require('../controllers/songController');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const fs = require('fs');

// Ensure an uploads directory exists on your local machine
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Configure Local Storage (Required for AcoustID fingerprinting)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/')
  },
  filename: function (req, file, cb) {
    // Generate a unique safe filename
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
  }
});
const upload = multer({ storage: storage });

// Custom Middleware: "Safe Upload" wrapper
const safeUpload = (req, res, next) => {
  const uploadFields = upload.fields([{ name: 'audio' }, { name: 'cover' }]);
  uploadFields(req, res, (err) => {
    if (err) {
      console.error("Multer Error:", err);
      return res.status(500).json({ message: "Upload stream error." });
    }
    next();
  });
};

// ==========================================
// ROUTES
// ==========================================
router.post('/check', verifyToken, songController.checkDuplicate);
router.get('/search', songController.searchSongs);
router.post('/import', verifyToken, songController.importSongOnline);

// ⚡ FIX 2: Used verifyToken (your actual middleware) and songController.importAlbumOnline
router.post('/import-album', verifyToken, songController.importAlbumOnline);

router.post('/upload', verifyToken, safeUpload, songController.uploadSong);
router.get('/', songController.getAllSongs);
router.patch('/:id/duration', verifyToken, songController.updateSongDuration);
router.patch('/:id', verifyToken, safeUpload, songController.updateSong);
router.delete('/:id', verifyToken, songController.deleteSong);

module.exports = router;
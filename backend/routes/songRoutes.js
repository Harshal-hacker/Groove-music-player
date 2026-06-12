const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { verifyToken } = require('../middleware/authMiddleware'); // 🛡️ IMPORT THE SHIELD
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

const storage = new CloudinaryStorage({ 
  cloudinary, 
  params: { 
    folder: 'groove_music', 
    resource_type: 'auto',
    timeout: 300000 // 🚀 5 minutes in milliseconds
  } 
});

const upload = multer({ storage });

// 👉 Custom Middleware to catch Cloudinary/Multer crashes
const safeUpload = (req, res, next) => {
  const uploadFields = upload.fields([{ name: 'audio' }, { name: 'cover' }]);
  uploadFields(req, res, (err) => {
    if (err) {
      console.error("Multer/Cloudinary Error:", err);
      return res.status(500).json({ message: "Upload stream error.", details: err.message });
    }
    next(); // If no errors, move to the controller!
  });
};

// 👉 1. Upload a new song (Protected + Safe Upload)
router.post('/upload', verifyToken, safeUpload, songController.uploadSong);

// 👉 2. Fetch all songs (Public)
router.get('/', songController.getAllSongs);

// 👉 3. Update song duration (Protected)
router.patch('/:id/duration', verifyToken, songController.updateSongDuration);

// 👉 4. Update song metadata or files (Protected + Safe Upload)
router.patch('/:id', verifyToken, safeUpload, songController.updateSong);

// 👉 5. Delete a song (Protected)
router.delete('/:id', verifyToken, songController.deleteSong);

module.exports = router;
require('dotenv').config(); // 1. Load the .env file

const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { verifyToken } = require('../middleware/authMiddleware'); 
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// ⚡ 2. THE MISSING LINK: You MUST configure Cloudinary right here! ⚡
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 3. Now, when Multer grabs 'cloudinary', it actually has the keys inside it!
const storage = new CloudinaryStorage({ 
  cloudinary, // This is now fully configured
  params: async (req, file) => {
    let targetFolder = 'groove_music'; 

    if (file.fieldname === 'cover') {
      targetFolder = 'groove_images';
    }

    return {
      folder: targetFolder, 
      resource_type: 'auto',
      timeout: 300000 
    };
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

// 👉 Pre-Flight Check (Fast, Text-Only)
router.post('/check', verifyToken, songController.checkDuplicate);

router.get('/search', songController.searchSongs);

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
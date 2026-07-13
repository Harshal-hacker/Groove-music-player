const express = require('express');
const router = express.Router();
const albumController = require('../controllers/albumController');

// 1. When the frontend asks for ALL albums (Home Page)
router.get('/', albumController.getAllAlbums);

// 2. When the frontend asks for a SPECIFIC album by ID (Album Page)
router.get('/:id', albumController.getAlbumById);

module.exports = router;
const Song = require('../models/Song');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// ⚡ Helper function to neutralize special Regex characters
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

exports.uploadSong = async (req, res) => {
  try {
    // ⚡ Added 'category' extraction
    const { title, artist, duration, category } = req.body;

    // 🛡️ THE FIX: Grab identity directly from the secure Token, not the body!
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

    // 🛡️ THE SHIELD: Case-insensitive check WITH escaped characters!
    const safeTitle = escapeRegex(title.trim());
    const safeArtist = escapeRegex(artist.trim());

    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${safeTitle}$`, 'i') }, 
      artist: { $regex: new RegExp(`^${safeArtist}$`, 'i') } 
    });

    if (existingSong) {
      console.log(`[DUPLICATE DETECTED] "${title}" already exists. Trashing files...`);
      
      // 🧹 THE JANITOR: Delete the duplicate files Multer just sent to Cloudinary
      if (req.files) {
        if (req.files['audio']) await cloudinary.uploader.destroy(req.files['audio'][0].filename, { resource_type: 'video' });
        if (req.files['cover']) await cloudinary.uploader.destroy(req.files['cover'][0].filename, { resource_type: 'image' });
      }
      
      // 🚫 ABORT: Return 409 so the frontend Bulk Importer knows to skip it
      return res.status(409).json({ 
        message: `"${title}" by ${artist} is already in your library. Skipped duplicate.` 
      }); 
    }

    if (!req.files || !req.files['audio']) {
      return res.status(400).json({ message: "Audio file is required." });
    }

    // ✅ SAVE TO DATABASE
    const newSong = new Song({
      title: title.trim(),
      artist: artist.trim(),
      category: category || "All", // ⚡ Saves category if provided
      duration: duration ? parseFloat(duration) : 0, 
      src: req.files['audio'][0].path,
      cover: req.files['cover'] ? req.files['cover'][0].path : "https://res.cloudinary.com/your_cloud/image/upload/v1/Groove.png", 
    });

    await newSong.save();
    console.log(`🎵 Successfully uploaded and saved: ${title}`);
    
    res.status(201).json(newSong);

  } catch (dbErr) {
    logger.error("Database crash during song upload", { message: dbErr.message, userId: req.user?.userId });
    res.status(500).json({ error: "Server error." });
  }
};

exports.getAllSongs = async (req, res) => {
  try {
    const allSongs = await Song.find(); 
    res.json(allSongs);
  } catch (error) {
    logger.error("The REAL database error is:", error); 
    res.status(500).json({ error: "Failed to fetch songs" });
  }
};

exports.updateSongDuration = async (req, res) => {
  try {
    const { duration } = req.body;
    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id,
      { duration: duration },
      { returnDocument: 'after' } // 🛑 No more yellow warnings!
    );
    res.json(updatedSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSong = async (req, res) => {
  try {
    // 🛡️ THE FIX: Only Admins can edit metadata
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

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
    logger.error("Update Error:", error);
    res.status(500).json({ message: "Server error during update", error: error.message });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    // 1. SECURITY: Ensure only Admins can delete
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

    // 2. FIND THE SONG: We need it to get the Cloudinary URLs
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    // 3. THE JANITOR: Delete the physical files from Cloudinary
    // We split the URL to grab the file name (public_id) and tell Cloudinary to delete it
    if (song.src && song.src.includes('cloudinary')) {
      const audioPublicId = song.src.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(audioPublicId, { resource_type: 'video' });
    }
    
    // We make sure NOT to delete your default Groove.png placeholder!
    if (song.cover && song.cover.includes('cloudinary') && !song.cover.includes('Groove.png')) {
      const coverPublicId = song.cover.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(coverPublicId);
    }

    // 4. CLEANUP PLAYLISTS: Remove this song from all users' Liked Songs
    await User.updateMany(
      { likedSongs: req.params.id },
      { $pull: { likedSongs: req.params.id } }
    );

    // 5. DATABASE PURGE: Finally, delete the record from MongoDB
    await Song.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Song completely and permanently deleted!" });
  } catch (error) {
    logger.error("Delete Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================================================
// PRE-FLIGHT CHECK: Instantly verify if a song exists 
// without uploading any files to Cloudinary.
// =========================================================
exports.checkDuplicate = async (req, res) => {
  try {
    const { title, artist } = req.body;

    if (!title || !artist) {
      return res.status(400).json({ error: "Title and artist required." });
    }

    // Escape special regex characters
    const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeTitle = escapeRegex(title.trim());
    const safeArtist = escapeRegex(artist.trim());

    // Check the database
    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${safeTitle}$`, 'i') }, 
      artist: { $regex: new RegExp(`^${safeArtist}$`, 'i') } 
    });

    if (existingSong) {
      // It exists! Tell the frontend to stop.
      return res.status(409).json({ isDuplicate: true, message: "Song already exists." });
    }

    // It's brand new! Give the frontend the green light to upload the heavy files.
    res.status(200).json({ isDuplicate: false, message: "Clear to upload." });

  } catch (error) {
    console.error("Duplicate Check Error:", error);
    res.status(500).json({ error: "Server error during check." });
  }
};

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query; // The 'q' from the URL
    
    // Use MongoDB regex to find matches in title or artist
    const songs = await Song.find({ 
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { artist: { $regex: q, $options: 'i' } }
      ]
    });
    
    res.json(songs);
  } catch (err) {
    console.error("Search controller error:", err);
    res.status(500).json({ message: "Search failed" });
  }
};
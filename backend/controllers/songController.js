const Song = require('../models/Song');
const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, duration } = req.body;

    // 🛡️ THE FIX: Grab identity directly from the secure Token, not the body!
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (userRole !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${title.trim()}$`, 'i') }, 
      artist: { $regex: new RegExp(`^${artist.trim()}$`, 'i') } 
    });

    if (existingSong) {
      // 🧹 THE JANITOR
      if (req.files) {
        if (req.files['audio']) await cloudinary.uploader.destroy(req.files['audio'][0].filename, { resource_type: 'video' });
        if (req.files['cover']) await cloudinary.uploader.destroy(req.files['cover'][0].filename);
      }
      return res.status(200).json(existingSong); 
    }

    if (!req.files || !req.files['audio']) {
      return res.status(400).json({ message: "Audio file is required." });
    }

    const newSong = new Song({
      title: title.trim(),
      artist: artist.trim(),
      duration: duration ? parseFloat(duration) : 0, 
      src: req.files['audio'][0].path,
      cover: req.files['cover'] ? req.files['cover'][0].path : "https://res.cloudinary.com/your_cloud/image/upload/v1/Groove.png", 
    });

    await newSong.save();
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
    // 🛡️ THE FIX: Secure admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }

    const deletedSong = await Song.findByIdAndDelete(req.params.id);
    if (!deletedSong) return res.status(404).json({ message: "Song not found" });

    res.status(200).json({ message: "Song deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
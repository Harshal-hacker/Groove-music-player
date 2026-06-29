const Playlist = require('../models/Playlist');
const User = require('../models/User');

exports.createCurated = async (req, res) => {
  try { 
    const { name, userId, category } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied" });
    }

    const newCurated = new Playlist({
      name: name || "Curated Edition Mix",
      createdBy: userId,
      isReadyMade: true,
      category: category || "Featured",
      songIds: []
    });

    const saved = await newCurated.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkCurate = async (req, res) => {
  try {
    const { playlistName, songIds, userId } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

    const targetName = playlistName || "Bulk Curated Release";
    const existingPlaylist = await Playlist.findOne({ name: targetName });

    if (existingPlaylist) {
      await Playlist.findByIdAndUpdate(
        existingPlaylist._id,
        { $addToSet: { songIds: { $each: songIds } } }
      );
      res.status(200).json({ message: "Appended to existing playlist", playlistId: existingPlaylist._id });
    } else {
      const bulkPlaylist = new Playlist({
        name: targetName,
        createdBy: userId,
        isReadyMade: true,
        songIds: songIds, 
        playlistCover: "/Groove.png"
      });
      await bulkPlaylist.save();
      res.status(201).json(bulkPlaylist);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 1. CREATE PLAYLIST
exports.createPlaylist = async (req, res) => {
  try {
    const { name } = req.body;
    
    // 🛡️ THE FIX: Grab the ID securely from the verified token!
    const createdBy = req.user.userId;

    if (!createdBy) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID in token." });
    }

    const newPlaylist = new Playlist({ 
      name: name || "New Playlist", 
      createdBy: createdBy, 
      songIds: [] 
    });
    
    const savedPlaylist = await newPlaylist.save();

    // ⚡ SHOUT DOWN THE TUNNEL: "New Playlist Created!"
    const io = req.app.get('io');
    if (io) io.to(createdBy.toString()).emit('playlistCreated', savedPlaylist);

    res.status(201).json(savedPlaylist);
  } catch (err) {
    console.error("Backend Create Error:", err);
    res.status(400).json({ error: err.message });
  }
};

// 2. RENAME PLAYLIST
exports.renamePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user.userId; // Ensure this matches your auth middleware

    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { _id: id, createdBy: userId },
      { name },
      { new: true }
    );

    if (!updatedPlaylist) return res.status(404).json({ message: "Playlist not found or unauthorized" });

    // Broadcast the update so the web app and other devices see the rename live
    const io = req.app.get('io');
    if (io) io.to(userId.toString()).emit('playlistUpdated', updatedPlaylist);

    res.status(200).json(updatedPlaylist);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// 3. DELETE PLAYLIST
exports.deletePlaylist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId; // Securely get ID from token

    const deleted = await Playlist.findOneAndDelete({ _id: id, createdBy: userId });
    
    if (!deleted) return res.status(404).json({ message: "Playlist not found or unauthorized" });

    // ⚡ SHOUT DOWN THE TUNNEL: Update the web app live
    const io = req.app.get('io');
    if (io) io.to(userId.toString()).emit('playlistDeleted', id);

    res.status(200).json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPlaylists = async (req, res) => {
  const { userId } = req.query;
  
  try {
    let queryCondition = {};
    const hasValidUser = userId && userId !== 'null' && userId !== 'undefined' && userId.trim() !== '';

    if (hasValidUser) {
      queryCondition = {
        $or: [
          { createdBy: userId },
          { followers: userId },
          { isReadyMade: true }
        ]
      };
    } else {
      queryCondition = { isReadyMade: true };
    }

    const playlists = await Playlist.find(queryCondition).populate('songIds');
    res.status(200).json(playlists);
  } catch (err) {
    console.error("Critical Playlist Fetch Error:", err);
    res.status(500).json({ message: "Internal server error fetching collections." });
  }
};

exports.addSong = async (req, res) => {
  try {
    const { songId, userId } = req.body;
    const playlist = await Playlist.findById(req.params.id);

    if (!playlist) return res.status(404).json({ error: "Not found" });

    if (playlist.isReadyMade) {
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Ready-made playlists cannot be modified by standard users." });
      }
    }

    playlist.songIds.addToSet(songId);
    await playlist.save();
    
    const freshlyPopulatedPlaylist = await Playlist.findById(req.params.id).populate('songIds');
    res.json(freshlyPopulatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeSong = async (req, res) => {
  try {
    const { songId } = req.body;
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      req.params.id,
      { $pull: { songIds: songId } }, 
      { new: true }
    ).populate('songIds');            
    
    res.json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.followPlaylist = async (req, res) => {
  const { userId } = req.body;
  const playlistId = req.params.id;

  if (!userId) return res.status(400).json({ message: "User ID context is required." });

  try {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) return res.status(404).json({ message: "Target playlist not found." });

    const isFollowing = playlist.followers.includes(userId);

    if (isFollowing) {
      playlist.followers = playlist.followers.filter(id => String(id) !== String(userId));
    } else {
      playlist.followers.push(userId);
    }

    await playlist.save();
    
    const updatedPlaylist = await Playlist.findById(playlistId).populate('songIds');
    res.status(200).json(updatedPlaylist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update Playlist Details (Name, Cover, Category)
exports.editPlaylistDetails = async (req, res) => {
  try {
    const { name, playlistCover, category } = req.body;
    const playlistId = req.params.id;

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { name, playlistCover, category },
      { new: true } // Returns the updated document
    ).populate('songIds'); // Ensures the tracks are still attached to the response

    if (!updatedPlaylist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.status(200).json(updatedPlaylist);
  } catch (error) {
    console.error("Edit Playlist Error:", error);
    res.status(500).json({ message: "Failed to update playlist details" });
  }
};

// Fetch Admin playlists using Pagination (The Spotify Way)
exports.getAdminPlaylists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const adminPlaylists = await Playlist.find({ isReadyMade: true })
      .populate('songIds')
      .skip(skip)
      .limit(limit);

    const totalPlaylists = await Playlist.countDocuments({ isReadyMade: true });
    const hasMore = skip + adminPlaylists.length < totalPlaylists;

    res.status(200).json({
      data: adminPlaylists,
      currentPage: page,
      hasMore: hasMore
    });

  } catch (err) {
    console.error("Admin Playlist Fetch Error:", err);
    res.status(500).json({ message: "Internal server error fetching admin playlists." });
  }
};

// Fetch strictly the logged-in user's created and followed playlists
exports.getUserLibrary = async (req, res) => {
  try {
    // The verifyToken middleware securely provides req.user
    const userId = req.user.userId; 

    // Find playlists I created OR playlists I hit the "save/heart" button on
    const myPlaylists = await Playlist.find({
      $or: [
        { createdBy: userId },
        { followers: userId }
      ]
    }).populate('songIds');

    res.status(200).json(myPlaylists);
  } catch (err) {
    console.error("User Library Fetch Error:", err);
    res.status(500).json({ message: "Internal server error fetching library." });
  }
};
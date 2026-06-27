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

exports.createPlaylist = async (req, res) => {
  try {
    const { name, createdBy } = req.body;
    const newPlaylist = new Playlist({ name, createdBy });
    const savedPlaylist = await newPlaylist.save();
    res.status(201).json(savedPlaylist);
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

exports.renamePlaylist = async (req, res) => {
  try {
    const { name } = req.body;
    const playlist = await Playlist.findById(req.params.id);
    
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    // 🛡️ OWNERSHIP CHECK
    if (playlist.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You can only rename your own playlists." });
    }

    playlist.name = name;
    await playlist.save();
    
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
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

exports.deletePlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: "Playlist not found" });

    // 🛡️ OWNERSHIP CHECK
    if (playlist.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You can only delete your own playlists." });
    }

    await Playlist.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
    // 1. Check what page the mobile app is asking for (default to page 1)
    const page = parseInt(req.query.page) || 1;
    // 2. Decide how many items to send per page (default to 10)
    const limit = parseInt(req.query.limit) || 10;
    // 3. Calculate how many items to skip in the database
    const skip = (page - 1) * limit;

    // 4. Fetch only the specific chunk of data
    const adminPlaylists = await Playlist.find({ isReadyMade: true })
      .populate('songIds')
      .skip(skip)
      .limit(limit);

    // 5. Count total playlists so the mobile app knows when to stop asking
    const totalPlaylists = await Playlist.countDocuments({ isReadyMade: true });
    const hasMore = skip + adminPlaylists.length < totalPlaylists;

    // 6. Send the chunk AND the metadata back to the phone
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
const Album = require('../models/Album');
const Song = require('../models/Song'); // ⚡ Required so we can find the songs!

// ==========================================
// 1. HOME SCREEN: Fetch all albums
// ==========================================
exports.getAllAlbums = async (req, res) => {
  try {
    // Fetches all albums and sorts them so the newest imports appear first!
    // I added .populate('artists') so your frontend can show the artist name on the cover!
    const albums = await Album.find().populate('artists').sort({ _id: -1 });
    res.status(200).json(albums);
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ error: "Failed to fetch albums" });
  }
};

// ==========================================
// 2. ALBUM SCREEN: Fetch ONE album and its songs
// ==========================================
exports.getAlbumById = async (req, res) => {
  try {
    // 1. Find the specific album by the ID in the URL
    const album = await Album.findById(req.params.id).populate('artists');
    if (!album) return res.status(404).json({ message: "Album not found" });

    // 2. Find all songs in the database that belong to this album ID
    const songs = await Song.find({ albumId: req.params.id }).populate('artists');

    // 3. Send both the album info AND the songs back to the frontend
    res.status(200).json({ album, songs });
  } catch (error) {
    console.error("Error fetching album details:", error);
    res.status(500).json({ error: "Server error fetching album details" });
  }
};
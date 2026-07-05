const Album = require('../models/Album');

exports.getAllAlbums = async (req, res) => {
  try {
    // Fetches all albums and sorts them so the newest imports appear first!
    const albums = await Album.find().sort({ _id: -1 });
    res.status(200).json(albums);
  } catch (error) {
    console.error("Error fetching albums:", error);
    res.status(500).json({ error: "Failed to fetch albums" });
  }
};
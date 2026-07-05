require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const readline = require('readline'); // ⚡ Added for safety

const Song = require('./models/Song');
const Artist = require('./models/Artist');
const Album = require('./models/Album');
const Playlist = require('./models/Playlist');
const User = require('./models/User');

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper to extract Public ID
const extractPublicId = (url) => {
  if (!url || !url.includes('cloudinary') || url.includes('Groove.png')) return null;
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    return withoutVersion.substring(0, withoutVersion.lastIndexOf('.'));
  }
  return null;
};

const nukeDatabase = async () => {
  // ⚡ Safety Prompt
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => rl.question("⚠️ ARE YOU SURE? This will delete ALL database content and Cloudinary assets. Type 'YES': ", resolve));
  rl.close();

  if (answer !== 'YES') {
    console.log("🛑 Nuke aborted.");
    process.exit(0);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB.");

    console.log("🧹 1. Sweeping Cloudinary...");
    const songs = await Song.find();
    const albums = await Album.find(); // ⚡ Fetch albums to clean their covers
    
    // Process Songs (Audio)
    for (const song of songs) {
      const audioId = extractPublicId(song.audioUrl);
      if (audioId) await cloudinary.uploader.destroy(audioId, { resource_type: 'video' });
    }

    // Process Albums (Covers)
    for (const album of albums) {
      const coverId = extractPublicId(album.coverArt);
      if (coverId) await cloudinary.uploader.destroy(coverId, { resource_type: 'image' });
    }
    
    console.log("✅ Cloudinary cleaned.");

    console.log("🔥 2. NUKING MongoDB Collections...");
    await Song.deleteMany({});
    await Artist.deleteMany({});
    await Album.deleteMany({});
    await Playlist.deleteMany({});

    console.log("🧹 3. Clearing User Libraries...");
    await User.updateMany({}, { $set: { likedSongs: [] } });

    console.log("🎉 RESET COMPLETE!");
    process.exit(0);
  } catch (err) {
    console.error("❌ CRITICAL ERROR:", err);
    process.exit(1);
  }
};

nukeDatabase();
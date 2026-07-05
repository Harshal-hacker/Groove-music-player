require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const Song = require('./models/Song'); 
const Album = require('./models/Album'); // ⚡ Import Album model

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function auditLibrary() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB. Starting thorough audit...");

    // ⚡ Fetch both Songs and Albums to get all valid URLs
    const dbSongs = await Song.find();
    const dbAlbums = await Album.find();
    
    const dbUrls = new Set(); // Use a Set for faster lookup
    
    dbSongs.forEach(song => {
      if (song.audioUrl) dbUrls.add(song.audioUrl);
    });
    
    dbAlbums.forEach(album => {
      if (album.coverArt) dbUrls.add(album.coverArt);
    });

    // ⚡ Fetch Cloudinary resources (Simplified logic)
    const audioResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'groove_music/', max_results: 500 });
    const imageResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'image', prefix: 'groove_images/', max_results: 500 });
    
    const cloudinaryFiles = [...audioResult.resources, ...imageResult.resources];
    let deletedCount = 0;

    for (const file of cloudinaryFiles) {
      if (!dbUrls.has(file.secure_url)) {
        console.log(`🧹 Deleting orphan: ${file.public_id}`);
        await cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type });
        deletedCount++;
      }
    }

    console.log(`🏁 Audit complete! Cleaned up ${deletedCount} orphaned files.`);
    process.exit(0);
  } catch (err) {
    console.error("Audit failed:", err);
    process.exit(1);
  }
}

auditLibrary();
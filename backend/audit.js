require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose');
const Song = require('./models/Song'); 

console.log("Checking API Key:", process.env.CLOUDINARY_API_KEY); // Add this line!

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function auditLibrary() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB. Starting audit...");

    const dbSongs = await Song.find();
    
    // 🛡️ THE FIX: Add BOTH audio and image URLs to the safe list
    const dbUrls = [];
    dbSongs.forEach(song => {
      if (song.src) dbUrls.push(song.src);
      if (song.cover) dbUrls.push(song.cover);
    });

    // 🛡️ THE FIX: Fetch audio and images separately, then combine them
    const audioResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'video', prefix: 'groove_music/', max_results: 500 });
    const imageResult = await cloudinary.api.resources({ type: 'upload', resource_type: 'image', prefix: 'groove_music/', max_results: 500 });
    
    const cloudinaryFiles = [...audioResult.resources, ...imageResult.resources];
    let deletedCount = 0;

    for (const file of cloudinaryFiles) {
      if (!dbUrls.includes(file.secure_url)) {
        console.log(`🧹 Deleting orphan: ${file.public_id}`);
        // Ensure we pass the correct resource type when deleting!
        await cloudinary.uploader.destroy(file.public_id, { resource_type: file.resource_type });
        deletedCount++;
      }
    }

    console.log(`🏁 Audit complete! Cleaned up ${deletedCount} orphaned files.`);
    process.exit();
  } catch (err) {
    console.error("Audit failed:", err);
    process.exit(1);
  }
}

auditLibrary();
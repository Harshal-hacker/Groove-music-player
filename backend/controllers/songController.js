const play = require('play-dl');
const Song = require('../models/Song'); 
const User = require('../models/User'); 
const Artist = require('../models/Artist'); 
const Album = require('../models/Album'); 
const cloudinary = require('cloudinary').v2; 
const fs = require('fs'); 

const { searchItunesTrack, searchItunesAlbumTracks } = require('../utils/itunesHelper');
const { extractLocalMetadata } = require('../utils/metadataHelper');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const escapeRegex = (string) => { 
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
};

const splitArtists = (artistString) => {
    if (!artistString) return ["Unknown Artist"];
    return artistString.split(/,|&|\band\b|\bfeat\.?\b|\bft\.?\b/i)
                       .map(name => name.trim())
                       .filter(name => name.length > 0);
};

const getArtistIds = async (artistNames) => {
    const ids = [];
    for (const name of artistNames) {
        const safeName = escapeRegex(name);
        const artistDoc = await Artist.findOneAndUpdate(
            { name: { $regex: new RegExp(`^${safeName}$`, 'i') } },
            { $setOnInsert: { name: name } },
            { upsert: true, returnDocument: 'after' }
        );
        ids.push(artistDoc._id);
    }
    return ids;
};

// ⚡ DIRECT PIPELINE: ZERO DISK USAGE & OOM PREVENTION
const streamToCloudinary = (youtubeUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Grabs the highest quality official audio stream natively
      const ytStream = await play.stream(youtubeUrl);
      if (!ytStream || !ytStream.stream) throw new Error("Could not extract official audio stream.");

      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "groove_music" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        }
      );
      
      ytStream.stream.pipe(uploadStream);
      ytStream.stream.on('error', (err) => reject(err));
      
    } catch (err) {
      reject(err);
    }
  });
};

// ==========================================
// 1. BULK UPLOAD SONG (ID3 -> iTunes -> DB)
// ==========================================
exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, album, duration, category } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    if (!req.files || !req.files['audio']) return res.status(400).json({ message: "Audio file is required." });

    let searchTitle = title ? title.trim() : "";
    let searchArtist = artist ? artist.trim() : "";
    let searchDuration = duration ? parseFloat(duration) : 0;
    let fallbackBase64Cover = null;

    if (!searchTitle) {
        const localData = await extractLocalMetadata(req.files['audio'][0].path);
        if (localData && localData.title) {
            searchTitle = localData.title;
            searchArtist = localData.artist || "Unknown Artist";
            searchDuration = localData.duration || 0;
            fallbackBase64Cover = localData.coverArt; 
        } else {
            const fileName = req.files['audio'][0].originalname.replace(/\.[^/.]+$/, ""); 
            if (fileName.includes('-')) {
                const parts = fileName.split('-');
                searchArtist = parts[0].trim();
                searchTitle = parts[1].trim();
            } else {
                searchTitle = fileName.trim();
                searchArtist = "Unknown Artist";
            }
        }
    }

    let enrichedData = {
        title: searchTitle,
        artist: searchArtist,
        album: album ? album.trim() : "Single",
        duration: searchDuration,
        coverArt: "https://res.cloudinary.com/your_cloud/image/upload/v1/Groove.png"
    };

    try {
        const onlineData = await searchItunesTrack(enrichedData.title, enrichedData.artist);
        if (onlineData) {
            enrichedData.title = onlineData.songTitle;
            enrichedData.artist = onlineData.artistName;
            enrichedData.album = onlineData.albumTitle;
            enrichedData.duration = onlineData.duration > 0 ? onlineData.duration : enrichedData.duration;
            enrichedData.coverArt = onlineData.coverArt; 
        } else {
            if (fallbackBase64Cover) enrichedData.coverArt = fallbackBase64Cover;
        }
    } catch (apiErr) {
        if (fallbackBase64Cover) enrichedData.coverArt = fallbackBase64Cover;
    }

    const audioResult = await cloudinary.uploader.upload(req.files['audio'][0].path, { resource_type: "video", folder: "groove_music" });
    const audioUrl = audioResult.secure_url;
    
    if (req.files['cover']) {
       const coverResult = await cloudinary.uploader.upload(req.files['cover'][0].path, { resource_type: "image", folder: "groove_images" });
       enrichedData.coverArt = coverResult.secure_url;
    } else if (enrichedData.coverArt && enrichedData.coverArt.startsWith('data:image')) {
       const coverResult = await cloudinary.uploader.upload(enrichedData.coverArt, { resource_type: "image", folder: "groove_images" });
       enrichedData.coverArt = coverResult.secure_url;
    }

    const artistIds = await getArtistIds(splitArtists(enrichedData.artist));
    const safeAlbum = escapeRegex(enrichedData.album);
    
    const albumDoc = await Album.findOneAndUpdate(
      { title: { $regex: new RegExp(`^${safeAlbum}$`, 'i') } },
      { $setOnInsert: { title: enrichedData.album, artists: [artistIds[0]], coverArt: enrichedData.coverArt } },
      { upsert: true, returnDocument: 'after' }
    );

    const newSong = new Song({
      title: enrichedData.title, artists: artistIds, albumId: albumDoc._id, category: category || "All", duration: enrichedData.duration, audioUrl: audioUrl
    });
    
    await newSong.save();
    const populatedSong = await Song.findById(newSong._id).populate('artists').populate('albumId');
    
    try {
      if (req.files['audio']) fs.unlinkSync(req.files['audio'][0].path);
      if (req.files['cover']) fs.unlinkSync(req.files['cover'][0].path);
    } catch (cleanupErr) {}

    res.status(201).json(populatedSong);
    
  } catch (dbErr) {
    res.status(500).json({ error: "Server error." });
  }
};

// ==========================================
// REMAINING CONTROLLERS
// ==========================================
exports.getAllSongs = async (req, res) => {
  try {
    const allSongs = await Song.find().populate('artists').populate('albumId');
    res.json(allSongs);
  } catch (error) { res.status(500).json({ error: "Failed to fetch songs" }); }
};

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query; 
    const matchingArtists = await Artist.find({ name: { $regex: q, $options: 'i' } }).select('_id');
    const artistIds = matchingArtists.map(a => a._id);
    const songs = await Song.find({ $or: [{ title: { $regex: q, $options: 'i' } }, { artists: { $in: artistIds } }] }).populate('artists').populate('albumId');
    res.json(songs);
  } catch (err) { res.status(500).json({ message: "Search failed" }); }
};

exports.checkDuplicate = async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) return res.status(400).json({ error: "Required fields missing." });
    const safeArtist = escapeRegex(artist.trim());
    const artistDoc = await Artist.findOne({ name: { $regex: new RegExp(`^${safeArtist}$`, 'i') } });
    if (!artistDoc) return res.status(200).json({ isDuplicate: false });
    const existingSong = await Song.findOne({ title: { $regex: new RegExp(`^${escapeRegex(title.trim())}$`, 'i') }, artists: artistDoc._id });
    res.status(200).json({ isDuplicate: !!existingSong });
  } catch (error) { res.status(500).json({ error: "Server error during check." }); }
};

exports.updateSongDuration = async (req, res) => {
  try {
    const updatedSong = await Song.findByIdAndUpdate(req.params.id, { duration: req.body.duration }, { returnDocument: 'after' }).populate('artists').populate('albumId');
    res.json(updatedSong);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.updateSong = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    const { title, artist } = req.body;
    let updateData = { title };
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    if (artist) updateData.artists = await getArtistIds(splitArtists(artist.trim()));

    if (req.files && req.files['audio']) {
      if (song.audioUrl && song.audioUrl.includes('cloudinary')) {
        const oldPublicId = song.audioUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`groove_music/${oldPublicId}`, { resource_type: 'video' });
      }
      const newUpload = await cloudinary.uploader.upload(req.files['audio'][0].path, { resource_type: "video", folder: "groove_music" });
      updateData.audioUrl = newUpload.secure_url;
      fs.unlinkSync(req.files['audio'][0].path);
    }

    const updatedSong = await Song.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' }).populate('artists').populate('albumId');
    res.status(200).json(updatedSong);
  } catch (error) { res.status(500).json({ message: "Server error during update", error: error.message }); }
};

exports.deleteSong = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    if (song.audioUrl && song.audioUrl.includes('cloudinary')) {
      const audioPublicId = song.audioUrl.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`groove_music/${audioPublicId}`, { resource_type: 'video' });
    }
    
    await User.updateMany({ likedSongs: req.params.id }, { $pull: { likedSongs: req.params.id } });
    await Song.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// ==========================================
// DIRECT INTERNET IMPORT PIPELINE
// ==========================================
exports.importSongOnline = async (req, res) => {
  try {
    const { searchQuery, category } = req.body; 
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    if (!searchQuery) return res.status(400).json({ message: "Please provide a search term." });

    console.log(`🌐 Initiating Direct Import for: "${searchQuery}"`);
    const itunesData = await searchItunesTrack(searchQuery, "");
    if (!itunesData) return res.status(404).json({ message: "Could not find official metadata." });

    const artistIds = await getArtistIds(splitArtists(itunesData.artistName));
    const existingSong = await Song.findOne({ title: { $regex: new RegExp(`^${escapeRegex(itunesData.songTitle.trim())}$`, 'i') }, artists: { $in: artistIds } });
    if (existingSong) {
        console.log(`⏭️ Skipping: "${itunesData.songTitle}" already exists in your library.`);
        return res.status(200).json(existingSong); 
    }

    console.log(`🔍 Searching YouTube for official audio...`);
    const primaryArtist = itunesData.artistName.split(',')[0].split('&')[0].trim();
    
    // ⚡ STRICTLY FETCH OFFICIAL AUDIO
    const ytResults = await play.search(`${itunesData.songTitle} ${primaryArtist} official audio`, { 
        limit: 1, source: { youtube: "video" } 
    });
    
    if (!ytResults || ytResults.length === 0 || !ytResults[0].url) {
        return res.status(404).json({ message: "Could not find a valid official video on YouTube." });
    }
    
    const cleanUrl = ytResults[0].url.split('&')[0];
    console.log(`✅ Located official source at ${cleanUrl}! Streaming direct to Cloudinary...`);

    let audioUrl = "";
    try {
        audioUrl = await streamToCloudinary(cleanUrl);
    } catch (downloadErr) {
        console.error("❌ Audio extraction failed:", downloadErr.message);
        throw downloadErr;
    }
    
    console.log(`✅ Audio successfully saved to Cloudinary!`);

    console.log("☁️ Uploading cover art to Cloudinary...");
    const coverResult = await cloudinary.uploader.upload(itunesData.coverArt, { resource_type: "image", folder: "groove_images" });

    console.log("💾 Saving organized data to MongoDB...");
    const safeAlbum = escapeRegex(itunesData.albumTitle);
    const albumDoc = await Album.findOneAndUpdate(
      { title: { $regex: new RegExp(`^${safeAlbum}$`, 'i') } },
      { $setOnInsert: { title: itunesData.albumTitle, artists: [artistIds[0]], coverArt: coverResult.secure_url } },
      { upsert: true, returnDocument: 'after' }
    );

    const newSong = new Song({
      title: itunesData.songTitle, artists: artistIds, albumId: albumDoc._id, category: category || "All", duration: itunesData.duration, audioUrl: audioUrl
    });
    
    await newSong.save();
    const populatedSong = await Song.findById(newSong._id).populate('artists').populate('albumId');

    console.log("🎉 Direct Import Complete!");
    res.status(201).json(populatedSong);

  } catch (error) {
    console.error("Import Error:", error);
    res.status(500).json({ error: "Failed to import song." });
  }
};

// ==========================================
// BATCH ALBUM / MOVIE IMPORT 
// ==========================================
exports.importAlbumOnline = async (req, res) => {
  try {
    const { searchQuery, category } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    if (!searchQuery) return res.status(400).json({ message: "Please provide a search term." });

    console.log(`💿 Initiating Album/Movie Import for: "${searchQuery}"`);
    const tracks = await searchItunesAlbumTracks(searchQuery);
    if (!tracks || tracks.length === 0) return res.status(404).json({ message: "Could not find album metadata." });

    console.log(`✅ Found Album with ${tracks.length} tracks. Starting mass download...`);
    console.log("☁️ Uploading Master Album cover art to Cloudinary...");
    const coverResult = await cloudinary.uploader.upload(tracks[0].coverArt, { resource_type: "image", folder: "groove_images" });
    const coverUrl = coverResult.secure_url;

    let importedSongs = [];

    for (const track of tracks) {
        console.log(`\n🎵 Processing: ${track.songTitle} by ${track.artistName}`);
        try {
            const artistIds = await getArtistIds(splitArtists(track.artistName));
            const existingSong = await Song.findOne({ title: { $regex: new RegExp(`^${escapeRegex(track.songTitle.trim())}$`, 'i') }, artists: { $in: artistIds } });

            if (existingSong) {
                console.log(`⏭️ Skipping ${track.songTitle} - Already exists in database.`);
                continue; 
            }

            const primaryArtist = track.artistName.split(',')[0].split('&')[0].trim();
            
            // ⚡ STRICTLY FETCH OFFICIAL AUDIO
            const ytResults = await play.search(`${track.songTitle} ${primaryArtist} official audio`, { 
                limit: 1, source: { youtube: "video" } 
            });
            
            if (!ytResults || ytResults.length === 0 || !ytResults[0].url) {
                console.log(`⚠️ Skipping ${track.songTitle} - Could not find a valid official video URL.`);
                continue;
            }

            const cleanUrl = ytResults[0].url.split('&')[0];
            console.log(`🔗 Found official stream source: ${cleanUrl}`);

            let audioUrl = "";
            try {
                audioUrl = await streamToCloudinary(cleanUrl);
            } catch (downloadErr) {
                console.error(`❌ Audio extraction failed for ${track.songTitle}:`, downloadErr.message);
                throw downloadErr;
            }
            
            const albumDoc = await Album.findOneAndUpdate(
              { title: { $regex: new RegExp(`^${escapeRegex(track.albumTitle)}$`, 'i') } },
              { $setOnInsert: { title: track.albumTitle, artists: [artistIds[0]], coverArt: coverUrl } },
              { upsert: true, returnDocument: 'after' }
            );

            const newSong = new Song({
              title: track.songTitle, artists: artistIds, albumId: albumDoc._id, category: category || "All", duration: track.duration, audioUrl: audioUrl
            });
            
            await newSong.save();
            importedSongs.push(newSong);
            console.log(`✅ Success: ${track.songTitle}`);
            
        } catch (trackErr) {
            console.error(`❌ Failed on ${track.songTitle}:`, trackErr.message || trackErr);
        }
    }

    console.log(`🎉 Album Import Complete! ${importedSongs.length}/${tracks.length} imported.`);
    res.status(201).json({ message: `Successfully imported ${importedSongs.length} tracks from ${tracks[0].albumTitle}!` });

  } catch (error) {
    console.error("Album Import Error:", error);
    res.status(500).json({ error: "Server failed to process album." });
  }
};
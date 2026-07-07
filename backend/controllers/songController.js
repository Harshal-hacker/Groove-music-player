const play = require('play-dl');
const youtubedl = require('youtube-dl-exec');
const ffmpegPath = require('ffmpeg-static'); // ⚡ The Media Engine
const Song = require('../models/Song'); 
const User = require('../models/User'); 
const Artist = require('../models/Artist'); 
const Album = require('../models/Album'); 
const cloudinary = require('cloudinary').v2; 
const fs = require('fs'); 
const os = require('os'); 
const path = require('path');

const { searchItunesTrack, searchItunesAlbumTracks } = require('../utils/itunesHelper');
const { extractLocalMetadata } = require('../utils/metadataHelper');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ⚡ THE AUTO-RETRY SHIELD
const uploadWithRetry = async (filePath, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await cloudinary.uploader.upload(filePath, options);
        } catch (err) {
            if (i === retries - 1) throw err;
            console.log(`⚠️ Network drop detected during upload. Retrying (Attempt ${i + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, 3000)); 
        }
    }
};

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

// ==========================================
// 1. BULK UPLOAD SONG (ID3 -> iTunes -> DB)
// ==========================================
exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, album, duration, category } = req.body;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access Denied: Admin only." });
    }
    if (!req.files || !req.files['audio']) {
      return res.status(400).json({ message: "Audio file is required." });
    }

    let searchTitle = title ? title.trim() : "";
    let searchArtist = artist ? artist.trim() : "";
    let searchDuration = duration ? parseFloat(duration) : 0;
    let fallbackBase64Cover = null;

    if (!searchTitle) {
        console.log("📂 Automated upload detected. Extracting ID3 tags from file...");
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

    const audioResult = await uploadWithRetry(req.files['audio'][0].path, { 
      resource_type: "video", 
      folder: "groove_music",
      timeout: 120000
    });
    const audioUrl = audioResult.secure_url;
    
    if (req.files['cover']) {
       const coverResult = await uploadWithRetry(req.files['cover'][0].path, { 
         resource_type: "image", folder: "groove_images", timeout: 120000
       });
       enrichedData.coverArt = coverResult.secure_url;
    } else if (enrichedData.coverArt && enrichedData.coverArt.startsWith('data:image')) {
       const coverResult = await uploadWithRetry(enrichedData.coverArt, {
         resource_type: "image", folder: "groove_images", timeout: 120000
       });
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
      title: enrichedData.title,
      artists: artistIds,
      albumId: albumDoc._id,
      category: category || "All", 
      duration: enrichedData.duration, 
      audioUrl: audioUrl
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
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch songs" });
  }
};

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query; 
    const matchingArtists = await Artist.find({ name: { $regex: q, $options: 'i' } }).select('_id');
    const artistIds = matchingArtists.map(a => a._id);
    const songs = await Song.find({ 
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { artists: { $in: artistIds } }
      ]
    }).populate('artists').populate('albumId');
    res.json(songs);
  } catch (err) {
    res.status(500).json({ message: "Search failed" });
  }
};

exports.checkDuplicate = async (req, res) => {
  try {
    const { title, artist } = req.body;
    if (!title || !artist) return res.status(400).json({ error: "Required fields missing." });
    const safeArtist = escapeRegex(artist.trim());
    const artistDoc = await Artist.findOne({ name: { $regex: new RegExp(`^${safeArtist}$`, 'i') } });
    if (!artistDoc) return res.status(200).json({ isDuplicate: false });
    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${escapeRegex(title.trim())}$`, 'i') }, 
      artists: artistDoc._id 
    });
    res.status(200).json({ isDuplicate: !!existingSong });
  } catch (error) {
    res.status(500).json({ error: "Server error during check." });
  }
};

exports.updateSongDuration = async (req, res) => {
  try {
    const updatedSong = await Song.findByIdAndUpdate(
      req.params.id, 
      { duration: req.body.duration }, 
      { returnDocument: 'after' }
    ).populate('artists').populate('albumId');
    res.json(updatedSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSong = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin only." });
    const { title, artist } = req.body;
    let updateData = { title };
    const song = await Song.findById(req.params.id);
    if (!song) return res.status(404).json({ message: "Song not found" });

    if (artist) { 
       updateData.artists = await getArtistIds(splitArtists(artist.trim()));
    }

    if (req.files && req.files['audio']) {
      if (song.audioUrl && song.audioUrl.includes('cloudinary')) {
        const oldPublicId = song.audioUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`groove_music/${oldPublicId}`, { resource_type: 'video' });
      }
      const newUpload = await uploadWithRetry(req.files['audio'][0].path, { 
          resource_type: "video", folder: "groove_music", timeout: 120000 
      });
      updateData.audioUrl = newUpload.secure_url;
      fs.unlinkSync(req.files['audio'][0].path);
    }

    const updatedSong = await Song.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' })
    .populate('artists').populate('albumId');
    res.status(200).json(updatedSong);
  } catch (error) {
    res.status(500).json({ message: "Server error during update", error: error.message });
  }
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// DIRECT INTERNET IMPORT PIPELINE
// ==========================================
exports.importSongOnline = async (req, res) => {
  try {
    const { searchQuery, category } = req.body; 
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin only." });
    }
    if (!searchQuery) {
      return res.status(400).json({ message: "Please provide a search term." });
    }

    console.log(`🌐 Initiating Direct Import for: "${searchQuery}"`);

    const itunesData = await searchItunesTrack(searchQuery, "");
    if (!itunesData) {
        return res.status(404).json({ message: "Could not find official metadata." });
    }

    const artistIds = await getArtistIds(splitArtists(itunesData.artistName));
    const existingSong = await Song.findOne({ 
      title: { $regex: new RegExp(`^${escapeRegex(itunesData.songTitle.trim())}$`, 'i') }, 
      artists: { $in: artistIds } 
    });

    if (existingSong) {
        console.log(`⏭️ Skipping: "${itunesData.songTitle}" already exists in your library.`);
        return res.status(200).json(existingSong); 
    }

    const primaryArtist = itunesData.artistName.split(',')[0].split('&')[0].trim();
    const cleanTitle = itunesData.songTitle.replace(/ *\([^)]*\) */g, "").replace(/ *\[[^\]]*\] */g, "").trim();
    console.log(`🔍 Searching YouTube for: "${cleanTitle} ${primaryArtist}"...`);
    
    let cleanUrl = "";
    try {
        const ytResults = await play.search(`${cleanTitle} ${primaryArtist} Topic`, { 
            limit: 1, 
            source: { youtube: "video" } 
        });
        if (ytResults && ytResults.length > 0 && ytResults[0].url) {
            cleanUrl = ytResults[0].url.split('&')[0];
        } else {
            throw new Error("No results found via play-dl");
        }
    } catch (searchErr) {
        console.log(`⚠️ play-dl parsing error, engaging yt-dlp native search fallback...`);
        cleanUrl = `ytsearch1:${cleanTitle} ${primaryArtist} Topic`; 
    }
    
    console.log(`✅ Target located: ${cleanUrl.startsWith('ytsearch') ? 'Native Search Engine' : cleanUrl}! Downloading securely...`);

    const uniqueDir = path.join(os.tmpdir(), `groove_import_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
    if (!fs.existsSync(uniqueDir)) fs.mkdirSync(uniqueDir, { recursive: true });
    const dynamicOutputTemplate = path.join(uniqueDir, '%(id)s.%(ext)s');

    try {
        await youtubedl(cleanUrl, {
            f: 'bestaudio', // ⚡ Let FFMPEG automatically extract the best audio
            o: dynamicOutputTemplate,
            noPlaylist: true,
            playlistItems: '1',
            noCheckCertificates: true, 
            noWarnings: true,
            extractorArgs: 'youtube:player_client=android,default', // ⚡ The Anonymous Android Bypass
            ffmpegLocation: ffmpegPath, // ⚡ The Media Engine
            forceIpv4: true,
            noCacheDir: true
        });
    } catch (downloadErr) {
        if (!fs.existsSync(uniqueDir) || fs.readdirSync(uniqueDir).length === 0) {
            console.error("❌ Failsafe triggered: Audio file was not created.");
            throw downloadErr;
        }
        console.log("⚠️ yt-dlp threw a warning, but the file downloaded successfully. Proceeding...");
    }
    
    const downloadedFiles = fs.readdirSync(uniqueDir);
    const targetFile = path.join(uniqueDir, downloadedFiles[0]);

    const stats = fs.statSync(targetFile);
    if (stats.size === 0) {
        throw new Error("Downloaded file is 0 bytes. YouTube blocked the stream.");
    }
    console.log(`✅ Audio successfully saved to server sandbox (${(stats.size / 1024 / 1024).toFixed(2)} MB)!`);

    console.log("☁️ Uploading audio to Cloudinary...");
    const audioResult = await uploadWithRetry(targetFile, { 
      resource_type: "video", 
      folder: "groove_music",
      timeout: 120000 
    });
    
    console.log("☁️ Uploading cover art to Cloudinary...");
    const coverResult = await uploadWithRetry(itunesData.coverArt, {
      resource_type: "image", 
      folder: "groove_images",
      timeout: 120000
    });

    console.log("💾 Saving organized data to MongoDB...");
    const safeAlbum = escapeRegex(itunesData.albumTitle);
    
    const albumDoc = await Album.findOneAndUpdate(
      { title: { $regex: new RegExp(`^${safeAlbum}$`, 'i') } },
      { $setOnInsert: { title: itunesData.albumTitle, artists: [artistIds[0]], coverArt: coverResult.secure_url } },
      { upsert: true, returnDocument: 'after' }
    );

    const newSong = new Song({
      title: itunesData.songTitle,
      artists: artistIds,
      albumId: albumDoc._id,
      category: category || "All", 
      duration: itunesData.duration, 
      audioUrl: audioResult.secure_url
    });
    
    await newSong.save();
    const populatedSong = await Song.findById(newSong._id).populate('artists').populate('albumId');

    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    if (fs.existsSync(uniqueDir)) fs.rmdirSync(uniqueDir);

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
    const coverResult = await uploadWithRetry(tracks[0].coverArt, { 
        resource_type: "image", folder: "groove_images", timeout: 120000 
    });
    const coverUrl = coverResult.secure_url;

    let importedSongs = [];

    for (const track of tracks) {
        console.log(`\n🎵 Processing: ${track.songTitle} by ${track.artistName}`);
        try {
            const artistIds = await getArtistIds(splitArtists(track.artistName));
            const existingSong = await Song.findOne({ 
                title: { $regex: new RegExp(`^${escapeRegex(track.songTitle.trim())}$`, 'i') }, 
                artists: { $in: artistIds } 
            });

            if (existingSong) {
                console.log(`⏭️ Skipping ${track.songTitle} - Already exists in database.`);
                continue; 
            }

            const primaryArtist = track.artistName.split(',')[0].split('&')[0].trim();
            const cleanTitle = track.songTitle.replace(/ *\([^)]*\) */g, "").replace(/ *\[[^\]]*\] */g, "").trim();
            
            let cleanUrl = "";
            try {
                const ytResults = await play.search(`${cleanTitle} ${primaryArtist} Topic`, { 
                    limit: 1, 
                    source: { youtube: "video" } 
                });
                if (ytResults && ytResults.length > 0 && ytResults[0].url) {
                    cleanUrl = ytResults[0].url.split('&')[0];
                } else {
                    throw new Error("No results found via play-dl");
                }
            } catch (searchErr) {
                console.log(`⚠️ play-dl parsing error, engaging yt-dlp native search fallback...`);
                cleanUrl = `ytsearch1:${cleanTitle} ${primaryArtist} Topic`;
            }

            console.log(`🔗 Target located: ${cleanUrl.startsWith('ytsearch') ? 'Native Search Engine' : cleanUrl}`);

            const uniqueDir = path.join(os.tmpdir(), `groove_import_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
            if (!fs.existsSync(uniqueDir)) fs.mkdirSync(uniqueDir, { recursive: true });
            
            const dynamicOutputTemplate = path.join(uniqueDir, '%(id)s.%(ext)s');

            try {
                await youtubedl(cleanUrl, { 
                    f: 'bestaudio', 
                    o: dynamicOutputTemplate,
                    noPlaylist: true,
                    playlistItems: '1',
                    noCheckCertificates: true,
                    noWarnings: true,
                    extractorArgs: 'youtube:player_client=android,default', // ⚡ The Anonymous Android Bypass
                    ffmpegLocation: ffmpegPath, // ⚡ The Media Engine
                    forceIpv4: true,
                    noCacheDir: true
                });
            } catch (downloadErr) {
                const checkFiles = fs.readdirSync(uniqueDir);
                if (checkFiles.length === 0) {
                    console.error(`❌ Failsafe triggered: Audio file for ${track.songTitle} was not created.`);
                    throw downloadErr;
                }
                console.log("⚠️ yt-dlp threw a warning, but the file downloaded successfully. Proceeding...");
            }
            
            const downloadedFiles = fs.readdirSync(uniqueDir);
            const targetFile = path.join(uniqueDir, downloadedFiles[0]);
            
            const stats = fs.statSync(targetFile);
            if (stats.size === 0) {
                throw new Error("Downloaded file is 0 bytes. YouTube blocked the stream.");
            }
            
            const audioResult = await uploadWithRetry(targetFile, { 
                resource_type: "video", 
                folder: "groove_music",
                timeout: 120000 
            });
            
            const albumDoc = await Album.findOneAndUpdate(
              { title: { $regex: new RegExp(`^${escapeRegex(track.albumTitle)}$`, 'i') } },
              { $setOnInsert: { title: track.albumTitle, artists: [artistIds[0]], coverArt: coverUrl } },
              { upsert: true, returnDocument: 'after' }
            );

            const newSong = new Song({
              title: track.songTitle,
              artists: artistIds,
              albumId: albumDoc._id,
              category: category || "All", 
              duration: track.duration, 
              audioUrl: audioResult.secure_url
            });
            
            await newSong.save();
            
            if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
            if (fs.existsSync(uniqueDir)) fs.rmdirSync(uniqueDir);
            
            importedSongs.push(newSong);
            console.log(`✅ Success: ${track.songTitle}`);

            console.log(`⏳ Anti-Bot Delay: Humanizing requests, waiting 10 seconds before next track...`);
            await new Promise(r => setTimeout(r, 10000));

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
const axios = require('axios');

exports.searchItunesTrack = async (trackName, artistName) => {
  try {
    // ⚡ ADDED &country=IN to ensure accurate Indian track searches
    const query = encodeURIComponent(`${trackName} ${artistName}`);
    const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=1&country=IN`;
    
    const response = await axios.get(url);
    if (response.data.results.length === 0) return null; 

    const officialTrack = response.data.results[0];
    const highResCover = officialTrack.artworkUrl100.replace('100x100bb', '600x600bb');

    return {
      songTitle: officialTrack.trackName,
      artistName: officialTrack.artistName,
      albumTitle: officialTrack.collectionName || "Single",
      coverArt: highResCover,
      duration: officialTrack.trackTimeMillis / 1000 
    };
  } catch (error) {
    console.error("iTunes API Search Error:", error.message);
    return null;
  }
};

exports.searchItunesAlbumTracks = async (albumInput) => {
    try {
        let collectionId = null;

        // ⚡ NEW: Check if the user pasted a direct Apple Music Link!
        // It looks for the ID numbers at the very end of the URL
        const urlMatch = albumInput.match(/\/album\/.*\/(\d+)/) || albumInput.match(/id(\d+)/);
        
        if (urlMatch && urlMatch[1]) {
            collectionId = urlMatch[1];
            console.log(`🔗 Extracted Apple Music ID: ${collectionId}`);
        } 
        // ⚡ Fallback: If it's just text, do the normal search
        else {
            const url = `https://itunes.apple.com/search?term=${encodeURIComponent(albumInput)}&entity=album&limit=1&country=IN`;
            const albumRes = await axios.get(url);
            if (albumRes.data.resultCount === 0) return null;
            collectionId = albumRes.data.results[0].collectionId;
        }

        // ⚡ Bypass search and look up the exact ID directly
        const tracksRes = await axios.get(`https://itunes.apple.com/lookup?id=${collectionId}&entity=song&country=IN`);
        
        const tracks = tracksRes.data.results.filter(item => item.wrapperType === 'track');
        const collectionInfo = tracksRes.data.results.find(item => item.wrapperType === 'collection');

        if (tracks.length === 0) return null;

        // Grab high-res cover from the collection data
        const highResCover = collectionInfo ? collectionInfo.artworkUrl100.replace('100x100bb', '1000x1000bb') : tracks[0].artworkUrl100.replace('100x100bb', '1000x1000bb');

        return tracks.map(track => ({
            songTitle: track.trackName,
            artistName: track.artistName,
            albumTitle: track.collectionName,
            duration: track.trackTimeMillis ? track.trackTimeMillis / 1000 : 0,
            coverArt: highResCover
        }));
    } catch (error) {
        console.error("iTunes Album API Error:", error.message);
        return null;
    }
};
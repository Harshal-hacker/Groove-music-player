const mm = require('music-metadata');
const fs = require('fs');

exports.extractLocalMetadata = async (filePath) => {
  try {
    // Read the embedded tags directly from the physical MP3 file
    const metadata = await mm.parseFile(filePath);
    const tags = metadata.common;
    const format = metadata.format;

    let coverArtUrl = null;

    // If the MP3 file has a cover image embedded inside it, extract it
    if (tags.picture && tags.picture.length > 0) {
      const picture = tags.picture[0];
      const base64String = picture.data.toString('base64');
      coverArtUrl = `data:${picture.format};base64,${base64String}`;
    }

    return {
      title: tags.title || null,
      artist: tags.artist || tags.albumartist || "Unknown Artist",
      album: tags.album || "Single",
      duration: format.duration ? parseFloat(format.duration) : 0,
      coverArt: coverArtUrl
    };
  } catch (error) {
    console.warn("⚠️ No ID3 tags found in this file:", error.message);
    return null;
  }
};
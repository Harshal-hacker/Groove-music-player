const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  createdBy: { 
    type: String, 
    default: 'User' 
  },
  // We store an array of Song IDs to link the music
  songIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Song' 
  }],
  // This can be a Cloudinary URL for the playlist cover
  thumbnail: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  // Link to the User model properly
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  // Array of Song IDs
  songIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Song' 
  }],
  // DISTINCTION: true for Bollywood/Bhim lists, false for user lists
  isReadyMade: { 
    type: Boolean, 
    default: false 
  }, 
  // Branding
  playlistCover: { 
    type: String, 
    default: "/Groove.png" 
  }
}, { timestamps: true }); // Keep timestamps to show "Recently Created" lists

module.exports = mongoose.model('Playlist', playlistSchema);
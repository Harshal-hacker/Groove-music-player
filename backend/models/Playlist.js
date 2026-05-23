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
  // Branding
  playlistCover: { 
    type: String, 
    default: "/Groove.png" 
  },
  // true = visible to everyone on Home screen
  isReadyMade: { 
    type: Boolean, 
    default: false 
  }, 
  // e.g., 'Romantic', 'Pop', 'Classical'
  category: { 
    type: String, 
    default: 'All' 
  },
  // Users who added this to their library     
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }] 
}, { timestamps: true }); // Keep timestamps to show "Recently Created" lists

module.exports = mongoose.model('Playlist', playlistSchema, );
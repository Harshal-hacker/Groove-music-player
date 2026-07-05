const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  description: { 
    type: String 
  },
  playlistCover: { // ⚡ Updated from 'coverArt' to match controller
    type: String 
  },
  songIds: [{ // ⚡ Updated from 'songs' to match controller
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Song'
  }],
  createdBy: { // ⚡ Updated from 'ownerId' to match controller
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // ⚡ Added missing fields used in playlistController.js
  isReadyMade: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    default: 'Featured'
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('Playlist', playlistSchema);
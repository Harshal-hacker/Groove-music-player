const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true 
  },
  email: {
    type: String,
    required: true,
    unique: true, // Prevents two users from having the same email
  },
  password: {
    type: String,
    required: true,
  },
  role: { 
    type: String, 
    default: 'user' 
  }, // Roles: 'user' or 'admin'
  
  // We store an array of Song IDs that this specific user has liked
  likedSongs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song' // Links to your existing Song model
  }],
  lastPlayback: {
    songId: { 
      type: String, 
      default: null 
    },
    currentTime: { 
      type: Number, 
      default: 0 
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileName: { 
    type: String, 
    required: true 
  },
  dob: { 
    type: Date 
  },
  gender: { 
    type: String 
  },
  role: { 
    type: String, 
    default: 'user' 
  },
  likedSongs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Song'
  }],
  activeSession: {
    trackId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Song', 
      default: null 
    },
    currentTime: { 
      type: Number, 
      default: 0 
    },
    playlistId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Playlist', 
      default: null 
    }
  },
  resetPasswordToken: { 
    type: String 
  },
  resetPasswordExpires: { 
    type: Date 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
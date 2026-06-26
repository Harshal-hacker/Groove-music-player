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
  },
  magicLinkOtp: { 
    type: String, 
    default: null 
  },
  magicLinkOtpExpires: { 
    type: Date, 
    default: null 
  }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
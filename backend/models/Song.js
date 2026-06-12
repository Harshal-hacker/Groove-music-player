const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  artist: { 
    type: String, 
    required: true 
  },
  src: { 
    type: String, 
    required: true 
  },
  cover: { 
    type: String, 
    required: true 
  },
  duration: { 
    type: Number 
  },
  isLossless: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.models.Song || mongoose.model('Song', songSchema);
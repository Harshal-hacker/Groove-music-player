const mongoose = require('mongoose'); 

const albumSchema = new mongoose.Schema({   
  title: {      
    type: String,      
    required: true,      
    trim: true,
    index: true    
  },
  spotifyId: {      
    type: String,      
    unique: true,      
    sparse: true    
  },   
  // ⚡ SPOTIFY UPGRADE: Now an array of distinct Artists
  artists: [{      
    type: mongoose.Schema.Types.ObjectId,      
    ref: 'Artist',     
    required: true    
  }],   
  coverArt: {      
    type: String,      
    required: true    
  },   
  releaseYear: {      
    type: Number  
  }
}, { timestamps: true }); // ⚡ Syntax fixed here

module.exports = mongoose.model('Album', albumSchema);
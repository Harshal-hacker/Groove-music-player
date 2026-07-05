const mongoose = require('mongoose'); 

const songSchema = new mongoose.Schema({   
  title: {      
    type: String,      
    required: true,      
    trim: true,
    index: true    
  },   
  // ⚡ SPOTIFY UPGRADE: Now an array of distinct Artists
  artists: [{      
    type: mongoose.Schema.Types.ObjectId,      
    ref: 'Artist'    
  }],   
  albumId: {      
    type: mongoose.Schema.Types.ObjectId,      
    ref: 'Album',     
    required: true    
  },   
  audioUrl: {      
    type: String,      
    required: true 
  },   
  duration: {      
    type: Number,      
    default: 0    
  },   
  category: {      
    type: String,      
    default: 'All'  
  }
}, { timestamps: true }); 

module.exports = mongoose.model('Song', songSchema);
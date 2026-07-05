const mongoose = require('mongoose'); 

const artistSchema = new mongoose.Schema({   
  name: {      
    type: String,      
    required: true,      
    trim: true,
    index: true    
  },
  spotifyId: {      
    type: String,      
    unique: true,      
    sparse: true // Allows nulls for manual uploads   
  },   
  imageUrl: {      
    type: String,      
    default: "https://res.cloudinary.com/your_cloud/image/upload/v1/default_artist.png"  
  }
}, { timestamps: true }); // ⚡ Syntax fixed here

module.exports = mongoose.model('Artist', artistSchema);
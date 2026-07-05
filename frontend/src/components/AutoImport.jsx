import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config'; // ⚡ NEW: Centralized API config

const AutoImport = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingAlbum, setIsImportingAlbum] = useState(false);

  // ⚡ 1. SINGLE SONG IMPORT
  const handleAutoImport = async () => {
    if (!searchQuery.trim()) return;
    
    setIsImporting(true);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/songs/import`, // ⚡ UPDATED: Uses dynamic URL
        { 
          searchQuery: searchQuery,
          category: "All" 
        },
        {
          withCredentials: true
        }
      );

      console.log("Import Success:", response.data);
      alert(`🎉 Successfully imported: ${response.data.title}`);
      setSearchQuery(''); 
      
    } catch (error) {
      console.error("Import Error:", error.response?.data || error.message);
      alert("❌ Failed to import song. Check your server terminal for details.");
    } finally {
      setIsImporting(false);
    }
  };

  // ⚡ 2. FULL ALBUM / SOUNDTRACK IMPORT
  const handleAlbumImport = async () => {
    if (!searchQuery.trim()) return;
    
    setIsImportingAlbum(true);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/songs/import-album`, // ⚡ UPDATED: Uses dynamic URL
        { 
          searchQuery: searchQuery,
          category: "All" 
        },
        {
          withCredentials: true
        }
      );

      console.log("Album Import Success:", response.data);
      alert(`🎉 ${response.data.message}`);
      setSearchQuery(''); 
      
    } catch (error) {
      console.error("Album Import Error:", error.response?.data || error.message);
      alert("❌ Failed to import Album. Check your server terminal for details.");
    } finally {
      setIsImportingAlbum(false);
    }
  };

  return (
    <div style={{ 
      backgroundColor: '#121212', 
      border: '1px solid #282828', 
      borderRadius: '16px', 
      padding: '24px', 
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)', 
      marginTop: '20px' 
    }}>
      <h3 style={{ color: 'white', marginTop: '0', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        🌐 Direct Internet Import
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input 
          type="text" 
          placeholder="Paste Apple Music URL or search..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #333',
            backgroundColor: '#1e1e1e',
            color: 'white',
            outline: 'none',
            boxSizing: 'border-box'
          }}
          disabled={isImporting || isImportingAlbum}
        />
        
        {/* BENTO GRID FOR BUTTONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button 
            onClick={handleAutoImport}
            disabled={isImporting || isImportingAlbum || !searchQuery}
            style={{
              padding: '12px',
              backgroundColor: isImporting ? '#333' : '#1db954',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (isImporting || isImportingAlbum) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isImporting ? '⏳...' : 'FETCH SONG'}
          </button>

          <button 
            onClick={handleAlbumImport}
            disabled={isImporting || isImportingAlbum || !searchQuery}
            style={{
              padding: '12px',
              backgroundColor: isImportingAlbum ? '#333' : '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (isImporting || isImportingAlbum) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
          >
            {isImportingAlbum ? '⏳...' : 'FETCH ALBUM'}
          </button>
        </div>
      </div>
      
      {isImportingAlbum && (
        <p style={{ color: '#aaa', fontSize: '12px', marginTop: '12px', marginBottom: '0', fontStyle: 'italic', textAlign: 'center' }}>
          Albums take a bit longer. Check server terminal for progress.
        </p>
      )}
    </div>
  );
};

export default AutoImport;
import React, { useState, useEffect } from 'react';
import { Music, Image as ImageIcon, UploadCloud, FolderPlus, ArrowLeft, CheckCircle2, Loader2, Trash2, Edit3, Search, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from './config';
import axios from 'axios';
import jsmediatags from 'jsmediatags';
import { usePlayer } from './context/PlayerContext'; // <-- 1. IMPORT CONTEXT

function Admin({ 
  onBack, 
  uploadProgress, 
  setUploadProgress, 
  isUploading, 
  setIsUploading, 
  setOverallProgress, 
  setUploadStats, 
  setPlaylist,
  handleRemoveFromPlaylist
}) {
  
  // 2. SECURE IDENTITY STATE
  const { currentUser } = usePlayer();

  // --- Form State ---
  const [songData, setSongData] = useState({ title: '', artist: '', duration: 0 });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editingSongId, setEditingSongId] = useState(null);
  
  // --- Management State ---
  const [existingSongs, setExistingSongs] = useState([]);
  const [mgmtSearch, setMgmtSearch] = useState('');

  // Fetch library for management
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`, { credentials: 'include' }) // <-- SECURED
      .then(res => res.json())
      .then(data => setExistingSongs(data));
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setCoverFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      setAudioFile(file);
      setSongData(prev => ({ ...prev, duration: audio.duration }));
      console.log("Audio metadata loaded. Duration:", audio.duration);
    };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent delete?")) return;
    const userId = currentUser?._id; // <-- CONTEXT IDENTITY
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include' // <-- SECURED
      });

      if (res.ok) {
        setExistingSongs(prev => prev.filter(s => s._id !== id));
      } else {
        const errorData = await res.json();
        alert(errorData.message);
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleEditClick = (song) => {
    setEditingSongId(song._id);
    setSongData({ 
      title: song.title, 
      artist: song.artist, 
      duration: song.duration || 0 
    });
    setPreview(song.cover);
    
    const formPanel = document.querySelector('.bento-scrollbar');
    if (formPanel) formPanel.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', songData.title);
    formData.append('artist', songData.artist);
    formData.append('userId', currentUser?._id); // <-- CONTEXT IDENTITY
    
    if (audioFile) formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);

    const url = editingSongId 
      ? `${API_BASE_URL}/api/songs/${editingSongId}` 
      : `${API_BASE_URL}/api/songs/upload`;

    const method = editingSongId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { 
        method: method, 
        body: formData,
        credentials: 'include' // <-- SECURED
      });
      
      if (res.ok) {
        const result = await res.json();
        
        if (editingSongId) {
          setExistingSongs(prev => prev.map(s => s._id === editingSongId ? result : s));
          alert("Song updated successfully!");
        } else {
          setExistingSongs(prev => [result, ...prev]);
          alert("Song uploaded successfully!");
        }

        setEditingSongId(null);
        setSongData({ title: '', artist: '', duration: 0 });
        setPreview(null);
        setAudioFile(null);
        setCoverFile(null);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFolderUpload = async (event) => {
    const files = Array.from(event.target.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/') || file.name.endsWith('.mp3'));
    
    if (!audioFiles || audioFiles.length === 0) {
      alert("No valid audio tracks detected.");
      return;
    }

    let folderName = "Curated Folder Batch";
    if (audioFiles[0].webkitRelativePath) {
      folderName = audioFiles[0].webkitRelativePath.split('/')[0].replace(/_/g, ' ');
    }

    setIsUploading(true);
    setUploadStats({ current: 1, total: audioFiles.length });
    const fileProgressTracker = new Array(audioFiles.length).fill(0);
    const totalBytesAllFiles = audioFiles.reduce((sum, f) => sum + f.size, 0); // Calculate total size once
    
    const extractMetadata = (file) => {
      return new Promise((resolve) => {
        jsmediatags.read(file, {
          onSuccess: (tag) => {
            const title = tag.tags.title || file.name.replace(/\.[^/.]+$/, "").replace(/_spotdown\.org/g, "");
            const artist = tag.tags.artist || "Unknown Artist";
            let coverBlobFile = null;
            if (tag.tags.picture) {
              const { data, format } = tag.tags.picture;
              coverBlobFile = new File([new Blob([new Uint8Array(data)], { type: format })], `cover-${Date.now()}.jpg`, { type: format });
            }
            resolve({ title, artist, coverFile: coverBlobFile });
          },
          onError: () => {
            resolve({ title: file.name.replace(/\.[^/.]+$/, "").replace(/_spotdown\.org/g, ""), artist: "Unknown Artist", coverFile: null });
          }
        });
      });
    };

    try {
      const uploadedTracks = []; // Array to collect successful uploads

      // ========================================================
      // 🚀 THE FIX: SEQUENTIAL UPLOAD LOOP (NO MORE PROMISE.ALL)
      // ========================================================
      for (let index = 0; index < audioFiles.length; index++) {
        const file = audioFiles[index];
        
        try {
          const metadata = await extractMetadata(file);
          const formData = new FormData();
          formData.append('audio', file);
          formData.append('userId', currentUser?._id); // <-- CONTEXT IDENTITY
          formData.append('title', metadata.title);
          formData.append('artist', metadata.artist);
          if (metadata.coverFile) formData.append('cover', metadata.coverFile);

          // We await THIS specific upload before moving to the next loop iteration
          const res = await axios.post(`${API_BASE_URL}/api/songs/upload`, formData, {
            withCredentials: true, // <-- AXIOS SECURE COOKIE ATTACHMENT
            onUploadProgress: (progressEvent) => {
              fileProgressTracker[index] = progressEvent.loaded;
              const totalLoadedBytes = fileProgressTracker.reduce((sum, bytes) => sum + bytes, 0);
              const globalPercentage = Math.min(Math.round((totalLoadedBytes / totalBytesAllFiles) * 100), 100);
              setOverallProgress(globalPercentage);
              setUploadProgress(globalPercentage);
            }
          });

          uploadedTracks.push(res.data); // Save the track if successful
          
          // Only update the "current" file count text if we aren't on the very last file
          if (index < audioFiles.length - 1) {
            setUploadStats(prev => ({ ...prev, current: prev.current + 1 }));
          }

        } catch (fileErr) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          // By putting this try/catch INSIDE the loop, if one song fails, 
          // it won't crash the entire folder upload. It just moves to the next song!
        }
      }
      // ========================================================

      // Check if anything actually uploaded successfully
      if (uploadedTracks.length === 0) {
        throw new Error("All track uploads failed.");
      }
      
      // Update global React State
      if (typeof setPlaylist === 'function') {
        setPlaylist(prev => [...uploadedTracks, ...prev]);
      }

      // Automatically group them into a folder
      const newlyCreatedSongIds = uploadedTracks.map(track => track._id);
      
      const curationResponse = await fetch(`${API_BASE_URL}/api/playlists/bulk-curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistName: folderName,
          songIds: newlyCreatedSongIds,
          userId: currentUser?._id // <-- CONTEXT IDENTITY
        }),
        credentials: 'include' // <-- SECURED
      });

      if (curationResponse.ok) {
        alert(`Success! Uploaded ${uploadedTracks.length} tracks and compiled them into the Curated Playlist: "${folderName}" instantly.`);
      }

    } catch (err) {
      console.error("Pipeline breakdown:", err);
      alert("An error occurred during multi-file streaming.");
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setOverallProgress(0);
        setUploadProgress(0);
      }, 1000);
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', backgroundColor: '#050505', color: '#fff',
      display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden'
    }}>
      
      {/* HEADER */}
      <nav style={{ padding: '25px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="ultra-action-circle2" style={{ background: 'rgba(255,255,255,0.05)' }}><ArrowLeft size={20} /></button>
          <h1 style={{ fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Studio <span style={{ color: '#10b981' }}>Console</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>Admin Mode</div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT: UPLOAD FORM (Fixed Width) */}
        <div style={{ width: '400px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '40px', overflowY: 'auto' }} className="bento-scrollbar"> 
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UploadCloud size={20} color="#10b981" /> 
              {editingSongId ? "Edit Release" : "New Release"}
            </h2>

            {editingSongId && (
              <button 
                className="ultra-action-circle2" 
                onClick={() => { 
                  setEditingSongId(null); 
                  setSongData({title:'', artist:'', duration: 0}); 
                  setPreview(null); 
                  setAudioFile(null); 
                  setCoverFile(null); 
                }}
                style={{ 
                  width: '35px',
                  height: '35px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <ArrowLeft size={18} color="#64748b" /> 
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visual Dropzone */}
            <div style={{
              height: '180px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.02)',
              border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative'
            }}>
              {preview ? (
                <>
                  <img 
                    src={preview || "/Groove.png"} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Preview" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Groove.png";
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0 }} onMouseOver={(e) => e.currentTarget.style.opacity=1} onMouseOut={(e) => e.currentTarget.style.opacity=0}>
                    <p style={{ fontWeight: '80x0', fontSize: '12px' }}>CHANGE COVER</p>
                  </div>
                </>
              ) : (
                <div className="preview-box" style={{ 
                  position: 'relative',
                  width: '100%', 
                  height: '200px', 
                  border: '2px dashed rgba(255,255,255,0.1)', 
                  borderRadius: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)'
                }}>
                  {preview ? (
                    <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                  ) : (
                    <div style={{ textAlign: 'center', opacity: 0.3 }}>
                      <img 
                        src="/Groove.png" 
                        style={{ width: '180px', marginBottom: '10px', filter: 'grayscale(1)' }} 
                        alt="Groove Logo Placeholder" 
                      />
                      <p style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>
                        DRAG COVER ART
                      </p>
                    </div>
                  )}
                </div>
              )}
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              <button type="button" onClick={() => document.querySelector('input[accept="image/*"]').click()} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>

            {/* Audio Picker */}
            <div style={{ padding: '20px', borderRadius: '20px', backgroundColor: audioFile ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transition: '0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: audioFile ? '#10b981' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Music size={18} color={audioFile ? "#000" : "#fff"} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: audioFile ? '#fff' : '#64748b' }}>{audioFile ? audioFile.name.substring(0, 20) + '...' : 'Select Audio File'}</p>
                </div>
                <button type="button" onClick={() => document.querySelector('input[accept="audio/*"]').click()} style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}>BROWSE</button>
              </div>
              <input 
                type="file" 
                hidden 
                accept="audio/*" 
                onChange={handleAudioChange} 
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input 
                className="studio-input" type="text" placeholder="Song Title" required 
                value={songData.title} onChange={(e) => setSongData({...songData, title: e.target.value})}
              />
              <input 
                className="studio-input" type="text" placeholder="Artist Name" required 
                value={songData.artist} onChange={(e) => setSongData({...songData, artist: e.target.value})}
              />
            </div>

            <button 
              type="submit" disabled={isUploading || (!editingSongId && (!audioFile || !coverFile))}
              style={{
                marginTop: '10px', padding: '18px', borderRadius: '50px', background: '#10b981',
                color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                opacity: (isUploading ||(!editingSongId && (!audioFile || !coverFile))) ? 0.5 : 1, transition: '0.3s'
              }}
            >
              {isUploading ? "PROCESSING..." : editingSongId ? "SAVE CHANGES" : "PUSH TO LIBRARY"}
            </button>
          </form>

          <div className="studio-bulk-section" style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
    <FolderPlus size={20} color="#10b981" /> 
    Import Media
  </h3>
  
  <div style={{
    width: '100%', padding: '30px', border: '2px dashed rgba(16, 185, 129, 0.3)',
    borderRadius: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)',
  }}>
    <div style={{ marginBottom: '15px' }}>
      <img src="/Groove.png" alt="" style={{ width: '40px', opacity: 0.5 }} />
    </div>
    <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Add Tracks to Library</h4>
    
    {/* SPLIT BUTTONS */}
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
      <button 
        type="button"
        onClick={() => document.getElementById('bulk-folder-input').click()}
        style={{
          flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)',
          color: '#10b981', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
      >
        BROWSE FOLDER
      </button>
      
      <button 
        type="button"
        onClick={() => document.getElementById('bulk-files-input').click()}
        style={{
          flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
          color: '#fff', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s'
        }}
        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      >
        SELECT FILES
      </button>
    </div>

    {/* Hidden Inputs Stay Exactly the Same */}
    <input id="bulk-folder-input" type="file" webkitdirectory="true" directory="true" multiple style={{ display: 'none' }} onChange={handleFolderUpload} />
    <input id="bulk-files-input" type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={handleFolderUpload} />
  </div>
</div>
        </div>

        {/* RIGHT: LIBRARY MANAGEMENT */}
        <div style={{ flex: 1, padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', overflowY: 'auto' }} className="bento-scrollbar">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Manage Library</h2>
            <div style={{ position: 'relative', width: '250px' }}>
              <Search size={14} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" placeholder="Filter tracks..." value={mgmtSearch} onChange={(e) => setMgmtSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 15px 10px 40px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50px', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {existingSongs.filter(s => s.title.toLowerCase().includes(mgmtSearch.toLowerCase())).map(song => (
              <div key={song._id} className="mgmt-card" style={{
                display: 'flex', alignItems: 'center', padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', gap: '20px'
              }}>
                <img 
                  src={song.cover || "/Groove.png"} 
                  style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }}
                  alt="" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/Groove.png";
                  }}
                />
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>{song.title}</h4>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{song.artist}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="mgmt-btn" onClick={() => handleEditClick(song)} style={{ color: '#64748b' }}><Edit3 size={16} /></button>
                  <button onClick={() => handleDelete(song._id)} className="mgmt-btn" style={{ color: '#ef4444' }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .studio-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 16px 20px;
          border-radius: 16px;
          color: white;
          outline: none;
          font-size: 14px;
          transition: 0.3s;
        }
        .studio-input:focus {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.05);
        }
        .mgmt-card:hover {
          background-color: rgba(255,255,255,0.05) !important;
          transform: translateX(5px);
        }
        .mgmt-btn {
          width: 36px; height: 36px; border-radius: 10px; border: none;
          background: rgba(255,255,255,0.03); cursor: pointer; transition: 0.2s;
          display: flex; align-items: center; justify-content: center;
        }
        .mgmt-btn:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}

export default Admin;
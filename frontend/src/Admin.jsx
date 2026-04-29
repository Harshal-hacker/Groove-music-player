import React, { useState, useEffect } from 'react';
import { Music, Image as ImageIcon, UploadCloud, ArrowLeft, CheckCircle2, Loader2, Trash2, Edit3, Search, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from './config';

function Admin({ onBack }) {
  // --- Form State ---
  const [songData, setSongData] = useState({ title: '', artist: '', duration: 0 });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [editingSongId, setEditingSongId] = useState(null);

  // --- Management State ---
  const [existingSongs, setExistingSongs] = useState([]);
  const [mgmtSearch, setMgmtSearch] = useState('');

  // Fetch library for management
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`)
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

    // Create a temporary audio element to extract duration metadata
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      setAudioFile(file);
      // Store the duration in state so we can send it to the backend
      setSongData(prev => ({ ...prev, duration: audio.duration }));
      console.log("Audio metadata loaded. Duration:", audio.duration);
    };
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent delete?")) return;
    const userId = localStorage.getItem('userId');
    
    try {
      // We now pass the userId in the URL string (?userId=...)
      const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${userId}`, {
        method: 'DELETE',
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

  const handleRemoveFromPlaylist = async (songId, playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/remove-song`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();

        // 1. Update the playlists state so the sidebar and "filteredPlaylist" update
        setUserPlaylists(prev => prev.map(pl => 
          pl._id === playlistId ? updatedPlaylist : pl
        ));

        // 2. IMPORTANT: If the user is currently viewing this playlist, 
        // we need to force a re-render by closing the menu
        setContextMenu(null);
        
        console.log("Song removed successfully from playlist");
      }
    } catch (error) {
      console.error("Failed to remove song:", error);
    }
  };

  const handleEditClick = (song) => {
    // 1. Set the ID so the form knows we are in "Edit Mode"
    setEditingSongId(song._id);
    
    // 2. Correctly update the songData object state
    setSongData({ 
      title: song.title, 
      artist: song.artist, 
      duration: song.duration || 0 
    });
    
    // 3. Show the existing cover in the preview box
    setPreview(song.cover);
    
    // 4. Scroll the form panel to the top so you can see the data
    const formPanel = document.querySelector('.bento-scrollbar');
    if (formPanel) formPanel.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', songData.title);
    formData.append('artist', songData.artist);
    formData.append('userId', localStorage.getItem('userId'));
    
    // Only append files if you actually picked NEW ones
    if (audioFile) formData.append('audio', audioFile);
    if (coverFile) formData.append('cover', coverFile);

    const url = editingSongId 
      ? `${API_BASE_URL}/api/songs/${editingSongId}` 
      : `${API_BASE_URL}/api/songs/upload`;

    const method = editingSongId ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { method: method, body: formData });
      
      if (res.ok) {
        const result = await res.json();
        
        if (editingSongId) {
          // Update the song in your "Manage Library" list instantly
          setExistingSongs(prev => prev.map(s => s._id === editingSongId ? result : s));
          alert("Song updated successfully!");
        } else {
          setExistingSongs(prev => [result, ...prev]);
          alert("Song uploaded successfully!");
        }

        // RESET EVERYTHING TO DEFAULT
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

  return (
    <div style={{
      height: '100vh', width: '100vw', backgroundColor: '#050505', color: '#fff',
      display: 'flex', flexDirection: 'column', fontFamily: "'Plus Jakarta Sans', sans-serif",
      overflow: 'hidden'
    }}>
      
      {/* HEADER */}
      <nav style={{ padding: '25px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button onClick={onBack} className="ultra-action-circle" style={{ background: 'rgba(255,255,255,0.05)' }}><ArrowLeft size={20} /></button>
          <h1 style={{ fontSize: '22px', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>Studio <span style={{ color: '#10b981' }}>Console</span></h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '8px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '800' }}>Admin Mode</div>
        </div>
      </nav>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT: UPLOAD FORM (Fixed Width) */}
        <div style={{ width: '400px', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '40px', overflowY: 'auto' }} className="bento-scrollbar"> 
          
          {/* Wrap title and button in this flex div */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UploadCloud size={20} color="#10b981" /> 
              {editingSongId ? "Edit Release" : "New Release"}
            </h2>

            {editingSongId && (
              <button 
                className="ultra-action-circle" 
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
                    /* Use the current track's cover or the logo if empty */
                    src={preview || "/Groove.png"} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt="Preview" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Groove.png";
                    }}
                  />
                  {/*<img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />*/}
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
                      {/* USE YOUR LOGO HERE INSTEAD OF THE ICON */}
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
                  /* Use the current track's cover or the logo if empty */
                  src={song.cover || "/Groove.png"} 
                  style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }}
                  alt="" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/Groove.png";
                  }}
                />
                {/*<img src={song.cover} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} alt="" />*/}
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

      {/* Internal CSS for Studio styling */}
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
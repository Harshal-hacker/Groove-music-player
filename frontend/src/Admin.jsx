import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Image as ImageIcon, UploadCloud, FolderPlus, ArrowLeft, CheckCircle2, Loader2, Trash2, Edit3, Search, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from './config';
import axios from 'axios';
import jsmediatags from 'jsmediatags';
import { usePlayer } from './context/PlayerContext';
import SuccessModal from './components/SuccessModal';
import AutoImport from './components/AutoImport';

function Admin(){ 
  const navigate = useNavigate();

  const { 
    onBack,
    setPlaylist,
    uploadProgress, 
    setUploadProgress, 
    isUploading, 
    setIsUploading, 
    setOverallProgress, 
    setUploadStats,
    handleRemoveFromPlaylist
  } = usePlayer();
   
  // --- Form State ---
  const [songData, setSongData] = useState({ title: '', artist: '', duration: 0 });
  const [audioFile, setAudioFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [editingSongId, setEditingSongId] = useState(null);
  
  // --- Management State ---
  const [existingSongs, setExistingSongs] = useState([]);
  const [mgmtSearch, setMgmtSearch] = useState('');
  const { currentUser, uploadQueue, setUploadQueue, isQueueMinimized, setIsQueueMinimized, setUploadAbortController } = usePlayer();
  const [successAlert, setSuccessAlert] = useState({ isOpen: false, message: '' });

  // Fetch library for management
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`, { credentials: 'include' })
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
    const userId = currentUser?._id; 
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include' 
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
    
    // ⚡ UPDATED: Safely pull the relational Artist name to populate the edit form
    setSongData({ 
      title: song.title, 
      artist: song.artists?.map(a => a.name).join(', ') || "Unknown Artist", 
      duration: song.duration || 0 
    });
    
    // ⚡ UPDATED: Safely pull the relational Album cover art to populate the preview
    setPreview(song.albumId?.coverArt || null);
    
    const formPanel = document.querySelector('.bento-scrollbar');
    if (formPanel) formPanel.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', songData.title);
    formData.append('artist', songData.artist);
    formData.append('userId', currentUser?._id); 
    formData.append('duration', songData.duration);
    
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
        credentials: 'include'
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
    const totalBytesAllFiles = audioFiles.reduce((sum, f) => sum + f.size, 0); 

    setUploadQueue(audioFiles.map(f => ({ name: f.name, progress: 0, status: 'pending' })));
    
    const extractMetadata = (file) => {
      return new Promise((resolve) => {
        const tempAudio = new Audio(URL.createObjectURL(file));
        
        tempAudio.onloadedmetadata = () => {
          const duration = tempAudio.duration;
          
          jsmediatags.read(file, {
            onSuccess: (tag) => {
              const title = tag.tags.title || file.name.replace(/\.[^/.]+$/, "").replace(/_spotdown\.org/g, "");
              const artist = tag.tags.artist || "Unknown Artist";
              const album = tag.tags.album || folderName || "Miscellaneous Tracks"; // ⚡ Pull the album for the relational DB!
              
              let coverBlobFile = null;
              if (tag.tags.picture) {
                const { data, format } = tag.tags.picture;
                coverBlobFile = new File([new Blob([new Uint8Array(data)], { type: format })], `cover-${Date.now()}.jpg`, { type: format });
              }
              resolve({ title, artist, album, coverFile: coverBlobFile, duration }); 
            },
            onError: () => {
              resolve({ title: file.name.replace(/\.[^/.]+$/, "").replace(/_spotdown\.org/g, ""), artist: "Unknown Artist", album: "Miscellaneous Tracks", coverFile: null, duration });
            }
          });
        };
        
        tempAudio.onerror = () => resolve({ title: file.name, artist: "Unknown", album: "Miscellaneous Tracks", coverFile: null, duration: 0 });
      });
    };

    const controller = new AbortController();
    setUploadAbortController(controller);

    try {
      const uploadedTracks = []; 

      for (let index = 0; index < audioFiles.length; index++) {
        const file = audioFiles[index];
        
        try {
          const metadata = await extractMetadata(file);
          const formData = new FormData();
          formData.append('audio', file);
          formData.append('userId', currentUser?._id); 
          formData.append('title', metadata.title);
          formData.append('artist', metadata.artist);
          formData.append('album', metadata.album); // ⚡ Pass the album to the new backend!
          formData.append('duration', metadata.duration);
          if (metadata.coverFile) formData.append('cover', metadata.coverFile);

          const res = await axios.post(`${API_BASE_URL}/api/songs/upload`, formData, {
            withCredentials: true, 
            signal: controller.signal, 
            onUploadProgress: (progressEvent) => {
              fileProgressTracker[index] = progressEvent.loaded;
              const totalLoadedBytes = fileProgressTracker.reduce((sum, bytes) => sum + bytes, 0);
              const globalPercentage = Math.min(Math.round((totalLoadedBytes / totalBytesAllFiles) * 100), 100);
              setOverallProgress(globalPercentage);
              setUploadProgress(globalPercentage);

              const filePercent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadQueue(prev => prev.map(item => 
                item.name === file.name ? { ...item, progress: filePercent, status: 'uploading' } : item
              ));
            }
          });

          uploadedTracks.push(res.data); 

          setUploadQueue(prev => prev.map(item => 
            item.name === file.name ? { ...item, progress: 100, status: 'completed' } : item
          ));
          
          if (index < audioFiles.length - 1) {
            setUploadStats(prev => ({ ...prev, current: prev.current + 1 }));
          }

        } catch (fileErr) {
          if (axios.isCancel(fileErr)) {
            console.log("🛑 Upload pipeline terminated by user.");
            break; 
          }
          if (fileErr.response && fileErr.response.status === 409) {
            console.warn(`⏭️ Skipped duplicate: ${file.name}`);
            setUploadQueue(prev => prev.map(item => 
              item.name === file.name ? { ...item, status: 'skipped' } : item
            ));
            continue; 
          }
          
          console.error(`❌ Failed to upload ${file.name}:`, fileErr);
          setUploadQueue(prev => prev.map(item => 
            item.name === file.name ? { ...item, status: 'error' } : item
          ));
        }
      }

      if (uploadedTracks.length === 0) {
        throw new Error("All track uploads failed.");
      }
      
      if (typeof setPlaylist === 'function') {
        setPlaylist(prev => [...uploadedTracks, ...prev]);
      }

      const newlyCreatedSongIds = uploadedTracks.map(track => track._id);
      
      const curationResponse = await fetch(`${API_BASE_URL}/api/playlists/bulk-curate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistName: folderName,
          songIds: newlyCreatedSongIds,
          userId: currentUser?._id 
        }),
        credentials: 'include' 
      });

      if (curationResponse.ok) {
        setSuccessAlert({
          isOpen: true,
          message: `Successfully uploaded ${uploadedTracks.length} tracks and compiled them into the Curated Playlist: "${folderName}".`
        });
      }

    } catch (err) {
      console.error("Pipeline breakdown:", err);
      alert("An error occurred during multi-file streaming.");
    } finally {
      setUploadAbortController(null);
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

      <div className="admin-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* LEFT: UPLOAD FORM */}
        <div className="admin-left bento-scrollbar" style={{ width: '400px', flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.05)', padding: '40px', overflowY: 'auto' }}> 
          
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
                  width: '35px', height: '35px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                <ArrowLeft size={18} color="#64748b" /> 
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    <p style={{ fontWeight: '800', fontSize: '12px' }}>CHANGE COVER</p>
                  </div>
                </>
              ) : (
                <div className="preview-box" style={{ 
                  position: 'relative', width: '100%', height: '200px', border: '2px dashed rgba(255,255,255,0.1)', 
                  borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', background: 'rgba(255,255,255,0.02)'
                }}>
                  {preview ? (
                    <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                  ) : (
                    <div style={{ textAlign: 'center', opacity: 0.3 }}>
                      <img src="/Groove.png" style={{ width: '180px', marginBottom: '10px', filter: 'grayscale(1)' }} alt="Groove Logo Placeholder" />
                      <p style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: '#fff' }}>DRAG COVER ART</p>
                    </div>
                  )}
                </div>
              )}
              <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              <button type="button" onClick={() => document.querySelector('input[accept="image/*"]').click()} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </div>

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
              <input type="file" hidden accept="audio/*" onChange={handleAudioChange} />
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
            
            <div style={{ width: '100%', padding: '30px', border: '2px dashed rgba(16, 185, 129, 0.3)', borderRadius: '24px', textAlign: 'center', background: 'rgba(16, 185, 129, 0.02)' }}>
              <div style={{ marginBottom: '15px' }}>
                <img src="/Groove.png" alt="" style={{ width: '40px', opacity: 0.5 }} />
              </div>
              <h4 style={{ margin: '0 0 15px 0', fontSize: '14px' }}>Add Tracks to Library</h4>
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={() => document.getElementById('bulk-folder-input').click()}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                >BROWSE FOLDER</button>
                
                <button 
                  type="button"
                  onClick={() => document.getElementById('bulk-files-input').click()}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >SELECT FILES</button>
              </div>

              <input id="bulk-folder-input" type="file" webkitdirectory="true" directory="true" multiple style={{ display: 'none' }} onChange={handleFolderUpload} />
              <input id="bulk-files-input" type="file" multiple accept="audio/*" style={{ display: 'none' }} onChange={handleFolderUpload} />
            </div>
            <AutoImport />
          </div>
        </div>

        {/* RIGHT: LIBRARY MANAGEMENT */}
        <div className="admin-right bento-scrollbar" style={{ flex: 1, minWidth: '300px', padding: '40px', backgroundColor: 'rgba(255,255,255,0.01)', overflowY: 'auto' }}>
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
            {/* ⚡ UPDATED: Safely checks both the title AND the nested artist name for the search bar */}
            {existingSongs.filter(s => 
              s.title.toLowerCase().includes(mgmtSearch.toLowerCase()) || 
              (s.artists?.map(a => a.name).join(', ') || "").toLowerCase().includes(mgmtSearch.toLowerCase())
            ).map(song => (
              <div key={song._id} className="mgmt-card" style={{
                display: 'flex', alignItems: 'center', padding: '12px 20px', backgroundColor: 'rgba(255,255,255,0.02)',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', gap: '20px'
              }}>
                {/* ⚡ UPDATED: Pulls the cover art from the linked Album document */}
                <img 
                  src={song.albumId?.coverArt || "/Groove.png"} 
                  style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }}
                  alt="" 
                  onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}> 
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.title}
                  </h4>
                  {/* ⚡ UPDATED: Pulls the artist name from the linked Artist document */}
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {song.artists?.map(a => a.name).join(', ') || "Unknown Artist"}
                  </p>
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
        .studio-input:focus { border-color: #10b981; background: rgba(16, 185, 129, 0.05); }
        .mgmt-card:hover { background-color: rgba(255,255,255,0.05) !important; transform: translateX(5px); }
        .mgmt-btn { width: 36px; height: 36px; border-radius: 10px; border: none; background: rgba(255,255,255,0.03); cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .mgmt-btn:hover { background: rgba(255,255,255,0.1); }
        @media (max-width: 950px) {
          .admin-layout { flex-direction: column !important; overflow-y: auto !important; }
          .admin-left { width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; overflow-y: visible !important; }
          .admin-right { width: 100% !important; overflow-y: visible !important; }
        }
      `}</style>

      <SuccessModal 
        isOpen={successAlert.isOpen} 
        message={successAlert.message}
        onClose={() => setSuccessAlert({ isOpen: false, message: '' })} 
      />
    </div>
  );
}

export default Admin;
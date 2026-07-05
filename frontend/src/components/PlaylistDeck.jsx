import React, { useState } from 'react';
import { Play, Pause, ChevronRight, ListMusic, Plus, X, Search, CheckCircle2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { API_BASE_URL } from '../config';

export default function PlaylistDeck({
  activeCategory, selectedPlaylist, filteredPlaylist, userPlaylists, setUserPlaylists,
  handleContextMenu, isAdmin, setToast, handleAddToPlaylist, handleRemoveFromPlaylist, getContextName
}) {
  const { 
    playlist, currentTrack, currentTrackIndex, setCurrentTrackIndex, 
    isPlaying, setIsPlaying, setPlaybackContext, isPlayingFromQueueRef,
    setActivePlaylistName, currentUser, togglePlayPause,
    setPlayingPlaylistId, syncPlayback
  } = usePlayer();

  // ⚡ ALL PLAYLIST-SPECIFIC STATE MOVED HERE!
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [addTrackSearch, setAddTrackSearch] = useState('');

  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };

  const handleInlineRename = async () => {
    const playlistId = selectedPlaylist;
    if (!tempName || tempName.trim() === "" || tempName === userPlaylists.find(pl => pl._id === playlistId)?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tempName }),
        credentials: 'include'
      });
      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? updatedPlaylist : pl));
      }
    } catch (error) { 
      console.error("Rename failed:", error); 
    } finally { 
      setIsEditingName(false); 
    }
  };

  return (
    <div className="groove-playlist-wrapper">
      <div className="groove-header-deck">
        <div className="deck-main-card">
          <div className="deck-art-frame">
            {/* ⚡ UPDATED: Pulls the cover art from the new relational Album object */}
            <img src={filteredPlaylist.length > 0 ? filteredPlaylist[0].albumId?.coverArt : "/Groove.png"} alt="Playlist Art" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} />
          </div>
          <div className="deck-details">
            {isEditingName ? (
              <input
                autoFocus className="deck-title-text inline-edit-input" value={tempName} onChange={(e) => setTempName(e.target.value)} onBlur={handleInlineRename}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInlineRename(); if (e.key === 'Escape') setIsEditingName(false); }}
                style={{ background: '#0a0a0a', border: '1px solid #10b981', color: 'white', width: '50%', outline: 'none', borderRadius: '8px', padding: '4px 10px' }}
              />
            ) : (
              <h1 className="deck-title-text">{selectedPlaylist ? userPlaylists.find(p => p._id === selectedPlaylist)?.name : "Liked Library"}</h1>
            )}
            <div className="deck-info-row">
              <div className="deck-stat"><span>{filteredPlaylist.length}</span> TRACKS</div>
              <div className="deck-stat">
                <span style={{ marginLeft: '4px' }}>About</span>
                <span style={{ textTransform: 'lowercase' }}>
                  {(() => {
                    const totalSeconds = filteredPlaylist.reduce((total, track) => total + (Number(track.duration) || 0), 0);
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    if (hours > 0) return `${hours} hr ${minutes} min`;
                    else if (minutes > 0) return `${minutes} min`;
                    else return `0 min`;
                  })()}
                </span> 
              </div>
            </div>

            <div className="groove-action-unit" style={{ marginTop: '25px', paddingLeft: '0', background: 'transparent', border: 'none' }}>
              <button 
                className="groove-play-btn" 
                onClick={() => {
                  const isThisPlaylistActive = currentTrack && filteredPlaylist.some(track => track._id === currentTrack._id);
                  if (isThisPlaylistActive) {
                    togglePlayPause();
                  } else {
                    if (filteredPlaylist.length > 0) {
                      setPlaybackContext(filteredPlaylist); 
                      setActivePlaylistName(getContextName());
                      setPlayingPlaylistId(selectedPlaylist); 
                      setCurrentTrackIndex(playlist.findIndex(s => s._id === filteredPlaylist[0]._id));
                      setIsPlaying(true);
                      if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                    }
                  }
                }}
              >
                {isPlaying && (currentTrack && filteredPlaylist.some(track => track._id === currentTrack._id)) ? (
                  <Pause size={28} fill="white" /> 
                ) : (
                  <Play size={28} fill="white" style={{marginLeft: '4px'}} />
                )}
              </button>
              
              {selectedPlaylist && userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade && (
                <button
                  onClick={async () => {
                    const userId = currentUser?._id;
                    if (!userId) return alert("Please log in to save playlists!");
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/playlists/${selectedPlaylist}/follow`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }), credentials: 'include'
                      });
                      if (res.ok) {
                        const updatedPlaylist = await res.json();
                        setUserPlaylists(prev => prev.map(p => p._id === selectedPlaylist ? updatedPlaylist : p));
                        const isSaved = updatedPlaylist.followers?.includes(userId);
                        setToast({ message: isSaved ? "Added collection to your library!" : "Removed collection from library.", type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                      }
                    } catch (err) { console.error("Library operational error:", err); }
                  }}
                  style={{
                    background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '8px 18px',
                    borderRadius: '50px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', transition: '0.2s', marginLeft: '10px'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
                >
                  {userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id) ? "REMOVE FROM LIBRARY" : "SAVE TO LIBRARY"}
                </button>
              )}

              {isAdmin && selectedPlaylist && (
                <button
                  onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981',
                    padding: '8px 18px', borderRadius: '50px', fontSize: '11px', fontWeight: '900', cursor: 'pointer', transition: '0.2s',
                    marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.color = '#000'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.color = '#10b981'; }}
                >
                  <Plus size={14} /> ADD TRACKS
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tracklist Engine */}
      <div className="groove-tracklist">
        {filteredPlaylist.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed #333', marginTop: '10px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
              <ListMusic size={24} color="#10b981" />
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#fff' }}>This audio deck is empty</h4>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b', maxWidth: '280px', lineHeight: '1.5', fontWeight: '600' }}>There are no tracks loaded inside this context library yet.</p>
            
            {selectedPlaylist ? (
              <button 
                onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }}
                style={{ backgroundColor: '#fff', color: '#000', padding: '10px 24px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                ADD TRACKS NOW
              </button>
            ) : (
              <p style={{ color: '#10b981', fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>PRESS CTRL + K TO SEARCH NEW RELEASES</p>
            )}
          </div>
        ) : (
          filteredPlaylist.map((track, index) => {
            // ⚡ UPDATED: Changed track.cover to track.albumId?.coverArt
            const displayCover = track.albumId?.coverArt || "/Groove.png";
            const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
            return (
              <div 
                key={`${track._id}-${index}`} className={`groove-track-card ${isActive ? 'active' : ''}`}
                onClick={() => { 
                  setPlaybackContext(filteredPlaylist); 
                  setActivePlaylistName(getContextName());
                  setPlayingPlaylistId(selectedPlaylist); 
                  setCurrentTrackIndex(playlist.findIndex(s => s._id === track._id));
                  setIsPlaying(true);
                  if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                }}
                onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}
              >
                <div className="track-id">{(index + 1).toString().padStart(2, '0')}</div>
                <img src={displayCover} className="track-thumb" alt="" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} />
                <div className="track-meta">
                  <div className="track-name-main" style={{ color: isActive ? '#10b981' : '#fff' }}>{track.title}</div>
                  {/* ⚡ UPDATED: Changed track.artist to track.artists?.map(a => a.name).join(', ') */}
                  <div className="track-artist-sub">{track.artists?.map(a => a.name).join(', ') || "Unknown Artist"}</div>
                </div>
                <div className="track-time">{formatTime(track.duration)}</div>
                <div className="track-action-indicator">
                  {isActive && isPlaying ? <div className="groove-visualizer"><span></span><span></span><span></span></div> : <ChevronRight size={16} color="#333" />}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ⚡ THE ADD TRACKS MODAL LIVES HERE NOW */}
      {showAddTrackModal && selectedPlaylist && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '500px', height: '70vh', maxHeight: '600px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Add Tracks</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>{userPlaylists.find(p => p._id === selectedPlaylist)?.name}</p>
              </div>
              <button onClick={() => setShowAddTrackModal(false)} style={{ background: '#1a1a1a', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#333'} onMouseOut={e => e.currentTarget.style.background = '#1a1a1a'}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px 24px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', color: '#64748b' }} />
                <input type="text" placeholder="Search tracks..." value={addTrackSearch} onChange={(e) => setAddTrackSearch(e.target.value)} style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }} />
              </div>
            </div>
            <div className="bento-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {/* ⚡ UPDATED: Changed song.artist to (song.artists?.map(a => a.name).join(', ') || "") to prevent a crash on .toLowerCase() */}
              {playlist.filter(song => song.title.toLowerCase().includes(addTrackSearch.toLowerCase()) || (song.artists?.map(a => a.name).join(', ') || "").toLowerCase().includes(addTrackSearch.toLowerCase())).map(song => {
                  const isAlreadyAdded = userPlaylists.find(p => p._id === selectedPlaylist)?.songIds?.some(s => (s._id || s) === song._id);
                  return (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '16px', marginBottom: '8px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1a1a1a'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* ⚡ UPDATED: Relational album cover art */}
                        <img src={song.albumId?.coverArt || "/Groove.png"} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{song.title}</div>
                          {/* ⚡ UPDATED: Relational artist name */}
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{song.artists?.map(a => a.name).join(', ') || "Unknown Artist"}</div>
                        </div>
                      </div>
                      {isAlreadyAdded ? (
                        <button onClick={() => handleRemoveFromPlaylist(song._id, selectedPlaylist)} style={{ background: 'transparent', border: '1px solid #10b981', color: '#10b981', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                          <CheckCircle2 size={18} />
                        </button>
                      ) : (
                        <button onClick={() => handleAddToPlaylist(song._id, selectedPlaylist)} style={{ background: '#fff', border: 'none', color: '#000', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
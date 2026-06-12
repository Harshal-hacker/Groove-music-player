import React, { useState } from 'react';
import { Play, Pause, ChevronRight, Shuffle, SkipBack, SkipForward, Repeat, ListMusic, Volume2, VolumeX, Search, Settings, Heart, PlusCircle, FolderPlus, Share2, Link, Trash2, X, Plus, CheckCircle2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function MainFeed({
  activeCategory,
  selectedPlaylist,
  setSelectedPlaylist,
  debouncedQuery,
  userPlaylists,
  setUserPlaylists,
  filteredPlaylist,
  readyMadePlaylists,
  handleContextMenu,
  handleAddToPlaylist,
  handleRemoveFromPlaylist,
  isAdmin,
  setToast,
}) {
  const { 
    playlist, currentTrack, currentTrackIndex, setCurrentTrackIndex, 
    isPlaying, setIsPlaying, setPlaybackContext, isPlayingFromQueueRef,
    setActivePlaylistName, queue, setQueue,
    currentUser, togglePlayPause,
    setPlayingPlaylistId
  } = usePlayer();
  const navigate = useNavigate();

  // Local state for the inline playlist name editor
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  // Local states for the "Add Tracks" modal
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

  // ==========================================
  // PROFESSIONAL CONTEXT ENGINE
  // ==========================================
  const getContextName = () => {
    // 1. Are they playing from a search?
    if (debouncedQuery && debouncedQuery.trim() !== '') return "Search Results";
    
    // 2. Are they playing their liked songs?
    if (activeCategory === 'Liked') return "Liked Songs";
    
    // 3. Are they inside a specific playlist?
    if (selectedPlaylist) {
      const pl = userPlaylists.find(p => p._id === selectedPlaylist);
      return pl ? pl.name : "Playlist";
    }
    
    // 4. Default fallback
    return "All Songs";
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
        credentials: 'include' // <-- VIP PASS SECURE COOKIE ATTACHED
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
    <main style={{ 
      flex: 1, overflowY: 'auto', backgroundColor: '#121212', borderRadius: '24px', border: '1px solid #222', padding: '24px' 
    }} className="bento-scrollbar">
      
      {/* 1. CURATED SHELVES (JIOSAAVN STYLE) */}
      {activeCategory === 'All' && !selectedPlaylist && debouncedQuery.trim() === '' && (
        (() => {
          const categories = [...new Set(readyMadePlaylists.map(pl => pl.category || 'Featured'))];

          return categories.map(categoryName => {
            const categoryPlaylists = readyMadePlaylists.filter(pl => (pl.category || 'Featured') === categoryName);
            if (categoryPlaylists.length === 0) return null;

            const shelfId = `shelf-${categoryName.replace(/\s+/g, '-').toLowerCase()}`;
            const scrollShelf = (direction) => {
              const shelfElement = document.getElementById(shelfId);
              if (shelfElement) {
                const offset = direction === 'left' ? -360 : 360;
                shelfElement.scrollBy({ left: offset, behavior: 'smooth' });
              }
            };

            return (
              <div key={categoryName} style={{ marginBottom: '50px', position: 'relative' }} className="jio-shelf-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>
                    {categoryName}
                  </h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => scrollShelf('left')}
                      style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
                    >
                      <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    <button 
                      onClick={() => scrollShelf('right')}
                      style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}
                      onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                      onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div id={shelfId} style={{ display: 'flex', gap: '20px', overflowX: 'hidden', scrollBehavior: 'smooth', padding: '16px 4px' }}>
                  {categoryPlaylists.map(pl => {
                    const isFollowed = pl.followers?.includes(currentUser?._id);

                    return (
                      <div 
                        key={pl._id} 
                        onClick={() => navigate(`/playlist/${pl._id}`)} 
                        onContextMenu={(e) => handleContextMenu(e, pl._id, 'playlist', 'home')}
                        className="curated-bento-card" 
                        style={{ 
                          minWidth: '160px', maxWidth: '160px', cursor: 'pointer', padding: '12px',
                          backgroundColor: '#0a0a0a', borderRadius: '16px', border: '1px solid #333',
                          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative'
                        }}
                      >
                        <div className="curated-art-wrapper" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
                          <img src={pl.songIds?.[0]?.cover || pl.playlistCover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease' }} alt={pl.name} onError={(e) => e.target.src = "/Groove.png"} />
                          <div className="curated-hover-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s ease' }}>
                            <div style={{ width: '36px', height: '36px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="curated-play-bubble">
                              <Play size={16} fill="black" color="black" style={{ marginLeft: '2px' }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: '0 2px' }}>
                          <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pl.name}</h4>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', margin: 0 }}>{pl.songIds?.length || 0} Tracks</p>
                            {isFollowed && <span style={{ fontSize: '9px', color: '#10b981', fontWeight: '800' }}>SAVED</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()
      )}

      {/* 2. SEARCH RESULTS / ALL SONGS LIST - NOW ONLY SHOWS IF A SEARCH IS ACTIVE */}
      {((activeCategory === 'All' && !selectedPlaylist && debouncedQuery.trim() !== '') || (activeCategory !== 'All' && !selectedPlaylist)) && (
        <>
          <div style={{ marginBottom: '50px' }}>
            <span style={{ background: '#10b981', color: '#000', padding: '4px 12px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>
              {debouncedQuery.trim() !== '' ? 'SEARCH RESULTS' : 'ALL SONGS'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
            {filteredPlaylist.map((track) => {
              const displayCover = track.cover || "/Groove.png";
              const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
              
              return (
                <div 
                  key={track._id} className={`advanced-music-card ${isActive ? 'active' : ''}`}
                  onClick={() => { 
                    setPlaybackContext(filteredPlaylist);
                    setSelectedPlaylist(selectedPlaylist);
                    setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); 
                    setIsPlaying(true); 
                    syncPlayback(track._id, 0, selectedPlaylist);
                    if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false; 
                    const currentListName = selectedPlaylist ? userPlaylists.find(p => p._id === selectedPlaylist)?.name : "All Songs";
                    // setActivePlaylistName(debouncedQuery.trim() !== '' ? "Search Results" : currentListName);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}
                  style={{ 
                    cursor: 'pointer', padding: '16px', borderRadius: '20px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative',
                    backgroundColor: isActive ? '#1a1a1a' : '#0a0a0a', border: isActive ? '1px solid #10b981' : '1px solid #333'
                  }}
                >
                  <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', aspectRatio: '1/1', boxShadow: '0 12px 24px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
                    <img src={track.cover} alt={track.title} onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.5s' }} className="card-img" />
                    <div className="card-overlay" style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isActive ? 1 : 0, transition: '0.3s ease', backdropFilter: 'blur(4px)' }}>
                      <div style={{ width: '48px', height: '48px', backgroundColor: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 15px rgba(16, 185, 129, 0.4)' }}>
                        {isActive ? <Pause size={24} fill="white" color="white" /> : <Play size={24} fill="white" color="white" style={{marginLeft: '3px'}} />}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '0 4px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: isActive ? '#10b981' : '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</h4>
                    <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', margin: '4px 0 0' }}>{track.artist}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 3. PLAYLIST DETAIL VIEW (THE GROOVE DECK) */}
      {activeCategory !== 'All' || selectedPlaylist ? (
        <div className="groove-playlist-wrapper">
          <div className="groove-header-deck">
            <div className="deck-main-card">
              <div className="deck-art-frame">
                <img src={filteredPlaylist.length > 0 ? filteredPlaylist[0].cover : "/Groove.png"} alt="Playlist Art" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} />
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
                      // 1. Check if the currently playing track belongs to the playlist we are looking at
                      const isThisPlaylistActive = currentTrack && filteredPlaylist.some(track => track._id === currentTrack._id);

                      if (isThisPlaylistActive) {
                        // 2. If it IS active, just toggle Play/Pause! This perfectly syncs with the bottom bar.
                        togglePlayPause();
                      } else {
                        // 3. If it is a DIFFERENT playlist, load it up and start from Track 1
                        if (filteredPlaylist.length > 0) {
                          setPlaybackContext(filteredPlaylist); 
                          
                          // ---> USE THE NEW ENGINE HERE <---
                          setActivePlaylistName(getContextName());
                          setPlayingPlaylistId(selectedPlaylist); 
                          
                          setCurrentTrackIndex(playlist.findIndex(s => s._id === track._id));
                          setIsPlaying(true);
                          if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                        }
                      }
                    }}
                  >
                    {/* Update the icon to perfectly match the playing state of this specific context */}
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
                            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }),
                            credentials: 'include' // <-- VIP PASS SECURE COOKIE ATTACHED
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

                  {isAdmin && selectedPlaylist && (userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade || !userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade) && (
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
          <div className="groove-tracklist">
            {filteredPlaylist.map((track, index) => {
              const displayCover = track.cover || "/Groove.png";
              const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
              return (
                <div 
                  key={`${track._id}-${index}`} className={`groove-track-card ${isActive ? 'active' : ''}`}
                  onClick={() => { 
                    setPlaybackContext(filteredPlaylist); 
        
                    // ---> USE THE NEW ENGINE HERE <---
                    setActivePlaylistName(getContextName());
                    setPlayingPlaylistId(selectedPlaylist); 
                    
                    setCurrentTrackIndex(playlist.findIndex(s => s._id === track._id));
                    setIsPlaying(true);
                    if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}
                >
                  <div className="track-id">{(index + 1).toString().padStart(2, '0')}</div>
                  <img src={displayCover} className="track-thumb" alt="" onError={(e) => { e.target.src = "/Groove.png"; }} />
                  <div className="track-meta">
                    <div className="track-name-main" style={{ color: isActive ? '#10b981' : '#fff' }}>{track.title}</div>
                    <div className="track-artist-sub">{track.artist}</div>
                  </div>
                  <div className="track-time">{formatTime(track.duration)}</div>
                  <div className="track-action-indicator">
                    {isActive && isPlaying ? <div className="groove-visualizer"><span></span><span></span><span></span></div> : <ChevronRight size={16} color="#333" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ADD TRACKS MODAL */}
      {showAddTrackModal && selectedPlaylist && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            width: '100%', maxWidth: '500px', height: '70vh', maxHeight: '600px',
            backgroundColor: '#121212', border: '1px solid #333',
            borderRadius: '28px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}>
            {/* Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Add Tracks</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#10b981', fontWeight: '800', textTransform: 'uppercase' }}>
                  {userPlaylists.find(p => p._id === selectedPlaylist)?.name}
                </p>
              </div>
              <button onClick={() => setShowAddTrackModal(false)} style={{ background: '#1a1a1a', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#333'} onMouseOut={e => e.currentTarget.style.background = '#1a1a1a'}>
                <X size={18} />
              </button>
            </div>

            {/* Search Bar */}
            <div style={{ padding: '16px 24px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', color: '#64748b' }} />
                <input 
                  type="text" placeholder="Search tracks..." value={addTrackSearch} onChange={(e) => setAddTrackSearch(e.target.value)}
                  style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '14px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600' }}
                />
              </div>
            </div>

            {/* Track List */}
            <div className="bento-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
              {playlist.filter(song => song.title.toLowerCase().includes(addTrackSearch.toLowerCase()) || song.artist.toLowerCase().includes(addTrackSearch.toLowerCase())).map(song => {
                  const isAlreadyAdded = userPlaylists.find(p => p._id === selectedPlaylist)?.songIds?.some(s => (s._id || s) === song._id);

                  return (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderRadius: '16px', marginBottom: '8px', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.backgroundColor = '#1a1a1a'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img src={song.cover || "/Groove.png"} alt="" style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{song.title}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{song.artist}</div>
                        </div>
                      </div>

                      {isAlreadyAdded ? (
                        <button 
                          onClick={() => handleRemoveFromPlaylist(song._id, selectedPlaylist)}
                          style={{ 
                            background: 'transparent', 
                            border: '1px solid #10b981', 
                            color: '#10b981', 
                            width: '36px', height: '36px', borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: 'pointer', transition: '0.2s' 
                          }}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddToPlaylist(song._id, selectedPlaylist)}
                          style={{ 
                            background: '#fff', 
                            border: 'none', 
                            color: '#000', 
                            width: '36px', height: '36px', borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: 'pointer', transition: '0.2s' 
                          }}
                        >
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
    </main>
  );
}
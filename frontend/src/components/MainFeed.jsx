import React, { useState } from 'react';
import { Play, Pause, ChevronRight, ListMusic, Search, Settings, Heart, Plus, CheckCircle2, MoreHorizontal, PenTool, X, Share2, Download } from 'lucide-react';
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
    setPlayingPlaylistId, syncPlayback 
  } = usePlayer();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [addTrackSearch, setAddTrackSearch] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', playlistCover: '', category: '' });

  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Hover state for the artwork play button
  const [isArtHovered, setIsArtHovered] = useState(false);

  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };

  const getContextName = () => {
    if (debouncedQuery && debouncedQuery.trim() !== '') return "Search Results";
    if (activeCategory === 'Liked') return "Liked Songs";
    if (selectedPlaylist) {
      const pl = userPlaylists.find(p => p._id === selectedPlaylist);
      return pl ? pl.name : "Playlist";
    }
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
        credentials: 'include' 
      });
      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? updatedPlaylist : pl));
      }
    } catch (error) { console.error("Rename failed:", error); } 
    finally { setIsEditingName(false); }
  };

  const openEditModal = () => {
    const pl = userPlaylists.find(p => p._id === selectedPlaylist);
    if (pl) {
      setEditForm({ name: pl.name || '', playlistCover: pl.playlistCover || '', category: pl.category || 'Featured' });
      setShowEditModal(true);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/playlists/${selectedPlaylist}/edit`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm), credentials: 'include'
      });
      if (res.ok) {
        const updatedPl = await res.json();
        setUserPlaylists(prev => prev.map(p => p._id === selectedPlaylist ? updatedPl : p));
        setShowEditModal(false);
        if (setToast) {
          setToast({ message: "Playlist details updated!", type: 'success' });
          setTimeout(() => setToast(null), 3000);
        }
      }
    } catch (error) { console.error("Edit failed:", error); }
  };

  // ⚡ THE NEW FLOATING DOCK BUTTON
  const DockButton = ({ icon, text, onClick, active, success }) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', 
        padding: text ? '8px 16px' : '8px', 
        background: active ? '#10b981' : success ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
        border: 'none', borderRadius: '50px',
        color: active ? '#000' : success ? '#10b981' : '#a7a7a7',
        fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        whiteSpace: 'nowrap', flexShrink: 0
      }}
      onMouseOver={e => {
        if (!active && !success) {
          e.currentTarget.style.color = '#fff';
          e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
        }
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseOut={e => {
        if (!active && !success) {
          e.currentTarget.style.color = '#a7a7a7';
          e.currentTarget.style.background = 'transparent';
        }
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {icon}
      {text && <span>{text}</span>}
    </button>
  );

  // ⚡ THE FIX: Smart logic to bypass default database Groove.png covers
  const getHeaderCoverImage = () => {
    const currentPl = userPlaylists.find(p => p._id === selectedPlaylist);
    const firstTrackCover = filteredPlaylist.length > 0 ? filteredPlaylist[0].cover : null;
    
    // If there is a valid custom cover AND it's NOT the default Groove image
    if (currentPl?.playlistCover && currentPl.playlistCover.trim() !== '' && !currentPl.playlistCover.includes('Groove.png')) {
      return currentPl.playlistCover;
    }
    
    // Fallback exactly to the 1st song in the playlist!
    if (firstTrackCover) {
      return firstTrackCover;
    }
    
    // Absolute fallback if the playlist is empty
    return "/Groove.png";
  };

  const headerCoverImage = getHeaderCoverImage();

  return (
    <main 
      className="bento-scrollbar"
      style={{ 
        flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', 
        overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#121212', 
        borderRadius: '24px', border: '1px solid #222', boxSizing: 'border-box'
      }} 
    >
      
      {/* 1. CURATED SHELVES */}
      {activeCategory === 'All' && !selectedPlaylist && debouncedQuery.trim() === '' && (
        <div style={{ padding: '24px' }}>
          {(() => {
            const categories = [...new Set(readyMadePlaylists.map(pl => pl.category || 'Featured'))];
            return categories.map(categoryName => {
              const categoryPlaylists = readyMadePlaylists.filter(pl => (pl.category || 'Featured') === categoryName);
              if (categoryPlaylists.length === 0) return null;
              const shelfId = `shelf-${categoryName.replace(/\s+/g, '-').toLowerCase()}`;
              
              return (
                <div key={categoryName} style={{ marginBottom: '50px', position: 'relative' }} className="jio-shelf-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>{categoryName}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => document.getElementById(shelfId).scrollBy({ left: -360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                        <ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
                      </button>
                      <button onClick={() => document.getElementById(shelfId).scrollBy({ left: 360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s' }}>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                  <div id={shelfId} style={{ display: 'flex', gap: '20px', overflowX: 'hidden', scrollBehavior: 'smooth', padding: '16px 4px' }}>
                    {categoryPlaylists.map(pl => {
                      const isFollowed = pl.followers?.includes(currentUser?._id);
                      return (
                        <div key={pl._id} onClick={() => navigate(`/playlist/${pl._id}`)} onContextMenu={(e) => handleContextMenu(e, pl._id, 'playlist', 'home')} className="curated-bento-card" style={{ minWidth: '160px', maxWidth: '160px', cursor: 'pointer', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative' }}>
                          <div className="curated-art-wrapper" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
                            <img src={pl.songIds?.[0]?.cover || pl.playlistCover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={pl.name} onError={(e) => e.target.src = "/Groove.png"} />
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
          })()}
        </div>
      )}

      {/* 2. SEARCH RESULTS */}
      {((activeCategory === 'All' && !selectedPlaylist && debouncedQuery.trim() !== '') || (activeCategory !== 'All' && !selectedPlaylist)) && (
        <div style={{ flex: 1, padding: '24px' }}>
          <div style={{ marginBottom: '50px' }}>
            <span style={{ background: '#10b981', color: '#000', padding: '4px 12px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>
              {debouncedQuery.trim() !== '' ? 'SEARCH RESULTS' : 'ALL SONGS'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '20px', paddingBottom: '40px' }}>
            {filteredPlaylist.map((track) => {
              const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
              return (
                <div key={track._id} className={`advanced-music-card ${isActive ? 'active' : ''}`} onClick={() => { setPlaybackContext(filteredPlaylist); setSelectedPlaylist(selectedPlaylist); setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); setIsPlaying(true); syncPlayback(track._id, 0, selectedPlaylist); if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false; }} onContextMenu={(e) => handleContextMenu(e, track._id, 'song')} style={{ cursor: 'pointer', padding: '16px', borderRadius: '20px', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', backgroundColor: isActive ? '#1a1a1a' : '#0a0a0a', border: isActive ? '1px solid #10b981' : '1px solid #333' }}>
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
        </div>
      )}

      {/* 3. PLAYLIST DETAIL VIEW (⚡ THE NEW CINEMATIC DOCK DESIGN ⚡) */}
      {activeCategory !== 'All' || selectedPlaylist ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* THE HEADER CONTAINER */}
          <div style={{ position: 'relative', padding: 'clamp(24px, 5cqw, 40px)', containerType: 'inline-size', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            
            {/* Atmospheric Background Glow */}
            <div style={{ position: 'absolute', left: '10%', top: '0', width: '60%', height: '100%', background: '#10b981', filter: 'blur(180px)', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(20px, 4cqw, 32px)', zIndex: 1, position: 'relative', flexWrap: 'nowrap' }}>
              
              {/* ⚡ THE ARTWORK: Hover to Reveal Cinematic Play Button */}
              <div 
                onMouseEnter={() => setIsArtHovered(true)}
                onMouseLeave={() => setIsArtHovered(false)}
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
                      syncPlayback(filteredPlaylist[0]._id, 0, selectedPlaylist); 
                      if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                    }
                  }
                }}
                style={{ 
                  position: 'relative', width: 'clamp(140px, 20cqw, 240px)', flexShrink: 0, aspectRatio: '1/1', 
                  borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  cursor: 'pointer' 
                }}
              >
                {/* ⚡ THE FIX: Using headerCoverImage instead of directly referencing userPlaylists */}
                <img 
                  src={headerCoverImage} 
                  alt="Playlist Art" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', transform: isArtHovered ? 'scale(1.05)' : 'scale(1)' }}
                />
                
                {/* Dark Overlay on Hover */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: isArtHovered ? 1 : 0, transition: 'opacity 0.3s ease' }} />

                {/* Massive Play/Pause Icon Over Artwork */}
                <div style={{ 
                  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isArtHovered || (isPlaying && currentTrack && filteredPlaylist.some(t => t._id === currentTrack._id)) ? 1 : 0,
                  transform: isArtHovered ? 'scale(1)' : 'scale(0.8)',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(16,185,129,0.5)' }}>
                    {isPlaying && (currentTrack && filteredPlaylist.some(track => track._id === currentTrack._id)) ? (
                      <Pause size={32} fill="#000" color="#000" /> 
                    ) : (
                      <Play size={32} fill="#000" color="#000" style={{marginLeft: '4px'}} />
                    )}
                  </div>
                </div>
              </div>

              {/* ⚡ TYPOGRAPHY AND FLOATING DOCK */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 0%', minWidth: 0 }}>
                
                <div style={{ fontSize: 'clamp(10px, 1.5cqw, 12px)', fontWeight: '900', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                  {activeCategory === 'Liked' ? 'LIBRARY' : 'COLLECTION'}
                </div>

                {isEditingName ? (
                  <input
                    autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)} onBlur={handleInlineRename}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInlineRename(); if (e.key === 'Escape') setIsEditingName(false); }}
                    style={{ background: 'rgba(0,0,0,0.5)', border: '2px solid #10b981', color: 'white', outline: 'none', borderRadius: '12px', padding: '8px 16px', fontSize: 'clamp(32px, 6cqw, 64px)', fontWeight: '900', width: '100%', marginBottom: '8px', boxSizing: 'border-box' }}
                  />
                ) : (
                  <h1 style={{ 
                    fontSize: 'clamp(32px, 6cqw, 72px)', fontWeight: '900', color: '#fff', 
                    margin: '0 0 16px 0', letterSpacing: '-1.5px', lineHeight: 1.1, 
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%'
                  }}>
                    {selectedPlaylist ? userPlaylists.find(p => p._id === selectedPlaylist)?.name : "Liked Library"}
                  </h1>
                )}

                <p style={{ color: '#a7a7a7', fontSize: 'clamp(12px, 2cqw, 14px)', fontWeight: '600', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                  <span style={{ color: '#fff', fontWeight: '800' }}>{selectedPlaylist ? 'Groove Audio' : currentUser?.profileName || 'User'}</span>
                  <span>•</span>
                  <span>{filteredPlaylist.length} Tracks</span>
                  <span>•</span>
                  <span>
                    {(() => {
                      const totalSeconds = filteredPlaylist.reduce((total, track) => {
                        let sec = 0;
                        if (typeof track.duration === 'string' && track.duration.includes(':')) {
                          const parts = track.duration.split(':');
                          sec = parseInt(parts[0]) * 60 + parseInt(parts[1]);
                        } else { sec = Number(track.duration) || 0; }
                        return total + sec;
                      }, 0);
                      const hours = Math.floor(totalSeconds / 3600);
                      const minutes = Math.floor((totalSeconds % 3600) / 60);
                      if (hours > 0) return `${hours} hr ${minutes} min`;
                      else if (minutes > 0) return `${minutes} min`;
                      else return `0 min`;
                    })()}
                  </span>
                </p>

                {/* ⚡ THE FLOATING GLASS DOCK (Replaces the rigid right panel) */}
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  padding: '6px', background: 'rgba(255,255,255,0.03)', 
                  border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50px',
                  backdropFilter: 'blur(10px)', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%'
                }}>
                  
                  {/* Save to Library */}
                  {selectedPlaylist && userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade && (
                    <DockButton 
                      icon={<Heart size={16} fill={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id) ? "#10b981" : "none"} color={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id) ? "#10b981" : "currentColor"} />} 
                      text="Save"
                      active={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id)}
                      onClick={async () => {
                        const userId = currentUser?._id;
                        if (!userId) return alert("Please log in!");

                        const currentPlaylist = userPlaylists.find(p => p._id === selectedPlaylist);
                        const isCurrentlySaved = currentPlaylist?.followers?.includes(userId);

                        // Optimistic Update
                        setUserPlaylists(prev => prev.map(p => {
                          if (p._id === selectedPlaylist) {
                            const newFollowers = isCurrentlySaved ? p.followers.filter(id => id !== userId) : [...(p.followers || []), userId];       
                            return { ...p, followers: newFollowers };
                          }
                          return p;
                        }));

                        if (setToast) {
                          setToast({ message: isCurrentlySaved ? "Removed from library." : "Added to collection!", type: 'success' });
                          setTimeout(() => setToast(null), 3000);
                        }

                        try {
                          const res = await fetch(`${API_BASE_URL}/api/playlists/${selectedPlaylist}/follow`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }), credentials: 'include' });
                          if (res.ok) {
                            const updatedPlaylist = await res.json();
                            setUserPlaylists(prev => prev.map(p => p._id === selectedPlaylist ? updatedPlaylist : p));
                          }
                        } catch (err) { console.error("Save action failed:", err); }
                      }}
                    />
                  )}

                  {/* Share, Download, More */}
                  {selectedPlaylist && (
                    <>
                      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                      
                      <DockButton 
                        icon={isCopied ? <CheckCircle2 size={16} /> : <Share2 size={16} />} 
                        success={isCopied}
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(`${window.location.origin}/playlist/${selectedPlaylist}`);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000); 
                            if (setToast) {
                              setToast({ message: "Link copied to clipboard!", type: 'success' });
                              setTimeout(() => setToast(null), 3000);
                            }
                          } catch (err) {}
                        }} 
                      />
                      
                      <DockButton 
                        icon={<Download size={16} />} 
                        success={isDownloaded}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDownloaded(!isDownloaded);
                          if (setToast) {
                            setToast({ message: isDownloaded ? "Removed from downloads." : "Downloading playlist...", type: 'success' });
                            setTimeout(() => setToast(null), 3000);
                          }
                        }} 
                      />

                      <DockButton 
                        icon={<MoreHorizontal size={16} />} 
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const fakeEvent = { preventDefault: () => {}, clientX: rect.left, clientY: rect.bottom + 10 };
                          handleContextMenu(fakeEvent, selectedPlaylist, 'playlist', 'header');
                        }} 
                      />
                    </>
                  )}

                  {/* Admin Actions */}
                  {isAdmin && selectedPlaylist && (
                    <>
                      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                      <DockButton icon={<Plus size={16} />} text="Add Tracks" onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }} />
                      <DockButton icon={<PenTool size={16} />} text="Edit" onClick={openEditModal} />
                    </>
                  )}
                  
                </div>
              </div>
            </div>
          </div>

          {/* THE TRACKLIST AREA */}
          <div className="groove-tracklist" style={{ padding: '24px' }}>
            {filteredPlaylist.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed #333' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <ListMusic size={24} color="#10b981" />
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#fff' }}>This audio deck is empty</h4>
                {selectedPlaylist ? (
                  <button onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }} style={{ backgroundColor: '#fff', color: '#000', padding: '10px 24px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: '0.2s', marginTop: '16px' }}>
                    ADD TRACKS NOW
                  </button>
                ) : (
                  <p style={{ color: '#10b981', fontSize: '11px', fontWeight: '900', letterSpacing: '1px' }}>PRESS CTRL + K TO SEARCH</p>
                )}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '8px' }}>
                {filteredPlaylist.map((track, index) => {
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
                        syncPlayback(track._id, 0, selectedPlaylist); 
                        if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                      }}
                      onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}
                    >
                      <div className="track-id">{(index + 1).toString().padStart(2, '0')}</div>
                      <img src={track.cover || "/Groove.png"} className="track-thumb" alt="" onError={(e) => { e.target.src = "/Groove.png"; }} />
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
            )}
          </div>
        </div>
      ) : null}

      {/* ================= MODALS ================= */}

      {/* 1. ADD TRACKS MODAL */}
      {showAddTrackModal && selectedPlaylist && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '540px', height: '80vh', maxHeight: '700px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
            
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#121212', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#a7a7a7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Add songs to
                  </p>
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userPlaylists.find(p => p._id === selectedPlaylist)?.name}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowAddTrackModal(false)} 
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a7a7a7', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }} 
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} 
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#a7a7a7'; }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', color: '#a7a7a7' }} />
                <input 
                  type="text" placeholder="Search tracks or artists..." value={addTrackSearch} onChange={(e) => setAddTrackSearch(e.target.value)} 
                  style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', outline: 'none', fontSize: '14px', fontWeight: '600', boxSizing: 'border-box', transition: 'border-color 0.2s' }} 
                  onFocus={e => e.currentTarget.style.borderColor = '#10b981'} 
                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'} 
                />
              </div>
            </div>

            <div className="bento-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
              {playlist.filter(song => song.title.toLowerCase().includes(addTrackSearch.toLowerCase()) || song.artist.toLowerCase().includes(addTrackSearch.toLowerCase())).map(song => {
                  const isAlreadyAdded = userPlaylists.find(p => p._id === selectedPlaylist)?.songIds?.some(s => (s._id || s) === song._id);
                  
                  return (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', marginBottom: '4px', transition: 'all 0.2s', backgroundColor: 'transparent' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                        <img 
                          src={song.cover || "/Groove.png"} alt="" 
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, opacity: isAlreadyAdded ? 0.5 : 1 }} 
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: isAlreadyAdded ? '#a7a7a7' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.artist}
                          </div>
                        </div>
                      </div>

                      {isAlreadyAdded ? (
                        <button 
                          onClick={() => handleRemoveFromPlaylist(song._id, selectedPlaylist)} 
                          style={{ background: 'transparent', border: '1px solid transparent', color: '#10b981', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }} 
                          onMouseOver={e => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; e.currentTarget.style.borderColor = '#10b981'; }} 
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddToPlaylist(song._id, selectedPlaylist)} 
                          style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }} 
                          onMouseOver={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; e.currentTarget.style.borderColor = '#fff'; }} 
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                        >
                          <Plus size={16} />
                        </button>
                      )}

                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT PLAYLIST MODAL */}
      {showEditModal && selectedPlaylist && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff' }}>Edit Details</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: '#1a1a1a', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleEditSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>Name</label><input type="text" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>Cover Image URL (Optional)</label><input type="text" placeholder="https://..." value={editForm.playlistCover} onChange={(e) => setEditForm({ ...editForm, playlistCover: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div><label style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'block' }}>Shelf Category</label><input type="text" placeholder="e.g., Featured, Workout, Focus" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: 'white', outline: 'none', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <button type="submit" style={{ padding: '16px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '800', fontSize: '14px', marginTop: '10px', cursor: 'pointer' }}>SAVE CHANGES</button>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
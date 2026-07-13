import React, { useState, useEffect } from 'react';
import { Play, Pause, ChevronRight, ListMusic, Search, Heart, Plus, CheckCircle2, MoreHorizontal, PenTool, X, Share2, Download } from 'lucide-react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';
import { API_BASE_URL } from '../config';

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

export default function PlaylistDeck({
  activeCategory,
  selectedPlaylist,
  debouncedQuery,
  userPlaylists,
  setUserPlaylists,
  filteredPlaylist,
  handleContextMenu,
  handleAddToPlaylist,
  handleRemoveFromPlaylist,
  isAdmin,
  setToast,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: albumRouteId } = useParams();
  const isAlbumMode = location.pathname.includes('/album');

  const { 
    playlist, currentTrack, currentTrackIndex, setCurrentTrackIndex, 
    isPlaying, setIsPlaying, setPlaybackContext, isPlayingFromQueueRef,
    setActivePlaylistName, currentUser, togglePlayPause,
    setPlayingPlaylistId, syncPlayback 
  } = usePlayer();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);
  const [addTrackSearch, setAddTrackSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', playlistCover: '', category: '' });
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isArtHovered, setIsArtHovered] = useState(false);
  const [visibleTracksCount, setVisibleTracksCount] = useState(30);

  // ⚡ ALBUM STATE
  const [albumData, setAlbumData] = useState(null);
  const [albumSongs, setAlbumSongs] = useState([]);
  const [isLoadingSpecificAlbum, setIsLoadingSpecificAlbum] = useState(false);

  useEffect(() => {
    if (isAlbumMode && albumRouteId) {
      setIsLoadingSpecificAlbum(true);
      const fetchSpecificAlbum = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/albums/${albumRouteId}`);
          if (response.ok) {
            const data = await response.json();
            setAlbumData(data.album);
            setAlbumSongs(data.songs);
          }
        } catch (error) { console.error("Failed to load album:", error); } 
        finally { setIsLoadingSpecificAlbum(false); }
      };
      fetchSpecificAlbum();
    }
  }, [isAlbumMode, albumRouteId]);

  useEffect(() => {
    setVisibleTracksCount(30);
  }, [selectedPlaylist, activeCategory, debouncedQuery, isAlbumMode]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      if (visibleTracksCount < (isAlbumMode ? albumSongs.length : filteredPlaylist.length)) {
        setVisibleTracksCount((prev) => prev + 20);
      }
    }
  };

  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };

  const getContextName = () => {
    if (isAlbumMode) return albumData?.title || "Album";
    if (debouncedQuery && debouncedQuery.trim() !== '') return "Search Results";
    if (activeCategory === 'Liked') return "Liked Songs";
    if (selectedPlaylist) {
      const pl = userPlaylists.find(p => p._id === selectedPlaylist);
      return pl ? pl.name : "Playlist";
    }
    return "All Songs";
  };

  const handleInlineRename = async () => {
    if (isAlbumMode) return;
    const playlistId = selectedPlaylist;
    if (!tempName || tempName.trim() === "" || tempName === userPlaylists.find(pl => pl._id === playlistId)?.name) {
      setIsEditingName(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/rename`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: tempName }), credentials: 'include' 
      });
      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? updatedPlaylist : pl));
      }
    } catch (error) { console.error("Rename failed:", error); } 
    finally { setIsEditingName(false); }
  };

  const openEditModal = () => {
    if (isAlbumMode) return;
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
        if (setToast) { setToast({ message: "Playlist details updated!", type: 'success' }); setTimeout(() => setToast(null), 3000); }
      }
    } catch (error) { console.error("Edit failed:", error); }
  };

  const getHeaderCoverImage = () => {
    if (isAlbumMode) return albumData?.coverArt || "/Groove.png";
    const currentPl = userPlaylists.find(p => p._id === selectedPlaylist);
    const firstTrackCover = filteredPlaylist.length > 0 ? filteredPlaylist[0].albumId?.coverArt : null;
    if (currentPl?.playlistCover && currentPl.playlistCover.trim() !== '' && !currentPl.playlistCover.includes('Groove.png')) {
      return currentPl.playlistCover;
    }
    if (firstTrackCover) { return firstTrackCover; }
    return "/Groove.png";
  };

  // ⚡ UNIVERSAL DATA VARIABLES
  const fullContextTracks = isAlbumMode ? albumSongs : filteredPlaylist;
  const visibleTracks = fullContextTracks.slice(0, visibleTracksCount);
  const headerCoverImage = getHeaderCoverImage();
  const displayTitle = isAlbumMode ? albumData?.title : (selectedPlaylist ? userPlaylists.find(p => p._id === selectedPlaylist)?.name : "Liked Library");
  const displayCreator = isAlbumMode ? (albumData?.artists?.map(a => a.name).join(', ') || "Various Artists") : (selectedPlaylist ? 'Groove Audio' : currentUser?.profileName || 'User');
  const currentCollectionId = isAlbumMode ? albumData?._id : selectedPlaylist;

  if (isLoadingSpecificAlbum) {
    return <div style={{ padding: '40px', color: '#10b981', fontWeight: '800' }}>Loading Deck...</div>;
  }

  return (
    <main 
      className="bento-scrollbar"
      onScroll={handleScroll} 
      style={{ 
        flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', 
        overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#121212', 
        borderRadius: '24px', border: '1px solid #222', boxSizing: 'border-box'
      }} 
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ position: 'relative', padding: 'clamp(24px, 5cqw, 40px)', containerType: 'inline-size', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          
          <div style={{ position: 'absolute', left: '10%', top: '0', width: '60%', height: '100%', background: '#10b981', filter: 'blur(180px)', opacity: 0.08, zIndex: 0, pointerEvents: 'none' }} />

          {/* ⚡ Identical FlexBox For Both! Back Button removed completely! */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'clamp(20px, 4cqw, 32px)', zIndex: 1, position: 'relative', flexWrap: 'nowrap' }}>
            
            <div 
              onMouseEnter={() => setIsArtHovered(true)}
              onMouseLeave={() => setIsArtHovered(false)}
              onClick={() => {
                const isThisPlaylistActive = currentTrack && fullContextTracks.some(track => track._id === currentTrack._id);
                if (isThisPlaylistActive) {
                  togglePlayPause();
                } else {
                  if (fullContextTracks.length > 0) {
                    setPlaybackContext(fullContextTracks); 
                    setActivePlaylistName(getContextName());
                    setPlayingPlaylistId(currentCollectionId); 
                    setCurrentTrackIndex(playlist.findIndex(s => s._id === fullContextTracks[0]._id));
                    setIsPlaying(true);
                    syncPlayback(fullContextTracks[0]._id, 0, currentCollectionId); 
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
              <img 
                src={headerCoverImage} 
                alt="Playlist Art" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', transform: isArtHovered ? 'scale(1.05)' : 'scale(1)' }}
              />
              
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: isArtHovered ? 1 : 0, transition: 'opacity 0.3s ease' }} />

              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: isArtHovered || (isPlaying && currentTrack && fullContextTracks.some(t => t._id === currentTrack._id)) ? 1 : 0,
                transform: isArtHovered ? 'scale(1)' : 'scale(0.8)',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 30px rgba(16,185,129,0.5)' }}>
                  {isPlaying && (currentTrack && fullContextTracks.some(track => track._id === currentTrack._id)) ? (
                    <Pause size={32} fill="#000" color="#000" /> 
                  ) : (
                    <Play size={32} fill="#000" color="#000" style={{marginLeft: '4px'}} />
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: '1 1 0%', minWidth: 0 }}>
              
              <div style={{ fontSize: 'clamp(10px, 1.5cqw, 12px)', fontWeight: '900', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>
                {isAlbumMode ? 'OFFICIAL ALBUM' : (activeCategory === 'Liked' ? 'LIBRARY' : 'COLLECTION')}
              </div>

              {isEditingName && !isAlbumMode ? (
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
                  {displayTitle}
                </h1>
              )}

              <p style={{ color: '#a7a7a7', fontSize: 'clamp(12px, 2cqw, 14px)', fontWeight: '600', margin: '0 0 24px 0', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                <span style={{ color: '#fff', fontWeight: '800', whiteSpace: 'nowrap' }}>{displayCreator}</span>
                <span>•</span>
                <span style={{ whiteSpace: 'nowrap' }}>{fullContextTracks.length} Tracks</span>
                <span>•</span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {(() => {
                    const totalSeconds = fullContextTracks.reduce((total, track) => {
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

              {/* ⚡ 100% IDENTICAL FLOATING GLASS DOCK */}
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                padding: '6px', background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50px',
                backdropFilter: 'blur(10px)', flexWrap: 'nowrap', overflowX: 'auto', maxWidth: '100%'
              }}>
                
                {/* ⚡ The Heart Button for BOTH */}
                {isAlbumMode ? (
                  <DockButton 
                    icon={<Heart size={16} fill="none" color="currentColor" />} 
                    onClick={() => {
                      if (setToast) { setToast({ message: "Album saved to library!", type: 'success' }); setTimeout(() => setToast(null), 3000); }
                    }}
                  />
                ) : selectedPlaylist && userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade ? (
                  <DockButton 
                    icon={<Heart size={16} fill={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id) ? "#10b981" : "none"} color={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id) ? "#10b981" : "currentColor"} />} 
                    active={userPlaylists.find(p => p._id === selectedPlaylist)?.followers?.includes(currentUser?._id)}
                    onClick={async () => {
                      const userId = currentUser?._id;
                      if (!userId) return alert("Please log in!");

                      const currentPlaylist = userPlaylists.find(p => p._id === selectedPlaylist);
                      const isCurrentlySaved = currentPlaylist?.followers?.includes(userId);

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
                ) : null}

                {(selectedPlaylist || isAlbumMode) && (
                  <>
                    {/* ⚡ Divider line */}
                    {(isAlbumMode || (selectedPlaylist && userPlaylists.find(p => p._id === selectedPlaylist)?.isReadyMade)) && (
                      <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px', flexShrink: 0 }} />
                    )}
                    
                    <DockButton 
                      icon={isCopied ? <CheckCircle2 size={16} /> : <Share2 size={16} />} 
                      success={isCopied}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await navigator.clipboard.writeText(`${window.location.origin}${isAlbumMode ? `/album/${currentCollectionId}` : `/playlist/${selectedPlaylist}`}`);
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
                          setToast({ message: isDownloaded ? "Removed from downloads." : "Downloading...", type: 'success' });
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
                        handleContextMenu(fakeEvent, currentCollectionId, isAlbumMode ? 'album' : 'playlist', 'header');
                      }} 
                    />
                  </>
                )}

                {/* ⚡ The Admin Options (Now visible on BOTH!) */}
                {isAdmin && (selectedPlaylist || isAlbumMode) && (
                  <>
                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px', flexShrink: 0 }} />
                    <DockButton icon={<Plus size={16} />} onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }} />
                    <DockButton icon={<PenTool size={16} />} onClick={openEditModal} />
                  </>
                )}
                
              </div>
            </div>

          </div>
        </div>

        {/* THE TRACKLIST AREA */}
        <div className="groove-tracklist" style={{ padding: '24px' }}>
          {fullContextTracks.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '24px', border: '1px dashed #333' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <ListMusic size={24} color="#10b981" />
              </div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '800', color: '#fff' }}>This audio deck is empty</h4>
              
              {/* ⚡ Button visible on both if admin! */}
              {(selectedPlaylist || isAlbumMode) && isAdmin ? (
                <button onClick={() => { setAddTrackSearch(''); setShowAddTrackModal(true); }} style={{ backgroundColor: '#fff', color: '#000', padding: '10px 24px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', border: 'none', cursor: 'pointer', transition: '0.2s', marginTop: '16px' }}>
                  ADD TRACKS NOW
                </button>
              ) : (
                <p style={{ color: '#10b981', fontSize: '11px', fontWeight: '900', letterSpacing: '1px', marginTop: '16px' }}>NO TRACKS AVAILABLE</p>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '8px' }}>
              
              {visibleTracks.map((track, index) => {
                const trackCover = track.albumId?.coverArt || headerCoverImage;
                const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
                return (
                  <div 
                    key={`${track._id}-${index}`} 
                    onClick={() => { 
                      setPlaybackContext(fullContextTracks); 
                      setActivePlaylistName(getContextName());
                      setPlayingPlaylistId(currentCollectionId); 
                      setCurrentTrackIndex(playlist.findIndex(s => s._id === track._id));
                      setIsPlaying(true);
                      syncPlayback(track._id, 0, currentCollectionId); 
                      if (isPlayingFromQueueRef) isPlayingFromQueueRef.current = false;
                    }}
                    onContextMenu={(e) => handleContextMenu && handleContextMenu(e, track._id, 'song')}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '10px 16px', 
                      borderRadius: '16px', cursor: 'pointer', transition: 'background 0.2s ease', 
                      backgroundColor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      minWidth: 0 
                    }}
                    onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                    onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <div style={{ width: '24px', flexShrink: 0, fontSize: '13px', color: '#a7a7a7', fontWeight: '600', textAlign: 'center' }}>
                      {isActive && isPlaying ? <div className="groove-visualizer"><span></span><span></span><span></span></div> : (index + 1).toString().padStart(2, '0')}
                    </div>
                    
                    <img src={trackCover} alt="" onError={(e) => { e.target.onerror = null; e.target.src = "/Groove.png"; }} 
                      style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
                      loading="lazy"
                    />
                    
                    <div style={{ flex: '1 1 0%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: isActive ? '#10b981' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.title}</div>
                      <div style={{ fontSize: '13px', color: '#a7a7a7', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{track.artists?.map(a => a.name).join(', ') || "Unknown Artist"}</div>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: '#a7a7a7', fontWeight: '500', flexShrink: 0, width: '40px', textAlign: 'right' }}>
                      {formatTime(track.duration)}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', flexShrink: 0 }}>
                      <button 
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation(); 
                          if (handleContextMenu) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const fakeEvent = { preventDefault: () => {}, clientX: rect.left, clientY: rect.bottom + 10 };
                            handleContextMenu(fakeEvent, track._id, 'song');
                          }
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#a7a7a7', cursor: 'pointer', padding: '4px', display: 'flex' }}
                        onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                        onMouseOut={(e) => e.currentTarget.style.color = '#a7a7a7'}
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* ADD TRACKS MODAL (Allowed on both) */}
      {showAddTrackModal && (selectedPlaylist || isAlbumMode) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ width: '100%', maxWidth: '540px', height: '80vh', maxHeight: '700px', backgroundColor: '#121212', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.8)' }}>
            
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: '#121212', zIndex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#a7a7a7', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Add songs to
                  </p>
                  <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayTitle}
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
              {playlist.filter(song => song.title.toLowerCase().includes(addTrackSearch.toLowerCase()) || (song.artists?.map(a => a.name).join(', ') || "").toLowerCase().includes(addTrackSearch.toLowerCase())).map(song => {
                  const isAlreadyAdded = !isAlbumMode && userPlaylists.find(p => p._id === selectedPlaylist)?.songIds?.some(s => (s._id || s) === song._id);
                  
                  return (
                    <div key={song._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '12px', marginBottom: '4px', transition: 'all 0.2s', backgroundColor: 'transparent' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                        <img 
                          src={song.albumId?.coverArt || "/Groove.png"} alt="" 
                          style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, opacity: isAlreadyAdded ? 0.5 : 1 }} 
                          loading="lazy"
                        />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: isAlreadyAdded ? '#a7a7a7' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {song.artists?.map(a => a.name).join(', ') || "Unknown Artist"}
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

      {/* EDIT PLAYLIST MODAL (Allowed on both) */}
      {showEditModal && (selectedPlaylist || isAlbumMode) && (
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
import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Play, SkipForward, X, PlusCircle, ListMusic, User, ArrowLeft, FolderPlus, Share2, Link, ChevronRight, Trash2, Heart, Plus, Folder, Search, Loader2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { API_BASE_URL } from './config';

import PlayerDeck from './components/PlayerDeck';
import { usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import MainFeed from './components/MainFeed';

// ⚡ OUR BRAND NEW, CLEAN COMPONENTS
import TopHeader from './components/TopHeader';
import RightQueue from './components/RightQueue';

const Admin = lazy(() => import('./Admin'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));

const AppSkeleton = () => (
  <div style={{ backgroundColor: '#000', height: '100vh', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
    <div className="skeleton-pulse" style={{ height: '64px', borderRadius: '16px' }} />
    <div style={{ display: 'flex', flex: 1, gap: '12px' }}>
      <div className="skeleton-pulse" style={{ width: '260px', borderRadius: '16px' }} />
      <div className="skeleton-pulse" style={{ flex: 1, borderRadius: '16px' }} />
    </div>
  </div>
);

function MainPlayer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  const { 
    currentUser, setCurrentUser, isAuthLoading,
    playlist, setPlaylist, currentTrack, currentTrackIndex, setCurrentTrackIndex,
    isPlaying, setIsPlaying, setCurrentTime, queue, setQueue, 
    playbackContext, setPlaybackContext, audioRef,
    selectedPlaylist, setSelectedPlaylist, syncPlayback, setActivePlaylistName,
    forceSyncNow, setPlayingPlaylistId, volume
  } = usePlayer();

  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';

  const [searchQuery, setSearchQuery] = useState(''); 
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false); 
  
  const [contextMenu, setContextMenu] = useState(null); 
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  const [userData, setUserData] = useState({ likedSongs: [], role: 'user' });
  const isPlayingFromQueueRef = useRef(false);  
  const lastContextIndexRef = useRef(0);
  const hasRestoredServerQueue = useRef(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState({ current: 0, total: 0 });
  const [toast, setToast] = useState(null);
  const [savedTime, setSavedTime] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => { setPlaylist(data); setIsLoading(false); })
      .catch(err => { console.error("Fetch error:", err); setIsLoading(false); });
  }, [showAdmin]); 

  useEffect(() => {
    if (id) { setSelectedPlaylist(id); setActiveCategory('All'); } 
    else { setSelectedPlaylist(null); setActiveCategory('All'); }
  }, [id]);

  useEffect(() => {
    const fetchUserLibrary = async () => {
      const userId = currentUser?._id;
      const url = userId ? `${API_BASE_URL}/api/playlists?userId=${userId}` : `${API_BASE_URL}/api/playlists`;
      try {
        const response = await fetch(url, { credentials: 'include' });
        const data = await response.json();
        if (Array.isArray(data)) setUserPlaylists(data);
      } catch (err) { console.error("Library Fetch Failed:", err); }
    };
    fetchUserLibrary();
  }, [showAdmin, isAuthenticated, currentUser]); 

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (audioRef.current.src !== currentTrack.src) audioRef.current.src = currentTrack.src;
      if (isPlaying) audioRef.current.play().catch(e => console.error("Auto-play failed:", e));
    }
  }, [currentTrackIndex]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title, artist: currentTrack.artist, album: "Groove Collection",
        artwork: [{ src: currentTrack.cover || '/Groove.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const preventDefault = (e) => { if (contextMenu) { e.preventDefault(); e.stopPropagation(); } };
    if (contextMenu) {
      window.addEventListener('wheel', preventDefault, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
    }
    return () => {
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') setContextMenu(null); };
    if (contextMenu) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu]);

  useEffect(() => {
    if (!hasRestoredServerQueue.current && userPlaylists.length > 0 && currentUser?.activeSession?.playlistId) {
      const serverPlaylist = userPlaylists.find(p => p._id === currentUser.activeSession.playlistId);
      if (serverPlaylist) {
        setActivePlaylistName(serverPlaylist.name); 
        setPlaybackContext(serverPlaylist.songIds || []);
        setPlayingPlaylistId(serverPlaylist._id);
      }
      hasRestoredServerQueue.current = true; 
    }
  }, [userPlaylists, currentUser, setActivePlaylistName, setPlaybackContext, setPlayingPlaylistId]);
  
  useEffect(() => {
    if (contextMenu) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [contextMenu]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
    }
  }, [playlist, currentTrackIndex, isPlaying]); 

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedQuery(searchQuery); }, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); return; }
      if (e.key === 'Escape') { setIsSearchOpen(false); setIsShortcutHelpOpen(false); }
      if ((e.ctrlKey || e.metaKey) && e.key === '/') { e.preventDefault(); setIsShortcutHelpOpen(prev => !prev); return; }
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; 
      if (e.code === 'Space' || e.code === 'MediaPlayPause') { e.preventDefault(); togglePlayPause(); }
      if ((e.ctrlKey && e.code === 'ArrowRight') || e.code === 'MediaTrackNext') { e.preventDefault(); handleNext(); }
      if ((e.ctrlKey && e.code === 'ArrowLeft') || e.code === 'MediaTrackPrevious') { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isPlaying, volume, currentTrackIndex, queue, playbackContext, playlist]);
  
  useEffect(() => {
    const userId = currentUser?._id;
    if (!userId || !currentTrack || !audioRef.current) return;

    const syncStateToCloud = () => {
      if (audioRef.current.currentTime > 0) {
        fetch(`${API_BASE_URL}/api/users/${userId}/playback`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'keepalive': 'true' },
          body: JSON.stringify({ songId: currentTrack._id, currentTime: audioRef.current.currentTime }),
          credentials: 'include'
        }).catch(e => console.error("Cloud sync failed", e));
      }
    };

    if (!isPlaying) syncStateToCloud();
    let heartbeatInterval;
    if (isPlaying) { heartbeatInterval = setInterval(() => { syncStateToCloud(); }, 10000); }
    window.addEventListener('beforeunload', syncStateToCloud);
    return () => {
      window.removeEventListener('beforeunload', syncStateToCloud);
      if (heartbeatInterval) clearInterval(heartbeatInterval); 
    };
  }, [isPlaying, currentTrack, currentUser]);

  useEffect(() => {
    if (isPlayingFromQueueRef.current) return; 
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    if (currentTrack) {
      const indexInContext = currentPool.findIndex(s => s._id === currentTrack._id);
      if (indexInContext !== -1) lastContextIndexRef.current = indexInContext;
    }
  }, [currentTrack, playbackContext, playlist]);
  
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const fadeDuration = 300; 
    const steps = 20; 
    const stepTime = fadeDuration / steps;
    const targetVolume = volume; 

    if (isPlaying) {
      let currentStep = 0;
      const fadeOutInterval = setInterval(() => {
        currentStep++;
        const newVolume = targetVolume * (1 - currentStep / steps);
        if (newVolume >= 0 && newVolume <= 1) audio.volume = newVolume;
        if (currentStep >= steps) {
          clearInterval(fadeOutInterval); audio.pause(); setIsPlaying(false); audio.volume = targetVolume; forceSyncNow();
        }
      }, stepTime);
    } else {
      audio.volume = 0;
      audio.play().then(() => {
          setIsPlaying(true);
          let currentStep = 0;
          const fadeInInterval = setInterval(() => {
            currentStep++;
            const newVolume = targetVolume * (currentStep / steps);
            if (newVolume >= 0 && newVolume <= 1) audio.volume = newVolume;
            if (currentStep >= steps) { clearInterval(fadeInInterval); audio.volume = targetVolume; }
          }, stepTime);
        }).catch(e => console.log("Audio play blocked:", e));
    }
  };

  const handleNext = () => {
    forceSyncNow();
    if (queue.length > 0) {
      const nextFromQueue = queue[0];
      const indexInGlobal = playlist.findIndex(s => s._id === nextFromQueue._id);
      if (indexInGlobal !== -1) {
        isPlayingFromQueueRef.current = true;
        setCurrentTrackIndex(indexInGlobal);
        setQueue(prev => prev.slice(1));
        return;
      }
    }
    isPlayingFromQueueRef.current = false;
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);
    const baseIndex = currentIndexInPool !== -1 ? currentIndexInPool : lastContextIndexRef.current;
    const nextIndexInPool = (baseIndex + 1) % currentPool.length;
    setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[nextIndexInPool]._id));
  };

  const handlePrev = () => {
    forceSyncNow();
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);

    if (currentIndexInPool > 0) {
      setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[currentIndexInPool - 1]._id));
      isPlayingFromQueueRef.current = false; 
    } else if (currentIndexInPool === -1) {
      setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[lastContextIndexRef.current]._id));
      isPlayingFromQueueRef.current = false;
    } else {
      audioRef.current.currentTime = 0;
    }
  };

  const deletePlaylist = (id) => {
    setConfirmDialog({
      isOpen: true, title: "Delete Playlist", message: "Are you sure you want to remove this playlist? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, { method: 'DELETE', credentials: 'include' });
          if (response.ok) {
            setUserPlaylists(prev => prev.filter(pl => pl._id !== id));
            if (selectedPlaylist === id) { setSelectedPlaylist(null); setActiveCategory('All'); }
            setContextMenu(null);
            setToast({ message: "Playlist deleted successfully.", type: 'success' }); setTimeout(() => setToast(null), 3000);
          }
        } catch (error) { console.error("Delete failed:", error); }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleCreatePlaylistInline = async () => {
    const userId = currentUser?._id;
    if (!userId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "New Playlist", createdBy: userId, songIds: [] }), credentials: 'include'
      });
      if (response.ok) {
        const newPlaylist = await response.json();
        setUserPlaylists(prev => [...prev, newPlaylist]);
        setSelectedPlaylist(newPlaylist._id); setActiveCategory('All');
        setTempName("New Playlist"); setIsEditingName(true); setIsPlaylistModalOpen(false); 
      }
    } catch (err) { console.error("Create failed:", err); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true, title: "Delete Track Permanently", message: "Are you sure you want to permanently delete this track from the cloud database?",
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${currentUser?._id}`, { method: 'DELETE', credentials: 'include' });
          if (res.ok) {
            setPlaylist(prev => prev.filter(s => s._id !== id));
            if (currentTrack?._id === id) { setIsPlaying(false); audioRef.current?.pause(); setCurrentTrackIndex(0); }
            setToast({ message: "Track removed from library.", type: 'success' }); setTimeout(() => setToast(null), 3000);
          }
        } catch (err) { console.error("Network error:", err); }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleLogout = async () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false); setCurrentTrackIndex(0); setCurrentTime(0);
    try { await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (err) {}
    setCurrentUser(null); localStorage.clear(); 
    setShowAdmin(false); setSelectedPlaylist(null);
    navigate('/'); 
  };

  const toggleLike = async (songId, e) => {
    if (e) e.stopPropagation();
    if (!currentUser?._id) return alert("Please log in!");
    const previousLikes = userData.likedSongs;
    setUserData(prev => ({ ...prev, likedSongs: prev.likedSongs.includes(songId) ? prev.likedSongs.filter(id => id !== songId) : [...prev.likedSongs, songId] }));
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/toggle-like`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser._id, songId }), credentials: 'include'
      });
      if (response.ok) { const data = await response.json(); setUserData(prev => ({ ...prev, likedSongs: data.likedSongs })); }
    } catch (err) { setUserData(prev => ({ ...prev, likedSongs: previousLikes })); }
  };

  const handleContextMenu = (e, id, type = 'song', source = 'general') => {
    e.preventDefault();
    const menuWidth = 220; const menuHeight = (type === 'song' && isAdmin) ? 380 : 320; 
    let x = e.clientX; let y = e.clientY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 15; 
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 15; 
    setContextMenu({ x, y, id, type, source, alignLeft: e.clientX + (menuWidth * 2) > window.innerWidth });
  };

  const handleAddToPlaylist = async (songId, playlistId) => {
    const previousPlaylists = [...userPlaylists];
    setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? { ...pl, songIds: [...pl.songIds, songId] } : pl));
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/add-song`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, userId: currentUser?._id }), credentials: 'include'
      });
      if (response.ok) { setToast({ message: "Added!", type: 'success' }); setTimeout(() => setToast(null), 3000); }
    } catch (error) { setUserPlaylists(previousPlaylists); }
  };

  const handleRemoveFromPlaylist = async (songId, playlistId) => {
    const previousPlaylists = [...userPlaylists];
    setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? { ...pl, songIds: pl.songIds.filter(id => (id._id || id) !== songId) } : pl));
    try {
      await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/remove-song`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ songId }), credentials: 'include'
      });
    } catch (error) { setUserPlaylists(previousPlaylists); }
  };

  const filteredPlaylist = playlist.filter((song) => {
    const matchesSearch = song.title.toLowerCase().includes(debouncedQuery.toLowerCase()) || song.artist.toLowerCase().includes(debouncedQuery.toLowerCase());
    if (activeCategory === 'Liked') return matchesSearch && userData?.likedSongs?.some(likedId => String(likedId) === String(song._id));
    if (selectedPlaylist) return matchesSearch && userPlaylists.find(pl => pl._id === selectedPlaylist)?.songIds.some(id => String(id._id || id) === String(song._id));
    return matchesSearch;
  });

  const readyMadePlaylists = userPlaylists.filter(pl => pl.isReadyMade === true);

  if (isLoading || isAuthLoading) return <AppSkeleton />; 
  if (error) return <div className="spotify-container loading-screen" style={{ backgroundColor: '#000' }}><h2 style={{ color: '#fff' }}>{error}</h2></div>;

  if (showAdmin) {
    return (
      <Suspense fallback={<AppSkeleton />}>
        <Admin onBack={() => setShowAdmin(false)} uploadProgress={uploadProgress} setUploadProgress={setUploadProgress} isUploading={isUploading} setIsUploading={setIsUploading} setOverallProgress={setOverallProgress} setUploadStats={setUploadStats} setPlaylist={setPlaylist} handleRemoveFromPlaylist={handleRemoveFromPlaylist} />
      </Suspense>
    );
  }

  return (
    <div className="bento-shell" style={{ backgroundColor: '#000', height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', padding: '12px', gap: '12px', boxSizing: 'border-box', overflow: 'hidden', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ⚡ 1. THE NEW TOP HEADER COMPONENT */}
      <TopHeader 
        activeCategory={activeCategory} setActiveCategory={setActiveCategory} selectedPlaylist={selectedPlaylist} setShowLikedOnly={setShowLikedOnly}
        setIsSearchOpen={setIsSearchOpen} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onLogout={handleLogout} setToast={setToast}
      />

      <div style={{ display: 'flex', flex: 1, gap: '12px', overflow: 'hidden' }}>
        <Sidebar 
          isAuthenticated={isAuthenticated} isAdmin={isAdmin} setShowAdmin={setShowAdmin} handleCreatePlaylistInline={handleCreatePlaylistInline}
          activeCategory={activeCategory} setActiveCategory={setActiveCategory} selectedPlaylist={selectedPlaylist} setSelectedPlaylist={setSelectedPlaylist}
          userPlaylists={userPlaylists} handleContextMenu={handleContextMenu}
        />

        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.2, ease: "circOut" }} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spinner" size={32} color="#10b981"/></div>}>
              {location.pathname === '/profile' ? <Profile userData={userData} userPlaylists={userPlaylists} playlist={playlist} setCurrentTrackIndex={setCurrentTrackIndex} setIsPlaying={setIsPlaying} setPlaybackContext={setPlaybackContext} /> 
               : location.pathname === '/settings' ? <Settings handleLogout={handleLogout} /> 
               : <MainFeed activeCategory={activeCategory} selectedPlaylist={selectedPlaylist} setSelectedPlaylist={setSelectedPlaylist} debouncedQuery={debouncedQuery} userPlaylists={userPlaylists} setUserPlaylists={setUserPlaylists} filteredPlaylist={filteredPlaylist} readyMadePlaylists={readyMadePlaylists} handleContextMenu={handleContextMenu} handleAddToPlaylist={handleAddToPlaylist} handleRemoveFromPlaylist={handleRemoveFromPlaylist} isAdmin={isAdmin} setToast={setToast} />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        
        {/* ⚡ 2. THE NEW QUEUE SIDEBAR COMPONENT */}
        <RightQueue 
          isQueueOpen={isQueueOpen} 
          setIsQueueOpen={setIsQueueOpen} 
          lastContextIndexRef={lastContextIndexRef} 
          playlist={playlist} 
          handleContextMenu={handleContextMenu} 
          setConfirmDialog={setConfirmDialog}
        />
      </div>

      <PlayerDeck isQueueOpen={isQueueOpen} setIsQueueOpen={setIsQueueOpen} />

      {/* The rest of the Context Menu and Dialog logic remains identical below... */}
      {contextMenu && (
        <div 
          className={`glass-context-menu ${contextMenu.alignLeft ? 'align-left' : ''}`}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999, background: '#121212', border: '1px solid #333' }}
        >
          {contextMenu.type === 'playlist' && (() => {
            const targetPl = userPlaylists.find(pl => pl._id === contextMenu.id);
            if (!targetPl) return null;

            return (
              <>
                {targetPl.isReadyMade ? (
                  <>
                    {(() => {
                      const isFollowed = targetPl.followers?.includes(currentUser?._id);
                      return (
                        <div className="context-item" onClick={async () => {
                          setContextMenu(null);
                          const userId = currentUser?._id;
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/playlists/${contextMenu.id}/follow`, { 
                              method: 'PATCH', 
                              headers: { 'Content-Type': 'application/json' }, 
                              body: JSON.stringify({ userId }),
                              credentials: 'include'
                            });
                            if (res.ok) {
                              const updatedPlaylist = await res.json();
                              setUserPlaylists(prev => prev.map(p => p._id === contextMenu.id ? updatedPlaylist : p));
                              setToast({ message: isFollowed ? "Removed collection from your library." : "Added collection to your library!", type: 'success' });
                              setTimeout(() => setToast(null), 3000);
                            }
                          } catch (err) { console.error(err); }
                        }}>
                          <div className="item-content">
                            {isFollowed ? <X size={16} color="#10b981" /> : <PlusCircle size={16} />}
                            <span style={{ color: isFollowed ? '#10b981' : '#fff' }}>{isFollowed ? 'Remove from Your Library' : 'Add to Your Library'}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="context-item" onClick={() => { 
                      if (targetPl && targetPl.songIds && targetPl.songIds.length > 0) {
                        setQueue(prev => [...prev, ...targetPl.songIds]);
                        setToast({ message: `Added ${targetPl.songIds.length} tracks to Queue!`, type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                      } else {
                        setToast({ message: `This playlist is empty!`, type: 'error' });
                        setTimeout(() => setToast(null), 3000);
                      }
                      setContextMenu(null); 
                    }}>
                      <div className="item-content"><ListMusic size={16} /> <span>Add to queue</span></div>
                    </div>

                    <div className="context-item submenu-parent">
                      <div className="item-content"><FolderPlus size={16} /> <span>Add to folder</span></div>
                      <ChevronRight size={14} opacity={0.5} />
                      <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
                        <div className="context-item"><span style={{fontSize:'10px', color:'#888', fontWeight:'bold'}}>NO FOLDERS FOUND</span></div>
                      </div>
                    </div>

                    <div className="context-item submenu-parent">
                      <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
                      <ChevronRight size={14} opacity={0.5} />
                      <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
                        <div className="context-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?playlist=${contextMenu.id}`); setContextMenu(null); }}>
                          <Link size={14} /> <span>Copy link to playlist</span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && contextMenu.source === 'home' && (
                      <>
                        <div className="context-divider" style={{background: '#333'}} />
                        <div className="context-item delete-text" onClick={() => { deletePlaylist(contextMenu.id); setContextMenu(null); }}>
                          <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Delete Playlist</span></div>
                        </div>
                        <div 
                          className="context-item" style={{ color: '#10b981' }}
                          onClick={async () => {
                            const userId = currentUser?._id;
                            const name = prompt("Enter a name for this Playlist:");
                            if (!name) return;
                            const category = prompt("Enter Category Group:", "Trending Now");
                            setContextMenu(null);
                            if (!category) return;

                            try {
                              const res = await fetch(`${API_BASE_URL}/api/playlists/curated`, { 
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ name, userId, category: category.trim() }),
                                credentials: 'include'
                              });
                              if (res.ok) {
                                const newCuratedDeck = await res.json();
                                setUserPlaylists(prev => [...prev, newCuratedDeck]);
                                setToast({ message: `"${name}" added to "${category}" shelf!`, type: 'success' });
                                setTimeout(() => setToast(null), 3000);
                              }
                            } catch (err) { console.error(err); }
                          }}
                        >
                          <div className="item-content"><PlusCircle size={16} color="#10b981" /> <span>Create Playlist</span></div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="context-item" onClick={() => { 
                      if (targetPl && targetPl.songIds && targetPl.songIds.length > 0) {
                        setQueue(prev => [...prev, ...targetPl.songIds]);
                        setToast({ message: `Added ${targetPl.songIds.length} tracks to Queue!`, type: 'success' });
                        setTimeout(() => setToast(null), 3000);
                      } else {
                        setToast({ message: `This playlist is empty!`, type: 'error' });
                        setTimeout(() => setToast(null), 3000);
                      }
                      setContextMenu(null); 
                    }}>
                      <div className="item-content"><ListMusic size={16} /> <span>Add to queue</span></div>
                    </div>

                    <div className="context-item" onClick={() => { setTempName(targetPl.name || ""); setSelectedPlaylist(contextMenu.id); setIsEditingName(true); setContextMenu(null); }}>
                      <div className="item-content"><SettingsIcon size={16} /> <span>Edit details</span></div>
                    </div>

                    <div className="context-item delete-text" onClick={() => { deletePlaylist(contextMenu.id); setContextMenu(null); }}>
                      <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span>Delete</span></div>
                    </div>

                    <div className="context-divider" style={{background: '#333'}} />

                    <div className="context-item submenu-parent">
                      <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
                      <ChevronRight size={14} opacity={0.5} />
                      <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
                        <div className="context-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?playlist=${contextMenu.id}`); setContextMenu(null); }}>
                          <Link size={14} /> <span>Copy link to playlist</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                {contextMenu.source === 'sidebar' && (
                  <>
                    <div className="context-divider" style={{background: '#333'}} />
                    <div className="context-item" onClick={() => { handleCreatePlaylistInline(); setContextMenu(null); }}>
                      <div className="item-content"><Plus size={16} /> <span>Create playlist</span></div>
                    </div>
                    <div className="context-item" onClick={() => setContextMenu(null)}>
                      <div className="item-content"><Folder size={16} /> <span>Create folder</span></div>
                    </div>
                  </>
                )}
              </>
            );
          })()}

          {contextMenu.type === 'song' && (
            <>
              <div className="context-item" onClick={() => { 
                const songToAdd = playlist.find(s => s._id === contextMenu.id);
                if (songToAdd) setQueue(prev => [songToAdd, ...prev]);
                setContextMenu(null);
              }}>
                <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
              </div>

              <div className="context-item" onClick={() => { 
                const songToAdd = playlist.find(s => s._id === contextMenu.id);
                if (songToAdd) setQueue(prev => [...prev, songToAdd]);
                setContextMenu(null);
              }}>
                <div className="item-content"><Plus size={16} /> <span>Add to Queue</span></div>
              </div>

              <div className="context-divider" style={{background: '#333'}} />

              <div className="context-item submenu-parent">
                <div className="item-content"><FolderPlus size={16} /> <span>Add to Playlist</span></div>
                <ChevronRight size={14} opacity={0.5} />
                <div className="glass-submenu" style={{ maxHeight: '200px', overflowY: 'auto', background: '#121212', border: '1px solid #333' }}>
                  <div style={{ padding: '6px 12px', fontSize: '10px', color: '#64748b', fontWeight: '800', letterSpacing: '1px' }}>YOUR PLAYLISTS</div>
                  {userPlaylists.filter(pl => !pl.isReadyMade).map(pl => (
                    <div key={pl._id} className="context-item" onClick={() => handleAddToPlaylist(contextMenu.id, pl._id)}>
                      <span>{pl.name}</span>
                    </div>
                  ))}

                  {isAdmin && (
                    <>
                      <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
                      <div style={{ padding: '6px 12px', fontSize: '10px', color: '#10b981', fontWeight: '800', letterSpacing: '1px' }}>CURATED SHELVES</div>
                      {userPlaylists.filter(pl => pl.isReadyMade).map(pl => (
                        <div key={pl._id} className="context-item" onClick={() => handleAddToPlaylist(contextMenu.id, pl._id)}>
                          <span style={{ color: '#34d399' }}>{pl.name}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="context-item" onClick={(e) => { toggleLike(contextMenu.id, e); setContextMenu(null); }}>
                <div className="item-content">
                  <Heart size={16} fill={userData?.likedSongs?.includes(contextMenu.id) ? "#10b981" : "none"} color="#10b981" /> 
                  <span>{userData?.likedSongs?.includes(contextMenu.id) ? 'Remove from Likes' : 'Save to Liked Songs'}</span>
                </div>
              </div>

              {selectedPlaylist && (() => {
                const activePlObj = userPlaylists.find(p => p._id === selectedPlaylist);
                if (!activePlObj) return null;
                const canModifyTracks = !activePlObj.isReadyMade || isAdmin;
                if (canModifyTracks) {
                  return (
                    <div className="context-item delete-text" onClick={() => handleRemoveFromPlaylist(contextMenu.id, selectedPlaylist)}>
                      <div className="item-content"><Trash2 size={16} color="#10b981" /> <span>Remove from this playlist</span></div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="context-divider" style={{background: '#333'}} />

              <div className="context-item" onClick={() => setContextMenu(null)}>
                <div className="item-content"><User size={16} /> <span>Go to Artist</span></div>
              </div>

              <div className="context-item submenu-parent">
                <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
                <ChevronRight size={14} opacity={0.5} />
                <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
                  <div className="context-item" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}?track=${contextMenu.id}`); setContextMenu(null); }}>
                    <Link size={14} /> <span>Copy Link</span>
                  </div>
                </div>
              </div>

              {isAdmin && activeCategory === 'All' && !selectedPlaylist && (
                <>
                  <div className="context-divider" style={{background: '#333'}} />
                  <div className="context-item delete-text" onClick={() => { handleDelete(contextMenu.id); setContextMenu(null); }}>
                    <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span style={{ color: '#ef4444' }}>Delete Permanently</span></div>
                  </div>
                </>
              )}
            </>
          )}

          {contextMenu.type === 'sidebar-empty' && (
            <>
              <div className="context-item" onClick={() => { handleCreatePlaylistInline(); setContextMenu(null); }}>
                <div className="item-content"><Plus size={16} /> <span>Create playlist</span></div>
              </div>
              <div className="context-item" onClick={() => setContextMenu(null)}>
                <div className="item-content"><Folder size={16} /> <span>Create folder</span></div>
              </div>
            </>
          )}

        </div>
      )}

      {confirmDialog.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ultraFade 0.2s ease-out'
        }}>
          <div style={{
            /* ⚡ COMPACT FIX: Reduced width (320px), padding (24px), and border radius (16px) */
            width: '100%', maxWidth: '320px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '16px',
            padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}>
            
            {/* ⚡ COMPACT FIX: Shrunk the icon circle from 60px to 48px */}
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <Trash2 size={24} color="#ef4444" />
            </div>
            
            {/* ⚡ COMPACT FIX: Tighter typography margins and smaller fonts */}
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>{confirmDialog.title}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', fontWeight: '500' }}>{confirmDialog.message}</p>
            
            {/* ⚡ COMPACT FIX: Slimmer buttons and tighter gap */}
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
                style={{ flex: 1, padding: '10px 0', borderRadius: '50px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                style={{ flex: 1, padding: '10px 0', borderRadius: '50px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '12px', fontWeight: '800', cursor: 'pointer', transition: '0.2s', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {confirmDialog.confirmText || "YES, DELETE"}
              </button>
            </div>
            
          </div>
        </div>
      )}

      {isSearchOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', paddingTop: '12vh', animation: 'ultraFade 0.2s ease-out' }}
          onClick={() => setIsSearchOpen(false)} 
        >
          <div 
            style={{ width: '100%', maxWidth: '650px', height: 'fit-content', maxHeight: '70vh', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }}
            onClick={(e) => e.stopPropagation()} 
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #333', background: '#0a0a0a', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <Search size={20} color="#10b981" />
              <input 
                autoFocus type="text" placeholder="What do you want to listen to?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '18px', fontWeight: '700', paddingLeft: '12px' }}
              />
              <div onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} style={{ padding: '4px 8px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', fontSize: '10px', color: '#fff', fontWeight: '800', cursor: 'pointer' }}>
                ESC
              </div>
            </div>

            <div className="bento-scrollbar" style={{ padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {debouncedQuery === '' ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>Type a song or artist to start searching...</div>
              ) : (
                filteredPlaylist.slice(0, 8).map((track) => (
                  <div 
                    key={track._id}
                    onClick={() => { 
                      setPlaybackContext(filteredPlaylist); 
                      setActivePlaylistName(userPlaylists.find(p => p._id === selectedPlaylist)?.name || "Playlist");
                      setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); 
                      setIsPlaying(true); 
                      isPlayingFromQueueRef.current = false;
                      syncPlayback(track._id, 0, selectedPlaylist);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', backgroundColor: 'transparent' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1a1a1a'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <img src={track.cover || "/Groove.png"} style={{ width: '40px', height: '40px', borderRadius: '8px' }} alt="" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{track.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>{track.artist}</div>
                    </div>
                    <Play size={18} color="#10b981" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isShortcutHelpOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'ultraFade 0.2s ease-out' }}
          onClick={() => setIsShortcutHelpOpen(false)}
        >
          <div 
            style={{ width: '100%', maxWidth: '450px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '28px', padding: '30px', boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#10b981' }}>Keyboard Controls</h3>
              <button onClick={() => setIsShortcutHelpOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20}/></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { keys: ['Space'], action: 'Play / Pause Track' },
                { keys: ['Ctrl', 'K'], action: 'Open Global Command Search' },
                { keys: ['Ctrl', '→'], action: 'Skip to Next Track' },
                { keys: ['Ctrl', '←'], action: 'Previous Track / Restart' },
                { keys: ['Ctrl', '/'], action: 'Toggle Shortcut Manual' },
                { keys: ['Esc'], action: 'Close Modals and Menus' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
                  <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '600' }}>{item.action}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {item.keys.map((key, kIdx) => (
                      <kbd key={kIdx} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', boxShadow: '0 2px 0 #000' }}>{key}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
    </div> 
  )
}

export default MainPlayer;
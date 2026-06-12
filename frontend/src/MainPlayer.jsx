import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, X, VolumeX, Shuffle, PlusCircle, ListMusic, Repeat, Home, Search, Settings as SettingsIcon, Heart, Loader2, Plus, Folder, User, ShieldCheck, ArrowLeft, LogOut, FolderPlus, Share2, Link, ChevronRight, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';
import { API_BASE_URL } from './config';

import { Suspense, lazy } from 'react'; // 👈 Import Suspense & lazy
import PlayerDeck from './components/PlayerDeck';
import { usePlayer } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import MainFeed from './components/MainFeed'; // MainFeed is eagerly loaded because it's the home page!

// ⚡ THE SPEED UPGRADE: Lazy-load heavy components so the initial bundle is tiny
const Admin = lazy(() => import('./Admin'));
const Profile = lazy(() => import('./components/Profile'));
const Settings = lazy(() => import('./components/Settings'));

// ⚡ SKELETON UI COMPONENT: A visual mockup of your app's layout
const AppSkeleton = () => (
  <div style={{ backgroundColor: '#000', height: '100vh', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' }}>
    <div className="skeleton-pulse" style={{ height: '75px', borderRadius: '24px' }} />
    <div style={{ display: 'flex', flex: 1, gap: '12px' }}>
      <div className="skeleton-pulse" style={{ width: '280px', borderRadius: '24px' }} />
      <div className="skeleton-pulse" style={{ flex: 1, borderRadius: '24px' }} />
    </div>
  </div>
);


function MainPlayer() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // 1. GLOBAL STATE (Coming from PlayerContext)
  const { 
    currentUser, setCurrentUser, // <-- AUTH STATE ADDED
    isAuthLoading,
    playlist, setPlaylist, 
    currentTrack, currentTrackIndex, setCurrentTrackIndex,
    isPlaying, setIsPlaying,
    setCurrentTime,          
    queue, setQueue, 
    playbackContext, setPlaybackContext,
    activePlaylistName,
    audioRef,
    selectedPlaylist, setSelectedPlaylist,
    syncPlayback,setActivePlaylistName,
    forceSyncNow,setPlayingPlaylistId,
    volume
  } = usePlayer();

  // DERIVE AUTH STATUS FROM GLOBAL CONTEXT
  const isAuthenticated = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';

  // 2. LOCAL UI STATE
  const [searchQuery, setSearchQuery] = useState(''); 
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false); 
  
  const [contextMenu, setContextMenu] = useState(null); 
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const avatarRef = useRef(null);
  const curatedShelfRef = useRef(null);
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
  const [initialTimeSet, setInitialTimeSet] = useState(false);  
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, title: '', message: '', onConfirm: null 
  });

  // --- Data Fetching Effect ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`, { credentials: 'include' }) // <-- ADDED
      .then(response => response.json())
      .then(data => {
        setPlaylist(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setIsLoading(false);
      });
  }, [showAdmin]); 

  useEffect(() => {
    if (id) {
      setSelectedPlaylist(id);
      setActiveCategory('All'); 
    } else {
      setSelectedPlaylist(null);
      setActiveCategory('All');
    }
  }, [id]);

  useEffect(() => {
    const fetchUserLibrary = async () => {
      const userId = currentUser?._id;
      const url = userId 
        ? `${API_BASE_URL}/api/playlists?userId=${userId}`
        : `${API_BASE_URL}/api/playlists`;
        
      try {
        const response = await fetch(url, { credentials: 'include' }); // <-- ADDED
        const data = await response.json();
        if (Array.isArray(data)) {
          setUserPlaylists(data);
        }
      } catch (err) {
        console.error("Library Fetch Failed:", err);
      }
    };
    fetchUserLibrary();
  }, [showAdmin, isAuthenticated, currentUser]); 

  {/*// In MainPlayer.jsx
  useEffect(() => {
    // Wait until auth is done loading AND playlist is ready
    if (isAuthLoading || playlist.length === 0) return;

    const userId = currentUser?._id;
    
    if (isAuthenticated && userId) {
      fetch(`${API_BASE_URL}/api/users/${userId}`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          // Only restore if we haven't already restored and we have session data
          if (data?.lastPlayback?.songId && !initialTimeSet) {
            const savedIndex = playlist.findIndex(s => s._id === data.lastPlayback.songId);
            if (savedIndex !== -1) {
              setCurrentTrackIndex(savedIndex);
              setInitialTimeSet(true);
              
              // Sync audio element
              if (audioRef.current) {
                audioRef.current.currentTime = data.lastPlayback.currentTime || 0;
                setCurrentTime(data.lastPlayback.currentTime || 0);
              }
            }
          }
        });
    }
  }, [isAuthenticated, isAuthLoading, playlist.length]); // Added isAuthLoading*/}

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  // --- Playback Engine Effect ---
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (audioRef.current.src !== currentTrack.src) {
        audioRef.current.src = currentTrack.src;
      }
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Auto-play failed:", e));
      }
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
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: "Groove Collection",
        artwork: [{ src: currentTrack.cover || '/Groove.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => {
    const preventDefault = (e) => {
      if (contextMenu) {
        e.preventDefault(); e.stopPropagation();
      }
    };
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

  // ==========================================
  // PROFESSIONAL QUEUE RESTORER
  // ==========================================
  useEffect(() => {
    // Wait until the database playlists are fully loaded
    if (!hasRestoredServerQueue.current && userPlaylists.length > 0 && currentUser?.activeSession?.playlistId) {
      
      const serverPlaylist = userPlaylists.find(p => p._id === currentUser.activeSession.playlistId);
      
      if (serverPlaylist) {
        // Force the app to remember the exact name of the playlist from the cloud
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
    const handleClose = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener('click', handleClose);
      window.addEventListener('resize', handleClose);
      window.addEventListener('keydown', (e) => e.key === 'Escape' && handleClose());
    }
    return () => {
      window.removeEventListener('click', handleClose);
      window.removeEventListener('resize', handleClose);
    };
  }, [contextMenu]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
    }
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      }
    };
  }, [playlist, currentTrackIndex, isPlaying]); 

  useEffect(() => {
    const timerId = setTimeout(() => { setDebouncedQuery(searchQuery); }, 300);
    return () => clearTimeout(timerId);
  }, [searchQuery]);

  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      // 1. Search Bar Shortcut (Ctrl + K)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault(); 
        setIsSearchOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsShortcutHelpOpen(false); // 👈 Close shortcut help on Escape too
      }

      // 🌟 ADD THIS: Keyboard Shortcut Help Guide (Ctrl + /)
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsShortcutHelpOpen(prev => !prev);
        return;
      }

      // 🛡️ SAFETY SHIELD: Ignore play/pause if the user is typing in a search box!
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; 
      }

      // 2. Spacebar OR Dedicated Media Play/Pause Button
      if (e.code === 'Space' || e.code === 'MediaPlayPause') {
        e.preventDefault(); 
        togglePlayPause();
      }

      // 3. Ctrl+Arrows OR Dedicated Media Skip Buttons
      if ((e.ctrlKey && e.code === 'ArrowRight') || e.code === 'MediaTrackNext') {
        e.preventDefault();
        handleNext();
      }
      if ((e.ctrlKey && e.code === 'ArrowLeft') || e.code === 'MediaTrackPrevious') {
        e.preventDefault();
        handlePrev();
      }
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
          body: JSON.stringify({
            songId: currentTrack._id,
            currentTime: audioRef.current.currentTime
          }),
          credentials: 'include' // <-- ADDED
        }).catch(e => console.error("Cloud sync failed", e));
      }
    };

    if (!isPlaying) syncStateToCloud();

    let heartbeatInterval;
    if (isPlaying) {
      heartbeatInterval = setInterval(() => { syncStateToCloud(); }, 10000); 
    }

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
      if (indexInContext !== -1) {
        lastContextIndexRef.current = indexInContext;
      }
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
          clearInterval(fadeOutInterval);
          audio.pause();
          setIsPlaying(false);
          audio.volume = targetVolume; 
          forceSyncNow();
        }
      }, stepTime);
    } else {
      audio.volume = 0;
      audio.play()
        .then(() => {
          setIsPlaying(true);
          let currentStep = 0;
          const fadeInInterval = setInterval(() => {
            currentStep++;
            const newVolume = targetVolume * (currentStep / steps);
            if (newVolume >= 0 && newVolume <= 1) audio.volume = newVolume;
            if (currentStep >= steps) {
              clearInterval(fadeInInterval);
              audio.volume = targetVolume; 
            }
          }, stepTime);
        })
        .catch(e => console.log("Audio play blocked:", e));
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
    
    const nextSong = currentPool[nextIndexInPool];
    setCurrentTrackIndex(playlist.findIndex(s => s._id === nextSong._id));
  };

  const handlePrev = () => {
    forceSyncNow();
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);

    if (currentIndexInPool > 0) {
      const prevSong = currentPool[currentIndexInPool - 1];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === prevSong._id));
      isPlayingFromQueueRef.current = false; 
    } 
    else if (currentIndexInPool === -1) {
      const prevSong = currentPool[lastContextIndexRef.current];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === prevSong._id));
      isPlayingFromQueueRef.current = false;
    }
    else {
      audioRef.current.currentTime = 0;
    }
  };

  const handleLoadedMetadata = async () => {
    if (!audioRef.current) return;
    const seconds = audioRef.current.duration;
    setDuration(seconds);

    if (savedTime > 0) {
      audioRef.current.currentTime = savedTime;
      setCurrentTime(savedTime);
      setSavedTime(0); 
    }

    if (currentTrack && !currentTrack.duration) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/songs/${currentTrack._id}/duration`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: seconds }),
          credentials: 'include' // <-- ADDED
        });

        if (response.ok) {
          setPlaylist(prev => prev.map(song => 
            song._id === currentTrack._id ? { ...song, duration: seconds } : song
          ));
        }
      } catch (err) { console.error("Failed to auto-save duration:", err); }
    }
  };

  const deletePlaylist = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Playlist",
      message: "Are you sure you want to remove this playlist? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, { 
            method: 'DELETE',
            credentials: 'include' // <-- ADDED
          });
          if (response.ok) {
            setUserPlaylists(prev => prev.filter(pl => pl._id !== id));
            if (selectedPlaylist === id) {
              setSelectedPlaylist(null);
              setActiveCategory('All');
            }
            setContextMenu(null);
            setToast({ message: "Playlist deleted successfully.", type: 'success' });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: "Failed to delete playlist.", type: 'error' });
            setTimeout(() => setToast(null), 3000);
          }
        } catch (error) {
          console.error("Delete failed:", error);
        }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const renamePlaylist = async (id) => {
    const currentPlaylist = userPlaylists.find(pl => pl._id === id);
    const newName = prompt("Enter new name:", currentPlaylist?.name);
    if (!newName || newName === currentPlaylist?.name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
        credentials: 'include' // <-- ADDED
      });
      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => pl._id === id ? updatedPlaylist : pl));
        setContextMenu(null);
      }
    } catch (error) {
      console.error("Rename failed:", error);
    }
  };

  const getUserInitial = () => {
    if (currentUser?.email) return currentUser.email.charAt(0).toUpperCase();
    return "?"; 
  };

  const handleCreatePlaylistInline = async () => {
    const userId = currentUser?._id;
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "New Playlist", createdBy: userId, songIds: [] }),
        credentials: 'include' // <-- ADDED
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setUserPlaylists(prev => [...prev, newPlaylist]);
        setSelectedPlaylist(newPlaylist._id);
        setActiveCategory('All');
        setTempName("New Playlist");
        setIsEditingName(true);
        setIsPlaylistModalOpen(false); 
      }
    } catch (err) { console.error("Create failed:", err); }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Track Permanently",
      message: "Are you sure you want to permanently delete this track from the cloud database?",
      onConfirm: async () => {
        const userId = currentUser?._id;
        try {
          const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${userId}`, { 
            method: 'DELETE',
            credentials: 'include' // <-- ADDED
          });
          if (res.ok) {
            setPlaylist(prev => prev.filter(s => s._id !== id));
            if (currentTrack?._id === id) {
              setIsPlaying(false);
              if (audioRef.current) audioRef.current.pause();
              setCurrentTrackIndex(0);
            }
            setToast({ message: "Track removed from library.", type: 'success' });
            setTimeout(() => setToast(null), 3000);
          } else {
            const errorData = await res.json();
            setToast({ message: `Error: ${errorData.message}`, type: 'error' });
            setTimeout(() => setToast(null), 3000);
          }
        } catch (err) { console.error("Network error:", err); }
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null });
      }
    });
  };

  const handleLogout = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; 
    }
    setIsPlaying(false);
    setCurrentTrackIndex(0);
    setCurrentTime(0);

    try {
      // Hit the backend to destroy the secure cookie
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error("Logout error:", err);
    }

    // Clear react state
    setCurrentUser(null);
    localStorage.clear(); 
    
    setShowUserMenu(false);
    setShowAdmin(false); 
    setSelectedPlaylist(null);
    
    navigate('/'); 
  };

  const toggleLike = async (songId, e) => {
  if (e) e.stopPropagation();
  const userId = currentUser?._id;
  if (!userId) return alert("Please log in!");

  // 1. BACKUP: Store current state in case we need to roll back
  const previousLikes = userData.likedSongs;

  // 2. OPTIMISTIC UPDATE: Flip the heart instantly
  setUserData(prev => ({ 
    ...prev, 
    likedSongs: prev.likedSongs.includes(songId) 
      ? prev.likedSongs.filter(id => id !== songId) 
      : [...prev.likedSongs, songId] 
  }));

  try {
    const response = await fetch(`${API_BASE_URL}/api/users/toggle-like`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, songId }),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error("Server rejected request");
    }

    const data = await response.json();
    // 3. SYNC: Optional, but good practice to sync with the "source of truth"
    setUserData(prev => ({ ...prev, likedSongs: data.likedSongs }));

  } catch (err) {
    console.error("Like toggle failed:", err);
    // 4. ROLLBACK: If the server call failed, revert the heart to its previous state
    setUserData(prev => ({ ...prev, likedSongs: previousLikes }));
    setToast({ message: "Sync failed. Please check your connection.", type: 'error' });
    setTimeout(() => setToast(null), 3000);
  }
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
        credentials: 'include' // <-- ADDED
      });
      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => pl._id === playlistId ? updatedPlaylist : pl));
      }
    } catch (error) { console.error("Rename failed:", error); } 
    finally { setIsEditingName(false); }
  };

  const handleContextMenu = (e, id, type = 'song', source = 'general') => {
    e.preventDefault();
    const menuWidth = 220;
    const menuHeight = (type === 'song' && isAdmin) ? 380 : 320; 
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    let x = e.clientX;
    let y = e.clientY;
    if (x + menuWidth > screenWidth) x = screenWidth - menuWidth - 15; 
    if (y + menuHeight > screenHeight) y = screenHeight - menuHeight - 15; 
    const shouldAlignLeft = e.clientX + (menuWidth * 2) > screenWidth;
    setContextMenu({ x, y, id, type, source, alignLeft: shouldAlignLeft });
  };

  useEffect(() => {
    const handleGlobalContextMenu = (e) => e.preventDefault();
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const handleAddToPlaylist = async (songId, playlistId) => {
    // 1. BACKUP: Store current state
    const previousPlaylists = [...userPlaylists];

    // 2. OPTIMISTIC UPDATE: Update UI instantly
    setUserPlaylists(prev => prev.map(pl => {
      if (pl._id === playlistId) {
        return { ...pl, songIds: [...pl.songIds, songId] };
      }
      return pl;
    }));

    const targetPlaylist = userPlaylists.find(pl => pl._id === playlistId);
    const playlistName = targetPlaylist ? targetPlaylist.name : "Playlist";

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/add-song`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, userId: currentUser?._id }),
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Server failed");

      setToast({ message: `Added to "${playlistName}"!`, type: 'success' });
      setTimeout(() => setToast(null), 3000);

    } catch (error) {
      // 3. ROLLBACK: Revert if the server call fails
      setUserPlaylists(previousPlaylists);
      console.error("Add to playlist failed:", error);
      setToast({ message: "Failed to add song. Try again.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const songsToDisplay = playlist.filter(song => {
    if (activeCategory === 'Liked') return userData.likedSongs.includes(song._id);
    if (activeCategory === 'All') return true;
    return activeCategory === song.category; 
  });

  const handleRemoveFromPlaylist = async (songId, playlistId) => {
    // 1. BACKUP: Store current state
    const previousPlaylists = [...userPlaylists];

    // 2. OPTIMISTIC UPDATE: Remove song instantly
    setUserPlaylists(prev => prev.map(pl => {
      if (pl._id === playlistId) {
        return { ...pl, songIds: pl.songIds.filter(id => (id._id || id) !== songId) };
      }
      return pl;
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/remove-song`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId }), // Backend assumes context is handled by JWT/Auth
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Server failed");

      setToast({ message: "Song removed!", type: 'success' });
      setTimeout(() => setToast(null), 3000);

    } catch (error) {
      // 3. ROLLBACK: Revert if the server call fails
      setUserPlaylists(previousPlaylists);
      console.error("Remove from playlist failed:", error);
      setToast({ message: "Failed to remove song. Try again.", type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const filteredPlaylist = playlist.filter((song) => {
    const lowerCaseQuery = debouncedQuery.toLowerCase(); 
    const matchesSearch = song.title.toLowerCase().includes(lowerCaseQuery) || song.artist.toLowerCase().includes(lowerCaseQuery);
    
    if (activeCategory === 'Liked') {
      return matchesSearch && userData?.likedSongs?.some(likedId => String(likedId) === String(song._id));
    }
    if (selectedPlaylist) {
      const currentPlaylistObj = userPlaylists.find(pl => pl._id === selectedPlaylist);
      if (currentPlaylistObj) {
        return matchesSearch && currentPlaylistObj.songIds.some(id => String(id._id || id) === String(song._id));
      }
    }
    return matchesSearch;
  });

  const readyMadePlaylists = userPlaylists.filter(pl => pl.isReadyMade === true);

  useEffect(() => { window.scrollTo(0, 0); }, [showLikedOnly]);

  if (isLoading || isAuthLoading) {
    return <AppSkeleton />; // 👈 Instantly loads the skeleton outline!
  }

  if (error) {
    return (
      <div className="spotify-container loading-screen" style={{ backgroundColor: '#000' }}>
        <h2 style={{ color: '#fff' }}>{error}</h2>
        <p style={{ color: '#64748b' }}>Please check your connection and refresh.</p>
      </div>
    );
  }

  // --- Admin Panel Conditional Render ---
  if (showAdmin) {
    return (
      // 👇 Wrap lazy components in Suspense!
      <Suspense fallback={<AppSkeleton />}>
        <Admin 
          onBack={() => setShowAdmin(false)} 
          uploadProgress={uploadProgress} 
          setUploadProgress={setUploadProgress} 
          isUploading={isUploading} 
          setIsUploading={setIsUploading}
          setOverallProgress={setOverallProgress} 
          setUploadStats={setUploadStats} 
          setPlaylist={setPlaylist}
          handleRemoveFromPlaylist={handleRemoveFromPlaylist}
        />
      </Suspense>
    );
  }

  const handleShelfScroll = (direction) => {
    if (curatedShelfRef.current) {
      const offset = direction === 'left' ? -360 : 360; 
      curatedShelfRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };
    
  return (
    <div className="bento-shell" style={{ 
      backgroundColor: '#000', height: '100vh', width: '100vw', 
      display: 'flex', flexDirection: 'column', padding: '12px', gap: '12px', 
      boxSizing: 'border-box', overflow: 'hidden',
      color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>

      {isUploading && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '4px', backgroundColor: '#121212', zIndex: 99999 }}>
          <div style={{ width: `${overallProgress}%`, height: '100%', backgroundColor: '#10b981', boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)', transition: 'width 0.2s ease-out' }} />
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', top: '30px', right: '40px', backgroundColor: '#121212',
          border: toast.type === 'success' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '16px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)', zIndex: 99999, animation: 'slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {toast.type === 'success' ? (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          ) : (
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', boxShadow: '0 0 10px #ef4444' }} />
          )}
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff', letterSpacing: '-0.2px' }}>{toast.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TOP HEADER */}
      {/* ========================================================================= */}
      <header style={{ 
        height: '75px', display: 'flex', alignItems: 'center', padding: '0 24px',
        backgroundColor: '#121212', border: '1px solid #222', borderRadius: '24px',
        flexShrink: 0, zIndex: 1000
      }}>
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ fontSize: '35px', fontWeight: '900', letterSpacing: '-1px', color: '#10b981', margin: 0 }}>GROOVE</h2>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <div 
          onClick={() => { 
            setShowLikedOnly(false); 
            setActiveCategory('All'); 
            navigate('/'); 
          }} 
          style={{ 
            width: '48px', height: '48px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            cursor: 'pointer', transition: 'all 0.3s ease',
            backgroundColor: (activeCategory === 'All' && !selectedPlaylist) ? '#ffffff' : '#0a0a0a',
            color: (activeCategory === 'All' && !selectedPlaylist) ? '#000' : '#fff',
            border: '1px solid #333'
          }}
        >
          <Home size={22} fill={(activeCategory === 'All' && !selectedPlaylist) ? "black" : "none"} />
        </div>

          <div 
            onClick={() => setIsSearchOpen(true)}
            style={{ 
              width: '100%', maxWidth: '400px', padding: '12px 20px', 
              borderRadius: '50px', border: '1px solid #333', 
              backgroundColor: '#0a0a0a', color: '#64748b', 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', transition: '0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
            onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Search size={16} color="#10b981" />
              <span style={{ fontSize: '13px', fontWeight: '600' }}>Search tracks, artists...</span>
            </div>
            <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', color: '#fff' }}>
              Ctrl K
            </div>
          </div>
        </div>

        <div style={{ flex: '0 0 auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
          {!isAuthenticated ? (
            <>
              <button onClick={() => navigate('/signup')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</button>
              <button onClick={() => navigate('/login')} style={{ backgroundColor: 'white', color: 'black', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Log In</button>
            </>
          ) : (
            <>
              <div 
                ref={avatarRef} onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ 
                  width: '45px', height: '45px', borderRadius: '50px', 
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', fontWeight: '900', fontSize: '18px', color: '#000',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {getUserInitial()}
              </div>

              {showUserMenu && (
                <div 
                ref={userMenuRef}
                style={{
                  position: 'absolute', top: '85px', right: '24px', width: '300px',
                  backgroundColor: '#121212', 
                  borderRadius: '28px', padding: '24px', zIndex: 2000,
                  border: '1px solid #333',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.9)',
                  animation: 'ultraFade 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
                }}>
                  <div style={{ 
                    background: '#0a0a0a', borderRadius: '20px', 
                    padding: '15px', border: '1px solid #222',
                    marginBottom: '20px', textAlign: 'center'
                  }}>
                    <div style={{ 
                      width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 12px',
                      background: 'linear-gradient(45deg, #10b981, #34d399)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '24px', fontWeight: '900', color: '#000',
                      boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)'
                    }}>
                      {getUserInitial()}
                    </div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '800' }}>
                      {currentUser?.email?.split('@')[0]}
                    </h3>
                  </div>

                  {/* 4 Action Circles */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                    <div className="ultra-action-circle" title="Profile" onClick={() => { setShowUserMenu(false); navigate('/profile'); }} style={{ cursor: 'pointer' }}>
                      <User size={18} />
                    </div>
                    <div className="ultra-action-circle" title="Settings" onClick={() => { setShowUserMenu(false); navigate('/settings'); }} style={{ cursor: 'pointer' }}>
                      <SettingsIcon size={18} />
                    </div>
                    <div className="ultra-action-circle" title="Account" onClick={() => { setShowUserMenu(false); navigate('/account'); }} style={{ cursor: 'pointer' }}>
                      <User size={18} />
                    </div>
                    <div className="ultra-action-circle" title="Privacy" onClick={() => { setShowUserMenu(false); setToast({ message: "Privacy settings locked.", type: "error" }); setTimeout(() => setToast(null), 3000); }} style={{ cursor: 'pointer' }}>
                      <ShieldCheck size={18} />
                    </div>  
                  </div>

                  {/* List Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="ultra-menu-item" onClick={() => { setShowUserMenu(false); navigate('/profile'); }} style={{ cursor: 'pointer' }}>
                      <span>View Public Profile</span>
                      <ArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.3 }} size={14} />
                    </div>
                    <div className="ultra-menu-item" onClick={() => { setShowUserMenu(false); navigate('/settings'); }} style={{ cursor: 'pointer' }}>
                      <span>Privacy Settings</span>
                      <ArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.3 }} size={14} />
                    </div>
                  </div>

                  <div style={{ height: '1px', background: '#333', margin: '15px 0' }} />

                  {/* Logout Button */}
                  <button onClick={handleLogout} className="ultra-logout-btn" style={{ cursor: 'pointer' }}>
                    <LogOut size={16} />
                    <span>LOGOUT</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header> 

      {/* ========================================================================= */}
      {/* 2. MIDDLE SECTION WRAPPER */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flex: 1, gap: '12px', overflow: 'hidden' }}>
        
        <Sidebar 
          isAuthenticated={isAuthenticated}
          isAdmin={isAdmin}
          setShowAdmin={setShowAdmin}
          handleCreatePlaylistInline={handleCreatePlaylistInline}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          selectedPlaylist={selectedPlaylist}
          setSelectedPlaylist={setSelectedPlaylist}
          userPlaylists={userPlaylists}
          handleContextMenu={handleContextMenu}
        />

        {/* ROUTING LOGIC WITH PROFESSIONAL PAGE TRANSITIONS */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname} // Tells Framer Motion when the page changes
            initial={{ opacity: 0, y: 15 }} // Start slightly invisible and lower
            animate={{ opacity: 1, y: 0 }}  // Slide up into place
            exit={{ opacity: 0, y: -15 }}   // Slide up and fade out when leaving
            transition={{ duration: 0.2, ease: "circOut" }}
            style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
          >
            {/* 👇 THE SUSPENSE BOUNDARY 👇 */}
            <Suspense fallback={<div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader2 className="spinner" size={32} color="#10b981"/></div>}>
              {location.pathname === '/profile' ? (
                <Profile 
                  userData={userData}
                  userPlaylists={userPlaylists}
                  playlist={playlist}
                  setCurrentTrackIndex={setCurrentTrackIndex}
                  setIsPlaying={setIsPlaying}
                  setPlaybackContext={setPlaybackContext}
                />
              ) : location.pathname === '/settings' ? (
                <Settings handleLogout={handleLogout} />
              ) : (
                <MainFeed 
                  activeCategory={activeCategory}
                  selectedPlaylist={selectedPlaylist}
                  setSelectedPlaylist={setSelectedPlaylist}
                  debouncedQuery={debouncedQuery}
                  userPlaylists={userPlaylists}
                  setUserPlaylists={setUserPlaylists}
                  filteredPlaylist={filteredPlaylist}
                  readyMadePlaylists={readyMadePlaylists}
                  handleContextMenu={handleContextMenu}
                  handleAddToPlaylist={handleAddToPlaylist}
                  handleRemoveFromPlaylist={handleRemoveFromPlaylist}
                  isAdmin={isAdmin}
                  setToast={setToast}
                />
              )}
            </Suspense>
          </motion.div>
        </AnimatePresence>
        
        {/* --- RIGHT QUEUE --- */}
        <aside style={{
          width: isQueueOpen ? '350px' : '0px', opacity: isQueueOpen ? 1 : 0,
          backgroundColor: '#121212', border: isQueueOpen ? '1px solid #222' : 'none',
          borderRadius: '24px', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1050
        }}>
          <div style={{ padding: '24px 24px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#fff' }}>Queue</h3>
            <button onClick={() => setIsQueueOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', padding: 0 }}>
              <X size={20} />
            </button>
          </div>

          <div className="bento-scrollbar" style={{ flex: 1, padding: '0 24px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {currentTrack && (
              <div>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff', fontWeight: '800' }}>Now playing</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={currentTrack.cover || "/Groove.png"} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <p style={{ margin: 0, fontSize: '15px', color: '#10b981', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.artist}</p>
                  </div>
                </div>
              </div>
            )}

            {queue.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '800' }}>Next in queue</h4>
                  <button onClick={() => setQueue([])} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: 0 }}>Clear queue</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {queue.map((song, index) => (
                    <div key={`manual-${song._id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={song.cover || "/Groove.png"} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                      </div>
                      <button onClick={() => setQueue(prev => prev.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(() => {
              const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
              const currentIndexInContext = currentPool.findIndex(s => s._id === currentTrack?._id);
              const sliceAnchor = currentIndexInContext !== -1 ? currentIndexInContext : lastContextIndexRef.current;
              const remainingSongs = currentPool.slice(sliceAnchor + 1);
              
              if (remainingSongs.length > 0) {
                return (
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#fff', fontWeight: '800' }}>
                      {activePlaylistName !== "All Songs" ? `Next from: ${activePlaylistName}` : "Up Next"}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {remainingSongs.map((song, index) => (
                        <div key={`auto-${song._id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.6 }}>
                          <img src={song.cover || "/Groove.png"} style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <p style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </aside>
      </div>

      {isUploading && (
        <div style={{
          position: 'fixed', bottom: '130px', left: '40px', width: '260px',
          backgroundColor: '#121212', border: '1px solid #333', borderRadius: '16px',
          padding: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', zIndex: 1050,
          display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: '900', color: '#10b981', letterSpacing: '1px' }}>UPLOADING</span>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>{uploadStats.current}/{uploadStats.total} Files</span>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Processing media batch...</div>
          <div style={{ width: '100%', height: '6px', backgroundColor: '#0a0a0a', borderRadius: '10px', border: '1px solid #333', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ width: `${overallProgress}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '10px', transition: 'width 0.3s ease' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right', fontWeight: '600' }}>{overallProgress}% Complete</div>
        </div>
      )}

      <PlayerDeck isQueueOpen={isQueueOpen} setIsQueueOpen={setIsQueueOpen} />

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
                              credentials: 'include' // <-- ADDED
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
                            const category = prompt("Enter Category Group (e.g., Trending Now, Top Charts, New Releases, Editorial Picks):", "Trending Now");
                            setContextMenu(null);
                            if (!category) return;

                            try {
                              const res = await fetch(`${API_BASE_URL}/api/playlists/curated`, { 
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ name, userId, category: category.trim() }),
                                credentials: 'include' // <-- ADDED
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
            width: '100%', maxWidth: '400px', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '24px',
            padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)'
          }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <Trash2 size={28} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>{confirmDialog.title}</h3>
            <p style={{ margin: '0 0 30px 0', fontSize: '14px', color: '#94a3b8', lineHeight: '1.6', fontWeight: '600' }}>{confirmDialog.message}</p>
            <div style={{ display: 'flex', gap: '15px', width: '100%' }}>
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null })}
                style={{ flex: 1, padding: '12px 0', borderRadius: '50px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
              >
                CANCEL
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                style={{ flex: 1, padding: '12px 0', borderRadius: '50px', background: '#ef4444', border: 'none', color: '#fff', fontSize: '13px', fontWeight: '800', cursor: 'pointer', transition: '0.2s', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                YES, DELETE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. THE COMMAND PALETTE */}
      {/* ========================================================================= */}
      {isSearchOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', paddingTop: '12vh', animation: 'ultraFade 0.2s ease-out' }}
          onClick={() => setIsSearchOpen(false)} 
        >
          <div 
            style={{ width: '100%', maxWidth: '650px', height: 'fit-content', maxHeight: '70vh', backgroundColor: '#121212', border: '1px solid #333', borderRadius: '20px', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.9)' }}
            onClick={(e) => e.stopPropagation()} 
          >
            <div style={{ display: 'flex', alignItems: 'center', padding: '20px 25px', borderBottom: '1px solid #333', background: '#0a0a0a', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <Search size={24} color="#10b981" />
              <input 
                autoFocus type="text" placeholder="What do you want to listen to?" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '20px', fontWeight: '700', paddingLeft: '15px' }}
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
                      
                      // ADD THIS LINE SO PLAYLIST CLICKS SYNC IMMEDIATELY:
                      syncPlayback(track._id, 0, selectedPlaylist);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '10px 15px', borderRadius: '12px', cursor: 'pointer', transition: '0.2s', backgroundColor: 'transparent' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1a1a1a'; e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <img src={track.cover || "/Groove.png"} style={{ width: '40px', height: '40px', borderRadius: '8px' }} alt="" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>{track.title}</div>
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

      {/* ========================================================================= */}
      {/* 5. KEYBOARD SHORTCUT HELP GUIDE */}
      {/* ========================================================================= */}
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
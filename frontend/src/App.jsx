import { useState, useRef, useEffect, Profiler } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, X, VolumeX, Shuffle, PlusCircle, ListMusic, Repeat, Home, Search, Settings, Library, Heart, Loader2, Plus, Folder, Clock, Globe, Apple, Smartphone, ExternalLink, User, ShieldCheck, ArrowLeft, LogOut, FolderPlus, Share2, Link, ChevronRight, Trash2 } from 'lucide-react';
import './App.css';
import Admin from './Admin';
import SignUp from './SignUp';
import Login from './Login';
import { API_BASE_URL } from './config';

function App() {
  // --- Data Fetching State ---
  const [playlist, setPlaylist] = useState([]);
  const [view, setView] = useState('player');
  const [searchQuery, setSearchQuery] = useState(''); // Holds the search text
  // NEW: Keeps track of which view we are in
  const [showLikedOnly, setShowLikedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false); // Used to toggle screens
  // NEW: Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('userId'));
  const [passwordInput, setPasswordInput] = useState('');
  const ADMIN_PASSWORD = "grooveadmin"; // You can change this to whatever you want! 
  const [contextMenu, setContextMenu] = useState(null); // { x: 0, y: 0, songId: null } 
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const avatarRef = useRef(null);
  const [showLoginTooltip, setShowLoginTooltip] = useState(false);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('role') === 'admin'); 
  // --- Player State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [userData, setUserData] = useState({ likedSongs: [], role: localStorage.getItem('role') || 'user' });
  const [volume, setVolume] = useState(1); 
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const audioRef = useRef(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [queue, setQueue] = useState([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const currentTrack = playlist.length > 0 ? playlist[currentTrackIndex] : null;
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  

  // --- Data Fetching Effect ---
  // App.jsx
  // --- 1. Fetch Songs (Global Library) ---
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/songs`)
      .then(response => response.json())
      .then(data => {
        setPlaylist(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setIsLoading(false);
      });
  }, [showAdmin, view]);

  // --- 2. SINGLE SOURCE OF TRUTH FOR PLAYLISTS (Place it here) ---
  useEffect(() => {
    const fetchUserLibrary = async () => {
      const userId = localStorage.getItem('userId');
      // Use localhost for local testing!
      const url = `${API_BASE_URL}/api/playlists?userId=${userId}`;
      
      if (isAuthenticated && userId) {
        try {
          const response = await fetch(url);
          const data = await response.json();
          if (Array.isArray(data)) setUserPlaylists(data);
        } catch (err) {
          console.error("Library Fetch Failed:", err);
        }
      }
    };
    fetchUserLibrary();
  }, [isAuthenticated, view]); // This triggers the fetch as soon as login view closes

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    if (isAuthenticated && userId) {
      // Stick to localhost during local testing
      fetch(`${API_BASE_URL}/api/users/${userId}`)
        .then(res => res.ok ? res.json() : Promise.reject('User not found'))
        .then(data => {
          setUserData({
            likedSongs: data.likedSongs || [],
            role: data.role || 'user'
          });
        })
        .catch(err => {
          console.error("Sync failed:", err);
          setUserData({ likedSongs: [], role: 'user' });
        });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      // 1. Check if the menu is actually open
      // 2. Check if the click was NOT on the menu
      // 3. Check if the click was NOT on the avatar button (trigger)
      if (
        showUserMenu &&
        userMenuRef.current && !userMenuRef.current.contains(e.target) &&
        avatarRef.current && !avatarRef.current.contains(e.target)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]); // Added showUserMenu here so it stays in sync

  useEffect(() => {
    const user = localStorage.getItem('userId');
    const role = localStorage.getItem('role'); // Get the role you saved during login
    
    if (user) {
      setIsAuthenticated(true);
      if (role === 'admin') {
        setIsAdmin(true);
      }
    }
  }, []);

  // --- Playback Engine Effect ---
  useEffect(() => {
    if (isPlaying && currentTrack && audioRef.current) {
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser", e));
    }
  }, [currentTrackIndex, isPlaying, currentTrack]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
    }

    return () => {
      window.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
    const preventDefault = (e) => {
      if (contextMenu) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    if (contextMenu) {
      // Add listeners to 'wheel' and 'touchmove' with { passive: false }
      window.addEventListener('wheel', preventDefault, { passive: false });
      window.addEventListener('touchmove', preventDefault, { passive: false });
    }

    return () => {
      window.removeEventListener('wheel', preventDefault);
      window.removeEventListener('touchmove', preventDefault);
    };
  }, [contextMenu]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setContextMenu(null);
    };

    if (contextMenu) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu]);

  // 1. DELETE HANDLER
  const deletePlaylist = async (id) => {
    if (!window.confirm("Remove this playlist from your library?")) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove it from the sidebar list immediately
        setUserPlaylists(prev => prev.filter(pl => pl._id !== id));
        
        // If the user was looking at this playlist, go back to 'All'
        if (selectedPlaylist === id) {
          setSelectedPlaylist(null);
          setActiveCategory('All');
        }
        setContextMenu(null);
      } else {
        alert("Failed to delete playlist from server.");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const renamePlaylist = async (id) => {
    const currentPlaylist = userPlaylists.find(pl => pl._id === id);
    const newName = prompt("Enter new name:", currentPlaylist?.name);
    
    if (!newName || newName === currentPlaylist?.name) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${id}/rename`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => 
          pl._id === id ? updatedPlaylist : pl
        ));
        setContextMenu(null);
      }
    } catch (error) {
      console.error("Rename failed:", error);
    }
  };

  // 2. SCROLL LOCK EFFECT
  useEffect(() => {
    if (contextMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [contextMenu]);

  // 3. CLICK OUTSIDE TO CLOSE MENU
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

  // --- Handlers: Playback ---
  const togglePlayPause = () => {
    const prevValue = isPlaying;
    setIsPlaying(!prevValue);
    prevValue ? audioRef.current.pause() : audioRef.current.play();
  };

  const handleNext = () => {
    // 1. Determine which list we should be playing from
    const isFilteredView = selectedPlaylist || activeCategory === 'Liked';
    const currentPool = isFilteredView ? filteredPlaylist : playlist;

    if (queue.length > 0) {
      const nextFromQueue = queue[0];
      const indexInGlobal = playlist.findIndex(s => s._id === nextFromQueue._id);
      if (indexInGlobal !== -1) {
        setCurrentTrackIndex(indexInGlobal);
        setQueue(prev => prev.slice(1));
        return;
      }
    }

    // 2. Find where the current song sits in the current pool
    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);

    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * currentPool.length);
      const globalIndex = playlist.findIndex(s => s._id === currentPool[randomIndex]._id);
      setCurrentTrackIndex(globalIndex);
    } else {
      // Move to the next song in the POOL, then map it back to the global index
      const nextIndexInPool = (currentIndexInPool + 1) % currentPool.length;
      const nextSong = currentPool[nextIndexInPool];
      const globalIndex = playlist.findIndex(s => s._id === nextSong._id);
      setCurrentTrackIndex(globalIndex);
    }
  };


  const handlePrev = () => {
    const isFilteredView = selectedPlaylist || activeCategory === 'Liked';
    const currentPool = isFilteredView ? filteredPlaylist : playlist;
    
    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);
    const prevIndexInPool = currentIndexInPool <= 0 ? currentPool.length - 1 : currentIndexInPool - 1;
    
    const prevSong = currentPool[prevIndexInPool];
    const globalIndex = playlist.findIndex(s => s._id === prevSong._id);
    setCurrentTrackIndex(globalIndex);
  };


  const handleSongEnd = () => handleNext();

  // --- Handlers: Time & Progress ---
  const handleTimeUpdate = () => setCurrentTime(audioRef.current.currentTime);

  const handleLoadedMetadata = async () => {
    const seconds = audioRef.current.duration;
    setDuration(seconds);

    // If the song doesn't have a duration in the database yet, update it!
    if (currentTrack && !currentTrack.duration) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/songs/${currentTrack._id}/duration`, {
        // const response = await fetch(`${API_BASE_URL}/api/songs/${currentTrack._id}/duration`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duration: seconds })
        });

        if (response.ok) {
          // Update local state so the table updates instantly without a refresh
          setPlaylist(prev => prev.map(song => 
            song._id === currentTrack._id ? { ...song, duration: seconds } : song
          ));
        }
      } catch (err) {
        console.error("Failed to auto-save duration:", err);
      }
    }
  };

  const getUserInitial = () => {
    const userId = localStorage.getItem('userId'); // We use this to check if logged in
    const userEmail = localStorage.getItem('userEmail'); // Make sure you save this during login!
    
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return "?"; // Fallback if something goes wrong
  };

  // --- Auth Handler ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordInput(''); // Clear the input for security
    } else {
      alert("Incorrect password!");
      setPasswordInput('');
    }
  };

  const handleLoginSuccess = (userRole) => {
    setIsAuthenticated(true);
    
    // IMMEDIATELY update admin status based on the role from the login response
    setIsAdmin(userRole === 'admin'); 
    
    setView('player');
  };

  const handleCreatePlaylistInline = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: "New Playlist", // Default placeholder name
          createdBy: userId, 
          songIds: [] 
        })
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setUserPlaylists(prev => [...prev, newPlaylist]);
        
        // Immediately switch view to the new playlist and trigger edit mode
        setSelectedPlaylist(newPlaylist._id);
        setActiveCategory('All');
        setTempName("New Playlist");
        setIsEditingName(true);
        
        // Close the old modal if it was open
        setIsPlaylistModalOpen(false); 
      }
    } catch (err) {
      console.error("Create failed:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanent delete? This cannot be undone.")) return;
    
    const userId = localStorage.getItem('userId');
    
    try {
      // Pass userId as a query parameter (?userId=...)
      const res = await fetch(`${API_BASE_URL}/api/songs/${id}?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setExistingSongs(prev => prev.filter(s => s._id !== id));
        alert("Track removed from library.");
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (err) {
      
    }
  };

  const handleLogout = () => {
    // 1. STOP THE MUSIC IMMEDIATELY
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ""; // Clear the source to kill the buffer
    }

    // 2. Reset playback states
    setIsPlaying(false);
    setCurrentTrackIndex(0);
    setCurrentTime(0);

    // 3. Clear everything from the browser
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('role'); 
    
    // 4. Reset ALL UI states
    setIsAuthenticated(false);
    setIsAdmin(false); 
    setShowUserMenu(false);
    setShowAdmin(false); 
    setView('player'); 
    setSelectedPlaylist(null);
    
    console.log("Session terminated. Music stopped and privileges revoked.");
  };

  // Inside your Admin.jsx file selection handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 1. Create a temporary URL for the file
    const fileUrl = URL.createObjectURL(file);
    const tempAudio = new Audio();
    tempAudio.src = fileUrl;

    // 2. Wait for metadata to load to get the duration
    tempAudio.onloadedmetadata = () => {
      const songDuration = tempAudio.duration;
      
      // 3. Save it to your form state
      setNewSong(prev => ({ ...prev, duration: songDuration, audioFile: file }));
      
      // Clean up memory
      URL.revokeObjectURL(fileUrl);
      console.log("Captured Duration:", songDuration);
    };
  };

  const handleSeek = (event) => {
    const newTime = Number(event.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    if (time && !isNaN(time)) {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return '0:00';
  };

  // --- Handlers: Volume ---
  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if(audioRef.current) audioRef.current.volume = newVolume;
    
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if(audioRef.current) audioRef.current.muted = false;
    } else if (newVolume === 0) {
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if(audioRef.current) audioRef.current.muted = newMutedState;
    
    if (!newMutedState && volume === 0) {
      setVolume(0.5);
      if(audioRef.current) audioRef.current.volume = 0.5;
    }
  };

  // --- Like Toggle Handler ---
  const toggleLike = async (songId, e) => {
    if (e) e.stopPropagation();
    const userId = localStorage.getItem('userId');
    if (!userId) return alert("Please log in!");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/toggle-like`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, songId })
      });

      if (response.ok) {
        const data = await response.json();
        // This forces the "Likes count" in your console to update from 0 to 1
        setUserData(prev => ({ ...prev, likedSongs: data.likedSongs }));
      }
    } catch (err) {
      console.error("Like toggle failed:", err);
    }
  };

  const createNewPlaylist = async () => {
    const name = prompt("Name your new playlist:");
    const userId = localStorage.getItem('userId');

    if (!name) return;
    if (!userId) {
      alert("Please log in to create playlists!");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          createdBy: userId, // Links this playlist to YOU specifically
          songIds: [] 
        })
      });

      if (response.ok) {
        const newPlaylist = await response.json();
        setUserPlaylists(prev => [...prev, newPlaylist]);
      }
    } catch (error) {
      console.error("Failed to create playlist:", error);
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
        body: JSON.stringify({ name: tempName })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        setUserPlaylists(prev => prev.map(pl => 
          pl._id === playlistId ? updatedPlaylist : pl
        ));
      }
    } catch (error) {
      console.error("Rename failed:", error);
    } finally {
      setIsEditingName(false);
    }
  };

  // Function to show the menu
  const handleContextMenu = (e, id, type = 'song') => {
    e.preventDefault();
    
    const menuWidth = 220;
    const menuHeight = 300; // Approximate height of your menu
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    let x = e.clientX;
    let y = e.clientY;

    // 1. Prevent main menu from going off the right edge
    if (x + menuWidth > screenWidth) {
      x = screenWidth - menuWidth - 10; // 10px padding from edge
    }

    // 2. Prevent main menu from going off the bottom edge
    if (y + menuHeight > screenHeight) {
      y = screenHeight - menuHeight - 10;
    }

    // 3. Detect if we need to flip submenus to the left
    // We flip if there isn't enough space for the menu AND a submenu (menuWidth * 2)
    const shouldAlignLeft = e.clientX + (menuWidth * 2) > screenWidth;

    setContextMenu({ 
      x, 
      y, 
      id, 
      type, 
      alignLeft: shouldAlignLeft 
    });
  };

  useEffect(() => {
    const handleGlobalContextMenu = (e) => {
      // This prevents the default browser menu on the entire page
      e.preventDefault();
    };

    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  // Function to actually add the song to the playlist in the DB
  const handleAddToPlaylist = async (songId, playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/add-song`, {
      // const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/add-song`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        
        // Update our local state so the UI knows the song is now in the playlist
        setUserPlaylists(prev => prev.map(pl => 
          pl._id === playlistId ? updatedPlaylist : pl
        ));

        setContextMenu(null); // Close the menu
      }
    } catch (error) {
      console.error("Failed to add song:", error);
    }
  };

  // This variable calculates which songs to show every time the UI renders
  const songsToDisplay = playlist.filter(song => {
    if (activeCategory === 'Liked') {
      return userData.likedSongs.includes(song._id);
    }
    if (activeCategory === 'All') return true;
    
    // If you select a specific playlist from the sidebar
    return activeCategory === song.category; 
  });

  const handleRemoveFromPlaylist = async (songId, playlistId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/playlists/${playlistId}/remove-song`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId })
      });

      if (response.ok) {
        const updatedPlaylist = await response.json();
        
        // Update the playlists state so the UI reflects the removal immediately
        setUserPlaylists(prev => prev.map(pl => 
          pl._id === playlistId ? updatedPlaylist : pl
        ));
        
        setContextMenu(null); // Close the context menu
      }
    } catch (error) {
      console.error("Failed to remove song:", error);
    }
  };

  // --- The Smart Filter ---
  const filteredPlaylist = playlist.filter((song) => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const matchesSearch = song.title.toLowerCase().includes(lowerCaseQuery) || 
                          song.artist.toLowerCase().includes(lowerCaseQuery);
    
    if (activeCategory === 'Liked') {
      // String comparison ensures MongoDB ObjectIds match UI strings
      return matchesSearch && userData?.likedSongs?.some(likedId => 
        String(likedId) === String(song._id)
      );
    }
    
    if (selectedPlaylist) {
      const currentPlaylistObj = userPlaylists.find(pl => pl._id === selectedPlaylist);
      if (currentPlaylistObj) {
        return matchesSearch && currentPlaylistObj.songIds.some(id => 
          String(id._id || id) === String(song._id)
        );
      }
    }
    
    return matchesSearch;
  });

  const userPlaylistsOnly = userPlaylists.filter(pl => !pl.isReadyMade);
  const readyMadePlaylists = userPlaylists.filter(pl => pl.isReadyMade);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [showLikedOnly]);

  // --- Loading Screen ---
  if (isLoading) {
    return (
      <div className="spotify-container loading-screen">
        <Loader2 size={48} className="spinner" color="#1db954" />
        <h2>Loading your library...</h2>
      </div>
    );
  }

  // --- Error Screen ---
  if (error) {
    return (
      <div className="spotify-container loading-screen">
        <h2>{error}</h2>
        <p>Please check your connection and refresh.</p>
      </div>
    );
  }

    // --- Main UI Render in App.jsx ---
    if (view === 'signup') {
      return (
        <SignUp 
          onBackToLogin={() => setView('login')} 
          onBackToPlayer={() => setView('player')} // ADD THIS
        />
      );
    }

    if (view === 'login') {
  return (
    <Login 
      onBackToSignup={() => setView('signup')} 
      // Ensure the role is passed from Login.jsx to handleLoginSuccess
      onLoginSuccess={(role) => handleLoginSuccess(role)}
      onBackToPlayer={() => setView('player')}
    />
  );
}

    // Add this above your return (App.jsx)
    if (showAdmin) {
      return <Admin onBack={() => setShowAdmin(false)} setUploadProgress={setUploadProgress} />;
    }
    
  return (
    <div className="bento-shell" style={{ 
      height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 50%, #121212 0%, #000 100%)',
      color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif"
    }}>
      
      {/* 1. AUDIO ENGINE */}
      {currentTrack && (
        <audio ref={audioRef} src={currentTrack.src} preload="metadata" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleSongEnd} loop={isRepeat} />
      )}

      {/* --- ULTRA-WIDE HEADER --- */}
      <header style={{ 
        height: '90px', display: 'flex', alignItems: 'center', padding: '0 40px',
        backgroundColor: 'rgba(2, 6, 23, 0.6)', backdropFilter: 'blur(40px) saturate(200%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)', zIndex: 1000
      }}>
        {/* 1. LEFT: BRAND LOGO ONLY */}
        <div style={{ flex: '0 0 auto' }}>
          <h2 style={{ 
            fontSize: '35px', fontWeight: '900', letterSpacing: '-1px', color: '#10b981', 
            margin: 0 
          }}>
            GROOVE
          </h2>
        </div>

        {/* 2. CENTER: HOME + SEARCH BAR (Grouped together) */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          
          {/* HOME SYMBOL */}
          <div 
            onClick={() => { setShowLikedOnly(false); setSelectedPlaylist(null); setActiveCategory('All'); }}
            style={{ 
              width: '48px', height: '48px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              cursor: 'pointer', transition: 'all 0.3s ease',
              backgroundColor: (activeCategory === 'All' && !selectedPlaylist) ? '#ffffff' : 'rgba(255,255,255,0.05)',
              color: (activeCategory === 'All' && !selectedPlaylist) ? '#000' : '#fff',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Home size={22} fill={(activeCategory === 'All' && !selectedPlaylist) ? "black" : "none"} />
          </div>

          {/* SEARCH BAR */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
            <Search size={18} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#10b981' }} />
            <input 
              type="text" placeholder="Search tracks..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ 
                width: '100%', padding: '14px 25px 14px 60px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.1)', 
                backgroundColor: 'rgba(0,0,0,0.4)', color: 'white', outline: 'none', fontSize: '15px'
              }}
            />  
          </div>
        </div>

        {/* 3. RIGHT: AUTH BUTTONS */}
        <div style={{ flex: '0 0 auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
          {!isAuthenticated ? (
            <>
              <button onClick={() => setView('signup')} style={{ background: 'none', border: 'none', color: '#64748b', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</button>
              <button onClick={() => setView('login')} style={{ backgroundColor: 'white', color: 'black', padding: '10px 25px', borderRadius: '50px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Log In</button>
            </>
          ) : (
            <>
              {/* GLASS PROFILE AVATAR */}
              <div 
                ref={avatarRef}
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ 
                  width: '45px', height: '45px', borderRadius: '50px', 
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', fontWeight: '900', fontSize: '18px', color: '#000',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)',
                  transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              >
                {getUserInitial()} {/* DYNAMIC INITIAL HERE */}
              </div>

              {/* BENTO-GLASS DROPDOWN */}
              {showUserMenu && (
                <div 
                ref={userMenuRef}
                style={{
                  position: 'absolute', top: '75px', right: '0', width: '300px',
                  backgroundColor: 'rgb(37, 33, 33)', 
                  backdropFilter: 'blur(40px) saturate(200%)',
                  borderRadius: '28px', padding: '24px', zIndex: 2000,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.8), inset 0 0 20px rgba(255,255,255,0.02)',
                  animation: 'ultraFade 0.4s cubic-bezier(0.22, 1, 0.36, 1)'
                }}>
                  
                  {/* 1. DYNAMIC PROFILE CARD */}
                  <div style={{ 
                    background: 'rgba(255,255,255,0.03)', borderRadius: '20px', 
                    padding: '15px', border: '1px solid rgba(255,255,255,0.05)',
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
                      {localStorage.getItem('userEmail')?.split('@')[0]}
                    </h3>
                  </div>

                  {/* 2. QUICK ACTIONS ROW */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', gap: '10px' }}>
                    <div className="ultra-action-circle" title="Profile"><User size={18} /></div>
                    <div className="ultra-action-circle" title="Settings"><Settings size={18} /></div>
                    <div className="ultra-action-circle" title="Account"><User size={18} /></div>
                    <div className="ultra-action-circle" title="Privacy"><ShieldCheck size={18} /></div>  
                    {/* <div 
                      className="ultra-action-circle" 
                      onClick={() => setShowAdmin(!showAdmin)} 
                      style={{ color: showAdmin ? '#10b981' : '#fff' }}
                    >
                      <ShieldCheck size={18} />
                  </div> */}
                  </div>

                  {/* 3. MENU LIST */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div className="ultra-menu-item">
                      <span>View Public Profile</span>
                      <ArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.3 }} size={14} />
                    </div>
                    <div className="ultra-menu-item">
                      <span>Privacy Settings</span>
                    </div>
                  </div>

                  {/* 4. SEPARATOR */}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '15px 0' }} />

                  {/* 5. GLOWING LOGOUT */}
                  <button 
                    onClick={handleLogout}
                    className="ultra-logout-btn"
                  >
                    <LogOut size={16} />
                    <span>LOGOUT</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </header> 

      {/* --- CONTENT AREA: THE BENTO GRID --- */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>
        
        {/* SIDEBAR: GLASS BOX */}
        <aside style={{ width: '320px', display: 'flex', flexDirection: 'column',border: isAdmin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent', borderRadius: '28px', transition: '0.5s ease' }}>
          <div style={{ 
            flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(30px)',
            borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)', 
            overflowY: 'auto', padding: '30px' 
          }} className="bento-scrollbar">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
              <p style={{ fontSize: '11px', fontWeight: '800', opacity: 0.4, letterSpacing: '2px', margin: 0 }}>YOUR LIBRARY</p>
              
              {/* --- ADMIN UPLOAD BUTTON IN SIDEBAR --- */}
              {isAuthenticated && isAdmin && (
                <button 
                  onClick={() => setShowAdmin(true)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '1px solid #10b981',
                    color: '#10b981',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '900',
                    cursor: 'pointer',
                    transition: '0.3s'
                  }}
                  onMouseOver={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.3)'}
                  onMouseOut={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.2)'}
                >
                  UPLOAD
                </button>
              )}
            </div>

            {/* 2. PLAYLISTS SECTION HEADER */}
            <div style={{ 
              margin: '30px 0 15px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <p style={{ fontSize: '11px', fontWeight: '800', opacity: 0.4, letterSpacing: '2px', margin: 0 }}>
                PLAYLISTS
              </p>
              
              {/* PLUS BUTTON: Only for authenticated users */}
              {isAuthenticated && (
                <button 
                  onClick={handleCreatePlaylistInline}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: '0.3s'
                  }}
                >
                  <Plus size={16} />
                </button>
              )}
            </div>

            {/* Sidebar logic based on Login status */}
            {!isAuthenticated ? (
              /* Guest View: Login Call to Action */
              <div style={{ 
                padding: '24px', 
                textAlign: 'center', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '20px',
                border: '1px dashed rgba(255,255,255,0.1)'
              }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>
                  Sign in to create and view playlists.
                </p>
                <button 
                  onClick={() => setView('login')}
                  style={{ 
                    background: '#10b981', color: '#000', padding: '8px 16px', 
                    borderRadius: '50px', fontSize: '11px', fontWeight: '900', 
                    border: 'none', cursor: 'pointer' 
                  }}
                >
                  LOG IN
                </button>
              </div>
            ) : (
              /* Logged-In View: Folders and Playlists */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                
                {/* --- LIKED SONGS FOLDER --- */}
                <div 
                  onClick={() => { 
                    setActiveCategory('Liked'); 
                    setSelectedPlaylist(null); // Deselect dynamic playlists
                  }}
                  style={{ 
                    padding: '5px 18px', borderRadius: '15px', display: 'flex', 
                    alignItems: 'center', gap: '15px', cursor: 'pointer',
                    backgroundColor: activeCategory === 'Liked' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                    transition: '0.2s',
                    border: activeCategory === 'Liked' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                  }}
                >
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', 
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Heart size={18} fill="white" color="white" />
                  </div>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: activeCategory === 'Liked' ? '#10b981' : '#888' 
                  }}>
                    Liked Songs
                  </span>
                </div>

                {/* Dynamic User Playlists from Database */}
                {userPlaylistsOnly.length > 0 ? (
                  userPlaylistsOnly.map((pl) => (
                    <div key={pl._id} onClick={() => { setSelectedPlaylist(pl._id); setActiveCategory('All'); }}
                    onContextMenu={(e) => handleContextMenu(e, pl._id, 'playlist')}
                      style={{ 
                        padding: '5px 18px', borderRadius: '15px', display: 'flex', 
                        alignItems: 'center', gap: '15px', cursor: 'pointer',
                        backgroundColor: selectedPlaylist === pl._id ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                        transition: '0.2s',
                        border: selectedPlaylist === pl._id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                      }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', 
                        backgroundColor: selectedPlaylist === pl._id ? '#10b981' : '#222', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Library size={18} color={selectedPlaylist === pl._id ? "#000" : "#fff"} opacity={selectedPlaylist === pl._id ? 1 : 0.5} />
                      </div>
                      <span style={{ 
                        fontSize: '14px', 
                        fontWeight: '700', 
                        color: selectedPlaylist === pl._id ? '#10b981' : '#888' 
                      }}>
                        {pl.name}
                      </span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', padding: '10px' }}>No playlists found.</p>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN LIST: STRETCHED BENTO BOX */}
        <main style={{ 
          flex: 1, overflowY: 'auto', backgroundColor: 'rgba(255,255,255,0.01)', backdropFilter: 'blur(20px)',
          borderRadius: '28px', border: '1px solid rgba(255,255,255,0.05)', padding: '40px' 
        }} className="bento-scrollbar">
          {activeCategory === 'All' && !selectedPlaylist ? (
            <>
            {/* --- NEW READY-MADE SHELF --- */}
            {readyMadePlaylists.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <p style={{ fontSize: '11px', fontWeight: '800', opacity: 0.4, letterSpacing: '2px', marginBottom: '20px' }}>CURATED FOR YOU</p>
                <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '15px' }} className="bento-scrollbar">
                  {readyMadePlaylists.map(pl => (
                    <div 
                      key={pl._id} 
                      onClick={() => setSelectedPlaylist(pl._id)}
                      className="advanced-music-card" 
                      style={{ minWidth: '180px', cursor: 'pointer', padding: '12px' }}
                    >
                      <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: '18px', overflow: 'hidden', marginBottom: '12px' }}>
                        <img 
                          src={pl.playlistCover || "/Groove.png"} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          alt={pl.name} 
                        />
                      </div>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0 }}>{pl.name}</h4>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>{pl.songIds.length} Songs</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: '50px' }}>
              <span style={{ background: '#10b981', color: '#000', padding: '4px 12px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', letterSpacing: '1px' }}>TRENDING</span>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', // Increased for better readability
              gap: '20px', // More breathing room
              paddingBottom: '40px'
            }}>
              {filteredPlaylist.map((track) => {
                const displayCover = track.cover || "/Groove.png";
                const isActive = playlist.findIndex(p => p._id === track._id) === currentTrackIndex && isPlaying;
                
                return (
                  <div 
                    key={track._id} 
                    className="advanced-music-card" 
                    onClick={() => { 
                      setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); 
                      setIsPlaying(true); 
                    }}
                    onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}

                    style={{ 
                      cursor: 'pointer', 
                      padding: '16px', 
                      backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', 
                      borderRadius: '20px', 
                      border: isActive ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.05)', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}
                  >
                    {/* IMAGE CONTAINER */}
                    <div style={{ 
                      position: 'relative', 
                      borderRadius: '14px', 
                      overflow: 'hidden', 
                      aspectRatio: '1/1', 
                      boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
                      marginBottom: '16px'
                    }}>
                      <img 
                        src={track.cover} 
                        alt={track.title} 
                        onError={(e) => {
                          e.target.onerror = null; // Prevents infinite loops
                          e.target.src = "/Groove.png"; // Path to your GROOVE logo
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.5s' }} 
                        className="card-img"
                      />
                      
                      {/* OVERLAY PLAY BUTTON (Appears on hover or if active) 
                      <div className="card-overlay" style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isActive ? 1 : 0,
                        transition: '0.3s ease',
                        backdropFilter: 'blur(4px)'
                      }}>
                        <div style={{ 
                          width: '48px', height: '48px', backgroundColor: '#10b981', 
                          borderRadius: '50%', display: 'flex', alignItems: 'center', 
                          justifyContent: 'center', boxShadow: '0 8px 15px rgba(16, 185, 129, 0.4)' 
                        }}>
                          {isActive ? <Pause size={24} fill="white" color="white" /> : <Play size={24} fill="white" color="white" style={{marginLeft: '3px'}} />}
                        </div>
                      </div> */}
                    </div>

                    {/* TEXT INFO */}
                    <div style={{ padding: '0 4px' }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '800', 
                        color: isActive ? '#10b981' : '#fff',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {track.title}
                      </h4>
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#64748b', 
                        marginTop: '6px', 
                        fontWeight: '600',
                        margin: '4px 0 0'
                      }}>
                        {track.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* --- 2. PLAYLIST LOOK: GROOVE DECK --- */
          <div className="groove-playlist-wrapper">
            <div className="groove-header-deck">
              <div className="deck-main-card">
                <div className="deck-art-frame">
                  <img 
                    /* If the playlist is empty, it uses the logo immediately */
                    src={filteredPlaylist.length > 0 ? filteredPlaylist[0].cover : "/Groove.png"} 
                    alt="Playlist Art" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/Groove.png";
                    }}
                  />
                </div>
                <div className="deck-details">
                  <span className="deck-badge">DIGITAL COLLECTION</span>
                  {isEditingName ? (
                    <input
                      autoFocus
                      className="deck-title-text inline-edit-input"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleInlineRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineRename();
                        if (e.key === 'Escape') setIsEditingName(false);
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid #10b981',
                        color: 'white',
                        width: '50%',
                        outline: 'none',
                        borderRadius: '8px',
                        padding: '0 10px'
                      }}
                    />
                  ) : (
                    <h1 className="deck-title-text">
                      {selectedPlaylist ? userPlaylists.find(p => p._id === selectedPlaylist)?.name : "Liked Library"}
                    </h1>
                  )}
                
                  <div className="deck-info-row">
                    <div className="deck-stat"><span>{filteredPlaylist.length}</span> TRACKS</div>
                    <div className="deck-stat"><span>{Math.floor(filteredPlaylist.length * 3.5 / 60)}H</span> DURATION</div>
                  </div>

                  {/* Merged Action Unit */}
                  <div className="groove-action-unit" style={{ marginTop: '25px', paddingLeft: '0', background: 'transparent', border: 'none' }}>
                    <button 
                      className="groove-play-btn" 
                      onClick={() => {
                        // Check if the current playing song is actually in this playlist
                        const isCurrentTrackInView = filteredPlaylist.some(s => s._id === currentTrack?._id);
                        
                        if (!isPlaying || !isCurrentTrackInView) {
                          // If not playing, or playing a different playlist, start the first song of THIS list
                          if (filteredPlaylist.length > 0) {
                            const firstSongGlobalIndex = playlist.findIndex(s => s._id === filteredPlaylist[0]._id);
                            setCurrentTrackIndex(firstSongGlobalIndex);
                            setIsPlaying(true);
                          }
                        } else {
                          // If already playing from this list, just pause/resume
                          togglePlayPause();
                        }
                      }}
                    >
                      {/* Show Pause icon only if playing AND the song is part of this playlist pool */}
                      {isPlaying && filteredPlaylist.some(s => s._id === currentTrack?._id) ? (
                        <Pause size={28} fill="white" />
                      ) : (
                        <Play size={28} fill="white" style={{marginLeft: '4px'}} />
                      )}
                    </button>

                    <Shuffle size={24} className="groove-utility" color={isShuffle ? '#10b981' : '#444'} onClick={() => setIsShuffle(!isShuffle)} />
                    <PlusCircle size={24} className="groove-utility" color="#444" onClick={() => setIsPlaylistModalOpen(true)} />
                  </div>
                </div>
              </div>
            </div>
            <div className="groove-tracklist">
              {filteredPlaylist.map((track, index) => {
                const displayCover = track.cover || "/Groove.png";
                const isActive = currentTrack?._id === track._id;
                return (
                  <div 
                    key={track._id} 
                    className={`groove-track-card ${isActive ? 'active' : ''}`}
                    onClick={() => { setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); setIsPlaying(true); }}
                    onContextMenu={(e) => handleContextMenu(e, track._id, 'song')}
                  >
                    <div className="track-id">{(index + 1).toString().padStart(2, '0')}</div>
                    <img 
                      src={displayCover} // USE THE VARIABLE HERE
                      className="track-thumb" 
                      alt="" 
                      onError={(e) => { e.target.src = "/Groove.png"; }}
                    />
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
        )}
      </main>
        
        {/* THE RIGHT SIDE QUEUE BOX */}
        <aside style={{
          width: isQueueOpen ? '350px' : '0px',
          opacity: isQueueOpen ? 1 : 0,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(40px)',
          borderLeft: isQueueOpen ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* QUEUE HEADER */}
          <div style={{ padding: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>Queue</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#10b981', fontWeight: '800' }}>{queue.length} TRACKS</p>
            </div>
            
            {/* DELETE ENTIRE QUEUE BUTTON */}
            {queue.length > 0 && (
              <button 
                onClick={() => setQueue([])} 
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
              >
                CLEAR ALL
              </button>
            )}
          </div>

          {/* QUEUE LIST */}
          <div className="bento-scrollbar" style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            {queue.map((song, index) => (
              <div key={`${song._id}-${index}`} className="queue-item-row" style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '12px', marginBottom: '8px',
                position: 'relative', transition: '0.3s'
              }}>
                <img src={song.cover} style={{ width: '40px', height: '40px', borderRadius: '8px' }} alt="" />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{song.artist}</p>
                </div>

                {/* REMOVE SINGLE SONG BUTTON */}
                <button 
                  onClick={() => setQueue(prev => prev.filter((_, i) => i !== index))}
                  style={{ 
                    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', 
                    padding: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}
                  className="remove-from-queue-btn"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <footer style={{ 
        height: '110px', 
        padding: '0 20px 20px 20px', // Lifted off the bottom
        display: 'flex', 
        justifyContent: 'center',
        zIndex: 1100,
        backgroundColor: 'transparent'
      }}>
        <div style={{ 
          width: '100%',
          maxWidth: '1400px',
          height: '100%',
          backgroundColor: 'rgba(10, 10, 15, 0.8)', 
          backdropFilter: 'blur(30px) saturate(200%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex', 
          alignItems: 'center', 
          padding: '0 30px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
        }}>
          
          {/* --- 1. MINIMALIST TRACK INFO --- */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '12px', overflow: 'hidden' }}>
              <img 
                src={currentTrack?.cover || "/Groove.png"} // INLINE CHECK HERE
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                alt="" 
                onError={(e) => { e.target.src = "/Groove.png"; }}
              />
              {isPlaying && <div className="playing-glow" style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 3px #10b981' }} />}
            </div>
            <div style={{ maxWidth: '180px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentTrack?.title || "IDLE"}
              </h4>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>
                {currentTrack?.artist || "Standby"}
              </p>
            </div>
          </div>

          {/* --- 2. THE DYNAMIC CONTROL UNIT --- */}
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
              <Shuffle size={16} onClick={() => setIsShuffle(!isShuffle)} style={{ cursor: 'pointer', color: isShuffle ? '#10b981' : '#444' }} />
              <SkipBack onClick={handlePrev} size={20} fill="#fff" style={{ cursor: 'pointer' }} />
              
              {/* CENTERED ACCENT PLAY BUTTON */}
              <div 
                onClick={togglePlayPause} 
                style={{ 
                  width: '54px', height: '54px', borderRadius: '18px', backgroundColor: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  boxShadow: '0 10px 20px rgba(255, 255, 255, 0.1)'
                }}
                className="play-trigger"
              >
                {isPlaying ? <Pause size={24} color="#000" fill="#000" /> : <Play size={24} color="#000" fill="#000" style={{ marginLeft: '4px' }} />}
              </div>

              <SkipForward onClick={handleNext} size={20} fill="#fff" style={{ cursor: 'pointer' }} />
              <Repeat size={16} onClick={() => setIsRepeat(!isRepeat)} style={{ cursor: 'pointer', color: isRepeat ? '#10b981' : '#444' }} />
            </div>

            {/* INTELLIGENT PROGRESS BAR */}
            <div style={{ width: '100%', maxWidth: '500px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', width: '35px' }}>{formatTime(currentTime)}</span>
              <div style={{ flex: 1, position: 'relative', height: '12px', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} 
                  className="advanced-slider"
                  style={{ width: '100%', height: '4px', accentColor: '#10b981' }} 
                />
              </div>
              <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', width: '35px' }}>{formatTime(duration)}</span>
            </div>
          </div>

         {/* --- 3. THE UTILITY MIXER --- */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '25px' }}>
            
            {/* ATTRACTIVE QUEUE TRIGGER */}
            <div 
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              style={{ 
                position: 'relative', cursor: 'pointer', 
                color: isQueueOpen ? '#10b981' : '#64748b',
                transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isQueueOpen ? 'scale(1.1)' : 'scale(1)',
                display: 'flex', alignItems: 'center'
              }}
            >
              <ListMusic size={22} />
              
              {/* DYNAMIC BADGE: Shows count of songs in queue */}
              {queue.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-10px', right: '-10px',
                  background: '#10b981', color: '#000', fontSize: '10px',
                  fontWeight: '900', minWidth: '18px', height: '18px',
                  borderRadius: '50px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', border: '2px solid #0a0a0f',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.4)',
                  animation: 'ultraFade 0.3s ease'
                }}>
                  {queue.length}
                </span>
              )}
            </div>

            {/* VOLUME CONTROLS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '8px 15px', borderRadius: '12px' }}>
              <Volume2 size={16} color="#64748b" />
              <input 
                type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} 
                style={{ width: '80px', height: '3px', accentColor: '#10b981' }} 
              />
            </div>
          </div>
        </div>
      </footer>
      {contextMenu && (
        <div 
          className={`glass-context-menu ${contextMenu.alignLeft ? 'align-left' : ''}`}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.type === 'playlist' && (
          <>
            {/* SECTION 1: ACTIONS */}
            <div className="context-item" onClick={() => { /* Add to queue logic */ setContextMenu(null); }}>
              <div className="item-content"><ListMusic size={16} /> <span>Add to queue</span></div>
            </div>
            <div className="context-item" onClick={() => { 
              const currentName = userPlaylists.find(pl => pl._id === contextMenu.id)?.name;
              setTempName(currentName);
              setIsEditingName(true); 
              setContextMenu(null);
            }}>
              <div className="item-content"><Settings size={16} /> <span>Edit details</span></div>
            </div>

            <div className="context-divider" />

            {/* SECTION 2: MANAGEMENT */}
            <div className="context-item delete-text" onClick={() => deletePlaylist(contextMenu.id)}>
              <div className="item-content">
                <Trash2 size={16} color="#10b981" /> <span>Remove from Your Library</span>
              </div>
            </div>

            <div className="context-divider" />

            {/* SECTION 3: CREATION */}
            <div className="context-item" onClick={() => { 
              handleCreatePlaylistInline();
              setContextMenu(null); 
            }}>
              <div className="item-content"><Plus size={16} /> <span>Create playlist</span></div>
            </div>
            <div className="context-item">
              <div className="item-content"><Folder size={16} /> <span>Create folder</span></div>
            </div>

            <div className="context-divider" />

            {/* SECTION 4: SHARING */}
            <div className="context-item submenu-parent">
              <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
              <ChevronRight size={14} opacity={0.5} />
              <div className="glass-submenu">
                <div className="context-item" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}?playlist=${contextMenu.id}`);
                    setContextMenu(null);
                }}>
                  <Link size={14} /> <span>Copy link to playlist</span>
                </div>
              </div>
            </div>
          </>
        )}
          {contextMenu.type === 'song' ? (
            <>
              {/* --- 1. PLAY NEXT (Adds to START of queue) --- */}
              <div className="context-item" onClick={() => { 
                const songToAdd = playlist.find(s => s._id === contextMenu.id);
                if (songToAdd) {
                  // We put the new song at the index 0 (the very next to play)
                  setQueue(prev => [songToAdd, ...prev]);
                }
                setContextMenu(null);
              }}>
                <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
              </div>

              {/* --- 2. ADD TO QUEUE (Adds to END of queue) --- */}
              <div className="context-item" onClick={() => { 
                const songToAdd = playlist.find(s => s._id === contextMenu.id);
                if (songToAdd) {
                  // We spread the previous queue and add the new song at the very end
                  setQueue(prev => [...prev, songToAdd]);
                }
                setContextMenu(null);
              }}>
                <div className="item-content"><Plus size={16} /> <span>Add to Queue</span></div>
              </div>

              <div className="context-divider" />

              {/* SECTION 2: LIBRARY */}
              <div className="context-item submenu-parent">
                <div className="item-content"><FolderPlus size={16} /> <span>Add to Playlist</span></div>
                <ChevronRight size={14} opacity={0.5} />
                <div className="glass-submenu">
                  {userPlaylists.map(pl => (
                    <div key={pl._id} className="context-item" onClick={() => handleAddToPlaylist(contextMenu.id, pl._id)}>
                      <span>{pl.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div 
                className="context-item" 
                onClick={(e) => {
                  // 1. Trigger the logic using the ID stored when you right-clicked
                  toggleLike(contextMenu.id, e); 
                  
                  // 2. Close the menu immediately so the user sees the heart update
                  setContextMenu(null); 
                }}
              >
                <div className="item-content">
                  <Heart 
                    size={16} 
                    // Check if the song is already liked to show a filled heart in the menu
                    fill={userData?.likedSongs?.includes(contextMenu.id) ? "#10b981" : "none"} 
                    color={userData?.likedSongs?.includes(contextMenu.id) ? "#10b981" : "#10b981"}
                  /> 
                  <span>
                    {userData?.likedSongs?.includes(contextMenu.id) ? 'Remove from Likes' : 'Save to Liked Songs'}
                  </span>
                </div>
              </div>

              {selectedPlaylist && (
              <>
                <div 
                  className="context-item delete-text" 
                  onClick={() => handleRemoveFromPlaylist(contextMenu.id, selectedPlaylist)}
                >
                  <div className="item-content">
                    <Trash2 size={16} color="#10b981" /> 
                    <span>Remove from this playlist</span>
                  </div>
                </div>
              </>
            )}

              <div className="context-divider" />

              {/* SECTION 3: DISCOVERY & SHARE */}
              <div className="context-item" onClick={() => setContextMenu(null)}>
                <div className="item-content"><User size={16} /> <span>Go to Artist</span></div>
              </div>

              <div className="context-item submenu-parent">
                <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
                <ChevronRight size={14} opacity={0.5} />
                <div className="glass-submenu">
                  <div className="context-item" onClick={() => { 
                    const shareUrl = `${window.location.origin}?track=${contextMenu.id}`;
                    navigator.clipboard.writeText(shareUrl); 
                    setContextMenu(null); 
                    }}>
                    <Link size={14} /> <span>Copy Link</span>
                  </div>
                  <div className="context-item">
                    <Globe size={14} /> <span>Embed Track</span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: ADMIN (ONLY IF ADMIN) */}
              {isAdmin && (
                <>
                  <div className="context-divider" />
                  <div className="context-item delete-text" onClick={() => handleDelete(contextMenu.id)}>
                    <div className="item-content"><Trash2 size={16} /> <span>Delete Permanently</span></div>
                  </div>
                </>
              )}
            </>
          ) : null }
        </div>
      )}


      
    </div> // This is the closing tag for spotify-container
  )
}

export default App;
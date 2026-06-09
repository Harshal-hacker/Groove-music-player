import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const loadSetting = (key, defaultValue) => {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

const PlayerContext = createContext();
export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const pendingRestoreTime = useRef(0); // Holds the time until the MP3 is ready
  
  // AUTH STATE
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // CORE AUDIO STATE
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [hasRestoredSession, setHasRestoredSession] = useState(false);
  
  const currentTrack = playlist.length > 0 ? playlist[currentTrackIndex] : null;

  // ==========================================
  // 🚀 UPGRADED: PERSISTENT QUEUE STATE
  // ==========================================
  // These now load from local storage so your queue survives a refresh!
  const [queue, setQueue] = useState(() => loadSetting('groove_queue', []));
  const [playbackContext, setPlaybackContext] = useState(() => loadSetting('groove_playbackContext', []));
  const [activePlaylistName, setActivePlaylistName] = useState(() => loadSetting('groove_activePlaylistName', "All Songs"));
  const [playingPlaylistId, setPlayingPlaylistId] = useState(() => loadSetting('groove_playingPlaylistId', null));
  useEffect(() => localStorage.setItem('groove_playingPlaylistId', JSON.stringify(playingPlaylistId)), [playingPlaylistId]);

  // SETTINGS STATES
  const [highQuality, setHighQuality] = useState(() => loadSetting('groove_highQuality', true));
  const [normalizeVolume, setNormalizeVolume] = useState(() => loadSetting('groove_normalizeVolume', true));
  const [crossfade, setCrossfade] = useState(() => loadSetting('groove_crossfade', 0));
  const [privateProfile, setPrivateProfile] = useState(() => loadSetting('groove_privateProfile', false));
  const [explicitContent, setExplicitContent] = useState(() => loadSetting('groove_explicitContent', true));

  // ==========================================
  // MEMORY SAVERS (Auto-saves to browser memory on change)
  // ==========================================
  useEffect(() => localStorage.setItem('groove_highQuality', JSON.stringify(highQuality)), [highQuality]);
  useEffect(() => localStorage.setItem('groove_normalizeVolume', JSON.stringify(normalizeVolume)), [normalizeVolume]);
  useEffect(() => localStorage.setItem('groove_crossfade', JSON.stringify(crossfade)), [crossfade]);
  useEffect(() => localStorage.setItem('groove_privateProfile', JSON.stringify(privateProfile)), [privateProfile]);
  useEffect(() => localStorage.setItem('groove_explicitContent', JSON.stringify(explicitContent)), [explicitContent]);
  
  // NEW: Saves your queue and context!
  useEffect(() => localStorage.setItem('groove_queue', JSON.stringify(queue)), [queue]);
  useEffect(() => localStorage.setItem('groove_playbackContext', JSON.stringify(playbackContext)), [playbackContext]);
  useEffect(() => localStorage.setItem('groove_activePlaylistName', JSON.stringify(activePlaylistName)), [activePlaylistName]);

  // AUTH CHECKER
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setCurrentUser(data.user);
        setIsAuthLoading(false);
      })
      .catch(() => {
        setCurrentUser(null);
        setIsAuthLoading(false);
      });
  }, []);

  // ==========================================
  // SERVER SYNC LOGIC (The Saver)
  // ==========================================
  const syncPlayback = async (trackId, time, playlistId) => {
    if (!currentUser) return; 
    try {
      await fetch(`${API_BASE_URL}/api/user/sync-playback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'keepalive': 'true' },
        body: JSON.stringify({ trackId, time, playlistId }),
        credentials: 'include'
      });
    } catch (err) {
      console.error("Sync failed:", err);
    }
  };

  const forceSyncNow = () => {
    if (audioRef.current && currentTrack) {
      syncPlayback(currentTrack._id, audioRef.current.currentTime || 0, playingPlaylistId);
    }
  };

  // ==========================================
  // INSTANT ARRIVAL SYNC
  // ==========================================
  // The millisecond the song changes, tell the database we arrived, even if paused!
  useEffect(() => {
    if (currentTrack && currentUser) {
      syncPlayback(currentTrack._id, 0, selectedPlaylist);
    }
  }, [currentTrack?._id]); // This specifically watches for the song ID to change

  useEffect(() => {
    const syncState = () => {
      if (audioRef.current && audioRef.current.currentTime > 0) {
        syncPlayback(currentTrack._id, audioRef.current.currentTime, selectedPlaylist);
      }
    };

    if (!isPlaying && currentTrack) {
      syncState();
    }

    let interval;
    if (currentTrack && isPlaying) {
      interval = setInterval(syncState, 10000); 
    }

    const handleUnload = () => syncState();
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [isPlaying, currentTrack, currentUser, selectedPlaylist]);

  // ==========================================
  // RESTORER: Load from Server
  // ==========================================
  useEffect(() => {
    // 1. If the user logs out, reset the flag so it is ready for the next login!
    if (!currentUser) {
      setHasRestoredSession(false);
      return;
    }

    // 2. If a user is logged in and we haven't restored yet, do it!
    if (playlist.length > 0 && currentUser && !hasRestoredSession) {
      const savedTrackId = currentUser.activeSession?.trackId?._id || currentUser.activeSession?.trackId;
      const savedTime = currentUser.activeSession?.currentTime;

      if (savedTrackId) {
        const savedIndex = playlist.findIndex(s => s._id === savedTrackId);
        if (savedIndex !== -1) {
          setCurrentTrackIndex(savedIndex);

          if (savedTime > 0) {
            pendingRestoreTime.current = parseFloat(savedTime);
          }
        }
      }
      setHasRestoredSession(true); // Mark as done for this session
    }
  }, [playlist, currentUser, hasRestoredSession]);

  // ==========================================
  // GLOBAL AUDIO ENGINE LOGIC
  // ==========================================

  useEffect(() => {
    if (audioRef.current && currentTrack) {
      if (audioRef.current.src !== currentTrack.src) {
        audioRef.current.src = currentTrack.src;
      }
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Auto-play failed:", e));
      }
    }
  }, [currentTrackIndex, currentTrack, isPlaying]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      forceSyncNow();
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    forceSyncNow();
    if (queue.length > 0) {
      const nextFromQueue = queue[0];
      const indexInGlobal = playlist.findIndex(s => s._id === nextFromQueue._id);
      
      if (indexInGlobal !== -1) {
        setCurrentTrackIndex(indexInGlobal);
        setQueue(prev => prev.slice(1)); 
        return;
      }
    }

    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    if (currentPool.length === 0) return; 

    if (isShuffle) {
      let randomIndex = Math.floor(Math.random() * currentPool.length);
      if (currentPool.length > 1 && currentPool[randomIndex]._id === currentTrack?._id) {
        randomIndex = (randomIndex + 1) % currentPool.length;
      }
      const nextSong = currentPool[randomIndex];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === nextSong._id));
      return;
    }

    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);
    
    if (currentIndexInPool === currentPool.length - 1) {
      if (repeatMode === 'all') {
        setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[0]._id));
      } else {
        setIsPlaying(false); 
        setCurrentTime(0);   
        setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[0]._id)); 
        
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        return;
      }
    } else {
      const nextSong = currentPool[currentIndexInPool + 1];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === nextSong._id));
    }
  };

  const handlePrev = () => {
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    if (currentPool.length === 0) return;

    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const currentIndexInPool = currentPool.findIndex(s => s._id === currentTrack?._id);

    if (currentIndexInPool === 0) {
      const lastSong = currentPool[currentPool.length - 1];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === lastSong._id));
    } else {
      const prevSong = currentPool[currentIndexInPool - 1];
      setCurrentTrackIndex(playlist.findIndex(s => s._id === prevSong._id));
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentUser, setCurrentUser, isAuthLoading,
      audioRef, playlist, setPlaylist,
      currentTrack, currentTrackIndex, setCurrentTrackIndex,
      isPlaying, setIsPlaying, togglePlayPause,
      currentTime, setCurrentTime,
      duration, setDuration,
      volume, setVolume,
      isMuted, setIsMuted,
      queue, setQueue,
      playbackContext, setPlaybackContext,
      isShuffle, setIsShuffle,
      repeatMode, setRepeatMode,
      handleNext, handlePrev,
      activePlaylistName, setActivePlaylistName,
      highQuality, setHighQuality,
      normalizeVolume, setNormalizeVolume,
      crossfade, setCrossfade,
      privateProfile, setPrivateProfile,
      explicitContent, setExplicitContent,
      selectedPlaylist, setSelectedPlaylist,
      syncPlayback,forceSyncNow,
      playingPlaylistId, setPlayingPlaylistId
    }}>
      {!isAuthLoading && children}
      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack.src} 
          preload="metadata" 
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
          onLoadedMetadata={() => {
            setDuration(audioRef.current?.duration || 0);
            
            if (pendingRestoreTime.current > 0) {
              audioRef.current.currentTime = pendingRestoreTime.current;
              setCurrentTime(pendingRestoreTime.current);
              pendingRestoreTime.current = 0; 
            }
          }} 
          onEnded={handleNext} 
          loop={repeatMode === 'one'} 
        />
      )}
    </PlayerContext.Provider>
  );
};
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { API_BASE_URL } from '../config';

// 1. Create the Context (The Global Brain)
const PlayerContext = createContext();

// 2. Create a custom hook so any file can easily access the player
export const usePlayer = () => useContext(PlayerContext);

// 3. The Provider Component that wraps your app
export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  
  // Core Audio State
  const [playlist, setPlaylist] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [queue, setQueue] = useState([]);
  const [playbackContext, setPlaybackContext] = useState([]);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const currentTrack = playlist.length > 0 ? playlist[currentTrackIndex] : null;

  // Global Audio Engine Logic
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
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleNext = () => {
    // Queue priority
    if (queue.length > 0) {
      const nextFromQueue = queue[0];
      const indexInGlobal = playlist.findIndex(s => s._id === nextFromQueue._id);
      if (indexInGlobal !== -1) {
        setCurrentTrackIndex(indexInGlobal);
        setQueue(prev => prev.slice(1));
        return;
      }
    }
    // Normal playlist context
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    const currentIndex = currentPool.findIndex(s => s._id === currentTrack?._id);
    const nextIndex = (currentIndex + 1) % currentPool.length;
    setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[nextIndex]?._id));
  };

  const handlePrev = () => {
    const currentPool = playbackContext.length > 0 ? playbackContext : playlist;
    const currentIndex = currentPool.findIndex(s => s._id === currentTrack?._id);
    if (currentIndex > 0) {
      setCurrentTrackIndex(playlist.findIndex(s => s._id === currentPool[currentIndex - 1]?._id));
    } else {
      audioRef.current.currentTime = 0;
    }
  };

  return (
    <PlayerContext.Provider value={{
      audioRef,
      playlist, setPlaylist,
      currentTrack, currentTrackIndex, setCurrentTrackIndex,
      isPlaying, setIsPlaying, togglePlayPause,
      currentTime, setCurrentTime,
      duration, setDuration,
      volume, setVolume,
      isMuted, setIsMuted,
      queue, setQueue,
      playbackContext, setPlaybackContext,
      isShuffle, setIsShuffle,
      isRepeat, setIsRepeat,
      handleNext, handlePrev
    }}>
      {children}
      
      {/* THE GLOBAL AUDIO NODE: Sits at the root, never unmounts! */}
      {currentTrack && (
        <audio 
          ref={audioRef} 
          src={currentTrack.src} 
          preload="metadata" 
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
          onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} 
          onEnded={handleNext} 
          loop={isRepeat} 
        />
      )}
    </PlayerContext.Provider>
  );
};
import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Repeat, Repeat1, ListMusic } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function PlayerDeck({ isQueueOpen, setIsQueueOpen }) {
  // 1. Instantly tap into the Global Player Context!
  const {
    audioRef, currentTrack, isPlaying, togglePlayPause,
    currentTime, setCurrentTime, duration, volume, setVolume,
    isMuted, setIsMuted, isShuffle, setIsShuffle,
    repeatMode, setRepeatMode, handleNext, handlePrev, queue
  } = usePlayer();

  // Local state for previous volume before muting
  const [preMuteVolume, setPreMuteVolume] = useState(0.5);

  // --- Local Handlers ---
  const handleSeek = (event) => {
    const newTime = Number(event.target.value);
    if (audioRef.current) audioRef.current.currentTime = newTime;
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

  const handleVolumeChange = (event) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume); 
    if (audioRef.current) audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if(audioRef.current) audioRef.current.muted = false;
    } else if (newVolume === 0) {
      setIsMuted(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      audioRef.current.volume = preMuteVolume;
      setVolume(preMuteVolume);
      setIsMuted(false);
    } else {
      setPreMuteVolume(volume);
      audioRef.current.muted = true;
      audioRef.current.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  };

  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      const activeTagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTagName === 'input' || activeTagName === 'textarea') return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowright':
          if (audioRef.current && duration) {
            e.preventDefault();
            const forwardTime = Math.min(audioRef.current.currentTime + 5, duration);
            audioRef.current.currentTime = forwardTime;
            setCurrentTime(forwardTime);
          }
          break;
        case 'arrowleft':
          if (audioRef.current) {
            e.preventDefault();
            const backwardTime = Math.max(audioRef.current.currentTime - 5, 0);
            audioRef.current.currentTime = backwardTime;
            setCurrentTime(backwardTime);
          }
          break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [isPlaying, volume, isMuted, preMuteVolume, duration, currentTrack]);

  const toggleRepeat = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  return (
    <footer style={{ 
      height: '90px', backgroundColor: '#121212', border: '1px solid #222', borderRadius: '24px',
      padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexShrink: 0, zIndex: 1100
    }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden', minWidth: '240px' }}>
          <div style={{ position: 'relative', width: '56px', height: '56px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
            <img src={currentTrack?.cover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" onError={(e) => e.target.src = "/Groove.png"} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '100%' }}>
            <div className="sliding-text-container">
              <h4 key={currentTrack?._id || 'idle'} className={`desktop-track-title ${isPlaying ? 'should-slide' : ''}`} style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                {currentTrack?.title || "IDLE"}
              </h4>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack?.artist || "Standby"}
            </p>
          </div>
        </div>

        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            <Shuffle size={16} onClick={() => setIsShuffle(!isShuffle)} style={{ cursor: 'pointer', color: isShuffle ? '#10b981' : '#444' }} />
            <SkipBack onClick={handlePrev} size={18} fill="#fff" style={{ cursor: 'pointer' }} />
            <div 
              onClick={togglePlayPause} 
              style={{ 
                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: '0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
            >
              {isPlaying ? <Pause size={18} color="#000" fill="#000" /> : <Play size={18} color="#000" fill="#000" style={{ marginLeft: '2px' }} /> }
            </div>
            <SkipForward onClick={handleNext} size={18} fill="#fff" style={{ cursor: 'pointer' }} />
            {/* REPEAT BUTTON LOGIC */}
            {repeatMode === 'one' ? (
              <Repeat1 
                size={18} 
                onClick={toggleRepeat} 
                style={{ cursor: 'pointer', color: '#10b981', transition: '0.2s' }} 
              />
            ) : (
              <Repeat 
                size={18} 
                onClick={toggleRepeat} 
                style={{ cursor: 'pointer', color: repeatMode === 'all' ? '#10b981' : '#64748b', transition: '0.2s' }} 
              />
            )}
          </div>

          <div style={{ width: '100%', maxWidth: '500px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', width: '35px' }}>{formatTime(currentTime)}</span>
            <div 
              className="timeline-slider-wrapper"
              style={{ flex: 1, position: 'relative', height: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onMouseMove={(e) => {
                if (!duration) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const hoverX = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
                e.currentTarget.style.setProperty('--hover-left', `${hoverX}px`);
                e.currentTarget.setAttribute('data-preview-time', formatTime(percentage * duration));
              }}
              onMouseLeave={(e) => e.currentTarget.removeAttribute('data-preview-time')}
            >
              <input 
                type="range" min="0" max={duration || 0} value={currentTime} onChange={handleSeek} className="advanced-slider"
                style={{ width: '100%', height: '4px', accentColor: '#10b981', background: '#333', cursor: 'pointer' }} 
              />
            </div>
            <span style={{ fontSize: '10px', color: '#64748b', fontWeight: '800', width: '35px' }}>{formatTime(duration)}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '25px' }}>
          <div 
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            style={{ position: 'relative', cursor: 'pointer', color: isQueueOpen ? '#10b981' : '#64748b', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', transform: isQueueOpen ? 'scale(1.1)' : 'scale(1)', display: 'flex', alignItems: 'center' }}
          >
            <ListMusic size={22} />
            {queue.length > 0 && (
              <span style={{ position: 'absolute', top: '-10px', right: '-10px', background: '#10b981', color: '#000', fontSize: '10px', fontWeight: '900', minWidth: '18px', height: '18px', borderRadius: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #121212' }}>
                {queue.length}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#0a0a0a', border: '1px solid #333', padding: '8px 15px', borderRadius: '12px' }}>
            <div onClick={toggleMute} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'transform 0.2s ease' }} className="volume-icon-trigger">
              {isMuted || volume === 0 ? <VolumeX size={16} color="#64748b" /> : <Volume2 size={16} color="#64748b" /> }
            </div>
            <input 
              type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} 
              style={{ width: '80px', height: '3px', accentColor: '#10b981', cursor: 'pointer' }} 
            />
          </div>
        </div>
    </footer>
  );
}
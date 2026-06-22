import React, { useState } from 'react';
import { Search, X, Play, TrendingUp } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

export default function SearchModal({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  debouncedQuery,
  filteredPlaylist,
  userPlaylists,
  selectedPlaylist
}) {
  const { 
    playlist, 
    setCurrentTrackIndex, 
    setIsPlaying, 
    setPlaybackContext, 
    isPlayingFromQueueRef,
    setActivePlaylistName, 
    setPlayingPlaylistId, 
    syncPlayback 
  } = usePlayer();

  const [hoveredTrack, setHoveredTrack] = useState(null);

  if (!isOpen) return null;

  const quickSearches = ["Pop Hits", "Workout Tunes", "Lofi Chill", "Top 50 Global", "Acoustic"];

  return (
    <div 
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, 
        backgroundColor: 'rgba(0, 0, 0, 0.65)', 
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', justifyContent: 'center', paddingTop: '8vh', 
        animation: 'ultraFade 0.2s ease-out' 
      }}
      onClick={onClose} 
    >
      <div 
        style={{ 
          width: '100%', maxWidth: '760px', height: 'fit-content', maxHeight: '82vh', 
          backgroundColor: '#0f0f13', 
          border: '1px solid rgba(255,255,255,0.06)', 
          borderRadius: '24px', 
          display: 'flex', flexDirection: 'column', 
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* ⚡ JIOSAAVN-STYLE HERO INPUT */}
        <div style={{ 
          display: 'flex', alignItems: 'center', padding: '24px 32px', 
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          borderBottom: debouncedQuery ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
          transition: 'border-color 0.3s'
        }}>
          <Search size={28} color={debouncedQuery ? "#10b981" : "#a7a7a7"} style={{ transition: 'color 0.3s' }} />
          <input 
            autoFocus 
            type="text" 
            placeholder="Search music, artists, or podcasts..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              flex: 1, background: 'transparent', border: 'none', outline: 'none', 
              color: '#fff', fontSize: '24px', fontWeight: '800', paddingLeft: '20px',
              letterSpacing: '-0.5px'
            }}
          />
          
          {searchQuery && (
            <button 
              onClick={() => { setSearchQuery(''); }} 
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s', marginRight: '16px' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <X size={16} />
            </button>
          )}

          <div 
            onClick={onClose} 
            style={{ 
              padding: '8px 16px', background: 'rgba(255,255,255,0.05)', 
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', 
              fontSize: '12px', color: '#fff', fontWeight: '800', cursor: 'pointer',
              transition: 'all 0.2s ease', letterSpacing: '0.5px'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#000'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
          >
            ESC
          </div>
        </div>

        {/* ⚡ CONTENT AREA */}
        <div className="bento-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: debouncedQuery ? '16px 24px 24px' : '32px' }}>
          
          {debouncedQuery === '' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* JioSaavn-style Trending Tags */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <TrendingUp size={18} color="#10b981" />
                  <h4 style={{ margin: 0, color: '#fff', fontSize: '16px', fontWeight: '800' }}>Trending Searches</h4>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {quickSearches.map(tag => (
                    <button 
                      key={tag} 
                      onClick={() => setSearchQuery(tag)}
                      style={{ 
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '12px', padding: '12px 20px', color: '#fff', fontSize: '14px', 
                        fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}
                      onMouseOver={e => { 
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; 
                        e.currentTarget.style.borderColor = '#10b981'; 
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={e => { 
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; 
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; 
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <Search size={14} color="#a7a7a7" />
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#a7a7a7', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                Top Results
              </div>

              {filteredPlaylist.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Search size={28} color="#64748b" />
                  </div>
                  <h4 style={{ color: '#fff', fontSize: '18px', fontWeight: '800', margin: '0 0 8px' }}>No results found</h4>
                  <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '500', margin: 0 }}>Try searching for a different song or artist.</p>
                </div>
              ) : (
                filteredPlaylist.slice(0, 10).map((track) => (
                  <div 
                    key={track._id}
                    onClick={() => { 
                      setPlaybackContext(filteredPlaylist); 
                      setActivePlaylistName("Search Results");
                      setPlayingPlaylistId(selectedPlaylist); 
                      setCurrentTrackIndex(playlist.findIndex(p => p._id === track._id)); 
                      setIsPlaying(true); 
                      isPlayingFromQueueRef.current = false;
                      syncPlayback(track._id, 0, selectedPlaylist);
                      onClose();
                    }}
                    onMouseEnter={() => setHoveredTrack(track._id)}
                    onMouseLeave={() => setHoveredTrack(null)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', 
                      borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', 
                      backgroundColor: hoveredTrack === track._id ? 'rgba(255,255,255,0.04)' : 'transparent',
                      transform: hoveredTrack === track._id ? 'scale(1.01)' : 'scale(1)'
                    }}
                  >
                    <div style={{ position: 'relative', width: '48px', height: '48px', flexShrink: 0 }}>
                      <img 
                        src={track.cover || "/Groove.png"} 
                        style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }} 
                        alt="" 
                      />
                      {/* Play overlay on hover */}
                      <div style={{ 
                        position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hoveredTrack === track._id ? 1 : 0, transition: '0.2s ease'
                      }}>
                        <Play size={20} fill="#fff" color="#fff" style={{ marginLeft: '2px' }} />
                      </div>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.title}
                      </span>
                      <span style={{ fontSize: '13px', color: '#a7a7a7', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {track.artist}
                      </span>
                    </div>

                    {hoveredTrack === track._id && (
                      <div style={{ color: '#10b981', paddingRight: '8px' }}>
                        <Play size={20} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function MainFeed({ readyMadePlaylists, currentUser, setSelectedPlaylist, handleContextMenu }) {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState([]);
  const [isAlbumsLoading, setIsAlbumsLoading] = useState(true);

  // Fetch Albums
  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/albums`);
        if (response.ok) {
          const data = await response.json();
          setAlbums(data);
        }
      } catch (error) { console.error("Failed to load albums:", error); } 
      finally { setIsAlbumsLoading(false); }
    };
    fetchAlbums();
  }, []);

  return (
    <main 
      className="bento-scrollbar"
      style={{ 
        flex: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', 
        overflowY: 'auto', overflowX: 'hidden', backgroundColor: '#121212', 
        borderRadius: '24px', border: '1px solid #222', boxSizing: 'border-box'
      }} 
    >
      <div style={{ padding: '24px' }}>
        
        {/* 1. DYNAMIC ALBUMS ROW */}
        {!isAlbumsLoading && albums.length > 0 && (
          <div style={{ marginBottom: '50px', position: 'relative' }} className="jio-shelf-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', margin: 0 }}>Recently Added Albums</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => document.getElementById('shelf-recent-albums').scrollBy({ left: -360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}><ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                <button onClick={() => document.getElementById('shelf-recent-albums').scrollBy({ left: 360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}><ChevronRight size={16} /></button>
              </div>
            </div>
            <div id="shelf-recent-albums" style={{ display: 'flex', gap: '20px', overflowX: 'auto', scrollBehavior: 'smooth', padding: '16px 4px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`#shelf-recent-albums::-webkit-scrollbar { display: none; }`}</style>
              {albums.map(album => (
                <div 
                  key={album._id} 
                  onClick={() => navigate(`/album/${album._id}`)} 
                  
                  // ⚡ THE FIX: Right Click Menu Added Here!
                  onContextMenu={(e) => handleContextMenu && handleContextMenu(e, album._id, 'album', 'home')} 
                  
                  className="curated-bento-card" 
                  style={{ minWidth: '160px', maxWidth: '160px', cursor: 'pointer', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', flexShrink: 0 }}
                >
                  <div className="curated-art-wrapper" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
                    <img src={album.coverArt || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={album.title} onError={(e) => e.target.src = "/Groove.png"} loading="lazy" />
                  </div>
                  <div style={{ padding: '0 2px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 4px 0', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{album.title}</h4>
                    <p style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', margin: 0 }}>Album</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. READY-MADE PLAYLISTS */}
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
                    <button onClick={() => document.getElementById(shelfId).scrollBy({ left: -360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}><ChevronRight size={16} style={{ transform: 'rotate(180deg)' }} /></button>
                    <button onClick={() => document.getElementById(shelfId).scrollBy({ left: 360, behavior: 'smooth' })} style={{ background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div id={shelfId} style={{ display: 'flex', gap: '20px', overflowX: 'hidden', scrollBehavior: 'smooth', padding: '16px 4px' }}>
                  {categoryPlaylists.map(pl => {
                    const isFollowed = pl.followers?.includes(currentUser?._id);
                    return (
                      <div 
                        key={pl._id} 
                        onClick={() => { setSelectedPlaylist(pl._id); navigate(`/playlist/${pl._id}`); }} 
                        onContextMenu={(e) => handleContextMenu && handleContextMenu(e, pl._id, 'playlist', 'home')} 
                        className="curated-bento-card" 
                        style={{ minWidth: '160px', maxWidth: '160px', cursor: 'pointer', padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '16px', border: '1px solid #333', boxShadow: '0 12px 24px rgba(0, 0, 0, 0.5)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', flexShrink: 0 }}
                      >
                        <div className="curated-art-wrapper" style={{ width: '100%', aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden', marginBottom: '10px', position: 'relative' }}>
                          <img src={pl.songIds?.[0]?.albumId?.coverArt || pl.playlistCover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={pl.name} onError={(e) => e.target.src = "/Groove.png"} loading="lazy" />
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
    </main>
  );
}
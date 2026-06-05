import React from 'react';
import { Plus, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar({
  isAuthenticated, 
  isAdmin, 
  setShowAdmin, 
  handleCreatePlaylistInline,
  activeCategory, 
  setActiveCategory, 
  selectedPlaylist, 
  setSelectedPlaylist,
  userPlaylists, 
  handleContextMenu
}) {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  // Filter out public/curated playlists so only the user's personal ones show here
  const userPlaylistsOnly = userPlaylists.filter(pl => 
    (!pl.isReadyMade && pl.createdBy === currentUserId) || 
    (pl.isReadyMade && pl.followers?.some(id => String(id) === String(currentUserId)))
  );

  return (
    <aside style={{ 
      width: '320px', display: 'flex', flexDirection: 'column',
      backgroundColor: '#121212', border: isAdmin ? '1px solid #10b981' : '1px solid #222',
      borderRadius: '24px', transition: '0.5s ease', padding: '24px', overflowY: 'auto'
    }} className="bento-scrollbar" onContextMenu={(e) => {
        if (!e.target.closest('.sidebar-playlist-item')) {
          e.preventDefault(); 
          handleContextMenu(e, 'empty-sidebar', 'sidebar-empty', 'sidebar');
        }
    }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '2px', margin: 0 }}>YOUR LIBRARY</p>
          
          {isAuthenticated && isAdmin && (
            <button 
              onClick={() => setShowAdmin(true)}
              style={{
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981',
                padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '900',
                cursor: 'pointer', transition: '0.3s'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.2)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(16, 185, 129, 0.1)'}
            >
              UPLOAD
            </button>
          )}
        </div>

        <div style={{ margin: '30px 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', letterSpacing: '2px', margin: 0 }}>PLAYLISTS</p>
          
          {isAuthenticated && (
            <button 
              onClick={handleCreatePlaylistInline}
              style={{
                background: '#0a0a0a', border: '1px solid #333', borderRadius: '50%',
                width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff', transition: '0.3s'
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        {!isAuthenticated ? (
          <div style={{ padding: '24px', textAlign: 'center', background: '#0a0a0a', borderRadius: '20px', border: '1px dashed #333' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>Sign in to create and view playlists.</p>
            <button 
              onClick={() => navigate('/login')}
              style={{ background: '#10b981', color: '#000', padding: '8px 16px', borderRadius: '50px', fontSize: '11px', fontWeight: '900', border: 'none', cursor: 'pointer' }}
            >
              LOG IN
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div 
              onClick={() => { setActiveCategory('Liked'); setSelectedPlaylist(null); }}
              style={{ 
                padding: '5px 18px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: '0.2s',
                backgroundColor: activeCategory === 'Liked' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                border: activeCategory === 'Liked' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Heart size={18} fill="white" color="white" />
              </div>
              <span style={{ fontSize: '14px', fontWeight: '700', color: activeCategory === 'Liked' ? '#10b981' : '#888' }}>Liked Songs</span>
            </div>

            {userPlaylistsOnly.length > 0 ? (
              userPlaylistsOnly.map((pl) => (
                <div 
                 key={pl._id} 
                 onClick={() => navigate(`/playlist/${pl._id}`)} 
                  className="sidebar-playlist-item" 
                  onContextMenu={(e) => handleContextMenu(e, pl._id, 'playlist', 'sidebar')}
                  style={{ 
                    padding: '5px 18px', borderRadius: '15px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', transition: '0.2s',
                    backgroundColor: selectedPlaylist === pl._id ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                    border: selectedPlaylist === pl._id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                  }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img 
                      src={pl.songIds?.[0]?.cover || pl.playlistCover || "/Groove.png"} alt="cover" onError={(e) => e.target.src = "/Groove.png"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: selectedPlaylist === pl._id ? 1 : 0.7, transition: '0.3s' }} 
                    />
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: selectedPlaylist === pl._id ? '#10b981' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pl.name}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', padding: '10px' }}>No playlists found.</p>
            )}
          </div>
        )}
    </aside>
  );
}
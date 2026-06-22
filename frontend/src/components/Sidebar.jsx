import React from 'react';
import { Plus, Heart, Library, User } from 'lucide-react'; // Added Library and User icons
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

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
  handleContextMenu,
  isCollapsed, // ⚡ 1. NEW PROP: Tells sidebar to shrink
  toggleSidebar // ⚡ 2. NEW PROP: Allows user to click library icon to open/close
}) {
  const navigate = useNavigate();
  
  const { currentUser } = usePlayer();
  const currentUserId = currentUser?._id;

  // Filter out public/curated playlists so only the user's personal ones show here
  const userPlaylistsOnly = userPlaylists.filter(pl => 
    (!pl.isReadyMade && pl.createdBy === currentUserId) || 
    (pl.isReadyMade && pl.followers?.some(id => String(id) === String(currentUserId)))
  );

  return (
    <aside style={{ 
      /* ⚡ SMART SPOTIFY WIDTH LOGIC: Shrinks to 88px when collapsed */
      width: isCollapsed ? '88px' : '320px', 
      display: 'flex', flexDirection: 'column',
      backgroundColor: '#121212', border: isAdmin ? '1px solid #10b981' : '1px solid #222',
      borderRadius: '24px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', 
      padding: isCollapsed ? '24px 12px' : '24px', 
      overflowY: 'auto', overflowX: 'hidden', flexShrink: 0
    }} className="bento-scrollbar" onContextMenu={(e) => {
        if (!e.target.closest('.sidebar-playlist-item')) {
          e.preventDefault(); 
          handleContextMenu(e, 'empty-sidebar', 'sidebar-empty', 'sidebar');
        }
    }}>
        {/* ⚡ HEADER SECTION: Turns into a clickable button to expand/collapse */}
        <div style={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'space-between', alignItems: 'center', marginBottom: '25px' }}>
          
          <div 
            onClick={toggleSidebar}
            title={isCollapsed ? "Expand Your Library" : "Collapse Your Library"}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#64748b', transition: '0.2s' }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = '#64748b'}
          >
            <Library size={20} />
            {!isCollapsed && <p style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '2px', margin: 0 }}>YOUR LIBRARY</p>}
          </div>
          
          {isAuthenticated && isAdmin && !isCollapsed && (
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

        {/* ⚡ PLAYLIST HEADER: Hidden entirely when collapsed */}
        {!isCollapsed && (
          <div style={{ margin: '15px 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
        )}

        {!isAuthenticated ? (
          <div style={{ padding: isCollapsed ? '12px' : '24px', textAlign: 'center', background: '#0a0a0a', borderRadius: '20px', border: '1px dashed #333' }}>
            {!isCollapsed && <p style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', marginBottom: '12px' }}>Sign in to create and view playlists.</p>}
            <button 
              onClick={() => navigate('/login')}
              title="Log In"
              style={{ background: '#10b981', color: '#000', padding: isCollapsed ? '10px' : '8px 16px', borderRadius: '50px', fontSize: '11px', fontWeight: '900', border: 'none', cursor: 'pointer', width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              {isCollapsed ? <User size={16} /> : "LOG IN"}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            {/* LIKED SONGS */}
            <div 
              onClick={() => { setActiveCategory('Liked'); setSelectedPlaylist(null); }}
              title="Liked Songs"
              style={{ 
                padding: isCollapsed ? '8px' : '5px 18px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '15px', cursor: 'pointer', transition: '0.2s',
                backgroundColor: activeCategory === 'Liked' ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                border: activeCategory === 'Liked' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Heart size={18} fill="white" color="white" />
              </div>
              {!isCollapsed && <span style={{ fontSize: '14px', fontWeight: '700', color: activeCategory === 'Liked' ? '#10b981' : '#888', whiteSpace: 'nowrap', overflow: 'hidden' }}>Liked Songs</span>}
            </div>

            {/* DYNAMIC PLAYLISTS */}
            {userPlaylistsOnly.length > 0 ? (
              userPlaylistsOnly.map((pl) => (
                <div 
                    key={pl._id} 
                    onClick={() => { 
                      setSelectedPlaylist(pl._id); 
                      setActiveCategory('All'); 
                      navigate(`/playlist/${pl._id}`); 
                    }} 
                    className="sidebar-playlist-item" 
                    onContextMenu={(e) => handleContextMenu(e, pl._id, 'playlist', 'sidebar')}
                    title={isCollapsed ? pl.name : ""}
                    style={{ 
                      padding: isCollapsed ? '8px' : '5px 18px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '15px', cursor: 'pointer', transition: '0.2s',
                      backgroundColor: selectedPlaylist === pl._id ? 'rgba(16, 185, 129, 0.15)' : 'transparent', 
                      border: selectedPlaylist === pl._id ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent'
                    }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <img 
                      src={pl.songIds?.[0]?.cover || pl.playlistCover || "/Groove.png"} alt="cover" onError={(e) => e.target.src = "/Groove.png"}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: selectedPlaylist === pl._id ? 1 : 0.7, transition: '0.3s' }} 
                    />
                  </div>
                  {!isCollapsed && (
                    <span style={{ fontSize: '14px', fontWeight: '700', color: selectedPlaylist === pl._id ? '#10b981' : '#888', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {pl.name}
                    </span>
                  )}
                </div>
              ))
            ) : (
              !isCollapsed && <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', padding: '10px' }}>No playlists found.</p>
            )}
          </div>
        )}
    </aside>
  );
}
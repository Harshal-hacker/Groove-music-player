import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SkipForward, X, PlusCircle, ListMusic, User, FolderPlus, 
  Share2, Link, ChevronRight, Trash2, Heart, Plus, Folder, 
  SettingsIcon, Download, Disc, Mic2, PlayCircle, ListPlus
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { API_BASE_URL } from '../config';

// ⚡ Helper for safe clipboard access
const copyToClipboard = (text, setToast) => {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text);
    if (setToast) setToast({ message: 'Link copied to clipboard!', type: 'success' });
  } else {
    if (setToast) setToast({ message: 'Copying not supported on this browser.', type: 'error' });
  }
};

// ==========================================
// 1. PLAYLIST MENU SUB-COMPONENT
// ==========================================
const PlaylistMenu = ({ props, targetPl }) => {
  const { 
    menu, closeMenu, userPlaylists, setUserPlaylists, currentUser, setToast, 
    deletePlaylist, handleCreatePlaylistInline, setSelectedPlaylist, 
    setIsEditingName, setTempName, setQueue, isAdmin 
  } = props;

  const isFollowed = targetPl?.followers?.includes(currentUser?._id);

  return (
    <>
      <div className="context-item" onClick={() => { 
        if (targetPl?.songIds?.length > 0) {
          setQueue(prev => [...targetPl.songIds, ...prev]);
          setToast({ message: `Playing ${targetPl.songIds.length} tracks next!`, type: 'success' });
        } else {
          setToast({ message: `This playlist is empty!`, type: 'error' });
        }
        closeMenu(); 
      }}>
        <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
      </div>

      <div className="context-item" onClick={() => { 
        if (targetPl?.songIds?.length > 0) {
          setQueue(prev => [...prev, ...targetPl.songIds]);
          setToast({ message: `Added ${targetPl.songIds.length} tracks to Queue!`, type: 'success' });
        } else {
          setToast({ message: `This playlist is empty!`, type: 'error' });
        }
        closeMenu(); 
      }}>
        <div className="item-content"><ListPlus size={16} /> <span>Add to queue</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      {/* Save/Remove for ReadyMade (Global) Playlists */}
      {targetPl?.isReadyMade && (
        <div className="context-item" onClick={async () => {
          closeMenu();
          const userId = currentUser?._id;
          try {
            const res = await fetch(`${API_BASE_URL}/api/playlists/${menu.id}/follow`, { 
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }), credentials: 'include'
            });
            if (res.ok) {
              const updatedPlaylist = await res.json();
              setUserPlaylists(prev => prev.map(p => p._id === menu.id ? updatedPlaylist : p));
              setToast({ message: isFollowed ? "Removed collection from library." : "Added collection to library!", type: 'success' });
              setTimeout(() => setToast(null), 3000);
            }
          } catch (err) { console.error(err); }
        }}>
          <div className="item-content">
            {isFollowed ? <X size={16} color="#10b981" /> : <Heart size={16} />}
            <span style={{ color: isFollowed ? '#10b981' : '#fff' }}>{isFollowed ? 'Remove from Your Library' : 'Save to Your Library'}</span>
          </div>
        </div>
      )}

      <div className="context-item" onClick={() => { setToast({ message: 'Downloading playlist...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Download size={16} /> <span>Download</span></div>
      </div>

      <div className="context-item submenu-parent">
        <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
          <div className="context-item" onClick={() => { copyToClipboard(`${window.location.origin}/playlist/${menu.id}`, setToast); closeMenu(); }}>
            <Link size={14} /> <span>Copy link to playlist</span>
          </div>
        </div>
      </div>

      {/* Admin / Owner Actions */}
      {(!targetPl?.isReadyMade || isAdmin) && (
        <>
          <div className="context-divider" style={{background: '#333'}} />
          <div className="context-item" onClick={() => { setTempName(targetPl?.name || ""); setSelectedPlaylist(menu.id); setIsEditingName(true); closeMenu(); }}>
            <div className="item-content"><SettingsIcon size={16} /> <span>Edit details</span></div>
          </div>
          <div className="context-item delete-text" onClick={() => { deletePlaylist(menu.id); closeMenu(); }}>
            <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span>Delete</span></div>
          </div>
        </>
      )}
    </>
  );
};

// ==========================================
// 2. ALBUM MENU SUB-COMPONENT
// ==========================================
const AlbumMenu = ({ props }) => {
  const { menu, closeMenu, setToast, navigate } = props;

  return (
    <>
      <div className="context-item" onClick={() => { setToast({ message: 'Fetching album tracks...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
      </div>

      <div className="context-item" onClick={() => { setToast({ message: 'Album added to queue!', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><ListPlus size={16} /> <span>Add to queue</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      <div className="context-item" onClick={() => { setToast({ message: 'Album saved to Library!', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Heart size={16} /> <span>Save to Your Library</span></div>
      </div>

      <div className="context-item" onClick={() => { setToast({ message: 'Downloading album...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Download size={16} /> <span>Download</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      <div className="context-item" onClick={() => { closeMenu(); navigate(`/album/${menu.id}`); }}>
        <div className="item-content"><Disc size={16} /> <span>Go to Album</span></div>
      </div>

      <div className="context-item" onClick={() => { setToast({ message: 'Navigating to Artist...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Mic2 size={16} /> <span>Go to Artist</span></div>
      </div>

      <div className="context-item submenu-parent">
        <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
          <div className="context-item" onClick={() => { copyToClipboard(`${window.location.origin}/album/${menu.id}`, setToast); closeMenu(); }}>
            <Link size={14} /> <span>Copy link to album</span>
          </div>
        </div>
      </div>
    </>
  );
};

// ==========================================
// 3. SONG MENU SUB-COMPONENT
// ==========================================
const SongMenu = ({ props }) => {
  const { 
    menu, closeMenu, userPlaylists, userData, setToast, handleAddToPlaylist, 
    handleRemoveFromPlaylist, handleDelete, toggleLike, playlist, setQueue, 
    selectedPlaylist, isAdmin, activeCategory, navigate
  } = props;

  const currentSong = playlist.find(s => s._id === menu.id);

  return (
    <>
      <div className="context-item" onClick={() => { 
        if (currentSong) setQueue(prev => [currentSong, ...prev]);
        closeMenu();
      }}>
        <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
      </div>

      <div className="context-item" onClick={() => { 
        if (currentSong) setQueue(prev => [...prev, currentSong]);
        closeMenu();
      }}>
        <div className="item-content"><ListPlus size={16} /> <span>Add to Queue</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      <div className="context-item submenu-parent">
        <div className="item-content"><FolderPlus size={16} /> <span>Add to Playlist</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{ maxHeight: '200px', overflowY: 'auto', background: '#121212', border: '1px solid #333' }}>
          <div style={{ padding: '6px 12px', fontSize: '10px', color: '#64748b', fontWeight: '800', letterSpacing: '1px' }}>YOUR PLAYLISTS</div>
          {userPlaylists.filter(pl => !pl.isReadyMade).map(pl => (
            <div key={pl._id} className="context-item" onClick={() => { handleAddToPlaylist(menu.id, pl._id); closeMenu(); }}>
              <span>{pl.name}</span>
            </div>
          ))}

          {isAdmin && (
            <>
              <div style={{ height: '1px', background: '#333', margin: '4px 0' }} />
              <div style={{ padding: '6px 12px', fontSize: '10px', color: '#10b981', fontWeight: '800', letterSpacing: '1px' }}>CURATED SHELVES</div>
              {userPlaylists.filter(pl => pl.isReadyMade).map(pl => (
                <div key={pl._id} className="context-item" onClick={() => { handleAddToPlaylist(menu.id, pl._id); closeMenu(); }}>
                  <span style={{ color: '#34d399' }}>{pl.name}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedPlaylist && (() => {
        const activePlObj = userPlaylists.find(p => p._id === selectedPlaylist);
        if (activePlObj && (!activePlObj.isReadyMade || isAdmin)) {
          return (
            <div className="context-item delete-text" onClick={() => { handleRemoveFromPlaylist(menu.id, selectedPlaylist); closeMenu(); }}>
              <div className="item-content"><Trash2 size={16} color="#10b981" /> <span>Remove from this playlist</span></div>
            </div>
          );
        }
        return null;
      })()}

      <div className="context-item" onClick={(e) => { toggleLike(menu.id, e); closeMenu(); }}>
        <div className="item-content">
          <Heart size={16} fill={userData?.likedSongs?.includes(menu.id) ? "#10b981" : "none"} color="#10b981" /> 
          <span>{userData?.likedSongs?.includes(menu.id) ? 'Remove from Likes' : 'Save to Liked Songs'}</span>
        </div>
      </div>

      <div className="context-item" onClick={() => { setToast({ message: 'Downloading song...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Download size={16} /> <span>Download</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      {currentSong?.albumId && (
        <div className="context-item" onClick={() => { closeMenu(); navigate(`/album/${currentSong.albumId._id || currentSong.albumId}`); }}>
          <div className="item-content"><Disc size={16} /> <span>Go to Album</span></div>
        </div>
      )}

      <div className="context-item" onClick={() => { setToast({ message: 'Navigating to Artist...', type: 'success' }); closeMenu(); }}>
        <div className="item-content"><Mic2 size={16} /> <span>Go to Artist</span></div>
      </div>

      <div className="context-item submenu-parent">
        <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
          <div className="context-item" onClick={() => { copyToClipboard(`${window.location.origin}?track=${menu.id}`, setToast); closeMenu(); }}>
            <Link size={14} /> <span>Copy Song Link</span>
          </div>
        </div>
      </div>

      {isAdmin && activeCategory === 'All' && !selectedPlaylist && (
        <>
          <div className="context-divider" style={{background: '#333'}} />
          <div className="context-item delete-text" onClick={() => { handleDelete(menu.id); closeMenu(); }}>
            <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span style={{ color: '#ef4444' }}>Delete Permanently</span></div>
          </div>
        </>
      )}
    </>
  );
};

// ==========================================
// 4. MAIN COMPONENT EXPORT
// ==========================================
export default function ContextMenu(props) {
  const { menu, closeMenu, userPlaylists, currentUser } = props;
  const { playlist, setQueue, selectedPlaylist } = usePlayer();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role === 'admin';

  if (!menu) return null;

  // Bundle all props together to pass cleanly to sub-components
  const extendedProps = { ...props, playlist, setQueue, selectedPlaylist, isAdmin, navigate };

  return (
    <div 
      onClick={closeMenu} 
      style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
      onContextMenu={(e) => { e.preventDefault(); closeMenu(); }} 
    >
      <div 
        className={`glass-context-menu ${menu.alignLeft ? 'align-left' : ''}`}
        style={{ position: 'absolute', top: menu.y, left: menu.x, zIndex: 9999, background: '#121212', border: '1px solid #333' }}
        onClick={(e) => e.stopPropagation()} 
      >
        {menu.type === 'album' && (
          <AlbumMenu props={extendedProps} />
        )}

        {menu.type === 'playlist' && (
          <PlaylistMenu props={extendedProps} targetPl={userPlaylists.find(pl => pl._id === menu.id)} />
        )}

        {menu.type === 'song' && (
          <SongMenu props={extendedProps} />
        )}

        {menu.type === 'sidebar-empty' && (
          <>
            <div className="context-item" onClick={() => { props.handleCreatePlaylistInline(); closeMenu(); }}>
              <div className="item-content"><Plus size={16} /> <span>Create playlist</span></div>
            </div>
            <div className="context-item" onClick={() => closeMenu()}>
              <div className="item-content"><Folder size={16} /> <span>Create folder</span></div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
import React from 'react';
import { 
  SkipForward, X, PlusCircle, ListMusic, User, FolderPlus, 
  Share2, Link, ChevronRight, Trash2, Heart, Plus, Folder, 
  SettingsIcon 
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { API_BASE_URL } from '../config';

// ⚡ Helper for safe clipboard access (prevents crashes on non-HTTPS connections)
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

  if (targetPl.isReadyMade) {
    const isFollowed = targetPl.followers?.includes(currentUser?._id);
    return (
      <>
        <div className="context-item" onClick={async () => {
          closeMenu();
          const userId = currentUser?._id;
          try {
            const res = await fetch(`${API_BASE_URL}/api/playlists/${menu.id}/follow`, { 
              method: 'PATCH', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ userId }),
              credentials: 'include'
            });
            if (res.ok) {
              const updatedPlaylist = await res.json();
              setUserPlaylists(prev => prev.map(p => p._id === menu.id ? updatedPlaylist : p));
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

        <div className="context-item" onClick={() => { 
          if (targetPl && targetPl.songIds && targetPl.songIds.length > 0) {
            setQueue(prev => [...prev, ...targetPl.songIds]);
            setToast({ message: `Added ${targetPl.songIds.length} tracks to Queue!`, type: 'success' });
            setTimeout(() => setToast(null), 3000);
          } else {
            setToast({ message: `This playlist is empty!`, type: 'error' });
            setTimeout(() => setToast(null), 3000);
          }
          closeMenu(); 
        }}>
          <div className="item-content"><ListMusic size={16} /> <span>Add to queue</span></div>
        </div>

        <div className="context-item submenu-parent">
          <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
          <ChevronRight size={14} opacity={0.5} />
          <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
            <div className="context-item" onClick={() => { 
              copyToClipboard(`${window.location.origin}?playlist=${menu.id}`, setToast); 
              closeMenu(); 
            }}>
              <Link size={14} /> <span>Copy link to playlist</span>
            </div>
          </div>
        </div>

        {isAdmin && menu.source === 'home' && (
          <>
            <div className="context-divider" style={{background: '#333'}} />
            <div className="context-item delete-text" onClick={() => { deletePlaylist(menu.id); closeMenu(); }}>
              <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Delete Playlist</span></div>
            </div>
            <div className="context-item" style={{ color: '#10b981' }} onClick={async () => {
              const name = prompt("Enter a name for this Playlist:");
              if (!name) return;
              const category = prompt("Enter Category Group:", "Trending Now");
              closeMenu();
              if (!category) return;
              try {
                const res = await fetch(`${API_BASE_URL}/api/playlists/curated`, { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ name, userId: currentUser?._id, category: category.trim() }),
                  credentials: 'include'
                });
                if (res.ok) {
                  const newCuratedDeck = await res.json();
                  setUserPlaylists(prev => [...prev, newCuratedDeck]);
                  setToast({ message: `"${name}" added to "${category}" shelf!`, type: 'success' });
                  setTimeout(() => setToast(null), 3000);
                }
              } catch (err) { console.error(err); }
            }}>
              <div className="item-content"><PlusCircle size={16} color="#10b981" /> <span>Create Playlist</span></div>
            </div>
          </>
        )}
      </>
    );
  }

  // Regular User Playlist
  return (
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
        closeMenu(); 
      }}>
        <div className="item-content"><ListMusic size={16} /> <span>Add to queue</span></div>
      </div>

      <div className="context-item" onClick={() => { setTempName(targetPl.name || ""); setSelectedPlaylist(menu.id); setIsEditingName(true); closeMenu(); }}>
        <div className="item-content"><SettingsIcon size={16} /> <span>Edit details</span></div>
      </div>

      <div className="context-item delete-text" onClick={() => { deletePlaylist(menu.id); closeMenu(); }}>
        <div className="item-content"><Trash2 size={16} color="#ef4444" /> <span>Delete</span></div>
      </div>

      <div className="context-divider" style={{background: '#333'}} />

      <div className="context-item submenu-parent">
        <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
          <div className="context-item" onClick={() => { 
            copyToClipboard(`${window.location.origin}?playlist=${menu.id}`, setToast); 
            closeMenu(); 
          }}>
            <Link size={14} /> <span>Copy link to playlist</span>
          </div>
        </div>
      </div>

      {menu.source === 'sidebar' && (
        <>
          <div className="context-divider" style={{background: '#333'}} />
          <div className="context-item" onClick={() => { handleCreatePlaylistInline(); closeMenu(); }}>
            <div className="item-content"><Plus size={16} /> <span>Create playlist</span></div>
          </div>
          <div className="context-item" onClick={() => closeMenu()}>
            <div className="item-content"><Folder size={16} /> <span>Create folder</span></div>
          </div>
        </>
      )}
    </>
  );
};

// ==========================================
// 2. SONG MENU SUB-COMPONENT
// ==========================================
const SongMenu = ({ props }) => {
  const { 
    menu, closeMenu, userPlaylists, userData, setToast, handleAddToPlaylist, 
    handleRemoveFromPlaylist, handleDelete, toggleLike, playlist, setQueue, 
    selectedPlaylist, isAdmin, activeCategory 
  } = props;

  return (
    <>
      <div className="context-item" onClick={() => { 
        const songToAdd = playlist.find(s => s._id === menu.id);
        if (songToAdd) setQueue(prev => [songToAdd, ...prev]);
        closeMenu();
      }}>
        <div className="item-content"><SkipForward size={16} /> <span>Play Next</span></div>
      </div>

      <div className="context-item" onClick={() => { 
        const songToAdd = playlist.find(s => s._id === menu.id);
        if (songToAdd) setQueue(prev => [...prev, songToAdd]);
        closeMenu();
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

      <div className="context-item" onClick={(e) => { toggleLike(menu.id, e); closeMenu(); }}>
        <div className="item-content">
          <Heart size={16} fill={userData?.likedSongs?.includes(menu.id) ? "#10b981" : "none"} color="#10b981" /> 
          <span>{userData?.likedSongs?.includes(menu.id) ? 'Remove from Likes' : 'Save to Liked Songs'}</span>
        </div>
      </div>

      {selectedPlaylist && (() => {
        const activePlObj = userPlaylists.find(p => p._id === selectedPlaylist);
        if (!activePlObj) return null;
        const canModifyTracks = !activePlObj.isReadyMade || isAdmin;
        if (canModifyTracks) {
          return (
            <div className="context-item delete-text" onClick={() => { handleRemoveFromPlaylist(menu.id, selectedPlaylist); closeMenu(); }}>
              <div className="item-content"><Trash2 size={16} color="#10b981" /> <span>Remove from this playlist</span></div>
            </div>
          );
        }
        return null;
      })()}

      <div className="context-divider" style={{background: '#333'}} />

      <div className="context-item" onClick={() => closeMenu()}>
        <div className="item-content"><User size={16} /> <span>Go to Artist</span></div>
      </div>

      <div className="context-item submenu-parent">
        <div className="item-content"><Share2 size={16} /> <span>Share</span></div>
        <ChevronRight size={14} opacity={0.5} />
        <div className="glass-submenu" style={{background: '#121212', border: '1px solid #333'}}>
          <div className="context-item" onClick={() => { 
            copyToClipboard(`${window.location.origin}?track=${menu.id}`, setToast); 
            closeMenu(); 
          }}>
            <Link size={14} /> <span>Copy Link</span>
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
// 3. MAIN COMPONENT EXPORT
// ==========================================
export default function ContextMenu(props) {
  const { menu, closeMenu, userPlaylists, currentUser } = props;
  const { playlist, setQueue, selectedPlaylist } = usePlayer();
  const isAdmin = currentUser?.role === 'admin';

  if (!menu) return null;

  // Bundle all props together to pass cleanly to sub-components
  const extendedProps = { ...props, playlist, setQueue, selectedPlaylist, isAdmin };

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
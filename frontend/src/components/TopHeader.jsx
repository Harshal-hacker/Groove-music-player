import React, { useState, useRef, useEffect } from 'react';
import { Home, Search, User, Settings as SettingsIcon, ShieldCheck, ArrowLeft, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext';

export default function TopHeader({
  activeCategory,
  setActiveCategory,
  selectedPlaylist,
  setShowLikedOnly,
  setIsSearchOpen,
  searchQuery,
  setSearchQuery,
  onLogout,
  setToast
}) {
  const navigate = useNavigate();
  const { currentUser } = usePlayer();
  const isAuthenticated = !!currentUser;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);
  const avatarRef = useRef(null);

  // Moves the click-outside logic here!
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && userMenuRef.current && !userMenuRef.current.contains(e.target) && avatarRef.current && !avatarRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const getUserInitial = () => {
    if (currentUser?.email) return currentUser.email.charAt(0).toUpperCase();
    return "?"; 
  };

  return (
    <header style={{ 
      height: '64px', display: 'flex', alignItems: 'center', padding: '0 16px',
      backgroundColor: '#121212', border: '1px solid #222', borderRadius: '16px',
      flexShrink: 0, zIndex: 1000
    }}>
      <div style={{ flex: '0 0 auto', marginRight: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '-1px', color: '#10b981', margin: 0 }}>GROOVE</h2>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
        <div 
          onClick={() => { setShowLikedOnly(false); setActiveCategory('All'); navigate('/'); }} 
          style={{ 
            width: '40px', height: '40px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s ease',
            backgroundColor: (activeCategory === 'All' && !selectedPlaylist) ? '#ffffff' : '#0a0a0a',
            color: (activeCategory === 'All' && !selectedPlaylist) ? '#000' : '#fff',
            border: '1px solid #333'
          }}
        >
          <Home size={20} fill={(activeCategory === 'All' && !selectedPlaylist) ? "black" : "none"} />
        </div>

        <div 
          onClick={() => setIsSearchOpen(true)}
          style={{ 
            width: '100%', maxWidth: '360px', padding: '10px 16px', borderRadius: '50px', border: '1px solid #333', 
            backgroundColor: '#0a0a0a', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer', transition: '0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'}
          onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Search size={16} color="#10b981" />
            <span style={{ fontSize: '13px', fontWeight: '600' }}>Search tracks, artists...</span>
          </div>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', color: '#fff' }}>
            Ctrl K
          </div>
        </div>
      </div>

      <div style={{ flex: '0 0 auto', display: 'flex', gap: '15px', alignItems: 'center' }}>
        {!isAuthenticated ? (
          <>
            <button onClick={() => navigate('/signup')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Sign Up</button>
            <button onClick={() => navigate('/login')} style={{ backgroundColor: 'white', color: 'black', padding: '8px 20px', borderRadius: '50px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Log In</button>
          </>
        ) : (
          <>
            <div 
              ref={avatarRef} onClick={() => setShowUserMenu(!showUserMenu)}
              style={{ 
                width: '36px', height: '36px', borderRadius: '50px', background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: '900', fontSize: '14px', color: '#000',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)', transition: '0.3s', border: '1px solid rgba(255,255,255,0.2)'
              }}
            >
              {getUserInitial()}
            </div>

            {showUserMenu && (
              <div ref={userMenuRef} style={{ position: 'absolute', top: '70px', right: '16px', width: '260px', backgroundColor: '#121212', borderRadius: '20px', padding: '20px', zIndex: 2000, border: '1px solid #333', boxShadow: '0 30px 60px rgba(0,0,0,0.9)', animation: 'ultraFade 0.2s cubic-bezier(0.22, 1, 0.36, 1)' }}>
                <div style={{ background: '#0a0a0a', borderRadius: '16px', padding: '12px', border: '1px solid #222', marginBottom: '16px', textAlign: 'center' }}>
                  {/* Look for the green circle avatar and the text right below it */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#10b981', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '20px', fontWeight: 'bold', marginBottom: '10px'
                    }}>
                      {/* Avatar Letter */}
                      {(currentUser?.profileName || currentUser?.email || 'U')[0].toUpperCase()}
                    </div>
                    
                    {/* ⚡ THE FIX: Tell it to use profileName first, and fallback to email prefix if missing */}
                    <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>
                      {currentUser?.profileName || currentUser?.email?.split('@')[0]}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
                  <div className="ultra-action-circle" onClick={() => { setShowUserMenu(false); navigate('/profile'); }} style={{ cursor: 'pointer', width: '36px', height: '36px' }}><User size={16} /></div>
                  <div className="ultra-action-circle" onClick={() => { setShowUserMenu(false); navigate('/settings'); }} style={{ cursor: 'pointer', width: '36px', height: '36px' }}><SettingsIcon size={16} /></div>
                  <div className="ultra-action-circle" onClick={() => { setShowUserMenu(false); navigate('/account'); }} style={{ cursor: 'pointer', width: '36px', height: '36px' }}><User size={16} /></div>
                  <div className="ultra-action-circle" onClick={() => { setShowUserMenu(false); setToast({ message: "Privacy locked.", type: "error" }); setTimeout(() => setToast(null), 3000); }} style={{ cursor: 'pointer', width: '36px', height: '36px' }}><ShieldCheck size={16} /></div>  
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div className="ultra-menu-item" onClick={() => { setShowUserMenu(false); navigate('/profile'); }} style={{ cursor: 'pointer', padding: '10px 12px', fontSize: '13px' }}><span>Public Profile</span><ArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.3 }} size={14} /></div>
                  <div className="ultra-menu-item" onClick={() => { setShowUserMenu(false); navigate('/settings'); }} style={{ cursor: 'pointer', padding: '10px 12px', fontSize: '13px' }}><span>Privacy Settings</span><ArrowLeft style={{ transform: 'rotate(180deg)', opacity: 0.3 }} size={14} /></div>
                </div>

                <div style={{ height: '1px', background: '#333', margin: '12px 0' }} />

                <button onClick={onLogout} className="ultra-logout-btn" style={{ cursor: 'pointer', padding: '10px', fontSize: '12px' }}>
                  <LogOut size={14} /><span>LOGOUT</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </header> 
  );
}
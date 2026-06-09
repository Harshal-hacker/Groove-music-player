import React from 'react';
import { User, Heart, ListMusic, ShieldCheck, Clock, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../context/PlayerContext'; // <-- 1. IMPORT THE CONTEXT

export default function Profile({ userData, userPlaylists, playlist, setCurrentTrackIndex, setIsPlaying, setPlaybackContext }) {
  const navigate = useNavigate();
  
  // 2. GRAB THE SECURE USER STATE
  const { currentUser } = usePlayer(); 
  
  // 3. REPLACE LOCAL STORAGE WITH CONTEXT
  const userEmail = currentUser?.email || "Guest";
  const initial = userEmail.charAt(0).toUpperCase();

  // Filter the global playlist to find the user's actual liked songs
  const likedTracks = playlist.filter(song => userData?.likedSongs?.includes(song._id));
  
  // 4. USE CURRENTUSER._ID FOR PLAYLIST FILTERING
  const myPlaylists = userPlaylists.filter(pl => !pl.isReadyMade && pl.createdBy === currentUser?._id);

  return (
    <main style={{ 
      flex: 1, overflowY: 'auto', backgroundColor: '#121212', borderRadius: '24px', 
      border: '1px solid #222', padding: '30px', position: 'relative'
    }} className="bento-scrollbar">
      
      {/* 1. Profile Header (The Banner) */}
      <div style={{ 
        display: 'flex', alignItems: 'flex-end', gap: '24px', paddingBottom: '30px', 
        borderBottom: '1px solid #333', marginBottom: '30px'
      }}>
        <div style={{ 
          width: '150px', height: '150px', borderRadius: '50%', 
          background: 'linear-gradient(45deg, #10b981, #34d399)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '64px', fontWeight: '900', color: '#000',
          boxShadow: '0 0 50px rgba(16, 185, 129, 0.3)', border: '4px solid #121212'
        }}>
          {initial}
        </div>
        
        <div style={{ paddingBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '1px', color: '#10b981', textTransform: 'uppercase' }}>
              Profile
            </span>
            {/* USE CURRENTUSER FOR ROLE CHECK */}
            {currentUser?.role === 'admin' && (
              <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '50px', fontSize: '10px', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={12} /> ADMIN
              </span>
            )}
          </div>
          <h1 style={{ fontSize: '48px', fontWeight: '900', color: '#fff', margin: '0 0 10px 0', letterSpacing: '-1px' }}>
            {userEmail.split('@')[0]}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600', margin: 0 }}>
            {myPlaylists.length} Public Playlists • {likedTracks.length} Liked Songs
          </p>
        </div>
      </div>

      {/* 2. Stats Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div onClick={() => navigate('/')} style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'} onMouseOut={(e) => e.currentTarget.style.borderColor = '#222'}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 0 4px 0' }}>{likedTracks.length}</h3>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', margin: 0 }}>Saved Tracks</p>
          </div>
        </div>

        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListMusic size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 0 4px 0' }}>{myPlaylists.length}</h3>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', margin: 0 }}>Collections Created</p>
          </div>
        </div>

        <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#fff', margin: '0 0 4px 0' }}>Active</h3>
            <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', margin: 0 }}>Account Status</p>
          </div>
        </div>
      </div>

      {/* 3. Top Tracks Preview */}
      {likedTracks.length > 0 && (
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>Your Top Liked Tracks</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {likedTracks.slice(0, 5).map((track, index) => (
              <div 
                key={track._id}
                onClick={() => {
                  setPlaybackContext(likedTracks);
                  setCurrentTrackIndex(likedTracks.findIndex(p => p._id === track._id)); 
                  setIsPlaying(true);
                }}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px', 
                  background: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', cursor: 'pointer', transition: '0.2s' 
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.borderColor = '#333'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#0a0a0a'; e.currentTarget.style.borderColor = '#222'; }}
              >
                <div style={{ color: '#64748b', fontWeight: '800', fontSize: '14px', width: '20px' }}>{index + 1}</div>
                <img src={track.cover || "/Groove.png"} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#fff' }}>{track.title}</div>
                  <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>{track.artist}</div>
                </div>
                <Play size={18} color="#10b981" />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
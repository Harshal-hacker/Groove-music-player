import React from 'react';
import { User, Volume2, Shield, Bell, Monitor, Key, Trash2 } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';

// A premium custom toggle switch component
const Toggle = ({ active, onClick }) => (
  <div 
    onClick={onClick}
    style={{
      width: '44px', height: '24px', borderRadius: '12px',
      background: active ? '#10b981' : '#333',
      position: 'relative', cursor: 'pointer', transition: 'background 0.3s ease'
    }}
  >
    <div style={{
      width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
      position: 'absolute', top: '2px', left: active ? '22px' : '2px',
      transition: 'left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', 
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }} />
  </div>
);

export default function Settings({ handleLogout }) {
  // 1. PULL EVERYTHING FROM CONTEXT FIRST
  const {
    currentUser, // <-- Added currentUser here
    highQuality, setHighQuality,
    normalizeVolume, setNormalizeVolume,
    crossfade, setCrossfade,
    privateProfile, setPrivateProfile,
    explicitContent, setExplicitContent
  } = usePlayer();

  // 2. DERIVE LOCAL VARIABLES
  const userEmail = currentUser?.email || "Guest User";

  // Helper for rendering a settings row
  const SettingRow = ({ icon: Icon, title, description, control }) => (
    <div style={{ 
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
      padding: '16px 0', borderBottom: '1px solid #222'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
          <Icon size={20} />
        </div>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#fff' }}>{title}</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>{description}</p>
        </div>
      </div>
      <div>{control}</div>
    </div>
  );

  return (
    <main style={{ 
      flex: 1, overflowY: 'auto', backgroundColor: '#121212', borderRadius: '24px', 
      border: '1px solid #222', padding: '30px', position: 'relative'
    }} className="bento-scrollbar">
      
      {/* Header */}
      <div style={{ paddingBottom: '24px', borderBottom: '1px solid #333', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', color: '#fff', margin: '0 0 8px 0', letterSpacing: '-1px' }}>Settings</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600', margin: 0 }}>Manage your preferences, account details, and playback options.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', maxWidth: '800px' }}>
        
        {/* Account Section */}
        <section>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Account</h3>
          <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '0 24px' }}>
            <SettingRow 
              icon={User} title="Email Address" description={userEmail}
              control={<button style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '6px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Edit</button>}
            />
            <SettingRow 
              icon={Key} title="Password" description="Change your security credentials"
              control={<button style={{ background: 'transparent', border: '1px solid #444', color: '#fff', padding: '6px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Update</button>}
            />
          </div>
        </section>

        {/* Audio & Playback Section */}
        <section>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Audio & Playback</h3>
          <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '0 24px' }}>
            <SettingRow 
              icon={Volume2} title="High Quality Audio" description="Stream and download in 320kbps when available"
              control={<Toggle active={highQuality} onClick={() => setHighQuality(!highQuality)} />}
            />
            <SettingRow 
              icon={Monitor} title="Normalize Volume" description="Set the same volume level for all tracks"
              control={<Toggle active={normalizeVolume} onClick={() => setNormalizeVolume(!normalizeVolume)} />}
            />
            <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}><Volume2 size={20} /></div>
                 <div>
                   <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#fff' }}>Crossfade</h4>
                   <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Allow smooth transitions between songs</p>
                 </div>
               </div>
               
               {/* UPDATE THE CROSSFADE SLIDER */}
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '800', width: '20px' }}>{crossfade}s</span>
                 <input 
                   type="range" min="0" max="12" 
                   value={crossfade} 
                   onChange={(e) => setCrossfade(Number(e.target.value))} 
                   style={{ width: '100px', accentColor: '#10b981', cursor: 'pointer' }} 
                 />
               </div>

            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#10b981', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Privacy & Social</h3>
          <div style={{ background: '#0a0a0a', border: '1px solid #222', borderRadius: '20px', padding: '0 24px' }}>
            <SettingRow 
              icon={Shield} title="Private Profile" description="Hide your listening activity and public playlists"
              control={<Toggle active={privateProfile} onClick={() => setPrivateProfile(!privateProfile)} />}
            />
            <SettingRow 
              icon={Bell} title="Allow Explicit Content" description="Turn on to play explicit rated tracks"
              control={<Toggle active={explicitContent} onClick={() => setExplicitContent(!explicitContent)} />}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h3 style={{ fontSize: '12px', fontWeight: '900', color: '#ef4444', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Danger Zone</h3>
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '20px', padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(239, 68, 68, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}><Trash2 size={20} /></div>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700', color: '#fff' }}>Delete Account</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Permanently remove your account and data.</p>
                </div>
              </div>
              <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: '800', cursor: 'pointer' }}>DELETE</button>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
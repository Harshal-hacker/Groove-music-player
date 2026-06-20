import React, { useState } from 'react';
import { Globe, Apple, ArrowLeft, Headphones, Loader2, Eye, EyeOff } from 'lucide-react'; // ⚡ ADDED EYE ICONS
import { useNavigate } from 'react-router-dom';
import { usePlayer } from './context/PlayerContext';
import { API_BASE_URL } from './config';
import { useGoogleLogin } from '@react-oauth/google';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // ⚡ ADDED: Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  
  const { setCurrentUser } = usePlayer();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // 1. Perform the normal login check
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData), 
        credentials: 'include' // Accepts the HTTP-only cookie
      });

      const data = await response.json();

      if (response.ok) {
        // 2. THE FIX: The password worked! Now instantly fetch the full profile data.
        const profileResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include'
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          // Set the FULL user object (which includes activeSession!)
          setCurrentUser(profileData.user);
        } else {
          // Fallback just in case the profile fetch fails
          setCurrentUser({ _id: data.userId, email: formData.email, role: data.role });
        }
        
        // 3. Send to player
        navigate('/'); 
      } else {
        alert(data.message || "Invalid Email or Password");
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      alert("Login failed. Check if your server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Send the Google token to the new Express route we just built
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: tokenResponse.access_token }),
          credentials: 'include'
        });

        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
          navigate('/'); // Boom! Logged into Groove via Google.
        }
      } catch (err) {
        console.error(err);
      }
    },
  });
  
  return (
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      <button 
        onClick={() => navigate('/')}
        style={{ 
          position: 'absolute', top: '30px', left: '30px', zIndex: 100, 
          background: '#121212', border: '1px solid #222', 
          borderRadius: '50px', padding: '10px 20px', color: '#fff', cursor: 'pointer', 
          display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', 
          fontSize: '13px', transition: 'all 0.3s ease' 
        }}
        onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'}
        onMouseOut={(e) => e.currentTarget.style.background = '#121212'}
      >
        <ArrowLeft size={18} /> <span className="mobile-hide">BACK TO GROOVE</span>
      </button>

      <div className="auth-visual-side" style={{ flex: 1.2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '60px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.3), #000), url("https://res.cloudinary.com/ducrlh5lv/image/upload/v1779566951/Login_Page_fuexbz.png")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '20px' }}>
            <Headphones size={32} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px' }}>GROOVE</span>
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1.1', maxWidth: '450px' }}>
            Welcome back to the <span style={{ color: '#10b981' }}>studio.</span>
          </h2>
        </div>
      </div>

      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ 
          width: '100%', maxWidth: '460px', padding: '45px', backgroundColor: '#121212', 
          borderRadius: '24px', border: '1px solid #222', boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          
          <div style={{ marginBottom: '25px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0' }}>Log in</h1>
            <div style={{ height: '4px', width: '100%', background: '#10b981', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={() => loginWithGoogle()} // ⚡ Triggers the Google Pop-up
              type="button"
              style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', 
                width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', 
                borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', 
                cursor: 'pointer', transition: '0.2s' 
              }} 
              onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} 
              onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}
            >
              <Globe size={18} /> Continue with Google
            </button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }}>
              <Apple size={18} /> Continue with Apple
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#333' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Email</label>
              <input 
                type="text" placeholder="name@domain.com" required value={formData.email} 
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
              />
            </div>

            {/* ⚡ UPDATED: Password Field with Toggle */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" required value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  style={{ 
                    width: '100%', padding: '16px 50px 16px 20px', // Extra right padding for the icon
                    background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', 
                    color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' 
                  }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '16px', background: 'transparent', border: 'none', 
                    color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', transition: '0.2s' 
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              <div style={{ marginTop: '8px', textAlign: 'right' }}>
                <span 
                  onClick={() => navigate('/forgot-password')}
                  style={{ color: '#64748b', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
                >
                  Forgot password?
                </span>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Log In"}
            </button>
          </form>

          <p style={{ marginTop: '25px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            Don't have an account? <span onClick={() => navigate('/signup')} style={{ color: '#fff', cursor: 'pointer', fontWeight: '800', marginLeft: '5px' }}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
import React, { useState } from 'react';
import { Mail, Lock, Globe, Apple, ArrowLeft, Headphones, Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';

function Login({ onBackToSignup, onLoginSuccess, onBackToPlayer }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('role', data.role); // Corrected from data.user.role
        
        onLoginSuccess(data.role); // Corrected from data.user.role
      } else {
        alert(data.message || "Invalid Email or Password");
      }
    } catch (err) {
      alert("Login failed. Check if your server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="split-auth-container" style={{ 
      height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative'
    }}>

      {/* FLOATING BACK BUTTON - Now on the Left */}
      <button 
        onClick={onBackToPlayer} // Use the prop that takes user back to the main app
        className="auth-floating-back"
        style={{
          position: 'absolute', top: '30px', left: '30px', zIndex: 100,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '50px', padding: '10px 20px', color: '#fff', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px',
          backdropFilter: 'blur(10px)', transition: '0.3s'
        }}
      >
        <ArrowLeft size={18} /> <span className="mobile-hide">BACK</span>
      </button>

      {/* LEFT SIDE: BRAND VISUAL */}
      <div className="auth-visual-side" style={{ 
        flex: 1.2, position: 'relative', overflow: 'hidden', display: 'flex', 
        alignItems: 'flex-end', padding: '60px' 
      }}>
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: 'linear-gradient(rgba(0,0,0,0.3), #000), url("https://res.cloudinary.com/ducrlh5lv/image/upload/v1779566951/Login_Page_fuexbz.png")', 
          backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 
        }} />
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '20px' }}>
            <Headphones size={32} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px' }}>GROOVE</span>
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1', maxWidth: '450px' }}>
            Welcome back to the <span style={{ color: '#10b981' }}>studio.</span>
          </h2>
        </div>
      </div>

      {/* RIGHT SIDE: LOGIN FORM */}
      <div className="auth-form-side" style={{ 
        flex: 1, backgroundColor: '#0a0a0a', display: 'flex', 
        justifyContent: 'center', alignItems: 'center', padding: '40px' 
      }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900' }}>Log in</h1>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="auth-social-outline"><Globe size={18} /> Continue with Google</button>
            <button className="auth-social-outline"><Apple size={18} /> Continue with Apple</button>
          </div>

          <div className="auth-divider-container" style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '30px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block' }}>Email</label>
              <input 
                type="text" 
                placeholder="Email" 
                required 
                value={formData.email} // ADD THIS
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} // ADD THIS
                style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }} 
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block' }}>Password</label>
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={formData.password} // ADD THIS
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} // ADD THIS
                style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }} 
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="emerald-pill" style={{ 
              padding: '18px', borderRadius: '50px', background: '#10b981', 
              border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Log In"}
            </button>
          </form>

          <p style={{ marginTop: '30px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
            Don't have an account? <span onClick={onBackToSignup} style={{ color: '#fff', textDecoration: 'underline', cursor: 'pointer', fontWeight: '700' }}>Sign up for Groove</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
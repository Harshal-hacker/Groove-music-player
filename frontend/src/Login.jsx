import React, { useState } from 'react';
import { Globe, Apple, ArrowLeft, Headphones, Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';

function Login({ onBackToSignup, onLoginSuccess, onBackToPlayer, onForgotPassword }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        localStorage.setItem('role', data.role);
        onLoginSuccess(data.role); 
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
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      {/* Solid Bento Back Button */}
      <button 
        onClick={onBackToPlayer} 
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

      {/* Visual Side */}
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

      {/* Form Side - Solid Black Background for Bento Contrast */}
      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        
        {/* THE SOLID BENTO CARD - Margins and gaps match SignUp height */}
        <div style={{ 
          width: '100%', maxWidth: '460px', padding: '45px', 
          backgroundColor: '#121212', 
          borderRadius: '24px', border: '1px solid #222', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          
          <div style={{ marginBottom: '25px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 12px 0' }}>Log in</h1>
            <div style={{ height: '4px', width: '100%', background: '#10b981', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}>
              <Globe size={18} /> Continue with Google
            </button>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}>
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
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Password</label>
              <input 
                type="password" placeholder="Password" required value={formData.password} 
                onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                onFocus={(e) => e.target.style.borderColor = '#10b981'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
              <div style={{ marginTop: '8px', textAlign: 'right' }}>
                <span 
                  onClick={onForgotPassword} 
                  style={{ color: '#64748b', fontSize: '12px', cursor: 'pointer', fontWeight: '700', transition: '0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#fff'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#64748b'}
                >
                  Forgot password?
                </span>
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', marginTop: '4px', transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
              {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Log In"}
            </button>
          </form>

          <p style={{ marginTop: '25px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            Don't have an account? <span onClick={onBackToSignup} style={{ color: '#fff', textDecoration: 'none', borderBottom: '1px solid #10b981', cursor: 'pointer', fontWeight: '800', marginLeft: '5px' }}>Sign up</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
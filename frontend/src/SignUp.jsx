import React, { useState } from 'react';
import { Mail, Smartphone, Globe, Apple, ArrowLeft, Loader2, Headphones } from 'lucide-react';
import { API_BASE_URL } from './config';

function SignUp({ onBackToLogin, onBackToPlayer }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        onBackToLogin();
      } else {
        setError(data.message || "Registration failed. Try a different email.");
      }
    } catch (err) {
      setError("Server is unreachable. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      <button 
        onClick={onBackToPlayer}
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

      <div className="auth-visual-side" style={{ flex: 1.2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '60px' }}>
        <img 
          src="https://res.cloudinary.com/ducrlh5lv/image/upload/v1779566952/SignUp_wbegl8.avif" 
          alt="Music Background"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5, zIndex: 1 }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 0%, #000 100%)', zIndex: 2 }} />
        <div style={{ position: 'relative', zIndex: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '20px' }}>
            <Headphones size={32} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px' }}>GROOVE</span>
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1', maxWidth: '400px' }}>
            The pulse of the <span style={{ color: '#10b981' }}>future</span> is here.
          </h2>
        </div>
      </div>

      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#0a0a0a', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '40px' }}>Sign up</h1>
          
          {/* DISPLAY ERROR MESSAGE IF IT EXISTS */}
          {error && <p style={{ color: '#ff4d4d', fontSize: '14px', marginBottom: '15px', fontWeight: 'bold' }}>{error}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button className="auth-social-outline"><Globe size={18} /> Continue with Google</button>
            <button className="auth-social-outline"><Apple size={18} /> Continue with Apple</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '30px 0' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* UPDATED FORM SECTION */}
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block' }}>Email</label>
              <input 
                type="email" 
                placeholder="Email" 
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} 
              />
            </div>

            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block' }}>Password</label>
              <input 
                type="password" 
                placeholder="Password" 
                required 
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }} 
              />
            </div>

            <button type="submit" className="emerald-pill" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Next"}
            </button>
          </form>

          <p style={{ marginTop: '30px', textAlign: 'center', color: '#64748b' }}>
            Already have an account? <span onClick={onBackToLogin} style={{ color: '#fff', textDecoration: 'underline', cursor: 'pointer' }}>Log in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
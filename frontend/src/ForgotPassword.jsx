import React, { useState } from 'react';
import { ArrowLeft, Headphones, Loader2, ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react'; // ⚡ ADDED EYE ICONS
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from './config';

function ForgotPassword() { // ⚡ REMOVED THE BROKEN PROP
  const navigate = useNavigate();
  const [step, setStep] = useState(1); 
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState('');
  
  // ⚡ ADDED: Password Visibility State
  const [showPassword, setShowPassword] = useState(false);

  // --- 1. Send the email code ---
  const handleSendCode = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        credentials: 'include' // <-- SECURED
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStep(2); 
      } else {
        alert(data.message || "Failed to send reset code. Please try again.");
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 2. Verify code and update password ---
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTokenError(''); 
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
        credentials: 'include' // <-- SECURED
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert("Password updated successfully! You can now log in.");
        navigate('/login'); 
      } else {
        setTokenError(data.message || "Invalid or expired code.");
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      {/* Solid Bento Back Button */}
      <button 
        onClick={step === 2 ? () => { setStep(1); setTokenError(''); } : () => navigate('/login')} // ⚡ FIXED ROUTING HERE
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
        <ArrowLeft size={18} /> <span className="mobile-hide">{step === 2 ? "GO BACK" : "BACK TO LOGIN"}</span>
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
            Lost your keys? <br />
            <span style={{ color: '#10b981' }}>Let's get you back in.</span>
          </h2>
        </div>
      </div>

      {/* Form Side */}
      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        
        <div style={{ 
          width: '100%', maxWidth: '460px', padding: '45px', 
          backgroundColor: '#121212', 
          borderRadius: '24px', border: '1px solid #222', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
          animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          
          <div style={{ marginBottom: '35px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
              <ShieldAlert size={28} color="#10b981" />
              <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>Account Recovery</h1>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
               <div style={{ height: '4px', flex: 1, background: '#10b981', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
               <div style={{ height: '4px', flex: 1, background: step === 2 ? '#10b981' : '#222', borderRadius: '4px', transition: 'all 0.4s ease', boxShadow: step === 2 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none' }}></div>
            </div>
          </div>

          {step === 1 ? (
            <div style={{ animation: 'ultraFade 0.4s ease' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px', fontWeight: '500' }}>
                Enter the email address associated with your account, and we will send you a secure 6-digit recovery code.
              </p>

              <form onSubmit={handleSendCode} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Email Address</label>
                  <input 
                    type="email" placeholder="name@domain.com" required 
                    value={email} onChange={(e) => setEmail(e.target.value)} 
                    style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#333'}
                  />
                </div>

                <button type="submit" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', marginTop: '10px', transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Send Recovery Code"}
                </button>
              </form>
            </div>
          ) : (
            <div style={{ animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px', fontWeight: '500' }}>
                We've sent a 6-digit code to <strong style={{color: '#fff'}}>{email}</strong>. Enter it below along with your new password.
              </p>

              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>6-Digit Recovery Code</label>
                  <input 
                    type="text" placeholder="e.g. A1B2C3" required maxLength="6"
                    value={token} 
                    onChange={(e) => {
                      setToken(e.target.value.toUpperCase());
                      if (tokenError) setTokenError(''); 
                    }} 
                    style={{ 
                      width: '100%', padding: '16px 20px', background: '#0a0a0a', 
                      border: tokenError ? '1px solid #ef4444' : '1px solid #333', 
                      borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '16px', 
                      letterSpacing: '4px', textAlign: 'center', fontWeight: '900', transition: '0.3s ease' 
                    }} 
                    onFocus={(e) => e.target.style.borderColor = tokenError ? '#ef4444' : '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = tokenError ? '#ef4444' : '#333'}
                  />
                  
                  {tokenError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '13px', marginTop: '10px', fontWeight: '600', animation: 'ultraFade 0.3s ease' }}>
                      <AlertCircle size={16} />
                      {tokenError}
                    </div>
                  )}
                </div>

                {/* ⚡ UPDATED: Password Field with Toggle */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>New Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="At least 6 characters" required minLength="6"
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)} 
                      style={{ 
                        width: '100%', padding: '16px 50px 16px 20px', 
                        background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', 
                        color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' 
                      }} 
                      onFocus={(e) => e.target.style.borderColor = '#10b981'}
                      onBlur={(e) => e.target.style.borderColor = '#333'}
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
                </div>

                <button type="submit" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', marginTop: '10px', transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Update Password"}
                </button>
              </form>
            </div>
          )}

          <p style={{ marginTop: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            Remembered your password? <span onClick={() => navigate('/login')} style={{ color: '#fff', textDecoration: 'none', borderBottom: '1px solid #10b981', cursor: 'pointer', fontWeight: '800', marginLeft: '5px' }}>Log in</span> {/* ⚡ FIXED ROUTING HERE */}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
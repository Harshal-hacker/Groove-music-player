import React, { useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';

function ForgotPassword({ onBackToLogin, onGoToReset }) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setIsSent(true);
      } else {
        // --- THE FIX IS HERE ---
        // Parse the JSON response from the server/rate-limiter to get the actual message
        const data = await response.json(); 
        alert(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      alert("Failed to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', background: '#0a0a0a', color: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <button onClick={onBackToLogin} style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50px', padding: '10px 20px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ArrowLeft size={18} /> Back to Login
      </button>

      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#000', borderRadius: '24px', border: '1px solid #222' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '10px' }}>Find Account</h2>
        
        {!isSent ? (
          <>
            <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>Enter your email to receive a secure recovery code.</p>
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <input 
                type="email" placeholder="Email Address" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }} 
              />
              <button type="submit" disabled={isSubmitting} style={{ padding: '16px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Send Code"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '12px', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '15px', color: '#fff', fontWeight: '600' }}>
                Check your inbox! We've sent a 6-digit recovery code to <strong style={{ color: '#10b981' }}>{email}</strong>.
              </p>
            </div>
            <button onClick={onGoToReset} style={{ width: '100%', padding: '16px', borderRadius: '50px', background: '#fff', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
              Enter Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
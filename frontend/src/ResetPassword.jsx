import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // <-- 1. IMPORT useNavigate
import { API_BASE_URL } from './config';

function ResetPassword({ onBackToLogin }) {
  const navigate = useNavigate(); // <-- 2. INITIALIZE NAVIGATE
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
        credentials: 'include' // <-- 3. SECURED: Send cookie
      });
      
      if (response.ok) {
        alert("Password updated! Please log in with your new password.");
        navigate('/login'); // <-- 4. FIXED: Changed 'Maps' to 'navigate'
      } else {
        const data = await response.json();
        alert(data.message || "Invalid or expired code.");
      }
    } catch (err) {
      alert("Error resetting password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0a0a0a', color: '#fff' }}>
      <form onSubmit={handleReset} style={{ width: '100%', maxWidth: '400px', padding: '40px', background: '#000', borderRadius: '24px', border: '1px solid #222' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '10px' }}>New Password</h2>
        <p style={{ color: '#64748b', marginBottom: '30px', fontSize: '14px' }}>Paste the recovery code and choose a new password.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          <input 
            type="text" placeholder="6-Digit Reset Code" required value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none', textTransform: 'uppercase' }} 
          />
          <input 
            type="password" placeholder="New Password" required value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #333', borderRadius: '8px', color: '#fff', outline: 'none' }} 
          />
        </div>

        <button type="submit" disabled={isSubmitting} style={{ width: '100%', padding: '16px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
          {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Update Password"}
        </button>
        
        <p onClick={onBackToLogin} style={{ marginTop: '20px', textAlign: 'center', color: '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: '700' }}>Cancel</p>
      </form>
    </div>
  );
}

export default ResetPassword;
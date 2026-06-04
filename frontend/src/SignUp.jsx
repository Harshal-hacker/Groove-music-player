import React, { useState } from 'react';
import { Globe, Apple, ArrowLeft, Headphones, Loader2, Calendar } from 'lucide-react';
import { API_BASE_URL } from './config';

function SignUp({ onBackToLogin, onBackToPlayer }) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Custom Gender Dropdown State ---
  const [showGenderMenu, setShowGenderMenu] = useState(false);
  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

  // --- NEW: Custom Calendar State ---
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  // Default the calendar to start 18 years ago for Date of Birth convenience
  const [calYear, setCalYear] = useState(new Date().getFullYear() - 18); 

  // --- Calendar Helper Variables ---
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 100}, (_, i) => currentYear - i);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    profileName: '',
    dob: '',
    gender: 'Prefer not to say'
  });

  const handleNext = (e) => {
    e.preventDefault();
    if (formData.email && formData.password.length >= 6) {
      setStep(2);
    } else {
      alert("Please enter a valid email and a password of at least 6 characters.");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('role', data.role);
        onBackToPlayer();
      } else {
        alert(data.message || "Failed to create account.");
        setStep(1); 
      }
    } catch (err) {
      alert("Network error. Make sure your backend server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handles clicking a day on the custom calendar
  const handleDateSelect = (day) => {
    const formattedDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData({ ...formData, dob: formattedDate });
    setShowDatePicker(false);
  };

  return (
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      {/* Solid Bento Back Button */}
      <button 
        onClick={() => step === 2 ? setStep(1) : onBackToPlayer()} 
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
        <ArrowLeft size={18} /> <span className="mobile-hide">{step === 2 ? "GO BACK" : "BACK TO GROOVE"}</span>
      </button>

      {/* Visual Side */}
      <div className="auth-visual-side" style={{ flex: 1.2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '60px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.3), #000), url("https://res.cloudinary.com/ducrlh5lv/image/upload/v1780596443/SignUp_mj5zfa.png")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '20px' }}>
            <Headphones size={32} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px' }}>GROOVE</span>
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1.1', maxWidth: '450px' }}>
            {step === 1 ? "The pulse of the future is here." : "Tell us a bit about yourself."}
          </h2>
        </div>
      </div>

      {/* Form Side - Solid Black Background */}
      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        
        {/* THE SOLID BENTO CARD */}
        <div style={{ 
          width: '100%', maxWidth: '460px', padding: '45px', 
          backgroundColor: '#121212', 
          borderRadius: '24px', border: '1px solid #222', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)' 
        }}>
          
          <div style={{ marginBottom: '35px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 15px 0' }}>
              {step === 1 ? "Sign up" : "Create Profile"}
            </h1>
            
            {/* Step Progress Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
               <div style={{ height: '4px', flex: 1, background: '#10b981', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
               <div style={{ height: '4px', flex: 1, background: step === 2 ? '#10b981' : '#222', borderRadius: '4px', transition: 'all 0.4s ease', boxShadow: step === 2 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none' }}></div>
            </div>
          </div>

          {step === 1 ? (
            <div style={{ animation: 'ultraFade 0.4s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}>
                  <Globe size={18} /> Continue with Google
                </button>
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}>
                  <Apple size={18} /> Continue with Apple
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '30px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#333' }} />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#333' }} />
              </div>

              <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Email</label>
                  <input 
                    type="email" placeholder="name@domain.com" required 
                    value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                    style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#333'}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Password</label>
                  <input 
                    type="password" placeholder="At least 6 characters" required minLength="6"
                    value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                    style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                    onFocus={(e) => e.target.style.borderColor = '#10b981'}
                    onBlur={(e) => e.target.style.borderColor = '#333'}
                  />
                </div>

                <button type="submit" style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', marginTop: '10px', transition: '0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  Next
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>What should we call you?</label>
                <input 
                  type="text" placeholder="Profile name" required 
                  value={formData.profileName} onChange={(e) => setFormData({ ...formData, profileName: e.target.value })} 
                  style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                  onFocus={(e) => e.target.style.borderColor = '#10b981'}
                  onBlur={(e) => e.target.style.borderColor = '#333'}
                />
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '8px', display: 'block', fontWeight: '600' }}>This appears on your profile.</span>
              </div>

              {/* --- NEW: CUSTOM SOLID BENTO CALENDAR --- */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Date of Birth</label>
                
                {/* Trigger Box */}
                <div 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  style={{ 
                    width: '100%', padding: '16px 20px', background: '#0a0a0a', 
                    border: showDatePicker ? '1px solid #10b981' : '1px solid #333', 
                    borderRadius: '12px', color: formData.dob ? '#fff' : '#64748b', fontSize: '14px', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: '0.3s ease' 
                  }}
                >
                  {formData.dob ? formData.dob : "mm/dd/yyyy"}
                  <Calendar size={18} color="#64748b" />
                </div>

                {/* Calendar Dropdown Menu */}
                {showDatePicker && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px',
                    background: '#121212', border: '1px solid #333', borderRadius: '12px', 
                    padding: '20px', zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    animation: 'ultraFade 0.2s ease'
                  }}>
                    
                    {/* Header Controls (Month / Year) */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <select 
                        value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))}
                        style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        {months.map((m, i) => <option key={m} value={i} style={{background: '#121212'}}>{m}</option>)}
                      </select>
                      <select 
                        value={calYear} onChange={(e) => setCalYear(Number(e.target.value))}
                        style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontSize: '14px' }}
                      >
                        {years.map(y => <option key={y} value={y} style={{background: '#121212'}}>{y}</option>)}
                      </select>
                    </div>

                    {/* Days of Week Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', marginBottom: '10px', textAlign: 'center', color: '#64748b', fontSize: '12px', fontWeight: '700' }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
                    </div>

                    {/* Dates Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                      {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = formData.dob === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        return (
                          <div 
                            key={day}
                            onClick={() => handleDateSelect(day)}
                            style={{ 
                              padding: '8px 0', textAlign: 'center', borderRadius: '8px', cursor: 'pointer',
                              background: isSelected ? '#10b981' : 'transparent',
                              color: isSelected ? '#000' : '#fff',
                              fontWeight: isSelected ? '800' : '500',
                              fontSize: '13px', transition: '0.2s'
                            }}
                            onMouseOver={(e) => { if(!isSelected) e.currentTarget.style.background = '#1a1a1a' }}
                            onMouseOut={(e) => { if(!isSelected) e.currentTarget.style.background = 'transparent' }}
                          >
                            {day}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* --- CUSTOM SOLID BENTO GENDER DROPDOWN --- */}
              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>What's your gender?</label>
                
                {/* Clickable Trigger Box */}
                <div 
                  onClick={() => setShowGenderMenu(!showGenderMenu)}
                  style={{ 
                    width: '100%', padding: '16px 20px', background: '#0a0a0a', 
                    border: showGenderMenu ? '1px solid #10b981' : '1px solid #333', 
                    borderRadius: '12px', color: '#fff', fontSize: '14px', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: '0.3s ease' 
                  }}
                >
                  {formData.gender}
                  <span style={{ transform: showGenderMenu ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>▼</span>
                </div>

                {/* Solid Dropdown Menu */}
                {showGenderMenu && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px',
                    background: '#121212', border: '1px solid #333', borderRadius: '12px', 
                    overflow: 'hidden', zIndex: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
                    animation: 'ultraFade 0.2s ease'
                  }}>
                    {genderOptions.map((option) => (
                      <div 
                        key={option}
                        onClick={() => {
                          setFormData({ ...formData, gender: option });
                          setShowGenderMenu(false);
                        }}
                        style={{
                          padding: '14px 20px', color: formData.gender === option ? '#10b981' : '#fff', 
                          fontSize: '14px', cursor: 'pointer', transition: '0.2s',
                          background: formData.gender === option ? 'rgba(16, 185, 129, 0.1)' : 'transparent'
                        }}
                        onMouseOver={(e) => { if(formData.gender !== option) e.currentTarget.style.background = '#1a1a1a' }}
                        onMouseOut={(e) => { if(formData.gender !== option) e.currentTarget.style.background = 'transparent' }}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '5px', fontSize: '11px', color: '#64748b', lineHeight: '1.6', fontWeight: '600' }}>
                By clicking on sign-up, you agree to Groove's Terms and Conditions of Use.
              </div>

              <button type="submit" disabled={isSubmitting} style={{ padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', fontWeight: '900', cursor: 'pointer', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '10px', transition: '0.3s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Sign Up"}
              </button>
            </form>
          )}

          <p style={{ marginTop: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            Already have an account? <span onClick={onBackToLogin} style={{ color: '#fff', textDecoration: 'none', borderBottom: '1px solid #10b981', cursor: 'pointer', fontWeight: '800', marginLeft: '5px' }}>Log in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
import React, { useState, useEffect } from 'react';
import { Globe, Apple, ArrowLeft, Headphones, Loader2, Calendar, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from './context/PlayerContext';
import { API_BASE_URL } from './config';
import { useGoogleLogin } from '@react-oauth/google';

function SignUp({ onBackToLogin }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Now goes from 1 to 3
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setCurrentUser } = usePlayer();
  
  const [showPassword, setShowPassword] = useState(false);
  
  // Real-time Email Validation States
  const [emailError, setEmailError] = useState('');
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailIsValid, setEmailIsValid] = useState(false);
  
  const [showGenderMenu, setShowGenderMenu] = useState(false);
  const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear() - 18); 

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

  // THE REAL-TIME ENGINE: Checks DB when user stops typing for 800ms
  useEffect(() => {
    const checkEmailDatabase = async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setEmailError('Please enter a valid email format.');
        setEmailIsValid(false);
        setIsCheckingEmail(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/check-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email })
        });
        const data = await response.json();

        if (data.exists) {
          setEmailError('This email is already registered to an account.');
          setEmailIsValid(false);
        } else {
          setEmailError('');
          setEmailIsValid(true);
        }
      } catch (err) {
        console.error("Email check failed", err);
      } finally {
        setIsCheckingEmail(false);
      }
    };

    if (formData.email.length > 0) {
      setIsCheckingEmail(true);
      setEmailError('');
      setEmailIsValid(false);
      
      const delayDebounceFn = setTimeout(() => {
        checkEmailDatabase();
      }, 800);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setEmailError('');
      setEmailIsValid(false);
      setIsCheckingEmail(false);
    }
  }, [formData.email]);

  // Step Handlers
  const handleEmailNext = (e) => {
    e.preventDefault();
    if (emailIsValid) setStep(2);
  };

  const handlePasswordNext = (e) => {
    e.preventDefault();
    if (formData.password.length >= 6) {
      setStep(3);
    } else {
      alert("Password must be at least 6 characters.");
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!formData.dob) {
      alert("Please select your Date of Birth.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include' 
      });

      const data = await response.json();

      if (response.ok) {
        setCurrentUser({ 
          _id: data.userId, 
          email: formData.email, 
          role: data.role,
          profileName: formData.profileName // ⚡ ADD THIS LINE
        });
        navigate('/'); 
      } else {
        alert(data.message || "Failed to create account.");
        setStep(1); 
      }
    } catch (err) {
      console.error("Signup fetch error:", err);
      alert("Network error. Make sure your backend server is running.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateSelect = (day) => {
    const formattedDate = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setFormData({ ...formData, dob: formattedDate });
    setShowDatePicker(false);
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: tokenResponse.access_token }),
          credentials: 'include'
        });

        if (res.ok) {
          const userData = await res.json();
          setCurrentUser(userData);
          navigate('/'); 
        }
      } catch (err) {
        console.error(err);
      }
    },
  });

  const isStep3Complete = formData.profileName.trim() !== '' && formData.dob !== '';

  return (
    <div className="split-auth-container" style={{ height: '100vh', width: '100vw', display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
      
      <button 
        onClick={() => step === 3 ? setStep(2) : step === 2 ? setStep(1) : navigate('/')} 
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
        <ArrowLeft size={18} /> <span className="mobile-hide">{step > 1 ? "GO BACK" : "BACK TO GROOVE"}</span>
      </button>

      <div className="auth-visual-side" style={{ flex: 1.2, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '60px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(0,0,0,0.3), #000), url("https://res.cloudinary.com/ducrlh5lv/image/upload/v1780596443/SignUp_mj5zfa.png")', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.5 }} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', marginBottom: '20px' }}>
            <Headphones size={32} />
            <span style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '2px' }}>GROOVE</span>
          </div>
          <h2 style={{ fontSize: '48px', fontWeight: '900', lineHeight: '1.1', maxWidth: '450px' }}>
            {step === 1 ? "The pulse of the future is here." : step === 2 ? "Keep your Groove secure." : "Tell us a bit about yourself."}
          </h2>
        </div>
      </div>

      <div className="auth-form-side" style={{ flex: 1, backgroundColor: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
        <div style={{ 
          width: '100%', maxWidth: '460px', padding: '45px', 
          backgroundColor: '#121212', 
          borderRadius: '24px', border: '1px solid #222', 
          boxShadow: '0 20px 40px rgba(0,0,0,0.8)' 
        }}>
          
          <div style={{ marginBottom: '35px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', margin: '0 0 15px 0' }}>
              {step === 1 ? "Sign up" : step === 2 ? "Create Password" : "Create Profile"}
            </h1>
            
            {/* ⚡ UPDATED: 3-Segment Progress Bar */}
            <div style={{ display: 'flex', gap: '8px' }}>
               <div style={{ height: '4px', flex: 1, background: '#10b981', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
               <div style={{ height: '4px', flex: 1, background: step >= 2 ? '#10b981' : '#222', borderRadius: '4px', transition: 'all 0.4s ease', boxShadow: step >= 2 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none' }}></div>
               <div style={{ height: '4px', flex: 1, background: step === 3 ? '#10b981' : '#222', borderRadius: '4px', transition: 'all 0.4s ease', boxShadow: step === 3 ? '0 0 10px rgba(16, 185, 129, 0.3)' : 'none' }}></div>
            </div>
          </div>

          {/* ================= STEP 1: EMAIL ================= */}
          {step === 1 && (
            <div style={{ animation: 'ultraFade 0.4s ease' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  onClick={() => loginWithGoogle()} 
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
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', width: '100%', padding: '16px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '14px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', transition: '0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#1a1a1a'} onMouseOut={(e) => e.currentTarget.style.background = '#0a0a0a'}>
                  <Apple size={18} /> Continue with Apple
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', margin: '30px 0' }}>
                <div style={{ flex: 1, height: '1px', background: '#333' }} />
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '800' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#333' }} />
              </div>

              <form onSubmit={handleEmailNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Email</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="email" placeholder="name@domain.com" required 
                      value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                      style={{ 
                        width: '100%', padding: '16px 50px 16px 20px', 
                        background: '#0a0a0a', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease',
                        border: emailError ? '1px solid #ef4444' : (emailIsValid ? '1px solid #10b981' : '1px solid #333'), 
                        borderRadius: '12px', 
                      }} 
                    />
                    
                    <div style={{ position: 'absolute', right: '16px', display: 'flex', alignItems: 'center' }}>
                      {isCheckingEmail && <Loader2 size={18} color="#64748b" className="spinner" />}
                      {!isCheckingEmail && emailIsValid && <CheckCircle2 size={18} color="#10b981" />}
                      {!isCheckingEmail && emailError && <AlertCircle size={18} color="#ef4444" />}
                    </div>
                  </div>
                  
                  {emailError && !isCheckingEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', fontSize: '12px', marginTop: '8px', fontWeight: '600', animation: 'ultraFade 0.3s ease' }}>
                      {emailError}
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={!emailIsValid || isCheckingEmail}
                  style={{ 
                    padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', 
                    fontWeight: '900', fontSize: '15px', marginTop: '10px', transition: '0.3s',
                    opacity: (!emailIsValid || isCheckingEmail) ? 0.5 : 1,
                    cursor: (!emailIsValid || isCheckingEmail) ? 'not-allowed' : 'pointer'
                  }} 
                  onMouseOver={(e) => { if (emailIsValid && !isCheckingEmail) e.currentTarget.style.transform = 'translateY(-2px)' }} 
                  onMouseOut={(e) => { if (emailIsValid && !isCheckingEmail) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Next
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 2: PASSWORD ================= */}
          {step === 2 && (
            <div style={{ animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <form onSubmit={handlePasswordNext} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="At least 6 characters" required minLength="6"
                      value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                      style={{ 
                        width: '100%', padding: '16px 50px 16px 20px', 
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
                </div>

                <button 
                  type="submit" 
                  disabled={formData.password.length < 6}
                  style={{ 
                    padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', 
                    fontWeight: '900', fontSize: '15px', marginTop: '10px', transition: '0.3s',
                    opacity: (formData.password.length < 6) ? 0.5 : 1,
                    cursor: (formData.password.length < 6) ? 'not-allowed' : 'pointer'
                  }} 
                  onMouseOver={(e) => { if (formData.password.length >= 6) e.currentTarget.style.transform = 'translateY(-2px)' }} 
                  onMouseOut={(e) => { if (formData.password.length >= 6) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  Next
                </button>
              </form>
            </div>
          )}

          {/* ================= STEP 3: PROFILE ================= */}
          {step === 3 && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'slideInRight 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              
              <div>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>What should we call you?</label>
                <input 
                  type="text" placeholder="Profile name" required 
                  value={formData.profileName} onChange={(e) => setFormData({ ...formData, profileName: e.target.value })} 
                  style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', outline: 'none', fontSize: '14px', transition: '0.3s ease' }} 
                />
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>Date of Birth</label>
                <div 
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  style={{ 
                    width: '100%', padding: '16px 20px', background: '#0a0a0a', 
                    border: showDatePicker ? '1px solid #10b981' : (formData.dob ? '1px solid #333' : '1px dashed #64748b'), 
                    borderRadius: '12px', color: formData.dob ? '#fff' : '#64748b', fontSize: '14px', cursor: 'pointer', 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}
                >
                  {formData.dob ? formData.dob : "Select your birth date"}
                  <Calendar size={18} color={formData.dob ? "#10b981" : "#64748b"} />
                </div>
                {showDatePicker && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px', background: '#121212', border: '1px solid #333', borderRadius: '12px', padding: '20px', zIndex: 10 }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                      <select value={calMonth} onChange={(e) => setCalMonth(Number(e.target.value))} style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px' }}>
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                      </select>
                      <select value={calYear} onChange={(e) => setCalYear(Number(e.target.value))} style={{ flex: 1, padding: '10px', background: '#0a0a0a', border: '1px solid #333', color: '#fff', borderRadius: '8px' }}>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                      {Array.from({ length: firstDay }).map((_, i) => <div key={i} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => (
                        <div key={i+1} onClick={() => handleDateSelect(i+1)} style={{ padding: '5px', textAlign: 'center', cursor: 'pointer', background: formData.dob === `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(i+1).padStart(2, '0')}` ? '#10b981' : 'transparent', borderRadius: '4px' }}>{i+1}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <label style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', display: 'block', color: '#94a3b8' }}>What's your gender?</label>
                <div 
                  onClick={() => setShowGenderMenu(!showGenderMenu)}
                  style={{ width: '100%', padding: '16px 20px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '12px', color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  {formData.gender}
                  <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
                </div>
                {showGenderMenu && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px', background: '#121212', border: '1px solid #333', borderRadius: '12px', zIndex: 10, overflow: 'hidden' }}>
                    {genderOptions.map((option) => (
                      <div 
                        key={option} 
                        onClick={() => { setFormData({ ...formData, gender: option }); setShowGenderMenu(false); }} 
                        style={{ padding: '14px 20px', cursor: 'pointer', transition: '0.2s', backgroundColor: 'transparent' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !isStep3Complete} 
                style={{ 
                  padding: '18px', borderRadius: '50px', background: '#10b981', color: '#000', border: 'none', 
                  fontWeight: '900', fontSize: '15px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  transition: '0.3s', 
                  opacity: isStep3Complete ? 1 : 0.5, 
                  cursor: isStep3Complete ? 'pointer' : 'not-allowed' 
                }} 
                onMouseOver={(e) => { if(!isSubmitting && isStep3Complete) e.currentTarget.style.transform = 'translateY(-2px)'}} 
                onMouseOut={(e) => { if(!isSubmitting && isStep3Complete) e.currentTarget.style.transform = 'translateY(0)'}}
              >
                {isSubmitting ? <Loader2 className="spinner" size={20} /> : "Sign Up"}
              </button>
            </form>
          )}

          <p style={{ marginTop: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
            Already have an account? <span onClick={() => navigate('/login')} style={{ color: '#fff', cursor: 'pointer', fontWeight: '800', marginLeft: '5px' }}>Log in</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;
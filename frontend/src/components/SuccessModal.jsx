import React from 'react';
import { Check } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title = "Success!", message }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999 // Ensures it sits above EVERYTHING
    }}
    onClick={onClose} // Clicking outside closes it
    >
      <div 
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the card
        style={{
          backgroundColor: '#18181b', // Matches your dark theme
          borderRadius: '24px',
          padding: '40px 30px',
          width: '90%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255,255,255,0.05)',
          animation: 'modalFadeIn 0.2s ease-out'
        }}
      >
        {/* Glowing Success Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(16, 185, 129, 0.1)', // Subtle green background
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' // The glow effect
        }}>
          <Check size={32} color="#10b981" />
        </div>

        {/* Text Content */}
        <h2 style={{ 
          color: '#ffffff', 
          fontSize: '22px', 
          fontWeight: '800', 
          margin: '0 0 12px 0',
          letterSpacing: '-0.5px'
        }}>
          {title}
        </h2>
        
        <p style={{ 
          color: '#a1a1aa', 
          fontSize: '14px', 
          lineHeight: '1.6', 
          margin: '0 0 30px 0' 
        }}>
          {message}
        </p>

        {/* Action Button */}
        <button 
          onClick={onClose}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#10b981', // Your theme green
            color: '#000000',
            border: 'none',
            borderRadius: '14px',
            fontSize: '14px',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          AWESOME
        </button>
      </div>

      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SuccessModal;
import React from 'react';
import { usePlayer } from '../context/PlayerContext';
import { CheckCircle2, Loader2, Music, AlertCircle, Trash2, Check, X } from 'lucide-react';

const GlobalUploadManager = () => {
  const { uploadQueue, setUploadQueue, isQueueMinimized, setIsQueueMinimized, uploadAbortController } = usePlayer();

  // If there are no files uploading, stay completely hidden
  if (!uploadQueue || uploadQueue.length === 0) return null;

  // ⚡ THE GOOGLE PHOTOS LOGIC: Check if every single file is done (completed, skipped, or error)
  const isFinished = uploadQueue.every(f => f.status !== 'uploading' && f.status !== 'pending');
  const completedCount = uploadQueue.filter(f => f.status === 'completed' || f.status === 'skipped').length;
  const totalCount = uploadQueue.length;

  return (
    <div 
      style={{
        position: 'fixed', 
        bottom: '115px', 
        left: '13px', 
        width: '317px', 
        backgroundColor: '#18181b', 
        borderRadius: '25px', 
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)', 
        overflow: 'hidden', 
        zIndex: 99999,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
      }}
    >
      {/* Header */}
      <div 
        onClick={() => setIsQueueMinimized(!isQueueMinimized)} 
        style={{ 
          padding: '20px', 
          backgroundColor: '#27272a', 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          cursor: 'pointer' 
        }}
      >
        <div>
          {/* ⚡ Dynamic Title: Changes when the upload is completely done */}
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '800', color: '#fff' }}>
            {isFinished ? "Upload complete" : `Uploading ${totalCount} items`}
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: '#a1a1aa' }}>
            {isFinished 
              ? `${completedCount} items successfully saved to your library.` 
              : `${completedCount} of ${totalCount} processed...`}
          </p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isFinished ? (
            <Loader2 size={20} color="#8ab4f8" style={{ animation: 'spin 2s linear infinite' }} />
          ) : (
            <div style={{ background: '#10b981', borderRadius: '50%', padding: '4px', display: 'flex' }}>
               <Check size={16} color="#000" strokeWidth={3} />
            </div>
          )}
          
          {/* The Minimize Chevron */}
          <div style={{ transform: isQueueMinimized ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s', color: '#64748b', marginLeft: '4px' }}>
            ▼
          </div>

          {/* ⚡ THE NEW CLOSE BUTTON (Kill switch moved here!) */}
          <div 
            onClick={(e) => {
              e.stopPropagation(); // Stops the click from triggering the minimize toggle
              
              // ⚡ NEW: Only abort the upload if the user explicitly clicks the "X" button
              if (uploadAbortController) {
                uploadAbortController.abort(); 
              }
              setUploadQueue([]);  // Clears the data, which instantly closes the entire box!
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '4px',
              marginLeft: '4px',
              color: '#64748b',
              borderRadius: '6px',
              transition: '0.2s',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </div>
        </div>
      </div>

      {/* Scrolling List */}
      {!isQueueMinimized && (
        <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '10px 0' }} className="bento-scrollbar">
          {uploadQueue.map((file, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                <Music size={16} color="#64748b" />
                <p style={{ margin: 0, fontSize: '13px', color: '#e2e8f0', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '200px' }}>
                  {file.name}
                </p>
              </div>

              <div>
                {file.status === 'pending' && <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #3f3f46' }}></div>}
                {/* ⚡ Changed the progress text to Google's signature light blue */}
                {file.status === 'uploading' && <span style={{ fontSize: '12px', color: '#8ab4f8', fontWeight: '700' }}>{file.progress}%</span>}
                {file.status === 'completed' && <CheckCircle2 size={18} color="#10b981" />}
                {file.status === 'skipped' && <AlertCircle size={18} color="#f59e0b" title="Duplicate Skipped" />}
                {file.status === 'error' && <Trash2 size={18} color="#ef4444" />}
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default GlobalUploadManager;
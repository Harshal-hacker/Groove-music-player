import React, { useState } from 'react';
import { X, Play, MoreHorizontal } from 'lucide-react'; // ⚡ Swapped Grip for Play & More
import { usePlayer } from '../context/PlayerContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

export default function RightQueue({ isQueueOpen, setIsQueueOpen, lastContextIndexRef, handleContextMenu, setConfirmDialog }) {
  // ⚡ Grab extra functions from Context to handle clicking & playing
  const { 
    currentTrack, queue, setQueue, playbackContext, activePlaylistName,
    setCurrentTrackIndex, setIsPlaying, playlist: globalPlaylist, forceSyncNow 
  } = usePlayer();

  // ⚡ NEW: Tracks which row the mouse is hovering over
  const [hoveredTrack, setHoveredTrack] = useState(null); 

  const handleDragEnd = (result) => {
    if (!result.destination) return; 
    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setQueue(items);
  };

  // ⚡ NEW: Spotify Mechanic - Play song directly from the queue
  const handlePlayRow = (song, isManualQueue, indexInContext) => {
    forceSyncNow();
    const indexInGlobal = globalPlaylist.findIndex(s => s._id === song._id);
    
    if (indexInGlobal !== -1) {
      if (isManualQueue) {
        // Remove it from the queue since it is playing now
        setQueue(prev => prev.filter((_, i) => i !== indexInContext));
      }
      setCurrentTrackIndex(indexInGlobal);
      setIsPlaying(true);
    }
  };

  return (
    <aside style={{
      /* Spotify styling: 320px width, tighter border radius */
      width: isQueueOpen ? '320px' : '0px', opacity: isQueueOpen ? 1 : 0,
      backgroundColor: '#121212', borderRadius: '8px', 
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1050,
      marginLeft: isQueueOpen ? '8px' : '0px'
    }}>
      <div style={{ padding: '20px 16px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#fff' }}>Queue</h3>
        <button onClick={() => setIsQueueOpen(false)} style={{ background: 'none', border: 'none', color: '#a7a7a7', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '50%' }} onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}>
          <X size={16} />
        </button>
      </div>

      <div className="custom-queue-scrollbar" style={{ flex: 1, padding: '0 8px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* --- NOW PLAYING SECTION --- */}
        {currentTrack && (
          <div>
            <h4 style={{ margin: '0 8px 8px', fontSize: '14px', color: '#fff', fontWeight: '700' }}>Now playing</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '6px' }}>
              <img src={currentTrack.cover || "/Groove.png"} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} alt="" />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#1ed760', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#a7a7a7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentTrack.artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* --- ⚡ THE DRAGGABLE MANUAL QUEUE SECTION ⚡ --- */}
        {queue.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 8px 8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: '700' }}>Next in queue</h4>
              
              <button 
                // ⚡ UPDATED ONCLICK: Triggers the beautiful confirmation modal
                onClick={() => {
                  setConfirmDialog({
                    isOpen: true,
                    title: "Clear Queue",
                    message: "Are you sure you want to remove all upcoming tracks from your manual queue?",
                    confirmText: "CLEAR QUEUE", // Uses our dynamic text!
                    onConfirm: () => {
                      setQueue([]); // Actually clears the queue
                      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null }); // Closes modal
                    }
                  });
                }} 
                style={{ background: 'none', border: 'none', color: '#a7a7a7', fontSize: '12px', fontWeight: '600', cursor: 'pointer', padding: 0, transition: '0.2s' }}
                onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = '#a7a7a7'}
              >
                Clear
              </button>

            </div>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="manual-queue">
                {(provided) => (
                  <div 
                    {...provided.droppableProps} 
                    ref={provided.innerRef}
                    style={{ display: 'flex', flexDirection: 'column' }} 
                  >
                    {queue.map((song, index) => {
                      const uniqueId = `manual-${song._id}-${index}`;
                      
                      return (
                        <Draggable key={uniqueId} draggableId={uniqueId} index={index}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps} // ⚡ SPOTIFY MAGIC: The whole row is draggable!
                              onMouseEnter={() => setHoveredTrack(uniqueId)}
                              onMouseLeave={() => setHoveredTrack(null)}
                              onDoubleClick={() => handlePlayRow(song, true, index)} // Play on double click
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '8px', borderRadius: '6px',
                                backgroundColor: snapshot.isDragging ? 'rgba(255,255,255,0.1)' : hoveredTrack === uniqueId ? 'rgba(255,255,255,0.05)' : 'transparent',
                                boxShadow: snapshot.isDragging ? '0 8px 16px rgba(0,0,0,0.5)' : 'none',
                                cursor: 'default',
                                ...provided.draggableProps.style 
                              }}
                            >
                              <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                                <img src={song.cover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: hoveredTrack === uniqueId ? 0.4 : 1 }} alt="" />
                                
                                {/* ⚡ SPOTIFY MAGIC: Hover Play Button */}
                                {hoveredTrack === uniqueId && (
                                  <div 
                                    onClick={(e) => { e.stopPropagation(); handlePlayRow(song, true, index); }}
                                    style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                  >
                                    <Play size={18} fill="#fff" color="#fff" />
                                  </div>
                                )}
                              </div>
                              
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#a7a7a7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                              </div>
                              
                              {/* ⚡ SPOTIFY MAGIC: Hidden until hovered */}
                              {hoveredTrack === uniqueId && (
                                <div 
                                    onClick={(e) => {
                                    e.stopPropagation(); // Stops the song from playing
                                    handleContextMenu(e, song._id, 'song', 'queue'); // Opens the menu!
                                    }}
                                    style={{ color: '#a7a7a7', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.color = '#fff'}
                                    onMouseOut={e => e.currentTarget.style.color = '#a7a7a7'}
                                >
                                    <MoreHorizontal size={18} />
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder} 
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}

        {/* --- AUTO-PLAYLIST (UP NEXT) SECTION --- */}
        {(() => {
          const currentPool = playbackContext.length > 0 ? playbackContext : globalPlaylist;
          const currentIndexInContext = currentPool.findIndex(s => s._id === currentTrack?._id);
          const sliceAnchor = currentIndexInContext !== -1 ? currentIndexInContext : lastContextIndexRef.current;
          const remainingSongs = currentPool.slice(sliceAnchor + 1);
          
          if (remainingSongs.length > 0) {
            return (
              <div style={{ marginTop: queue.length > 0 ? '10px' : '0' }}>
                <h4 style={{ margin: '0 8px 8px', fontSize: '14px', color: '#fff', fontWeight: '700' }}>
                  {activePlaylistName !== "All Songs" ? `Next from: ${activePlaylistName}` : "Up Next"}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {remainingSongs.map((song, index) => {
                    const uniqueId = `auto-${song._id}-${index}`;
                    return (
                      <div 
                        key={uniqueId} 
                        onMouseEnter={() => setHoveredTrack(uniqueId)}
                        onMouseLeave={() => setHoveredTrack(null)}
                        onDoubleClick={() => handlePlayRow(song, false, index)} // Play on double click
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '6px',
                          backgroundColor: hoveredTrack === uniqueId ? 'rgba(255,255,255,0.05)' : 'transparent',
                          transition: 'background-color 0.2s ease', cursor: 'default'
                        }}
                      >
                        <div style={{ position: 'relative', width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                          <img src={song.cover || "/Groove.png"} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: hoveredTrack === uniqueId ? 0.4 : 1 }} alt="" />
                          
                          {hoveredTrack === uniqueId && (
                            <div 
                              onClick={(e) => { e.stopPropagation(); handlePlayRow(song, false, index); }}
                              style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                              <Play size={18} fill="#fff" color="#fff" />
                            </div>
                          )}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <p style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#a7a7a7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist}</p>
                        </div>

                        {/* Spotify's generic action menu for auto-queued tracks */}
                        {hoveredTrack === uniqueId && (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation(); // Stops the song from playing
                              handleContextMenu(e, song._id, 'song', 'queue'); // Opens the menu!
                            }}
                            style={{ color: '#a7a7a7', cursor: 'pointer', padding: '4px', transition: 'color 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.color = '#fff'}
                            onMouseOut={e => e.currentTarget.style.color = '#a7a7a7'}
                          >
                            <MoreHorizontal size={18} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>

      <style>{`
        /* Minimalist Scrollbar to match Spotify */
        .custom-queue-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-queue-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-queue-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-queue-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </aside>
  );
}
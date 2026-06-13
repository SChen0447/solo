import React, { useState, useCallback, useRef } from 'react';
import type { DanceScheme, DanceMove, BackupMove } from '../App';

interface DanceSchemeCardProps {
  scheme: DanceScheme;
  schemeIndex: number;
  bpm: number;
  backupMoves: BackupMove[];
  onPreview: (move: DanceMove, bpm: number) => void;
  onReplaceMove: (schemeIndex: number, moveIndex: number, newMove: BackupMove) => void;
  onReorderMoves: (schemeIndex: number, fromIndex: number, toIndex: number) => void;
  onExport: (scheme: DanceScheme) => void;
}

export default function DanceSchemeCard({
  scheme,
  schemeIndex,
  bpm,
  backupMoves,
  onPreview,
  onReplaceMove,
  onReorderMoves,
  onExport,
}: DanceSchemeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [ripple, setRipple] = useState(false);
  const dragItemRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== toIndex) {
      onReorderMoves(schemeIndex, dragIndex, toIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, schemeIndex, onReorderMoves]);

  const handleExportClick = useCallback(() => {
    setRipple(true);
    onExport(scheme);
    setTimeout(() => setRipple(false), 600);
  }, [scheme, onExport]);

  const starDisplay = (difficulty: number) => {
    return '★'.repeat(difficulty) + '☆'.repeat(3 - difficulty);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      marginBottom: '16px',
      overflow: 'hidden',
      transition: 'transform 0.3s ease-out, box-shadow 0.3s ease-out',
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '20px 24px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#FEB47B' }}>
            {scheme.name}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '4px' }}>
            BPM {scheme.bpmRange[0]}-{scheme.bpmRange[1]} · 难度 {starDisplay(Math.min(scheme.totalDifficulty, 9) > 6 ? 3 : scheme.totalDifficulty > 3 ? 2 : 1)} · {scheme.moves.length}个动作
          </div>
        </div>
        <div style={{
          fontSize: '1.2rem',
          transition: 'transform 0.3s ease-out',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          color: '#888',
        }}>
          ▼
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ paddingTop: '12px' }}>
            {scheme.moves.map((move, idx) => (
              <div
                key={`${move.name}-${idx}`}
                ref={idx === dragIndex ? dragItemRef : undefined}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  margin: '6px 0',
                  borderRadius: '8px',
                  background: dragOverIndex === idx
                    ? 'rgba(126,200,227,0.15)'
                    : dragIndex === idx
                      ? 'rgba(255,255,255,0.02)'
                      : 'rgba(255,255,255,0.05)',
                  border: dragOverIndex === idx
                    ? '2px dashed #7EC8E3'
                    : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'grab',
                  transition: 'all 0.2s ease-out',
                  animation: 'moveIn 0.2s ease-out',
                }}
              >
                <span style={{ cursor: 'grab', color: '#666', fontSize: '0.9rem' }}>⠿</span>
                <span style={{ flex: 1, fontSize: '0.9rem' }}>{move.name}</span>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>{move.beats}拍</span>
                <span style={{ color: '#FEB47B', fontSize: '0.75rem' }}>{starDisplay(move.difficulty)}</span>

                <button
                  onClick={(e) => { e.stopPropagation(); setReplacingIndex(replacingIndex === idx ? null : idx); }}
                  style={{
                    background: 'rgba(156,39,176,0.2)',
                    border: '1px solid rgba(156,39,176,0.4)',
                    color: '#CE93D8',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease-out',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(156,39,176,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(156,39,176,0.2)'; }}
                >
                  替换
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onPreview(move, bpm); }}
                  style={{
                    background: 'rgba(126,200,227,0.2)',
                    border: '1px solid rgba(126,200,227,0.4)',
                    color: '#7EC8E3',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s ease-out',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(126,200,227,0.4)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(126,200,227,0.2)'; }}
                >
                  3D
                </button>

                {replacingIndex === idx && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: '0',
                      top: '100%',
                      zIndex: 100,
                      background: 'rgba(26,26,46,0.95)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      maxWidth: '500px',
                    }}
                  >
                    {backupMoves.map((bm) => (
                      <button
                        key={bm.name}
                        onClick={() => {
                          onReplaceMove(schemeIndex, idx, bm);
                          setReplacingIndex(null);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.15)',
                          color: '#fff',
                          cursor: 'pointer',
                          minWidth: '70px',
                          fontSize: '0.75rem',
                          transition: 'all 0.2s ease-out',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(126,200,227,0.2)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
                      >
                        <span style={{ fontSize: '1.3rem' }}>{bm.icon}</span>
                        <span>{bm.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', textAlign: 'right', position: 'relative' }}>
            <button
              onClick={handleExportClick}
              style={{
                padding: '12px 28px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF7E5F, #FEB47B)',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.2s ease-out, box-shadow 0.2s ease-out',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.03)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(255,126,95,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              导出教案
              {ripple && (
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '200%',
                  height: '200%',
                  background: 'rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%) scale(0)',
                  animation: 'rippleEffect 0.6s ease-out',
                  pointerEvents: 'none',
                }} />
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes moveIn {
          from { transform: scale(0.95); opacity: 0.7; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes rippleEffect {
          to { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

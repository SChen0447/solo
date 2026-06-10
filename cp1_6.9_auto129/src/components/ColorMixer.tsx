import { useState, useRef, useCallback, useEffect } from 'react';

interface EmotionColor {
  id: string;
  color: string;
  name: string;
  frequency: number;
}

interface Clip {
  id: string;
  colors: { emotionId: string; weight: number }[];
  mixedColor: string;
  frequency: number;
  note?: string;
  order: number;
}

interface Props {
  emotions: EmotionColor[];
  clips: Clip[];
  viewOnly: boolean;
  onAddClip: (clip: Omit<Clip, 'id' | 'order'>) => void;
  onUpdateClip: (id: string, updates: Partial<Clip>) => void;
  onReorderClips: (clips: Clip[]) => void;
  onDeleteClip: (id: string) => void;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function playTone(frequency: number, duration: number = 100) {
  try {
    const audioContext = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + duration / 1000
    );
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch {
    // audio not available
  }
}

export default function ColorMixer({
  emotions,
  clips,
  viewOnly,
  onAddClip,
  onUpdateClip,
  onReorderClips,
  onDeleteClip
}: Props) {
  const [mixedWeights, setMixedWeights] = useState<Record<string, number>>({});
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [pulsingColor, setPulsingColor] = useState<string | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [draggedEmotion, setDraggedEmotion] = useState<string | null>(null);
  const [draggedClipId, setDraggedClipId] = useState<string | null>(null);
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const totalWeight = Object.values(mixedWeights).reduce((a, b) => a + b, 0);

  const getMixedColor = useCallback((): string => {
    if (totalWeight === 0) return '#ffffff';
    let r = 0,
      g = 0,
      b = 0;
    emotions.forEach((e) => {
      const weight = mixedWeights[e.id] || 0;
      if (weight > 0) {
        const rgb = hexToRgb(e.color);
        r += rgb.r * weight;
        g += rgb.g * weight;
        b += rgb.b * weight;
      }
    });
    return rgbToHex(r / totalWeight, g / totalWeight, b / totalWeight);
  }, [emotions, mixedWeights, totalWeight]);

  const getMixedFrequency = useCallback((): number => {
    if (totalWeight === 0) return 440;
    let freq = 0;
    emotions.forEach((e) => {
      const weight = mixedWeights[e.id] || 0;
      freq += e.frequency * weight;
    });
    return freq / totalWeight;
  }, [emotions, mixedWeights, totalWeight]);

  const getGradient = useCallback((): string => {
    const entries = Object.entries(mixedWeights).filter(([, w]) => w > 0);
    if (entries.length === 0) return '#ffffff';
    if (entries.length === 1) {
      const emo = emotions.find((e) => e.id === entries[0][0]);
      return emo ? emo.color : '#ffffff';
    }
    const sorted = entries.sort((a, b) => b[1] - a[1]);
    const colors = sorted.map(([id]) => {
      const emo = emotions.find((e) => e.id === id);
      return emo ? emo.color : '#ffffff';
    });
    return `linear-gradient(135deg, ${colors.join(', ')})`;
  }, [emotions, mixedWeights]);

  const handleColorClick = (emotion: EmotionColor) => {
    if (viewOnly) return;
    setActiveColor(emotion.id);
    setPulsingColor(emotion.id);
    playTone(emotion.frequency, 100);
    setTimeout(() => setActiveColor(null), 200);
    setTimeout(() => setPulsingColor(null), 500);
  };

  const handleDragStart = (e: React.DragEvent, emotionId: string) => {
    if (viewOnly) return;
    setDraggedEmotion(emotionId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleMixAreaDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleMixAreaDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (viewOnly) return;
    if (draggedEmotion) {
      setMixedWeights((prev) => ({
        ...prev,
        [draggedEmotion]: (prev[draggedEmotion] || 0) + 1
      }));
      setTimeout(() => {
        const newWeights = { ...mixedWeights };
        newWeights[draggedEmotion] = (newWeights[draggedEmotion] || 0) + 1;
        const tw = Object.values(newWeights).reduce((a, b) => a + b, 0);
        if (tw > 0) {
          let freq = 0;
          emotions.forEach((em) => {
            const w = newWeights[em.id] || 0;
            freq += em.frequency * w;
          });
          playTone(freq / tw, 150);
        }
      }, 0);
    }
    setDraggedEmotion(null);
  };

  const handleCreateClip = () => {
    if (viewOnly || totalWeight === 0) return;
    const clipColors = Object.entries(mixedWeights)
      .filter(([, w]) => w > 0)
      .map(([emotionId, weight]) => ({ emotionId, weight }));
    onAddClip({
      colors: clipColors,
      mixedColor: getMixedColor(),
      frequency: getMixedFrequency(),
      note: noteInput || undefined
    });
    setMixedWeights({});
    setNoteInput('');
  };

  const handleClearMix = () => {
    if (viewOnly) return;
    setMixedWeights({});
    setNoteInput('');
  };

  const handleClipDragStart = (e: React.DragEvent, clipId: string) => {
    if (viewOnly) return;
    setDraggedClipId(clipId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClipDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleClipDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (viewOnly || !draggedClipId) return;
    const draggedIndex = clips.findIndex((c) => c.id === draggedClipId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedClipId(null);
      return;
    }
    const newClips = [...clips];
    const [removed] = newClips.splice(draggedIndex, 1);
    newClips.splice(targetIndex, 0, removed);
    newClips.forEach((c, i) => (c.order = i));
    onReorderClips(newClips);
    playTone(600, 50);
    setDraggedClipId(null);
  };

  const handleClipDragEnd = () => {
    setDraggedClipId(null);
  };

  useEffect(() => {
    if (selectedClip) {
      const clip = clips.find((c) => c.id === selectedClip.id);
      if (clip) {
        setSelectedClip(clip);
      }
    }
  }, [clips, selectedClip?.id]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          marginBottom: '32px'
        }}
      >
        <div
          style={{
            flex: '1 1 400px',
            minWidth: '300px',
            background: '#2a2a3a',
            borderRadius: '12px',
            padding: '24px'
          }}
        >
          <h3
            style={{
              color: '#e0e0f0',
              fontSize: '16px',
              marginBottom: '16px',
              fontWeight: 500
            }}
          >
            情绪调色板
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))',
              gap: '12px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f0f0f5 0%, #e8e0f0 100%)',
              borderRadius: '8px'
            }}
          >
            {emotions.map((emotion) => (
              <div
                key={emotion.id}
                draggable={!viewOnly}
                onDragStart={(e) => handleDragStart(e, emotion.id)}
                onClick={() => handleColorClick(emotion)}
                title={emotion.name}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: viewOnly ? 'default' : 'pointer',
                  userSelect: 'none'
                }}
              >
                <div
                  style={{
                    width: activeColor === emotion.id ? '14px' : '10px',
                    height: activeColor === emotion.id ? '14px' : '10px',
                    backgroundColor: emotion.color,
                    borderRadius: '2px',
                    boxShadow:
                      pulsingColor === emotion.id
                        ? `0 0 20px ${emotion.color}`
                        : 'none',
                    opacity: pulsingColor === emotion.id ? 0.2 : 0.8,
                    transition:
                      'all 0.2s ease, width 0.2s ease, height 0.2s ease',
                    transform:
                      activeColor === emotion.id ? 'scale(1.3)' : 'scale(1)',
                    animation:
                      pulsingColor === emotion.id
                        ? 'pulse 0.5s ease-in-out'
                        : 'none'
                  }}
                  className={`color-block ${
                    pulsingColor === emotion.id ? 'pulsing' : ''
                  }`}
                  onMouseEnter={(e) => {
                    if (!viewOnly) {
                      (e.currentTarget as HTMLDivElement).style.transform =
                        'scale(1.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.transform =
                      activeColor === emotion.id ? 'scale(1.3)' : 'scale(1)';
                  }}
                />
                <span
                  style={{
                    fontSize: '12px',
                    color: '#555',
                    textAlign: 'center'
                  }}
                >
                  {emotion.name}
                </span>
              </div>
            ))}
          </div>
          <p style={{ color: '#8888a0', fontSize: '12px', marginTop: '12px' }}>
            提示：拖拽色块到右侧混合区进行混合
          </p>
        </div>

        <div
          style={{
            flex: '1 1 400px',
            minWidth: '300px',
            background: '#2a2a3a',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <h3
            style={{
              color: '#e0e0f0',
              fontSize: '16px',
              marginBottom: '16px',
              fontWeight: 500,
              alignSelf: 'flex-start'
            }}
          >
            混合区
          </h3>
          <div
            onDragOver={handleMixAreaDragOver}
            onDrop={handleMixAreaDrop}
            style={{
              width: '200px',
              height: '200px',
              background: getGradient(),
              borderRadius: '10px',
              border: '1px dashed #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              marginBottom: '16px'
            }}
          >
            {totalWeight === 0 && (
              <span style={{ color: '#999', fontSize: '13px' }}>
                拖入色块进行混合
              </span>
            )}
          </div>

          {totalWeight > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                width: '100%'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: '4px',
                  height: '80px',
                  justifyContent: 'center'
                }}
              >
                {emotions.map((e) => {
                  const w = mixedWeights[e.id] || 0;
                  if (w === 0) return null;
                  const height = (w / totalWeight) * 70 + 10;
                  return (
                    <div
                      key={e.id}
                      title={`${e.name}: ${((w / totalWeight) * 100).toFixed(1)}%`}
                      style={{
                        width: '20px',
                        height: `${height}px`,
                        backgroundColor: e.color,
                        borderRadius: '2px 2px 0 0',
                        transition: 'height 0.3s ease'
                      }}
                    />
                  );
                })}
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  justifyContent: 'center'
                }}
              >
                {emotions.map((e) => {
                  const w = mixedWeights[e.id] || 0;
                  if (w === 0) return null;
                  return (
                    <span
                      key={e.id}
                      style={{
                        fontSize: '11px',
                        color: '#a0a0c0',
                        background: '#3a3a4a',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}
                    >
                      {e.name}: {((w / totalWeight) * 100).toFixed(0)}%
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {!viewOnly && (
            <input
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="添加文字标注..."
              style={{
                width: '200px',
                padding: '8px 12px',
                marginBottom: '12px',
                background: '#1a1a2a',
                border: '1px solid #3a3a5a',
                borderRadius: '6px',
                color: '#e0e0f0',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          )}

          {!viewOnly && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleCreateClip}
                disabled={totalWeight === 0}
                style={{
                  padding: '10px 20px',
                  background:
                    totalWeight === 0
                      ? '#3a3a4a'
                      : 'linear-gradient(135deg, #66ff77, #66ffcc)',
                  color: totalWeight === 0 ? '#666' : '#1a1a2a',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: totalWeight === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                生成片段
              </button>
              <button
                onClick={handleClearMix}
                disabled={totalWeight === 0}
                style={{
                  padding: '10px 16px',
                  background: '#3a3a4a',
                  color: '#e0e0f0',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: totalWeight === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                清空
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ width: '80%', margin: '0 auto' }}>
        <h3
          style={{
            color: '#e0e0f0',
            fontSize: '16px',
            marginBottom: '16px',
            fontWeight: 500
          }}
        >
          时间轴
        </h3>
        <div
          ref={timelineRef}
          style={{
            background: '#2a2a3a',
            borderRadius: '12px',
            padding: '16px',
            minHeight: '100px'
          }}
        >
          {clips.length === 0 ? (
            <p
              style={{
                color: '#666',
                textAlign: 'center',
                padding: '24px',
                fontSize: '14px'
              }}
            >
              暂无片段，混合情绪色块生成您的第一个光谱片段
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0px'
              }}
            >
              {clips.map((clip, index) => (
                <div
                  key={clip.id}
                  draggable={!viewOnly}
                  onDragStart={(e) => handleClipDragStart(e, clip.id)}
                  onDragOver={handleClipDragOver}
                  onDrop={(e) => handleClipDrop(e, index)}
                  onDragEnd={handleClipDragEnd}
                  onClick={() => setSelectedClip(clip)}
                  onMouseEnter={() => setHoveredClip(clip.id)}
                  onMouseLeave={() => setHoveredClip(null)}
                  style={{
                    width: '200px',
                    height: '20px',
                    background: `linear-gradient(90deg, ${clip.mixedColor}, ${clip.mixedColor}88)`,
                    borderRadius: '4px',
                    position: 'relative',
                    cursor: 'pointer',
                    opacity: draggedClipId === clip.id ? 0.7 : 1,
                    transition: 'opacity 0.2s ease',
                    borderTop:
                      index > 0 ? '2px dashed #4a4a5a' : 'none',
                    paddingTop: index > 0 ? '2px' : '0',
                    marginTop: index > 0 ? '2px' : '0',
                    boxShadow: `0 2px 8px ${clip.mixedColor}44`
                  }}
                >
                  {clip.note && (
                    <span
                      style={{
                        position: 'absolute',
                        left: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: '11px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '150px'
                      }}
                    >
                      {clip.note}
                    </span>
                  )}
                  {!viewOnly && hoveredClip === clip.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteClip(clip.id);
                      }}
                      style={{
                        position: 'absolute',
                        right: '-8px',
                        top: '-8px',
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ff4455',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '10px',
                        lineHeight: '16px',
                        textAlign: 'center',
                        padding: 0,
                        zIndex: 10
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClip && (
        <>
          <div
            onClick={() => setSelectedClip(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.3)',
              zIndex: 99
            }}
          />
          <div
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              width: '300px',
              height: '400px',
              background: '#2a2a3a',
              color: '#e0e0f0',
              padding: '24px',
              zIndex: 100,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.3)',
              overflowY: 'auto',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}
            >
              <h4 style={{ fontSize: '16px', fontWeight: 500 }}>片段详情</h4>
              <button
                onClick={() => setSelectedClip(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#8888a0',
                  cursor: 'pointer',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                width: '100%',
                height: '60px',
                borderRadius: '8px',
                background: `linear-gradient(135deg, ${selectedClip.mixedColor}, ${selectedClip.mixedColor}66)`,
                marginBottom: '16px'
              }}
            />

            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8888a0',
                  marginBottom: '4px'
                }}
              >
                混合色
              </div>
              <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                {selectedClip.mixedColor.toUpperCase()}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8888a0',
                  marginBottom: '8px'
                }}
              >
                原色占比
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedClip.colors.map(({ emotionId, weight }) => {
                  const emo = emotions.find((e) => e.id === emotionId);
                  const totalW = selectedClip.colors.reduce(
                    (a, b) => a + b.weight,
                    0
                  );
                  const pct = ((weight / totalW) * 100).toFixed(0);
                  return (
                    <div
                      key={emotionId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          background: emo?.color || '#888'
                        }}
                      />
                      <span style={{ fontSize: '13px', flex: 1 }}>
                        {emo?.name || emotionId}
                      </span>
                      <span style={{ fontSize: '13px', color: '#a0a0c0' }}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8888a0',
                  marginBottom: '4px'
                }}
              >
                声音频率
              </div>
              <div style={{ fontSize: '14px' }}>
                {selectedClip.frequency.toFixed(0)} Hz
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8888a0',
                  marginBottom: '4px'
                }}
              >
                文字标注
              </div>
              {viewOnly ? (
                <div style={{ fontSize: '13px', color: '#c0c0e0' }}>
                  {selectedClip.note || '（无）'}
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedClip.note || ''}
                  onChange={(e) =>
                    onUpdateClip(selectedClip.id, { note: e.target.value })
                  }
                  placeholder="添加标注..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: '#1a1a2a',
                    border: '1px solid #3a3a5a',
                    borderRadius: '6px',
                    color: '#e0e0f0',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.8; box-shadow: 0 0 0 rgba(0,0,0,0); }
          50% { opacity: 0.2; box-shadow: 0 0 20px currentColor; }
          100% { opacity: 0.8; box-shadow: 0 0 0 rgba(0,0,0,0); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @media (max-width: 768px) {
          body { font-size: 12px; }
        }
      `}</style>
    </div>
  );
}

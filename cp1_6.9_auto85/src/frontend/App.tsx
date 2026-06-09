import React, { useState, useEffect, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import PrismViewer from './PrismViewer';
import { getCapsules, createCapsule } from './api';
import { Capsule, Emotion, EMOTION_LIST, EMOTION_COLORS, EMOTION_LABELS, CreateCapsuleDto } from '../backend/types';

const App: React.FC = () => {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [glowingId, setGlowingId] = useState<string | null>(null);

  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('blue');
  const [textInput, setTextInput] = useState('');
  const [imageData, setImageData] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const [rotation, setRotation] = useState(0);
  const [isDraggingScene, setIsDraggingScene] = useState(false);
  const dragStartX = useRef(0);
  const dragStartRotation = useRef(0);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const data = await getCapsules();
      setCapsules(data);
    };
    fetchData();
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('.prism-wrapper, .modal-overlay, .search-bar, .create-btn')) {
      return;
    }
    setIsDraggingScene(true);
    dragStartX.current = e.clientX;
    dragStartRotation.current = rotation;
  }, [rotation]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingScene) return;
    const deltaX = e.clientX - dragStartX.current;
    let newRotation = dragStartRotation.current + deltaX * 0.3;
    if (newRotation > 180) newRotation = 180;
    if (newRotation < -180) newRotation = -180;
    setRotation(newRotation);
  }, [isDraggingScene]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingScene(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const filteredCapsules = capsules.filter((capsule) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const emotionLabel = EMOTION_LABELS[capsule.emotion].toLowerCase();
    return (
      capsule.text.toLowerCase().includes(query) ||
      emotionLabel.includes(query) ||
      capsule.emotion.toLowerCase().includes(query)
    );
  });

  const isHighlighted = (id: string): boolean => {
    if (!searchQuery.trim()) return true;
    return filteredCapsules.some((c) => c.id === id);
  };

  const handleToggleExpand = useCallback((id: string | null): void => {
    setExpandedId(expandedId === id ? null : id);
  }, [expandedId]);

  const handleCardClose = useCallback((): void => {
    setExpandedId(null);
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (!textInput.trim()) return;

    const dto: CreateCapsuleDto = {
      text: textInput.trim(),
      image: imageData,
      emotion: selectedEmotion,
    };

    const newCapsule = await createCapsule(dto);
    if (newCapsule) {
      setCapsules((prev) => [newCapsule, ...prev]);
      setGlowingId(newCapsule.id);
      setTimeout(() => setGlowingId(null), 1500);
    }

    setIsModalOpen(false);
    setTextInput('');
    setImageData('');
    setSelectedEmotion('blue');
  };

  const handleImageUpload = (file: File): void => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageData(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (): void => {
    setIsDragging(false);
  };

  const getTextColor = (): string => {
    const len = textInput.length;
    if (len <= 100) return '#69db7c';
    if (len <= 200) return '#ffa94d';
    return '#ff6b6b';
  };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(1px 1px at 20px 30px, #eeeeee, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 40px 70px, #ffffff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 50px 160px, #dddddd, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 90px 40px, #ffffff, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 130px 80px, #eeeeee, rgba(0,0,0,0)),
          radial-gradient(1px 1px at 160px 120px, #ffffff, rgba(0,0,0,0)),
          linear-gradient(180deg, #0a0a1a 0%, #1a1a2e 100%)
        `,
        backgroundSize: '200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 200px 200px, 100% 100%',
        overflow: 'hidden',
        position: 'relative' as const,
        cursor: isDraggingScene ? 'grabbing' : 'grab',
        userSelect: 'none' as const,
      }}
      onMouseDown={handleMouseDown}
      onClick={expandedId ? handleCardClose : undefined}
    >
      <style>{`
        @keyframes prismSpin {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        @keyframes pulsePlaceholder {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 5px currentColor); }
          50% { filter: drop-shadow(0 0 20px currentColor); }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.2); }
          50% { transform: scale(1); }
          75% { transform: scale(1.2); }
        }
        @keyframes colorRing {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes borderFlash {
          0%, 100% { border-color: transparent; }
          50% { border-color: currentColor; }
        }
        .glow-pulse {
          animation: glowPulse 1.5s ease-in-out !important;
        }
        .heartbeat {
          animation: heartbeat 0.8s ease-in-out infinite;
        }
        .color-ring {
          animation: colorRing 0.8s ease-out forwards;
        }
        .flash-border {
          animation: borderFlash 0.6s ease-in-out infinite;
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 2px;
        }
        @media (max-width: 768px) {
          .search-container {
            left: 50% !important;
            top: 16px !important;
            transform: translateX(-50%) !important;
            right: auto !important;
          }
          .create-btn {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            top: auto !important;
            left: auto !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        className="search-container"
        style={{
          position: 'absolute' as const,
          top: '24px',
          left: '24px',
          zIndex: 100,
        }}
      >
        <input
          type="text"
          className="search-bar"
          placeholder="按情绪或内容搜索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '200px',
            padding: '10px 16px',
            background: 'rgba(200,200,255,0.15)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '24px',
            color: '#cccccc',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.3s ease-in-out',
            backdropFilter: 'blur(10px)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div
        ref={sceneRef}
        style={{
          width: '100%',
          height: '80vh',
          display: 'flex',
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            transformStyle: 'preserve-3d' as const,
            transform: `rotateY(${rotation}deg)`,
            transition: isDraggingScene ? 'none' : 'transform 0.5s ease-out',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 100px)',
              gridTemplateRows: 'repeat(2, 100px)',
              gap: '40px',
              transformStyle: 'preserve-3d' as const,
            }}
          >
            {capsules.slice(0, 6).map((capsule, index) => (
              <div
                key={capsule.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(capsule.id);
                }}
                style={{
                  position: 'relative' as const,
                  display: 'flex',
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                  color: EMOTION_COLORS[capsule.emotion],
                }}
              >
                <PrismViewer
                  capsule={capsule}
                  index={index}
                  isExpanded={expandedId === capsule.id}
                  isHighlighted={isHighlighted(capsule.id)}
                  isGlowing={glowingId === capsule.id}
                  onToggleExpand={handleToggleExpand}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        className="create-btn"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        style={{
          position: 'absolute' as const,
          bottom: '32px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          transition: 'all 0.3s ease-in-out',
          zIndex: 100,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
          e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
        }}
      >
        +
      </button>

      {isModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed' as const,
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center' as const,
            justifyContent: 'center' as const,
            zIndex: 1000,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.4s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsModalOpen(false);
            }
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '420px',
              maxWidth: '90vw',
              background: 'linear-gradient(180deg, rgba(30,30,60,0.95) 0%, rgba(20,20,40,0.98) 100%)',
              borderRadius: '20px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column' as const,
              gap: '24px',
              animation: 'slideUp 0.4s ease-out',
            }}
          >
            <h2
              style={{
                color: 'white',
                fontSize: '20px',
                fontWeight: '600',
                textAlign: 'center' as const,
                letterSpacing: '1px',
              }}
            >
              创建记忆胶囊
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <label style={{ color: '#aaaaaa', fontSize: '13px' }}>选择情绪</label>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' as const }}>
                {EMOTION_LIST.map((emotion) => (
                  <div
                    key={emotion}
                    style={{ position: 'relative' as const }}
                  >
                    {selectedEmotion === emotion && (
                      <div
                        className="color-ring"
                        style={{
                          position: 'absolute' as const,
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          border: `2px solid ${EMOTION_COLORS[emotion]}`,
                          pointerEvents: 'none' as const,
                        }}
                      />
                    )}
                    <button
                      onClick={() => setSelectedEmotion(emotion)}
                      title={EMOTION_LABELS[emotion]}
                      className={selectedEmotion === emotion ? 'heartbeat' : ''}
                      style={{
                        width: selectedEmotion === emotion ? '36px' : '28px',
                        height: selectedEmotion === emotion ? '36px' : '28px',
                        borderRadius: '50%',
                        background: EMOTION_COLORS[emotion],
                        border: selectedEmotion === emotion ? '3px solid white' : '2px solid rgba(255,255,255,0.3)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease-in-out',
                        boxShadow: selectedEmotion === emotion
                          ? `0 0 16px ${EMOTION_COLORS[emotion]}`
                          : '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <label style={{ color: '#aaaaaa', fontSize: '13px' }}>回忆文字</label>
              <div style={{ position: 'relative' as const }}>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value.slice(0, 300))}
                  placeholder="写下你想珍藏的回忆..."
                  maxLength={300}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    paddingBottom: '32px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none' as const,
                    transition: 'all 0.3s ease-in-out',
                    lineHeight: 1.6,
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = EMOTION_COLORS[selectedEmotion];
                    e.currentTarget.style.boxShadow = `0 0 8px ${EMOTION_COLORS[selectedEmotion]}`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <span
                  style={{
                    position: 'absolute' as const,
                    right: '12px',
                    bottom: '8px',
                    fontSize: '12px',
                    color: getTextColor(),
                    transition: 'color 0.3s ease-in-out',
                  }}
                >
                  {textInput.length}/300
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
              <label style={{ color: '#aaaaaa', fontSize: '13px' }}>上传图片</label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={isDragging ? 'flash-border' : ''}
                style={{
                  width: '100%',
                  height: '120px',
                  border: `2px dashed ${isDragging ? EMOTION_COLORS[selectedEmotion] : 'rgba(255,255,255,0.2)'}`,
                  borderRadius: '12px',
                  background: isDragging
                    ? `${EMOTION_COLORS[selectedEmotion]}33`
                    : 'rgba(255,255,255,0.03)',
                  color: EMOTION_COLORS[selectedEmotion],
                  display: 'flex',
                  alignItems: 'center' as const,
                  justifyContent: 'center' as const,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                  overflow: 'hidden' as const,
                  position: 'relative' as const,
                }}
              >
                {imageData ? (
                  <img
                    src={imageData}
                    alt="preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover' as const,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column' as const,
                      alignItems: 'center' as const,
                      gap: '8px',
                    }}
                  >
                    <span style={{ fontSize: '28px' }}>📷</span>
                    <span style={{ fontSize: '13px', color: '#888' }}>拖拽图片或点击上传</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  style={{
                    position: 'absolute' as const,
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' as const }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '12px 28px',
                  borderRadius: '24px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!textInput.trim()}
                style={{
                  padding: '12px 32px',
                  borderRadius: '24px',
                  background: textInput.trim() ? EMOTION_COLORS[selectedEmotion] : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: textInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease-in-out',
                  boxShadow: textInput.trim() ? `0 4px 16px ${EMOTION_COLORS[selectedEmotion]}66` : 'none',
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

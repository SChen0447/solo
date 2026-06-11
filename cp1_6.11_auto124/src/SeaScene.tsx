import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bottle,
  BOTTLE_COLORS,
  Blessing,
  BlessingTemplate,
  BLESSING_TEMPLATES,
  MediaFile,
} from './interface';

interface SeaSceneProps {
  mode: 'home' | 'ocean';
  bottles: Bottle[];
  currentUserId: string;
  onCreateBottle: () => void;
  onThrowAnimationComplete: () => void;
  showThrowAnimation: boolean;
  onAddBlessing: (bottleId: string, blessing: Blessing) => void;
  setBottles: React.Dispatch<React.SetStateAction<Bottle[]>>;
}

interface FloatingBottleState {
  id: string;
  x: number;
  y: number;
  baseY: number;
  speed: number;
  direction: number;
  size: number;
  phase: number;
}

const Cloud = ({ style }: { style: React.CSSProperties }) => (
  <div className="cloud" style={style}>
    <div className="cloud-puff cloud-puff-1" />
    <div className="cloud-puff cloud-puff-2" />
    <div className="cloud-puff cloud-puff-3" />
    <div className="cloud-puff cloud-puff-4" />
  </div>
);

const Wave = ({ delay, opacity }: { delay: number; opacity: number }) => (
  <div
    className="wave"
    style={{
      animationDelay: `${delay}s`,
      opacity,
    }}
  />
);

const GlassBottle = ({
  onClick,
  isOpening,
  showParticles,
}: {
  onClick: () => void;
  isOpening: boolean;
  showParticles: boolean;
}) => (
  <div
    className={`glass-bottle-container ${isOpening ? 'opening' : ''}`}
    onClick={onClick}
  >
    {showParticles && (
      <div className="particle-trail">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="particle" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>
    )}
    <div className="glass-bottle">
      <div className={`bottle-cap ${isOpening ? 'cap-open' : ''}`} />
      <div className="bottle-neck" />
      <div className="bottle-body">
        <div className="bottle-highlight" />
        <div className="bottle-paper" />
      </div>
      <div className="bottle-ribbon" />
    </div>
  </div>
);

const FloatingBottle = ({
  bottle,
  floatingState,
  onOpen,
  onLongPress,
  isOwn,
  onOwnBottleClick,
}: {
  bottle: Bottle;
  floatingState: FloatingBottleState;
  onOpen: () => void;
  onLongPress: () => void;
  isOwn: boolean;
  onOwnBottleClick: () => void;
}) => {
  const [hovered, setHovered] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number>(0);

  const handleMouseDown = () => {
    if (bottle.openAt > Date.now()) {
      setPressing(true);
      pressStartRef.current = Date.now();
      pressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - pressStartRef.current;
        const progress = Math.min(elapsed / 3000, 1);
        setPressProgress(progress);
        if (progress >= 1) {
          if (pressTimerRef.current) clearInterval(pressTimerRef.current);
          setPressing(false);
          setPressProgress(0);
          onLongPress();
        }
      }, 16);
    }
  };

  const handleMouseUp = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    if (pressProgress < 1 && pressProgress > 0) {
      onOpen();
    }
    setPressing(false);
    setPressProgress(0);
  };

  const handleMouseLeave = () => {
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressing(false);
    setPressProgress(0);
    setHovered(false);
  };

  const hasBlessings = bottle.blessings.length > 0;

  return (
    <div
      className={`floating-bottle ${hovered ? 'hovered' : ''} ${isOwn ? 'own-bottle' : ''}`}
      style={{
        left: `${floatingState.x}%`,
        top: `${floatingState.y}%`,
        width: floatingState.size,
        height: floatingState.size * 1.5,
        transform: `rotate(${Math.sin(floatingState.phase) * 5}deg)`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDoubleClick={isOwn ? onOwnBottleClick : onOpen}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      <svg viewBox="0 0 60 90" className="mini-bottle-svg">
        <defs>
          <radialGradient id={`grad-${bottle.id}`} cx="30%" cy="30%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor={BOTTLE_COLORS[bottle.color]} stopOpacity="0.7" />
          </radialGradient>
        </defs>
        <path
          d="M22 0 L38 0 L38 15 Q45 18 48 28 L52 78 Q52 88 42 88 L18 88 Q8 88 8 78 L12 28 Q15 18 22 15 Z"
          fill={`url(#grad-${bottle.id})`}
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
        <ellipse cx="22" cy="50" rx="3" ry="15" fill="rgba(255,255,255,0.25)" />
        <rect x="20" y="0" width="20" height="8" rx="2" fill="#d4af37" />
        {hasBlessings && (
          <circle cx="48" cy="20" r="3" fill="#d4af37" className="blessing-star">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
      {pressing && (
        <div className="press-progress-ring">
          <svg viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="#d4af37"
              strokeWidth="3"
              strokeDasharray={`${pressProgress * 94.2} 94.2`}
              transform="rotate(-90 18 18)"
            />
          </svg>
        </div>
      )}
      {hovered && (
        <div className="bottle-tooltip">
          <div className="tooltip-title">{bottle.title || '无题胶囊'}</div>
          <div className="tooltip-date">
            {bottle.openAt > Date.now()
              ? `开启时间: ${new Date(bottle.openAt).toLocaleDateString()}`
              : '已开启'}
          </div>
          {hasBlessings && <div className="tooltip-blessings">💫 {bottle.blessings.length} 条祝福</div>}
        </div>
      )}
      {isOwn && <div className="own-indicator">⭐</div>}
    </div>
  );
};

const BottleReader = ({
  bottle,
  onClose,
  onAddBlessing,
  isOwn,
}: {
  bottle: Bottle;
  onClose: () => void;
  onAddBlessing: (content: string, template: BlessingTemplate) => void;
  isOwn: boolean;
}) => {
  const [showBlessingInput, setShowBlessingInput] = useState(false);
  const [blessingContent, setBlessingContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<BlessingTemplate>('letter');
  const isUnlocked = bottle.openAt <= Date.now();
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (isUnlocked) {
      let i = 0;
      const timer = setInterval(() => {
        i += 2;
        setVisibleChars(Math.min(i, bottle.content.length));
        if (i >= bottle.content.length) clearInterval(timer);
      }, 30);
      return () => clearInterval(timer);
    }
  }, [isUnlocked, bottle.content.length]);

  const getTemplateStyle = (template: BlessingTemplate): React.CSSProperties => {
    const styles: Record<BlessingTemplate, React.CSSProperties> = {
      letter: {
        background: 'linear-gradient(135deg, #fffaf0 0%, #f5e6c8 100%)',
        border: '1px solid #c8a864',
        boxShadow: 'inset 0 0 10px rgba(200,168,100,0.2)',
      },
      leaf: {
        background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
        borderRadius: '50% 0 50% 0',
        border: '1px solid #81c784',
      },
      feather: {
        background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
        borderRadius: '50% 50% 20% 20%',
        border: '1px solid #ba68c8',
      },
      origami: {
        background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
        clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
        border: 'none',
      },
    };
    return styles[template];
  };

  return (
    <div className="bottle-reader-overlay" onClick={onClose}>
      <div className="bottle-reader-modal" onClick={(e) => e.stopPropagation()}>
        <button className="reader-close" onClick={onClose}>
          ×
        </button>
        <div className="reader-header">
          <h2>{bottle.title || '无题胶囊'}</h2>
          <div className="reader-meta">
            <span>创建于 {new Date(bottle.createdAt).toLocaleDateString()}</span>
            <span className={isUnlocked ? 'unlocked' : 'locked'}>
              {isUnlocked ? '🔓 已开启' : `🔒 开启于 ${new Date(bottle.openAt).toLocaleString()}`}
            </span>
          </div>
        </div>

        {isUnlocked ? (
          <div className="reader-content">
            {bottle.media.length > 0 && (
              <div className="reader-media">
                {bottle.media.map((m: MediaFile) => (
                  <div key={m.id} className="media-card">
                    {m.type === 'image' && <img src={m.url} alt={m.name} />}
                    {m.type === 'audio' && <audio controls src={m.url} />}
                    {m.type === 'video' && <video controls src={m.url} />}
                  </div>
                ))}
              </div>
            )}
            <div
              className="reader-text"
              style={{ fontFamily: bottle.fontFamily === 'handwriting' ? 'cursive, serif' : 'inherit' }}
            >
              {bottle.content.slice(0, visibleChars)}
              {visibleChars < bottle.content.length && <span className="cursor">|</span>}
            </div>

            {bottle.blessings.length > 0 && (
              <div className="reader-blessings">
                <h3>时光祝福 ({bottle.blessings.length})</h3>
                <div className="blessings-grid">
                  {bottle.blessings.map((b: Blessing) => (
                    <div
                      key={b.id}
                      className="blessing-note"
                      style={getTemplateStyle(b.template)}
                    >
                      {b.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="reader-locked">
            <div className="lock-icon">🔒</div>
            <p>这个时空胶囊还未到开启时间</p>
            <p className="lock-date">
              将在 {new Date(bottle.openAt).toLocaleString()} 自动解封
            </p>
            {!isOwn && (
              <button
                className="add-blessing-btn"
                onClick={() => setShowBlessingInput(!showBlessingInput)}
              >
                💝 留下祝福
              </button>
            )}
          </div>
        )}

        {showBlessingInput && !isUnlocked && !isOwn && (
          <div className="blessing-input">
            <div className="template-selector">
              {BLESSING_TEMPLATES.map((t) => (
                <div
                  key={t}
                  className={`template-option ${selectedTemplate === t ? 'selected' : ''}`}
                  style={getTemplateStyle(t)}
                  onClick={() => setSelectedTemplate(t)}
                />
              ))}
            </div>
            <textarea
              value={blessingContent}
              onChange={(e) => setBlessingContent(e.target.value)}
              placeholder="写下你的祝福..."
              rows={3}
            />
            <button
              className="submit-blessing-btn"
              onClick={() => {
                if (blessingContent.trim()) {
                  onAddBlessing(blessingContent.trim(), selectedTemplate);
                  setBlessingContent('');
                  setShowBlessingInput(false);
                }
              }}
            >
              送出祝福
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const FeatherFall = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="feather-fall-overlay">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="falling-feather"
          style={{ '--i': i, left: `${10 + i * 10}%` } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default function SeaScene({
  mode,
  bottles,
  currentUserId,
  onCreateBottle,
  onThrowAnimationComplete,
  showThrowAnimation,
  onAddBlessing,
  setBottles,
}: SeaSceneProps) {
  const [isOpening, setIsOpening] = useState(false);
  const [floatingStates, setFloatingStates] = useState<FloatingBottleState[]>([]);
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  const [showFeatherFall, setShowFeatherFall] = useState(false);
  const animFrameRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const states: FloatingBottleState[] = bottles.map((b) => ({
      id: b.id,
      x: b.position.x,
      y: b.position.y,
      baseY: b.position.y,
      speed: b.position.speed,
      direction: b.position.direction,
      size: b.position.size,
      phase: Math.random() * Math.PI * 2,
    }));
    setFloatingStates(states);
  }, [bottles]);

  useEffect(() => {
    if (mode !== 'ocean' || isMobile) {
      return;
    }

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 16.67;
      lastTime = currentTime;

      setFloatingStates((prev) =>
        prev.map((s) => {
          let newX = s.x + s.direction * s.speed * delta * 0.02;
          if (newX < 5) {
            newX = 5;
            s.direction = Math.abs(s.direction);
          }
          if (newX > 95) {
            newX = 95;
            s.direction = -Math.abs(s.direction);
          }
          const newPhase = s.phase + 0.02 * delta;
          const waveOffset = Math.sin(newPhase) * 2;
          return {
            ...s,
            x: newX,
            y: s.baseY + waveOffset,
            phase: newPhase,
          };
        })
      );

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, isMobile]);

  useEffect(() => {
    if (mode !== 'ocean' || !isMobile) return;
    setFloatingStates((prev) =>
      prev.map((s) => ({
        ...s,
        y: s.baseY,
      }))
    );
  }, [mode, isMobile]);

  const handleBottleClick = useCallback(() => {
    if (showThrowAnimation) return;
    setIsOpening(true);
    setTimeout(() => {
      onCreateBottle();
    }, 400);
  }, [onCreateBottle, showThrowAnimation]);

  const handleOpenBottle = useCallback((bottle: Bottle) => {
    setSelectedBottle(bottle);
  }, []);

  const handleOwnBottleClick = useCallback((bottle: Bottle) => {
    setShowFeatherFall(true);
    setSelectedBottle(bottle);
  }, []);

  const handleLongPress = useCallback((bottle: Bottle) => {
    setSelectedBottle(bottle);
  }, []);

  const handleSubmitBlessing = useCallback(
    (content: string, template: BlessingTemplate) => {
      if (selectedBottle) {
        const blessing: Blessing = {
          id: Math.random().toString(36).substring(2, 9),
          content,
          createdAt: Date.now(),
          template,
        };
        onAddBlessing(selectedBottle.id, blessing);
        setBottles((prev) =>
          prev.map((b) =>
            b.id === selectedBottle.id
              ? { ...b, blessings: [...b.blessings, blessing] }
              : b
          )
        );
        setSelectedBottle({
          ...selectedBottle,
          blessings: [...selectedBottle.blessings, blessing],
        });
      }
    },
    [selectedBottle, onAddBlessing, setBottles]
  );

  const handleThrowComplete = useCallback(() => {
    if (showThrowAnimation) {
      onThrowAnimationComplete();
    }
  }, [showThrowAnimation, onThrowAnimationComplete]);

  useEffect(() => {
    if (showThrowAnimation) {
      const timer = setTimeout(handleThrowComplete, 1500);
      return () => clearTimeout(timer);
    }
  }, [showThrowAnimation, handleThrowComplete]);

  const bgStyle =
    mode === 'home'
      ? {
          background: 'linear-gradient(180deg, #87ceeb 0%, #0b3d60 100%)',
        }
      : {
          background: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #0b3d60 100%)',
        };

  return (
    <>
      <style>{styles}</style>
      <div className={`sea-scene ${mode}`} style={bgStyle} ref={containerRef}>
        {mode === 'home' && (
          <div className="sky-layer">
            {Array.from({ length: 5 }).map((_, i) => (
              <Cloud
                key={i}
                style={{
                  top: `${5 + i * 12}%`,
                  left: `${(i * 23) % 100}%`,
                  animationDuration: `${60 + i * 20}s`,
                  animationDelay: `${-i * 15}s`,
                  transform: `scale(${0.6 + i * 0.15})`,
                }}
              />
            ))}
          </div>
        )}

        {mode === 'ocean' && (
          <div className="stars-layer">
            {Array.from({ length: 100 }).map((_, i) => (
              <div
                key={i}
                className="star"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 50}%`,
                  width: `${1 + Math.random() * 2}px`,
                  height: `${1 + Math.random() * 2}px`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
        )}

        <div className="ocean-layer">
          {Array.from({ length: 3 }).map((_, i) => (
            <Wave key={i} delay={i * -1.3} opacity={0.3 + i * 0.2} />
          ))}
        </div>

        {mode === 'home' && (
          <div className="center-bottle">
            <GlassBottle
              onClick={handleBottleClick}
              isOpening={isOpening}
              showParticles={showThrowAnimation}
            />
            <div className="bottle-hint">点击瓶子，开启你的时空旅程</div>
          </div>
        )}

        {mode === 'ocean' && (
          <div className="floating-bottles">
            {floatingStates.map((fs) => {
              const bottle = bottles.find((b) => b.id === fs.id);
              if (!bottle) return null;
              const isOwn = bottle.creatorId === currentUserId;
              return (
                <FloatingBottle
                  key={bottle.id}
                  bottle={bottle}
                  floatingState={fs}
                  onOpen={() => handleOpenBottle(bottle)}
                  onLongPress={() => handleLongPress(bottle)}
                  isOwn={isOwn}
                  onOwnBottleClick={() => handleOwnBottleClick(bottle)}
                />
              );
            })}
          </div>
        )}

        {mode === 'ocean' && (
          <div className="ocean-header">
            <h1>🌊 时光海</h1>
            <p>拾起一个漂流瓶，感受跨越时空的温度</p>
          </div>
        )}

        {showThrowAnimation && (
          <div className="throw-animation">
            <GlassBottle onClick={() => {}} isOpening={false} showParticles={true} />
          </div>
        )}
      </div>

      {selectedBottle && (
        <BottleReader
          bottle={selectedBottle}
          onClose={() => setSelectedBottle(null)}
          onAddBlessing={handleSubmitBlessing}
          isOwn={selectedBottle.creatorId === currentUserId}
        />
      )}

      {showFeatherFall && (
        <>
          <div className="own-bottle-toast">✨ 你有一个来自时空的呼唤</div>
          <FeatherFall onComplete={() => setShowFeatherFall(false)} />
        </>
      )}
    </>
  );
}

const styles = `
.sea-scene {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.sky-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60%;
  overflow: hidden;
}

.cloud {
  position: absolute;
  animation: cloudDrift linear infinite;
}

.cloud-puff {
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  filter: blur(4px);
}

.cloud-puff-1 {
  width: 60px;
  height: 40px;
  left: 0;
  top: 10px;
}

.cloud-puff-2 {
  width: 80px;
  height: 50px;
  left: 30px;
  top: 0;
}

.cloud-puff-3 {
  width: 70px;
  height: 45px;
  left: 70px;
  top: 8px;
}

.cloud-puff-4 {
  width: 50px;
  height: 35px;
  left: 120px;
  top: 15px;
}

@keyframes cloudDrift {
  0% { transform: translateX(-150px); }
  100% { transform: translateX(calc(100vw + 150px)); }
}

.stars-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 60%;
}

.star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.ocean-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50%;
  overflow: hidden;
}

.wave {
  position: absolute;
  bottom: 0;
  left: -50%;
  width: 200%;
  height: 100%;
  background: radial-gradient(
    ellipse at center top,
    transparent 0%,
    transparent 40%,
    rgba(135, 206, 235, 0.4) 60%,
    rgba(11, 61, 96, 0.6) 100%
  );
  animation: wave 4s ease-in-out infinite;
}

.wave::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  transform: translateY(-5px);
  animation: waveCrest 4s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes waveCrest {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.center-bottle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
}

.glass-bottle-container {
  cursor: pointer;
  transition: transform 0.5s ease;
  position: relative;
}

.glass-bottle-container:hover {
  animation: bottleSway 0.5s ease-in-out;
}

@keyframes bottleSway {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-3deg); }
  75% { transform: rotate(3deg); }
}

.glass-bottle-container.opening .glass-bottle {
  animation: bottleJump 0.4s ease-out;
}

@keyframes bottleJump {
  0% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0); }
}

.glass-bottle {
  position: relative;
  width: 200px;
  height: 300px;
}

.bottle-cap {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 25px;
  background: linear-gradient(180deg, #e8c76a 0%, #d4af37 50%, #b8941f 100%);
  border-radius: 6px 6px 3px 3px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 3;
  transform-origin: bottom left;
  transition: transform 0.4s ease-out;
}

.bottle-cap::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 6px;
  background: linear-gradient(180deg, #d4af37 0%, #b8941f 100%);
  border-radius: 3px;
}

.cap-open {
  transform: translateX(-50%) rotate(-120deg) translateY(-40px);
}

.bottle-neck {
  position: absolute;
  top: 22px;
  left: 50%;
  transform: translateX(-50%);
  width: 50px;
  height: 50px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(173, 216, 230, 0.3) 50%,
    rgba(255, 255, 255, 0.2) 100%
  );
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 8px 8px 3px 3px;
  backdrop-filter: blur(4px);
}

.bottle-body {
  position: absolute;
  top: 68px;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  height: 220px;
  background: radial-gradient(
    ellipse at 30% 20%,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(173, 216, 230, 0.2) 40%,
    rgba(135, 206, 235, 0.15) 70%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-radius: 30px 30px 60px 60px;
  backdrop-filter: blur(8px);
  overflow: hidden;
}

.bottle-highlight {
  position: absolute;
  top: 10px;
  left: 15px;
  width: 25px;
  height: 160px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.6) 0%,
    rgba(255, 255, 255, 0.1) 100%
  );
  border-radius: 20px;
  filter: blur(2px);
}

.bottle-paper {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%) rotate(-8deg);
  width: 100px;
  height: 80px;
  background: linear-gradient(135deg, #fff8e7 0%, #f5deb3 100%);
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.bottle-paper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 8px,
    rgba(139, 90, 43, 0.08) 8px,
    rgba(139, 90, 43, 0.08) 9px
  );
}

.bottle-ribbon {
  position: absolute;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  width: 80px;
  height: 20px;
  background: linear-gradient(180deg, #f0d778 0%, #d4af37 50%, #b8941f 100%);
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 2;
}

.bottle-ribbon::before,
.bottle-ribbon::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 25px;
  height: 30px;
  background: linear-gradient(180deg, #f0d778 0%, #d4af37 100%);
  border-radius: 0 50% 50% 0;
  transform: translateY(-50%);
}

.bottle-ribbon::before {
  left: -15px;
  transform: translateY(-50%) scaleX(-1);
}

.bottle-ribbon::after {
  right: -15px;
}

.bottle-hint {
  margin-top: 30px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 16px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
  animation: hintPulse 2s ease-in-out infinite;
}

@keyframes hintPulse {
  0%, 100% { opacity: 0.7; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-3px); }
}

.particle-trail {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  pointer-events: none;
  z-index: 5;
}

.particle {
  position: absolute;
  width: 6px;
  height: 6px;
  background: radial-gradient(circle, #ffd700 0%, #ff8c00 100%);
  border-radius: 50%;
  animation: particleFly 1.5s ease-out forwards;
  animation-delay: calc(var(--i) * 0.05s);
  opacity: 0;
}

@keyframes particleFly {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(
      calc(cos(var(--i) * 30deg) * 100px),
      calc(sin(var(--i) * 30deg) * 100px - 200px)
    ) scale(0);
  }
}

.ocean-header {
  position: absolute;
  top: 30px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 5;
  color: white;
}

.ocean-header h1 {
  font-size: 32px;
  margin-bottom: 8px;
  text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}

.ocean-header p {
  font-size: 14px;
  opacity: 0.8;
}

.floating-bottles {
  position: absolute;
  top: 30%;
  left: 0;
  width: 100%;
  height: 65%;
  overflow: hidden;
}

.floating-bottle {
  position: absolute;
  cursor: pointer;
  transition: transform 0.1s ease-out, filter 0.3s ease;
  will-change: transform;
}

.floating-bottle.hovered {
  filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.7)) brightness(1.2);
  z-index: 10;
}

.mini-bottle-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.blessing-star {
  filter: drop-shadow(0 0 3px gold);
}

.press-progress-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 60px;
  height: 60px;
  pointer-events: none;
}

.press-progress-ring svg {
  width: 100%;
  height: 100%;
}

.bottle-tooltip {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 20;
  animation: tooltipFade 0.2s ease;
}

@keyframes tooltipFade {
  from { opacity: 0; transform: translateX(-50%) translateY(5px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.tooltip-title {
  font-weight: bold;
  margin-bottom: 2px;
}

.tooltip-date,
.tooltip-blessings {
  opacity: 0.8;
  font-size: 10px;
}

.own-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  font-size: 14px;
  animation: twinkle 1.5s ease-in-out infinite;
}

.bottle-reader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bottle-reader-modal {
  position: relative;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  background: linear-gradient(135deg, #fff8e7 0%, #f5deb3 100%);
  border-radius: 20px;
  padding: 30px;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modalIn {
  from { transform: scale(0.8) translateY(50px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.reader-close {
  position: absolute;
  top: 15px;
  right: 20px;
  background: none;
  border: none;
  font-size: 28px;
  color: #8b5a2b;
  cursor: pointer;
  transition: transform 0.2s;
}

.reader-close:hover {
  transform: scale(1.2);
}

.reader-header h2 {
  color: #5d4037;
  font-size: 24px;
  margin-bottom: 10px;
}

.reader-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #8b7355;
}

.reader-meta .unlocked {
  color: #4caf50;
}

.reader-meta .locked {
  color: #f44336;
}

.reader-content {
  margin-top: 20px;
}

.reader-media {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 20px;
}

.media-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
}

.media-card img,
.media-card video {
  width: 100%;
  display: block;
}

.media-card audio {
  width: 100%;
}

.reader-text {
  font-size: 16px;
  line-height: 1.8;
  color: #5d4037;
  white-space: pre-wrap;
  min-height: 60px;
}

.cursor {
  animation: blink 0.8s infinite;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.reader-blessings {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px dashed #c8a864;
}

.reader-blessings h3 {
  color: #5d4037;
  font-size: 18px;
  margin-bottom: 15px;
}

.blessings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.blessing-note {
  padding: 15px;
  font-family: cursive, serif;
  font-size: 13px;
  color: #5d4037;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  line-height: 1.5;
}

.reader-locked {
  text-align: center;
  padding: 40px 20px;
}

.lock-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.reader-locked p {
  color: #5d4037;
  font-size: 16px;
  margin-bottom: 10px;
}

.lock-date {
  color: #8b7355;
  font-size: 14px;
  margin-bottom: 30px;
}

.add-blessing-btn {
  background: linear-gradient(180deg, #e91e63 0%, #c2185b 100%);
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 25px;
  font-size: 16px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 15px rgba(233, 30, 99, 0.3);
}

.add-blessing-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
}

.blessing-input {
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px dashed #c8a864;
}

.template-selector {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
  justify-content: center;
}

.template-option {
  width: 50px;
  height: 50px;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
}

.template-option.selected {
  border-color: #d4af37;
  transform: scale(1.1);
}

.blessing-input textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #c8a864;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.5);
  font-family: cursive, serif;
  font-size: 14px;
  color: #5d4037;
  resize: none;
  outline: none;
}

.blessing-input textarea:focus {
  border-color: #d4af37;
}

.submit-blessing-btn {
  margin-top: 10px;
  width: 100%;
  background: linear-gradient(180deg, #d4af37 0%, #b8941f 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 25px;
  font-size: 15px;
  cursor: pointer;
  transition: transform 0.2s;
}

.submit-blessing-btn:hover {
  transform: translateY(-2px);
}

.feather-fall-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 200;
  overflow: hidden;
}

.falling-feather {
  position: absolute;
  top: -50px;
  width: 30px;
  height: 50px;
  background: linear-gradient(180deg, #ffd700 0%, #daa520 100%);
  clip-path: ellipse(40% 50% at 50% 50%);
  animation: featherFall 0.8s ease-in forwards;
  animation-delay: calc(var(--i) * 0.1s);
  opacity: 0;
}

@keyframes featherFall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(100vh) rotate(360deg);
  }
}

.own-bottle-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
  color: white;
  padding: 12px 30px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: bold;
  z-index: 150;
  box-shadow: 0 4px 20px rgba(255, 140, 0, 0.4);
  animation: toastIn 0.5s ease, toastOut 0.5s ease 2s forwards;
}

@keyframes toastIn {
  from { transform: translateX(-50%) translateY(-50px); opacity: 0; }
  to { transform: translateX(-50%) translateY(0); opacity: 1; }
}

@keyframes toastOut {
  from { transform: translateX(-50%) translateY(0); opacity: 1; }
  to { transform: translateX(-50%) translateY(-50px); opacity: 0; }
}

.throw-animation {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 150;
  pointer-events: none;
  animation: throwAway 1.5s ease-in forwards;
}

@keyframes throwAway {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + 300px), calc(-50% + 400px)) scale(0.1) rotate(720deg);
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .glass-bottle {
    width: 140px;
    height: 210px;
  }
  
  .bottle-body {
    width: 126px;
    height: 154px;
  }
  
  .ocean-header h1 {
    font-size: 24px;
  }
  
  .bottle-reader-modal {
    padding: 20px;
  }
  
  .floating-bottle {
    animation: bottleFloatMobile 4s ease-in-out infinite;
  }
  
  @keyframes bottleFloatMobile {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
}
`;

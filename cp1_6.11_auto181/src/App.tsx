import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveAs } from 'file-saver';
import { useMeteorShower, Meteor } from './hooks/useMeteorShower';
import { StarWishBottle } from './components/StarWishBottle';
import { CONSTELLATION_TYPES, getUnlockedConstellations, generateWishText } from './utils/starData';

interface ExplosionParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface FlyingFragment {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  progress: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement>(null);
  const bottleRef = useRef<HTMLDivElement>(null);
  
  const [collectCount, setCollectCount] = useState(0);
  const [meteorFrequency, setMeteorFrequency] = useState(4);
  const [clickRadius, setClickRadius] = useState(25);
  const [maxCount, setMaxCount] = useState(30);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [bottlePosition, setBottlePosition] = useState({ x: 0, y: 0 });
  
  const explosionsRef = useRef<{ id: number; particles: ExplosionParticle[]; x: number; y: number }[]>([]);
  const fragmentsRef = useRef<FlyingFragment[]>([]);
  const particleIdRef = useRef(0);
  const fragmentIdRef = useRef(0);
  const animationFrameRef = useRef<number>(0);

  const handleMeteorClick = useCallback((meteor: Meteor, clickX: number, clickY: number) => {
    const particleCount = 12 + Math.floor(Math.random() * 7);
    const particles: ExplosionParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      const colorIndex = Math.floor(Math.random() * CONSTELLATION_TYPES.length);
      
      particles.push({
        id: particleIdRef.current++,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: CONSTELLATION_TYPES[colorIndex].color,
        size: 4 + Math.random() * 4,
        life: 0,
        maxLife: 600 + Math.random() * 400,
      });
    }

    const explosionId = Date.now();
    explosionsRef.current = [...explosionsRef.current, { id: explosionId, particles, x: clickX, y: clickY }];

    setTimeout(() => {
      explosionsRef.current = explosionsRef.current.filter(e => e.id !== explosionId);
    }, 1000);

    const bottleRect = bottleRef.current?.getBoundingClientRect();
    if (bottleRect) {
      const targetX = bottleRect.left + bottleRect.width / 2;
      const targetY = bottleRect.top + bottleRect.height / 3;
      
      const fragmentColor = CONSTELLATION_TYPES[Math.floor(Math.random() * CONSTELLATION_TYPES.length)].color;
      const fragmentId = fragmentIdRef.current++;
      
      fragmentsRef.current = [...fragmentsRef.current, {
        id: fragmentId,
        startX: clickX,
        startY: clickY,
        endX: targetX,
        endY: targetY,
        color: fragmentColor,
        progress: 0,
      }];

      setTimeout(() => {
        fragmentsRef.current = fragmentsRef.current.filter(f => f.id !== fragmentId);
        setCollectCount(prev => prev + 1);
      }, 800);
    }
  }, []);

  useMeteorShower({
    canvasRef,
    meteorFrequency,
    onMeteorClick: handleMeteorClick,
    clickRadius,
  });

  useEffect(() => {
    const canvas = effectCanvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = 0;

    const animate = (time: number) => {
      const deltaTime = lastTime ? time - lastTime : 16;
      lastTime = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      explosionsRef.current.forEach(explosion => {
        explosion.particles.forEach(particle => {
          particle.life += deltaTime;
          const dt = deltaTime / 1000;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vy += 200 * dt;
          particle.size *= 0.99;

          const lifeRatio = particle.life / particle.maxLife;
          let opacity = 1;
          if (lifeRatio > 0.7) {
            opacity = (1 - lifeRatio) / 0.3;
          }

          ctx.beginPath();
          ctx.arc(
            explosion.x + particle.x,
            explosion.y + particle.y,
            Math.max(0, particle.size),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = particle.color + Math.floor(opacity * 255).toString(16).padStart(2, '0');
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(
            explosion.x + particle.x,
            explosion.y + particle.y,
            Math.max(0, particle.size * 2),
            0,
            Math.PI * 2
          );
          const glowGradient = ctx.createRadialGradient(
            explosion.x + particle.x,
            explosion.y + particle.y,
            0,
            explosion.x + particle.x,
            explosion.y + particle.y,
            particle.size * 2
          );
          glowGradient.addColorStop(0, particle.color + Math.floor(opacity * 128).toString(16).padStart(2, '0'));
          glowGradient.addColorStop(1, particle.color + '00');
          ctx.fillStyle = glowGradient;
          ctx.fill();
        });
      });

      fragmentsRef.current.forEach(fragment => {
        fragment.progress = Math.min(fragment.progress + deltaTime / 800, 1);
        const t = fragment.progress;
        
        const cpX = fragment.startX + (fragment.endX - fragment.startX) * 0.2;
        const cpY = Math.min(fragment.startY, fragment.endY) - 150;
        
        const x = (1 - t) * (1 - t) * fragment.startX + 2 * (1 - t) * t * cpX + t * t * fragment.endX;
        const y = (1 - t) * (1 - t) * fragment.startY + 2 * (1 - t) * t * cpY + t * t * fragment.endY;

        const size = 10 + Math.sin(t * Math.PI) * 6;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fillStyle = fragment.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, size * 3, 0, Math.PI * 2);
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3);
        glowGradient.addColorStop(0, fragment.color + '99');
        glowGradient.addColorStop(1, fragment.color + '00');
        ctx.fillStyle = glowGradient;
        ctx.fill();

        if (t > 0.05) {
          const trailLength = 8;
          for (let i = 1; i <= trailLength; i++) {
            const trailT = t - i * 0.03;
            if (trailT < 0) break;
            const tx = (1 - trailT) * (1 - trailT) * fragment.startX + 2 * (1 - trailT) * trailT * cpX + trailT * trailT * fragment.endX;
            const ty = (1 - trailT) * (1 - trailT) * fragment.startY + 2 * (1 - trailT) * trailT * cpY + trailT * trailT * fragment.endY;
            
            const trailSize = size * (1 - i / trailLength) * 0.6;
            ctx.beginPath();
            ctx.arc(tx, ty, Math.max(0, trailSize), 0, Math.PI * 2);
            ctx.fillStyle = fragment.color + Math.floor((1 - i / trailLength) * 200).toString(16).padStart(2, '0');
            ctx.fill();
          }
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const updateBottlePosition = () => {
      const bottleRect = bottleRef.current?.getBoundingClientRect();
      if (bottleRect) {
        setBottlePosition({
          x: bottleRect.left + bottleRect.width / 2,
          y: bottleRect.top + bottleRect.height / 3,
        });
      }
    };

    updateBottlePosition();
    window.addEventListener('resize', updateBottlePosition);
    return () => window.removeEventListener('resize', updateBottlePosition);
  }, []);

  const handleExport = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(400, 300, 0, 400, 300, 500);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(0.5, '#1a1a4a');
    gradient.addColorStop(1, '#0d0d2b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 800;
      const y = Math.random() * 600;
      const size = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
      ctx.fill();
    }

    const unlocked = getUnlockedConstellations(collectCount);
    const totalConstellations = CONSTELLATION_TYPES.length;
    const radius = 180;
    const centerX = 400;
    const centerY = 250;

    CONSTELLATION_TYPES.forEach((constellation, index) => {
      const angle = (index / totalConstellations) * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const isUnlocked = unlocked.some(u => u.id === constellation.id);

      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      if (isUnlocked) {
        const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
        glowGradient.addColorStop(0, constellation.color + '66');
        glowGradient.addColorStop(1, constellation.color + '00');
        ctx.fillStyle = glowGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fillStyle = constellation.color + '33';
        ctx.fill();
        ctx.strokeStyle = constellation.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isUnlocked ? '#ffffff' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(constellation.symbol, x, y);

      ctx.font = '12px "Inter", sans-serif';
      ctx.fillStyle = isUnlocked ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)';
      ctx.fillText(constellation.name, x, y + 40);
    });

    const wishText = generateWishText(collectCount);
    ctx.font = '20px "Ma Shan Zheng", cursive';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(136, 170, 255, 0.8)';
    ctx.shadowBlur = 10;

    const maxWidth = 600;
    const words = wishText.split('');
    let line = '';
    let lines: string[] = [];
    let y = 480;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i];
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    lines.forEach((l, i) => {
      ctx.fillText(l, 400, y + i * 30);
    });

    ctx.shadowBlur = 0;
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText(`已收集 ${collectCount} 颗流星碎片`, 400, 560);

    ctx.font = '12px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('星座许愿图鉴 · Star Wish Atlas', 400, 580);

    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, '星座许愿图鉴.png');
      }
    }, 'image/png');
  }, [collectCount]);

  const unlockedConstellations = getUnlockedConstellations(collectCount);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      <canvas
        ref={effectCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10,
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 300,
            color: 'rgba(255, 255, 255, 0.9)',
            textShadow: '0 0 20px rgba(136, 170, 255, 0.5)',
            letterSpacing: '2px',
            marginBottom: '8px',
          }}
        >
          等待流星划过，点击收集碎片
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)', letterSpacing: '1px' }}>
          Wait for the meteor, click to collect fragments
        </p>
      </motion.div>

      <motion.div
        initial={{ x: panelCollapsed ? -220 : 0, opacity: 1 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: panelCollapsed ? '60px' : '220px',
          zIndex: 20,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'rgba(20, 20, 60, 0.4)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            padding: panelCollapsed ? '15px 10px' : '20px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
          }}
        >
          <button
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            style={{
              position: 'absolute',
              top: '15px',
              right: '-12px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: 'rgba(136, 170, 255, 0.3)',
              border: '1px solid rgba(136, 170, 255, 0.5)',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 0 10px rgba(136, 170, 255, 0.8)';
              e.currentTarget.style.borderWidth = '2px';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.borderWidth = '1px';
            }}
          >
            {panelCollapsed ? '→' : '←'}
          </button>

          {!panelCollapsed && (
            <>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '5px',
                letterSpacing: '1px',
              }}>
                ⚙️ 控制面板
              </h3>

              <div>
                <label style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  流星频率
                </label>
                <input
                  type="range"
                  min="3"
                  max="8"
                  step="0.5"
                  value={meteorFrequency}
                  onChange={(e) => setMeteorFrequency(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                }}>
                  <span>慢</span>
                  <span>{meteorFrequency.toFixed(1)}s</span>
                  <span>快</span>
                </div>
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  点击灵敏度
                </label>
                <input
                  type="range"
                  min="10"
                  max="40"
                  step="1"
                  value={clickRadius}
                  onChange={(e) => setClickRadius(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                }}>
                  <span>精确</span>
                  <span>{clickRadius}px</span>
                  <span>宽松</span>
                </div>
              </div>

              <div>
                <label style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'block',
                  marginBottom: '6px',
                }}>
                  满瓶阈值
                </label>
                <input
                  type="range"
                  min="20"
                  max="40"
                  step="1"
                  value={maxCount}
                  onChange={(e) => setMaxCount(Number(e.target.value))}
                  style={{
                    width: '100%',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    appearance: 'none',
                    cursor: 'pointer',
                  }}
                />
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: '4px',
                }}>
                  <span>易满</span>
                  <span>{maxCount}次</span>
                  <span>难满</span>
                </div>
              </div>

              <div style={{
                marginTop: '10px',
                paddingTop: '15px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                }}>
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    已收集
                  </span>
                  <span style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#ffffff',
                    textShadow: '0 0 10px rgba(136, 170, 255, 0.8)',
                  }}>
                    {collectCount}
                  </span>
                </div>

                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '10px',
                }}>
                  已解锁星座 ({unlockedConstellations.length}/8)
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                }}>
                  {CONSTELLATION_TYPES.map((constellation) => {
                    const isUnlocked = unlockedConstellations.some(u => u.id === constellation.id);
                    return (
                      <div
                        key={constellation.id}
                        title={isUnlocked ? constellation.name : `收集${constellation.unlockAt}次解锁`}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          background: isUnlocked
                            ? `${constellation.color}33`
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isUnlocked ? constellation.color : 'rgba(255, 255, 255, 0.2)'}`,
                          boxShadow: isUnlocked
                            ? `0 0 10px ${constellation.color}66`
                            : 'none',
                          transition: 'all 0.3s ease',
                          cursor: 'default',
                          opacity: isUnlocked ? 1 : 0.4,
                        }}
                      >
                        {constellation.symbol}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {panelCollapsed && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '15px',
              paddingTop: '30px',
            }}>
              <span title="控制面板" style={{ fontSize: '20px' }}>⚙️</span>
              <div style={{
                textAlign: 'center',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.7)',
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{collectCount}</div>
                <div>碎片</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        onClick={handleExport}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 20,
          padding: '10px 20px',
          borderRadius: '8px',
          background: 'rgba(136, 170, 255, 0.2)',
          border: '1px solid rgba(136, 170, 255, 0.4)',
          color: 'white',
          fontSize: '14px',
          cursor: 'pointer',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          fontFamily: "'Inter', sans-serif",
          letterSpacing: '1px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 15px rgba(136, 170, 255, 0.6)';
          e.currentTarget.style.borderWidth = '2px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderWidth = '1px';
        }}
      >
        📷 导出图鉴
      </motion.button>

      <div
        ref={bottleRef}
        style={{
          position: 'absolute',
          bottom: '30px',
          right: '40px',
          zIndex: 15,
        }}
      >
        <StarWishBottle collectCount={collectCount} maxCount={maxCount} />
      </div>
    </div>
  );
}

import { useState, useMemo, useRef, CSSProperties, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameStage } from '../App';

interface Props {
  stage: GameStage;
  onBottleOpened: () => void;
  onInkPlaced: () => void;
}

interface ParticleSeed {
  id: number;
  dx: number;
  dy: number;
  rotate: number;
  scale: number;
  delay: number;
}

interface WaxShard {
  id: number;
  x: number;
  y: number;
  rot: number;
  points: string;
}

export default function Workbench({ stage, onBottleOpened, onInkPlaced }: Props) {
  const [opened, setOpened] = useState(false);
  const [inkDragged, setInkDragged] = useState(false);
  const bottleRef = useRef<HTMLDivElement>(null);

  const particles: ParticleSeed[] = useMemo(() => {
    const arr: ParticleSeed[] = [];
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 80;
      arr.push({
        id: i,
        dx: Math.cos(angle) * r,
        dy: Math.sin(angle) * r - 30,
        rotate: Math.random() * 360,
        scale: 0.4 + Math.random() * 1.6,
        delay: Math.random() * 0.25,
      });
    }
    return arr;
  }, []);

  const waxShards: WaxShard[] = useMemo(() => {
    const base = [
      { points: '0,0 12,4 6,14 -2,10', x: -50, y: -40, rot: -75 },
      { points: '0,0 14,2 8,12 -4,8', x: -18, y: -58, rot: -30 },
      { points: '0,0 10,6 2,14 -8,6', x: 22, y: -56, rot: 20 },
      { points: '0,0 12,3 4,12 -6,10', x: 54, y: -38, rot: 65 },
      { points: '0,0 9,5 -2,13 -10,4', x: 44, y: -8, rot: 110 },
      { points: '0,0 11,4 0,12 -9,7', x: -44, y: -10, rot: -120 },
    ];
    return base.map((s, i) => ({ id: i, ...s }));
  }, []);

  const showInkBlock = (stage === 'bottle_opened' && !inkDragged) || stage === 'bottle_opened';
  const inkBlockDraggable = stage === 'bottle_opened' && !inkDragged;

  const handleBottleClick = () => {
    if (!opened && stage === 'idle') {
      setOpened(true);
      setTimeout(() => onBottleOpened(), 700);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData('text/plain', 'ink-block');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    // 检查墨块是否被放到分析仪（由分析仪端触发onInkPlaced）
    // 这里设置一个超时检测，如果没有在短时间内接收，则不移动
  };

  // 监听全局自定义事件 ink-placed
  useMemo(() => {
    if (typeof window !== 'undefined') {
      const handler = () => {
        setInkDragged(true);
        onInkPlaced();
      };
      window.addEventListener('ink-placed-in-analyzer', handler as EventListener);
      return () =>
        window.removeEventListener('ink-placed-in-analyzer', handler as EventListener);
    }
    return undefined;
  }, [onInkPlaced]);

  const workbenchStyle: CSSProperties = {
    position: 'relative',
    background:
      'repeating-linear-gradient(92deg, #3d2a1a 0px, #4a3220 2px, #3d2a1a 4px, #422d1c 8px), linear-gradient(180deg, #5a3e2b 0%, #3a2515 100%)',
    borderRadius: '12px',
    border: '2px solid #c9a96e',
    padding: '60px 40px 40px',
    minHeight: '340px',
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,220,170,0.08), inset 0 -2px 20px rgba(0,0,0,0.4)',
  };

  const labelStyle: CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: "'Dancing Script', cursive",
    fontSize: '22px',
    color: '#f5e8c8',
    letterSpacing: '2px',
    borderBottom: '1px solid #c9a96e',
    paddingBottom: '4px',
  };

  const bottleContainer: CSSProperties = {
    position: 'relative',
    width: '260px',
    height: '280px',
    margin: '0 auto',
    cursor: !opened && stage === 'idle' ? 'pointer' : 'default',
  };

  const inkBlockStyle: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '170px',
    transform: 'translateX(-50%)',
    width: '52px',
    height: '38px',
    borderRadius: '3px 3px 6px 6px',
    background:
      'linear-gradient(180deg, #1a1410 0%, #2a1f17 50%, #0e0a07 100%)',
    boxShadow:
      '0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(120,80,60,0.25), inset 0 -1px 0 rgba(0,0,0,0.8)',
    border: '1px solid #3a2a1e',
    cursor: inkBlockDraggable ? 'grab' : 'default',
    willChange: 'transform',
    zIndex: 15,
  };

  const dustStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.5,
    backgroundImage:
      "radial-gradient(circle at 20% 30%, rgba(200,180,140,0.15) 1px, transparent 2px), radial-gradient(circle at 65% 45%, rgba(200,180,140,0.12) 1px, transparent 2px), radial-gradient(circle at 35% 75%, rgba(200,180,140,0.1) 1px, transparent 2px)",
  };

  return (
    <div style={workbenchStyle}>
      <div style={labelStyle}>~ 调 制 台 · Workbench ~</div>
      <div style={dustStyle} />

      <div style={bottleContainer} ref={bottleRef} onClick={handleBottleClick}>
        {/* 瓶口封蜡 - 初始状态 */}
        <AnimatePresence>
          {!opened && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '30px',
                transform: 'translateX(-50%)',
                width: '80px',
                height: '60px',
                zIndex: 20,
              }}
            >
              <svg viewBox="0 0 80 60" width="80" height="60">
                <defs>
                  <radialGradient id="waxGrad" cx="40%" cy="35%" r="70%">
                    <stop offset="0%" stopColor="#8b3a2a" />
                    <stop offset="50%" stopColor="#6b2517" />
                    <stop offset="100%" stopColor="#3d1508" />
                  </radialGradient>
                </defs>
                <path
                  d="M8,48 Q6,30 16,18 Q28,8 40,10 Q54,6 64,20 Q74,32 72,50 Q60,58 40,56 Q20,58 8,48 Z"
                  fill="url(#waxGrad)"
                  stroke="#2a0e06"
                  strokeWidth="1"
                />
                <path
                  d="M22,24 Q30,20 40,22 Q52,20 58,26"
                  stroke="#2a0e06"
                  strokeWidth="0.8"
                  fill="none"
                  opacity="0.7"
                />
                <ellipse cx="28" cy="30" rx="3" ry="2" fill="#a85040" opacity="0.6" />
                <ellipse cx="50" cy="36" rx="2" ry="1.5" fill="#a85040" opacity="0.5" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 封蜡碎片飞散 */}
        <AnimatePresence>
          {opened &&
            waxShards.map((s) => (
              <motion.div
                key={`wax-${s.id}`}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                animate={{ x: s.x, y: s.y, rotate: s.rot, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '55px',
                  transformOrigin: 'center',
                  zIndex: 25,
                  marginLeft: '-6px',
                }}
              >
                <svg width="20" height="20" viewBox="-10 -8 24 22">
                  <polygon
                    points={s.points}
                    fill="#6b2517"
                    stroke="#2a0e06"
                    strokeWidth="0.8"
                  />
                </svg>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* 黑色雾气粒子 */}
        <AnimatePresence>
          {opened &&
            particles.map((p) => (
              <motion.div
                key={`p-${p.id}`}
                initial={{ x: 0, y: 0, opacity: 0.9, scale: 0.3 }}
                animate={{
                  x: p.dx,
                  y: p.dy,
                  opacity: 0,
                  scale: p.scale,
                  rotate: p.rotate,
                }}
                transition={{
                  duration: 1.6,
                  delay: p.delay,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '55px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, #0a0a0a 0%, #1a1a1a 40%, rgba(10,10,10,0) 100%)',
                  marginLeft: '-6px',
                  zIndex: 18,
                  willChange: 'transform, opacity',
                  pointerEvents: 'none',
                }}
              />
            ))}
        </AnimatePresence>

        {/* 玻璃墨水瓶SVG */}
        <svg
          viewBox="0 0 200 280"
          width="200"
          height="280"
          style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            transform: 'translateX(-50%)',
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.5))',
          }}
        >
          <defs>
            <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(180, 210, 200, 0.35)" />
              <stop offset="30%" stopColor="rgba(120, 160, 150, 0.25)" />
              <stop offset="70%" stopColor="rgba(80, 120, 110, 0.3)" />
              <stop offset="100%" stopColor="rgba(60, 100, 90, 0.2)" />
            </linearGradient>
            <linearGradient id="glassThickness" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="8%" stopColor="rgba(255,255,255,0)" />
              <stop offset="85%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
            </linearGradient>
            <linearGradient id="bottleNeck" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(200, 220, 210, 0.4)" />
              <stop offset="50%" stopColor="rgba(120, 160, 150, 0.25)" />
              <stop offset="100%" stopColor="rgba(70, 110, 100, 0.35)" />
            </linearGradient>
            <linearGradient id="inkInside" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0e1a14" />
              <stop offset="100%" stopColor="#050a08" />
            </linearGradient>
            <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <filter id="bottleShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>

          {/* 瓶身阴影 */}
          <ellipse cx="100" cy="268" rx="70" ry="6" fill="rgba(0,0,0,0.35)" filter="url(#bottleShadow)" />

          {/* 瓶身主体 */}
          <path
            d="M58,90 Q50,95 46,110 L36,190 Q32,240 62,260 Q100,272 138,260 Q168,240 164,190 L154,110 Q150,95 142,90 Z"
            fill="url(#glassBody)"
            stroke="#c9a96e"
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />

          {/* 瓶内墨水（干涸底部） */}
          {opened && (
            <path
              d="M50,200 Q44,245 70,258 Q100,268 130,258 Q156,245 150,200 Q120,215 100,215 Q80,215 50,200 Z"
              fill="url(#inkInside)"
              opacity="0.95"
            />
          )}
          {!opened && (
            <path
              d="M46,140 Q40,230 68,258 Q100,270 132,258 Q160,230 154,140 Q128,160 100,160 Q72,160 46,140 Z"
              fill="url(#inkInside)"
              opacity="0.95"
            />
          )}

          {/* 厚度玻璃边缘 */}
          <path
            d="M58,90 Q50,95 46,110 L36,190 Q32,240 62,260"
            fill="none"
            stroke="url(#glassThickness)"
            strokeWidth="4"
          />

          {/* 瓶身高光 */}
          <path
            d="M62,110 Q58,160 60,220 Q64,245 74,255"
            stroke="url(#highlight)"
            strokeWidth="5"
            fill="none"
            opacity="0.8"
            strokeLinecap="round"
          />
          <ellipse cx="130" cy="150" rx="2" ry="18" fill="rgba(255,255,255,0.25)" transform="rotate(5 130 150)" />

          {/* 瓶口 */}
          <rect x="78" y="50" width="44" height="45" rx="3" fill="url(#bottleNeck)" stroke="#c9a96e" strokeWidth="1" strokeOpacity="0.4" />
          <rect x="74" y="45" width="52" height="10" rx="2" fill="rgba(160, 190, 180, 0.4)" stroke="#c9a96e" strokeWidth="1" strokeOpacity="0.5" />
          <rect x="80" y="55" width="6" height="32" rx="2" fill="rgba(255,255,255,0.25)" />

          {/* 瓶塞（开瓶后向上弹飞） */}
          <AnimatePresence>
            <motion.g
              initial={false}
              animate={opened ? { y: -140, rotate: -15, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ transformOrigin: '100px 40px' }}
            >
              <defs>
                <pattern id="corkPattern" x="0" y="0" width="8" height="4" patternUnits="userSpaceOnUse">
                  <rect width="8" height="4" fill="#9a6b3f" />
                  <path d="M0,2 Q4,0 8,2 M0,4 Q4,2 8,4" stroke="#6b4520" strokeWidth="0.6" fill="none" />
                </pattern>
              </defs>
              <rect x="82" y="16" width="36" height="32" rx="3" fill="url(#corkPattern)" stroke="#5a3818" strokeWidth="1" />
              <ellipse cx="100" cy="16" rx="18" ry="3" fill="#b07d4a" stroke="#5a3818" strokeWidth="0.8" />
              <line x1="88" y1="24" x2="88" y2="44" stroke="#5a3818" strokeWidth="0.4" opacity="0.6" />
              <line x1="112" y1="24" x2="112" y2="44" stroke="#5a3818" strokeWidth="0.4" opacity="0.6" />
            </motion.g>
          </AnimatePresence>

          {/* 瓶身古董标签 */}
          <g transform="translate(60, 150)">
            <rect
              x="0"
              y="0"
              width="80"
              height="62"
              rx="2"
              fill="#f0e0b8"
              stroke="#8a6838"
              strokeWidth="0.8"
              opacity="0.92"
            />
            <text
              x="40"
              y="22"
              fontFamily="'Dancing Script', cursive"
              fontSize="13"
              fill="#5a3818"
              textAnchor="middle"
            >
              Antique Ink
            </text>
            <line x1="10" y1="30" x2="70" y2="30" stroke="#8a6838" strokeWidth="0.4" opacity="0.5" />
            <text
              x="40"
              y="42"
              fontFamily="'Courier Prime', monospace"
              fontSize="7"
              fill="#5a3818"
              textAnchor="middle"
              letterSpacing="1"
            >
              No. 1847 · MMXX
            </text>
            <text
              x="40"
              y="54"
              fontFamily="'Cormorant Garamond', serif"
              fontSize="8"
              fill="#5a3818"
              textAnchor="middle"
              fontStyle="italic"
            >
              — Unopened —
            </text>
          </g>
        </svg>

        {/* 干涸墨块 - 可拖拽 */}
        <AnimatePresence>
          {showInkBlock && inkBlockDraggable && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: 0.9, ease: 'easeOut' }}
              style={inkBlockStyle}
              draggable={inkBlockDraggable}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              title="拖拽至右侧光谱分析仪"
              whileHover={inkBlockDraggable ? { scale: 1.08, y: -4 } : {}}
              whileTap={inkBlockDraggable ? { cursor: 'grabbing' } : {}}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'inherit',
                  background:
                    'radial-gradient(ellipse at 30% 30%, rgba(100,70,50,0.25), transparent 70%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '6px',
                  right: '6px',
                  height: '1px',
                  background: 'rgba(120,80,50,0.4)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 提示文字 */}
      <div
        style={{
          textAlign: 'center',
          marginTop: '20px',
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '15px',
          color: '#c9a96e',
          opacity: 0.9,
          letterSpacing: '1px',
        }}
      >
        {stage === 'idle' && '✦ 轻触墨水瓶开启尘封岁月 ✦'}
        {stage === 'bottle_opened' && !inkDragged && '✦ 持墨块至右方光谱分析仪 ✦'}
        {inkDragged && '✦ 墨块已移送，准备分析 ✦'}
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { StringState } from './App';

interface TuningPanelProps {
  strings: StringState[];
  onTensionChange: (id: number, tension: number) => void;
  onStringPluck: (stringId: number, position: number) => void;
}

interface PluckAnimation {
  stringId: number;
  position: number;
  startTime: number;
  direction: number;
}

const QIN_WIDTH = 800;
const QIN_HEIGHT = 220;
const STRING_START_X = 80;
const STRING_END_X = QIN_WIDTH - 80;
const STRING_AREA_TOP = 60;
const STRING_AREA_BOTTOM = QIN_HEIGHT - 60;
const STRING_COUNT = 7;
const CANVAS_PADDING = 10;

const HUI_POSITIONS = [0.05, 0.08, 0.12, 0.17, 0.24, 0.33, 0.43, 0.5, 0.57, 0.67, 0.76, 0.83, 0.88];

const tensionToColor = (tension: number): string => {
  const t = Math.min(Math.max((tension - 0.2) / (2.0 - 0.2), 0), 1);
  const hue = 270 - t * 210;
  return `hsl(${hue}, 75%, 55%)`;
};

const getStringY = (index: number): number => {
  const spacing = (STRING_AREA_BOTTOM - STRING_AREA_TOP) / (STRING_COUNT - 1);
  return STRING_AREA_TOP + spacing * index;
};

const calcFrequency = (baseFreq: number, tension: number): number => {
  return baseFreq * Math.sqrt(tension);
};

const TuningPanel: React.FC<TuningPanelProps> = ({ strings, onTensionChange, onStringPluck }) => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const pluckAnimationsRef = useRef<PluckAnimation[]>([]);
  const wavePhaseRef = useRef<number[]>(Array(STRING_COUNT).fill(0));
  const [pluckVisuals, setPluckVisuals] = useState<{ stringId: number; offset: number; key: number }[]>([]);
  const pluckKeyRef = useRef(0);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playTone = useCallback((baseFreq: number, tension: number, position: number) => {
    try {
      const ctx = getAudioCtx();
      const freq = calcFrequency(baseFreq, tension);
      const now = ctx.currentTime;
      const duration = 2.2;
      const harmonics = [1, 2, 3, 4, 5];
      const harmonicGains = [1.0, 0.5, 0.25, 0.12, 0.06];
      const posFactor = position < 0.15 || position > 0.85 ? 0.6 : 1.0;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(0.35 * posFactor, now + 0.005);
      masterGain.gain.exponentialRampToValueAtTime(0.2, now + 0.2);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      masterGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 4500;
      filter.Q.value = 0.8;
      filter.connect(masterGain);

      harmonics.forEach((h, i) => {
        const osc = ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * h, now);

        const g = ctx.createGain();
        g.gain.value = harmonicGains[i];
        osc.connect(g);
        g.connect(filter);

        osc.start(now);
        osc.stop(now + duration + 0.05);
      });
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  }, [getAudioCtx]);

  const handleStringClick = useCallback((stringId: number, clickX: number, clickY: number, svgRect: DOMRect) => {
    const svgX = (clickX - svgRect.left) * (QIN_WIDTH / svgRect.width);
    const relX = (svgX - STRING_START_X) / (STRING_END_X - STRING_START_X);
    const position = Math.min(Math.max(relX, 0), 1);

    playTone(strings[stringId].baseFreq, strings[stringId].tension, position);
    onStringPluck(stringId, position);

    const direction = Math.random() > 0.5 ? 1 : -1;
    pluckAnimationsRef.current.push({
      stringId,
      position,
      startTime: performance.now(),
      direction
    });

    const key = ++pluckKeyRef.current;
    setPluckVisuals(prev => [...prev, { stringId, offset: direction * 8, key }]);
    setTimeout(() => {
      setPluckVisuals(prev => prev.filter(p => p.key !== key));
    }, 300);
  }, [strings, playTone, onStringPluck]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.clearRect(0, 0, cssW, cssH);
      const now = performance.now();

      const startX = CANVAS_PADDING + (STRING_START_X / QIN_WIDTH) * (cssW - 2 * CANVAS_PADDING);
      const endX = CANVAS_PADDING + (STRING_END_X / QIN_WIDTH) * (cssW - 2 * CANVAS_PADDING);
      const waveStartY = 12;
      const waveSpacing = (cssH - waveStartY - 10) / STRING_COUNT;

      for (let si = 0; si < STRING_COUNT; si++) {
        const tension = strings[si]?.tension ?? 1.0;
        const t = Math.min(Math.max((tension - 0.2) / (2.0 - 0.2), 0), 1);
        const baseWavelength = 70 + (1 - t) * 110;
        const amplitude = 6 + (1 - t) * 7;
        const waveSpeed = 0.006 + t * 0.012;

        wavePhaseRef.current[si] += waveSpeed;
        const phase = wavePhaseRef.current[si];
        const color = tensionToColor(tension);

        const cy = waveStartY + waveSpacing * si + waveSpacing / 2 - 10;

        let pluckBoost = 0;
        let pluckPhaseOffset = 0;
        pluckAnimationsRef.current = pluckAnimationsRef.current.filter(p => {
          if (p.stringId !== si) return true;
          const elapsed = now - p.startTime;
          if (elapsed > 1800) return false;
          const decay = Math.exp(-elapsed / 500);
          pluckBoost = 10 * decay;
          pluckPhaseOffset = (p.position - 0.5) * Math.PI * 2;
          return true;
        });

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;

        for (let px = 0; px <= cssW - 2 * CANVAS_PADDING; px += 2) {
          const x = startX + px;
          const rel = px / (endX - startX);
          const envelope = Math.sin(Math.PI * rel);
          const nodes = Math.floor(1 + t * 5);
          const standingWave = Math.sin(nodes * Math.PI * rel);
          const travelingWave = Math.sin(px / baseWavelength * Math.PI * 2 + phase + pluckPhaseOffset);
          const combined = standingWave * travelingWave;
          const y = cy + combined * envelope * (amplitude + pluckBoost);
          if (px === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#8a7f6e';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${si + 1}弦`, startX - 8, cy + 4);

        ctx.fillStyle = tensionToColor(tension);
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`T=${tension.toFixed(2)}`, endX + 8, cy + 4);
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [strings]);

  const svgMarkup = useMemo(() => {
    const huiElements = HUI_POSITIONS.map((pos, i) => {
      const x = STRING_START_X + pos * (STRING_END_X - STRING_START_X);
      const yTop = STRING_AREA_TOP - 28;
      const yBot = STRING_AREA_BOTTOM + 28;
      const isLarge = Math.abs(pos - 0.5) < 0.001;
      const isHalf = [0.24, 0.33, 0.43, 0.57, 0.67, 0.76].includes(pos);
      const r = isLarge ? 5 : isHalf ? 3.5 : 2.8;
      return (
        <g key={`hui-${i}`}>
          <circle cx={x} cy={yTop} r={r} fill="#d4a017" stroke="#8b6914" strokeWidth="0.5" />
          <circle cx={x} cy={yBot} r={r} fill="#d4a017" stroke="#8b6914" strokeWidth="0.5" />
        </g>
      );
    });

    const stringElements = strings.map((s, i) => {
      const y = getStringY(i);
      const color = tensionToColor(s.tension);
      return (
        <g key={`str-${i}`}>
          <line
            x1={STRING_START_X}
            y1={y}
            x2={STRING_END_X}
            y2={y}
            stroke="#8a7f6e"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <line
            x1={STRING_START_X}
            y1={y}
            x2={STRING_END_X}
            y2={y}
            stroke={color}
            strokeWidth="0.6"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      );
    });

    return (
      <svg
        ref={svgRef}
        viewBox={`0 0 ${QIN_WIDTH} ${QIN_HEIGHT}`}
        width="100%"
        style={{ display: 'block', cursor: 'pointer', borderRadius: '8px' }}
        onClick={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const svgX = (e.clientX - rect.left) * (QIN_WIDTH / rect.width);
          const svgY = (e.clientY - rect.top) * (QIN_HEIGHT / rect.height);
          if (svgX < STRING_START_X || svgX > STRING_END_X) return;
          let closestId = 0;
          let minDist = Infinity;
          for (let i = 0; i < STRING_COUNT; i++) {
            const d = Math.abs(svgY - getStringY(i));
            if (d < minDist) {
              minDist = d;
              closestId = i;
            }
          }
          if (minDist < 20) {
            handleStringClick(closestId, e.clientX, e.clientY, rect);
          }
        }}
      >
        <defs>
          <linearGradient id="qinBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7a4a22" />
            <stop offset="40%" stopColor="#5c3a21" />
            <stop offset="100%" stopColor="#3d2613" />
          </linearGradient>
          <linearGradient id="qinHighlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(212,160,23,0.15)" />
            <stop offset="50%" stopColor="rgba(212,160,23,0.35)" />
            <stop offset="100%" stopColor="rgba(212,160,23,0.15)" />
          </linearGradient>
          <filter id="qinShadow" x="-5%" y="-10%" width="110%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.35" />
          </filter>
        </defs>

        <g filter="url(#qinShadow)">
          <rect x="20" y="18" width={QIN_WIDTH - 40} height={QIN_HEIGHT - 36} rx="16" ry="16" fill="url(#qinBodyGrad)" stroke="#b8860b" strokeWidth="1.5" />
          <rect x="30" y="28" width={QIN_WIDTH - 60} height={QIN_HEIGHT - 56} rx="12" ry="12" fill="none" stroke="rgba(212,160,23,0.25)" strokeWidth="0.8" />

          <rect x={STRING_START_X - 10} y="22" width="20" height={QIN_HEIGHT - 44} rx="2" fill="url(#qinHighlightGrad)" stroke="#8b6914" strokeWidth="0.8" />
          <text x={STRING_START_X} y="14" fill="#d4a017" fontSize="10" textAnchor="middle" fontFamily="serif" opacity="0.8">岳山</text>

          <rect x={STRING_END_X - 10} y="22" width="20" height={QIN_HEIGHT - 44} rx="2" fill="url(#qinHighlightGrad)" stroke="#8b6914" strokeWidth="0.8" />
          <text x={STRING_END_X} y="14" fill="#d4a017" fontSize="10" textAnchor="middle" fontFamily="serif" opacity="0.8">龙龈</text>

          {huiElements}
          {stringElements}

          {pluckVisuals.map(pv => {
            const y = getStringY(pv.stringId);
            return (
              <motion.line
                key={pv.key}
                initial={{ y1: y, y2: y }}
                animate={{
                  y1: [y, y + pv.offset, y],
                  y2: [y, y + pv.offset, y]
                }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                x1={STRING_START_X}
                x2={STRING_END_X}
                stroke="#f5e6c8"
                strokeWidth="1.5"
                opacity="0.9"
                style={{ pointerEvents: 'none' }}
              />
            );
          })}
        </g>
      </svg>
    );
  }, [strings, pluckVisuals, handleStringClick]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>七弦琴身</h2>
          <span style={styles.cardHint}>点击弦线任意位置以拨奏</span>
        </div>
        <div style={styles.qinContainer}>
          {svgMarkup}
        </div>
        <div style={styles.canvasContainer}>
          <canvas ref={canvasRef} style={styles.waveCanvas} />
        </div>
      </div>

      <div style={{ ...styles.card, marginTop: '20px' }}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>弦张力控制</h2>
          <span style={styles.cardHint}>张力范围 0.2 ~ 2.0</span>
        </div>
        <div style={styles.slidersContainer}>
          {strings.map((s, i) => {
            const color = tensionToColor(s.tension);
            return (
              <div key={s.id} style={styles.sliderRow}>
                <span style={{ ...styles.sliderLabel, color }}>
                  {s.note}弦
                </span>
                <div style={styles.sliderTrackWrap}>
                  <div style={styles.sliderTrackBg} />
                  <div
                    style={{
                      ...styles.sliderTrackFill,
                      width: `${((s.tension - 0.2) / 1.8) * 100}%`,
                      background: `linear-gradient(90deg, ${tensionToColor(0.3)}, ${color})`
                    }}
                  />
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.01"
                    value={s.tension}
                    onChange={e => onTensionChange(s.id, parseFloat(e.target.value))}
                    onMouseUp={() => playTone(s.baseFreq, s.tension, 0.5)}
                    style={{
                      ...styles.sliderInput,
                      accentColor: color
                    }}
                  />
                </div>
                <span style={{ ...styles.sliderValue, color }}>
                  {s.tension.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%'
  },
  card: {
    background: 'rgba(245, 230, 200, 0.6)',
    border: '1px solid #b8860b',
    borderRadius: '8px',
    padding: '20px',
    backdropFilter: 'blur(6px)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    boxShadow: '0 2px 12px rgba(92, 58, 33, 0.15)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(184, 134, 11, 0.3)'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#2a1f14',
    letterSpacing: '3px',
    margin: 0
  },
  cardHint: {
    fontSize: '12px',
    color: '#8a7f6e',
    letterSpacing: '1px'
  },
  qinContainer: {
    width: '100%',
    background: 'linear-gradient(180deg, rgba(245,230,200,0.4) 0%, rgba(212,160,23,0.08) 100%)',
    borderRadius: '8px',
    padding: '10px',
    border: '1px solid rgba(184, 134, 11, 0.25)'
  },
  canvasContainer: {
    marginTop: '14px',
    border: '1px solid rgba(184, 134, 11, 0.3)',
    borderRadius: '6px',
    padding: '4px',
    background: 'rgba(42, 31, 20, 0.04)'
  },
  waveCanvas: {
    width: '100%',
    height: '240px',
    display: 'block',
    borderRadius: '4px'
  },
  slidersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  sliderRow: {
    display: 'grid',
    gridTemplateColumns: '56px 1fr 64px',
    alignItems: 'center',
    gap: '14px'
  },
  sliderLabel: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '2px',
    textAlign: 'right'
  },
  sliderTrackWrap: {
    position: 'relative',
    height: '24px',
    display: 'flex',
    alignItems: 'center'
  },
  sliderTrackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '6px',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, #e0d5c3 0%, #6b4a2e 100%)'
  },
  sliderTrackFill: {
    position: 'absolute',
    left: 0,
    height: '6px',
    borderRadius: '3px',
    opacity: 0.85,
    pointerEvents: 'none'
  },
  sliderInput: {
    position: 'relative',
    width: '100%',
    height: '24px',
    margin: 0,
    appearance: 'none',
    WebkitAppearance: 'none',
    background: 'transparent',
    cursor: 'pointer',
    zIndex: 2
  },
  sliderValue: {
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 600,
    textAlign: 'center',
    background: 'rgba(42, 31, 20, 0.08)',
    padding: '4px 8px',
    borderRadius: '4px'
  }
};

export default TuningPanel;

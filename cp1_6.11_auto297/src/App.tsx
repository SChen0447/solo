import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShrimpSim, ShrimpInfo } from './ShrimpSim';
import { VentRenderer } from './VentRenderer';
import { BiofilmManager } from './BiofilmManager';
import { Panel } from './ui/Panel';

interface BackgroundParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

const BG_PARTICLE_COUNT = 80;
const SHRIMP_COUNT = 50;
const LOW_QUALITY_THRESHOLD = 80;
const ACHIEVEMENT_BIOFILM = 0.4;
const ACHIEVEMENT_GATHERING = 0.7;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [temperature, setTemperature] = useState(50);
  const [ph, setPh] = useState(7.0);
  const [sulfide, setSulfide] = useState(5);
  const [isMobile, setIsMobile] = useState(false);
  const [achievementVisible, setAchievementVisible] = useState(false);
  const [hoveredShrimp, setHoveredShrimp] = useState<ShrimpInfo | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [biofilmCoverage, setBiofilmCoverage] = useState(0);
  const [gatheringRatio, setGatheringRatio] = useState(0);

  const shrimpSimRef = useRef<ShrimpSim | null>(null);
  const ventRendererRef = useRef<VentRenderer | null>(null);
  const biofilmManagerRef = useRef<BiofilmManager | null>(null);
  const bgParticlesRef = useRef<BackgroundParticle[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const achievementTriggeredRef = useRef<boolean>(false);
  const ventCenterRef = useRef({ x: 0, y: 0 });

  const getVentCenter = useCallback((w: number, h: number) => ({
    x: w / 2,
    y: h * 0.68,
  }), []);

  const initBackgroundParticles = useCallback((w: number, h: number) => {
    const particles: BackgroundParticle[] = [];
    for (let i = 0; i < BG_PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: -2 - Math.random() * 6,
        size: 0.5 + Math.random() * 1.8,
        alpha: 0.1 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      });
    }
    bgParticlesRef.current = particles;
  }, []);

  const updateBackgroundParticles = useCallback((dt: number, w: number, h: number) => {
    for (const p of bgParticlesRef.current) {
      p.phase += dt * 2;
      p.x += p.vx * dt + Math.sin(p.phase) * 0.3;
      p.y += p.vy * dt;
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
    }
  }, []);

  const renderBackground = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createRadialGradient(w / 2, h * 0.5, 50, w / 2, h * 0.5, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, '#1a3a5c');
    gradient.addColorStop(0.5, '#0f1f3a');
    gradient.addColorStop(1, '#0a0f1c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (const p of bgParticlesRef.current) {
      const flicker = 0.7 + Math.sin(p.phase * 3) * 0.3;
      ctx.fillStyle = `rgba(150, 200, 255, ${p.alpha * flicker})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const seabedGradient = ctx.createLinearGradient(0, h * 0.78, 0, h);
    seabedGradient.addColorStop(0, 'rgba(26, 26, 46, 0)');
    seabedGradient.addColorStop(0.3, 'rgba(26, 26, 46, 0.5)');
    seabedGradient.addColorStop(1, 'rgba(10, 10, 20, 0.95)');
    ctx.fillStyle = seabedGradient;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

    ctx.strokeStyle = 'rgba(50, 60, 90, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const baseY = h * 0.82 + i * 8;
      ctx.beginPath();
      ctx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += 30) {
        const y = baseY + Math.sin((x + i * 50) * 0.015) * 6;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, []);

  const renderTooltip = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!hoveredShrimp) return;
    const padding = { x: 14, y: 10 };
    const lines = [
      { label: '能量值', value: `${hoveredShrimp.shrimp.energy.toFixed(0)} / 100`, color: hoveredShrimp.shrimp.energy < 20 ? '#e74c3c' : hoveredShrimp.shrimp.energy > 70 ? '#2ecc71' : '#f1c40f' },
      { label: '局部温度', value: `${hoveredShrimp.localTemp.toFixed(1)}°C`, color: '#5dade2' },
    ];
    const boxW = 160;
    const lineH = 20;
    const boxH = padding.y * 2 + lines.length * lineH;
    let tx = mousePos.x + 18;
    let ty = mousePos.y - boxH - 10;
    if (tx + boxW > (canvasRef.current?.width ?? 0) - 10) tx = mousePos.x - boxW - 18;
    if (ty < 10) ty = mousePos.y + 18;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 28, 0.85)';
    ctx.strokeStyle = 'rgba(93, 173, 226, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(93, 173, 226, 0.2)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const r = 10;
    ctx.moveTo(tx + r, ty);
    ctx.lineTo(tx + boxW - r, ty);
    ctx.quadraticCurveTo(tx + boxW, ty, tx + boxW, ty + r);
    ctx.lineTo(tx + boxW, ty + boxH - r);
    ctx.quadraticCurveTo(tx + boxW, ty + boxH, tx + boxW - r, ty + boxH);
    ctx.lineTo(tx + r, ty + boxH);
    ctx.quadraticCurveTo(tx, ty + boxH, tx, ty + boxH - r);
    ctx.lineTo(tx, ty + r);
    ctx.quadraticCurveTo(tx, ty, tx + r, ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    for (let i = 0; i < lines.length; i++) {
      const ly = ty + padding.y + i * lineH + lineH / 2;
      ctx.font = "500 12px 'Nunito', sans-serif";
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textBaseline = 'middle';
      ctx.fillText(lines[i].label, tx + padding.x, ly);
      ctx.font = "700 13px 'Orbitron', sans-serif";
      ctx.fillStyle = lines[i].color;
      ctx.textAlign = 'right';
      ctx.fillText(lines[i].value, tx + boxW - padding.x, ly);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }, [hoveredShrimp, mousePos]);

  useEffect(() => {
    const checkResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkResize();
    window.addEventListener('resize', checkResize);
    return () => window.removeEventListener('resize', checkResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const setupCanvas = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vent = getVentCenter(w, h);
      ventCenterRef.current = vent;
      if (!shrimpSimRef.current) {
        shrimpSimRef.current = new ShrimpSim({
          count: SHRIMP_COUNT,
          canvasWidth: w,
          canvasHeight: h,
          ventX: vent.x,
          ventY: vent.y,
        });
      } else {
        shrimpSimRef.current.resize(w, h);
      }
      if (!ventRendererRef.current) {
        ventRendererRef.current = new VentRenderer(vent.x, vent.y);
      } else {
        ventRendererRef.current.resize(vent.x, vent.y);
      }
      if (!biofilmManagerRef.current) {
        biofilmManagerRef.current = new BiofilmManager(vent.x, vent.y, 80, 8);
      } else {
        biofilmManagerRef.current.resize(vent.x, vent.y);
      }
      initBackgroundParticles(w, h);
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      const w = window.innerWidth;
      const h = window.innerHeight;

      updateBackgroundParticles(dt, w, h);
      const biofilm = biofilmManagerRef.current!;
      const shrimpSim = shrimpSimRef.current!;
      const ventRenderer = ventRendererRef.current!;

      biofilm.update(dt, { temperature, ph, sulfide });
      shrimpSim.update(dt, { temperature, ph }, biofilm.getGrid(), biofilm.getGridSize());
      ventRenderer.update(dt, temperature);

      const coverage = biofilm.getCoverageRatio();
      const gathering = shrimpSim.getGatheringRatio();
      setBiofilmCoverage(coverage);
      setGatheringRatio(gathering);

      if (!achievementTriggeredRef.current && coverage >= ACHIEVEMENT_BIOFILM && gathering >= ACHIEVEMENT_GATHERING) {
        achievementTriggeredRef.current = true;
        setAchievementVisible(true);
      }

      renderBackground(ctx, w, h);
      ventRenderer.render(ctx);
      biofilm.render(ctx);
      const shrimpCount = shrimpSim.getCount();
      shrimpSim.render(ctx, shrimpCount > LOW_QUALITY_THRESHOLD, temperature);
      renderTooltip(ctx);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', setupCanvas);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [temperature, ph, sulfide, getVentCenter, initBackgroundParticles, renderBackground, renderTooltip, updateBackgroundParticles]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    const shrimpSim = shrimpSimRef.current;
    if (shrimpSim) {
      const info = shrimpSim.findShrimpAtPoint(x, y, temperature);
      setHoveredShrimp(info);
      if (info) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }
  }, [temperature]);

  const handleMouseLeave = useCallback(() => {
    setHoveredShrimp(null);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: '#0a0f1c',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'block',
        }}
      />

      <Panel
        temperature={temperature}
        ph={ph}
        sulfide={sulfide}
        onTemperatureChange={(v) => { setTemperature(v); }}
        onPhChange={(v) => { setPh(v); }}
        onSulfideChange={(v) => { setSulfide(v); achievementTriggeredRef.current = false; }}
        isMobile={isMobile}
        shrimpCount={SHRIMP_COUNT}
        biofilmCoverage={biofilmCoverage}
        gatheringRatio={gatheringRatio}
      />

      <AnimatePresence>
        {achievementVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: '18%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 200,
              pointerEvents: 'none',
            }}
            onAnimationComplete={() => {
              setTimeout(() => setAchievementVisible(false), 3200);
            }}
          >
            <div style={{
              padding: '24px 48px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(255,179,71,0.15), rgba(93,173,226,0.12))',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,179,71,0.35)',
              boxShadow: '0 0 60px rgba(255,179,71,0.25), 0 20px 60px rgba(0,0,0,0.5)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                style={{
                  fontSize: '12px',
                  fontFamily: "'Orbitron', sans-serif",
                  letterSpacing: '3px',
                  color: 'rgba(255,179,71,0.9)',
                  marginBottom: '10px',
                  fontWeight: 600,
                }}
              >
                ✦ ACHIEVEMENT UNLOCKED ✦
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.6, type: 'spring' }}
                style={{
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: '34px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #ffb347, #ff8c00, #ffb347)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '2px',
                  lineHeight: 1.1,
                }}
              >
                共生形成
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{
                  marginTop: '12px',
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.75)',
                  fontFamily: "'Nunito', sans-serif",
                  fontWeight: 500,
                }}
              >
                盲虾与菌群建立了稳定的共生生态系统
              </motion.div>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2, duration: 1.2, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, transparent, #ffb347, transparent)',
                  transformOrigin: 'left',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{
          position: 'fixed',
          top: isMobile ? '10px' : '22px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <h1 style={{
          margin: 0,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: isMobile ? '16px' : '24px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #5dade2 0%, #85c1e9 40%, #ffb347 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: isMobile ? '1.5px' : '3px',
          textShadow: '0 0 40px rgba(93, 173, 226, 0.3)',
        }}>
          深海热液喷口生态模拟器
        </h1>
        <p style={{
          margin: isMobile ? '2px 0 0 0' : '6px 0 0 0',
          fontSize: isMobile ? '10px' : '12px',
          color: 'rgba(255,255,255,0.45)',
          fontFamily: "'Nunito', sans-serif",
          letterSpacing: '1px',
        }}>
          DEEP-SEA VENT ECOSYSTEM SIMULATOR
        </p>
      </motion.div>
    </div>
  );
}

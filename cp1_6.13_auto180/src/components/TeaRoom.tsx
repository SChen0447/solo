import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import Scroll from './Scroll';
import Door from './Door';
import BookShelf from './BookShelf';
import { TeaStats, useAuth } from '../App';
import {
  Particle, TeaSetType, DeformState, WaterPour, Whirlpool,
  TeaSessionReport, Vec2, clamp, lerp, easeOutElastic, easeOut, easeInOut,
} from '../utils/teaTypes';
import { playWoodBlockSound, playPourSound, playStirSound, getAudioContext } from '../utils/audio';

interface TeaRoomProps {
  stats: TeaStats;
  updateStats: (updates: Partial<TeaStats>) => void;
}

interface TeaSetShape {
  bowl: Vec2[];
  teapot: Vec2[];
  whisk: Vec2[];
}

const generateBaseShapes = (cx: number, cy: number, scale: number): TeaSetShape => ({
  bowl: [
    { x: cx - 65 * scale, y: cy - 20 * scale },
    { x: cx - 50 * scale, y: cy - 45 * scale },
    { x: cx, y: cy - 55 * scale },
    { x: cx + 50 * scale, y: cy - 45 * scale },
    { x: cx + 65 * scale, y: cy - 20 * scale },
    { x: cx + 48 * scale, y: cy + 30 * scale },
    { x: cx, y: cy + 45 * scale },
    { x: cx - 48 * scale, y: cy + 30 * scale },
  ],
  teapot: [
    { x: cx + 30 * scale, y: cy - 140 * scale },
    { x: cx + 55 * scale, y: cy - 120 * scale },
    { x: cx + 75 * scale, y: cy - 90 * scale },
    { x: cx + 80 * scale, y: cy - 50 * scale },
    { x: cx + 95 * scale, y: cy - 30 * scale },
    { x: cx + 110 * scale, y: cy - 65 * scale },
    { x: cx + 85 * scale, y: cy + 10 * scale },
    { x: cx + 50 * scale, y: cy + 30 * scale },
    { x: cx + 10 * scale, y: cy + 25 * scale },
    { x: cx - 20 * scale, y: cy - 5 * scale },
    { x: cx - 15 * scale, y: cy - 80 * scale },
    { x: cx + 5 * scale, y: cy - 130 * scale },
  ],
  whisk: [
    { x: cx - 90 * scale, y: cy - 70 * scale },
    { x: cx - 60 * scale, y: cy - 130 * scale },
    { x: cx - 30 * scale, y: cy - 125 * scale },
    { x: cx - 10 * scale, y: cy - 60 * scale },
    { x: cx - 5 * scale, y: cy },
    { x: cx - 20 * scale, y: cy + 55 * scale },
    { x: cx - 80 * scale, y: cy + 55 * scale },
    { x: cx - 95 * scale, y: cy },
  ],
});

const TeaRoom: React.FC<TeaRoomProps> = ({ stats, updateStats }) => {
  const { user, token, logout } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [isNight, setIsNight] = useState(false);
  const [tempK, setTempK] = useState(4500);
  const [reports, setReports] = useState<TeaSessionReport[]>([]);
  const [roomSize, setRoomSize] = useState(600);
  const [scale, setScale] = useState(1);
  const [lastActionTime, setLastActionTime] = useState(Date.now());
  const [, forceRender] = useState(0);

  const isNightRef = useRef(isNight);
  const tempKRef = useRef(tempK);
  const statsRef = useRef(stats);
  const particlesRef = useRef<Particle[]>([]);
  const deformRef = useRef<DeformState | null>(null);
  const pourRef = useRef<WaterPour>({ active: false, startTime: 0, duration: 1200 });
  const whirlRef = useRef<Whirlpool>({ active: false, startTime: 0, duration: 3000, rotationSpeed: 1.5, foamShape: [], foamStartTime: 0 });
  const baseShapesRef = useRef<TeaSetShape | null>(null);
  const highlightedRef = useRef<TeaSetType | null>(null);
  const highlightStartRef = useRef<number>(0);
  const draggingRef = useRef<{ type: TeaSetType; vertexIndex: number; startX: number; startY: number; responseStart: number } | null>(null);
  const ripplePhaseRef = useRef(0);
  const ripplesActiveRef = useRef(false);
  const glintsRef = useRef<Array<{ x: number; y: number; startTime: number; size: number; type: TeaSetType }>>([]);
  const shapesRef = useRef<TeaSetShape | null>(null);
  const waterLevelRef = useRef(0);
  const canvasSizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => { isNightRef.current = isNight; }, [isNight]);
  useEffect(() => { tempKRef.current = tempK; }, [tempK]);
  useEffect(() => { statsRef.current = stats; }, [stats]);

  const getColorTemp = useCallback((k: number, alpha = 1): string => {
    const t = (k - 3000) / 4000;
    let r, g, b;
    if (t < 0.3) {
      r = 255; g = lerp(180, 220, t / 0.3); b = lerp(130, 180, t / 0.3);
    } else if (t < 0.7) {
      const t2 = (t - 0.3) / 0.4;
      r = lerp(255, 235, t2); g = lerp(220, 230, t2); b = lerp(180, 235, t2);
    } else {
      const t2 = (t - 0.7) / 0.3;
      r = lerp(235, 220, t2); g = lerp(230, 235, t2); b = 245;
    }
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
  }, []);

  const kelvinToShadow = useCallback((k: number): string => {
    return k < 5000 ? 'rgba(30,20,15,0.35)' : 'rgba(15,25,45,0.3)';
  }, []);

  const kelvinToAmbient = useCallback((k: number): string => {
    const t = (k - 4000) / 3000;
    const r = lerp(255, 230, t);
    const g = lerp(235, 235, t);
    const b = lerp(200, 245, t);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, 0.12)`;
  }, []);

  const computeSize = useCallback(() => {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const isMobile = vw < 768;
    const baseSize = Math.max(500, vh * 0.6);
    const finalSize = Math.min(baseSize, vw * 0.95);
    setRoomSize(finalSize);
    setScale(isMobile ? 0.8 : 1);
    canvasSizeRef.current = { w: finalSize, h: finalSize };
    const cx = finalSize / 2;
    const cy = finalSize / 2 + 40;
    baseShapesRef.current = generateBaseShapes(cx, cy, isMobile ? 0.8 : 1);
    shapesRef.current = generateBaseShapes(cx, cy, isMobile ? 0.8 : 1);
  }, []);

  useEffect(() => {
    computeSize();
    window.addEventListener('resize', computeSize);
    return () => window.removeEventListener('resize', computeSize);
  }, [computeSize]);

  const saveReports = useCallback((reps: TeaSessionReport[]) => {
    localStorage.setItem('teahouse_reports', JSON.stringify(reps));
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('teahouse_reports');
    if (saved) {
      try { setReports(JSON.parse(saved)); } catch {}
    }
    const fetchReports = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/tea-session', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessions?.length) {
            setReports(data.sessions);
            saveReports(data.sessions);
          }
        }
      } catch {}
    };
    fetchReports();
  }, [token, saveReports]);

  const addScore = useCallback((points: number) => {
    const now = Date.now();
    const response = now - lastActionTime;
    const newScore = clamp(statsRef.current.totalScore + points, 100, 300);
    const newHistory = [...statsRef.current.scoreHistory, { timestamp: now, score: newScore }].slice(-50);
    const newRTs = [...statsRef.current.responseTimes, response].slice(-20);
    const avg = newRTs.reduce((a, b) => a + b, 0) / newRTs.length;
    updateStats({
      totalScore: newScore,
      scoreHistory: newHistory,
      responseTimes: newRTs,
      averageResponseTime: avg,
    });
    setLastActionTime(now);
  }, [lastActionTime, updateStats]);

  const spawnSteam = useCallback((cx: number, cy: number, count = 60) => {
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= 200) break;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 15;
      particlesRef.current.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.6,
        life: 0,
        maxLife: 2000 + Math.random() * 500,
        size: 3 + Math.random() * 3,
        color: '255,255,255',
        alpha: 0.3,
        type: 'steam',
      });
    }
    void now;
  }, []);

  const generateFoamShape = useCallback((): Vec2[] => {
    const shape: Vec2[] = [];
    const numPts = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < numPts; i++) {
      const a = (i / numPts) * Math.PI * 2;
      const r = 8 + Math.random() * 8;
      shape.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    return shape;
  }, []);

  const spawnGlints = useCallback((type: TeaSetType) => {
    if (!baseShapesRef.current) return;
    const shape = baseShapesRef.current[type];
    const now = performance.now();
    for (let i = 0; i < 5; i++) {
      const v1 = shape[Math.floor(Math.random() * shape.length)];
      const v2 = shape[(Math.floor(Math.random() * shape.length) + 1) % shape.length];
      glintsRef.current.push({
        x: (v1.x + v2.x) / 2 + (Math.random() - 0.5) * 10,
        y: (v1.y + v2.y) / 2 + (Math.random() - 0.5) * 10,
        startTime: now + i * 120,
        size: 5 + Math.random() * 5,
        type,
      });
    }
  }, []);

  const addDeformationScore = useCallback(() => {
    const s = statsRef.current;
    updateStats({ deformationCount: s.deformationCount + 1 });
    addScore(10);
  }, [addScore, updateStats]);

  const addPourScore = useCallback(() => {
    const s = statsRef.current;
    updateStats({ pourCount: s.pourCount + 1 });
    addScore(8);
  }, [addScore, updateStats]);

  const addStirScore = useCallback(() => {
    const s = statsRef.current;
    updateStats({ stirCount: s.stirCount + 1 });
    addScore(6);
  }, [addScore, updateStats]);

  const saveDailyReport = useCallback(async () => {
    const s = statsRef.current;
    const today = new Date().toISOString().split('T')[0];
    const report: TeaSessionReport = {
      id: `r-${today}`,
      date: today,
      totalScore: s.totalScore,
      deformationCount: s.deformationCount,
      pourCount: s.pourCount,
      averageResponseTime: s.responseTimes.length
        ? s.responseTimes.reduce((a, b) => a + b, 0) / s.responseTimes.length
        : 0,
      scoreHistory: s.scoreHistory,
    };
    const newReports = reports.filter(r => r.date !== today);
    newReports.unshift(report);
    const sorted = newReports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setReports(sorted);
    saveReports(sorted);
    if (token) {
      try {
        await fetch('/api/tea-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            totalScore: report.totalScore,
            deformationCount: report.deformationCount,
            pourCount: report.pourCount,
            averageResponseTime: report.averageResponseTime,
            scoreHistory: report.scoreHistory,
          }),
        });
      } catch {}
    }
  }, [reports, saveReports, token]);

  useEffect(() => {
    const timer = setInterval(saveDailyReport, 60000);
    const onUnload = () => { saveDailyReport(); };
    window.addEventListener('beforeunload', onUnload);
    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [saveDailyReport]);

  const toggleDayNight = useCallback(() => {
    setIsNight(prev => {
      const next = !prev;
      getAudioContext();
      playWoodBlockSound();
      gsap.to({ t: tempKRef.current }, {
        t: next ? 6000 : 4500,
        duration: 1,
        ease: easeInOut,
        onUpdate: function () {
          const v = (this.targets()[0] as any).t;
          setTempK(v);
          tempKRef.current = v;
        },
      });
      return next;
    });
  }, []);

  const pointInPolygon = useCallback((px: number, py: number, poly: Vec2[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }, []);

  const nearestVertex = useCallback((px: number, py: number, poly: Vec2[], threshold = 18): number => {
    let minDist = Infinity;
    let idx = -1;
    for (let i = 0; i < poly.length; i++) {
      const d = Math.hypot(poly[i].x - px, poly[i].y - py);
      if (d < threshold && d < minDist) {
        minDist = d;
        idx = i;
      }
    }
    return idx;
  }, []);

  const getClickTarget = useCallback((x: number, y: number): { type: TeaSetType; vertexIndex: number } | null => {
    if (!shapesRef.current) return null;
    const order: TeaSetType[] = ['bowl', 'teapot', 'whisk'];
    for (const type of order) {
      const shape = shapesRef.current[type];
      if (pointInPolygon(x, y, shape)) {
        const vIdx = nearestVertex(x, y, shape, 28);
        return { type, vertexIndex: vIdx >= 0 ? vIdx : 0 };
      }
    }
    return null;
  }, [pointInPolygon, nearestVertex]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const hit = getClickTarget(x, y);
    if (!hit) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    draggingRef.current = {
      type: hit.type,
      vertexIndex: hit.vertexIndex,
      startX: x,
      startY: y,
      responseStart: Date.now(),
    };

    highlightedRef.current = hit.type;
    highlightStartRef.current = performance.now();
    ripplesActiveRef.current = true;
    setTimeout(() => { ripplesActiveRef.current = false; }, 1000);

    if (hit.type === 'teapot') {
      pourRef.current = { active: true, startTime: performance.now(), duration: 1200 };
      waterLevelRef.current = Math.min(1, waterLevelRef.current + 0.25);
      playPourSound();
      if (baseShapesRef.current) {
        const bowl = baseShapesRef.current.bowl;
        const bx = (bowl[0].x + bowl[4].x) / 2;
        const by = (bowl[2].y + bowl[6].y) / 2 + 5;
        setTimeout(() => spawnSteam(bx, by, 60), 400);
      }
      addPourScore();
    } else if (hit.type === 'whisk') {
      whirlRef.current = {
        active: true,
        startTime: performance.now(),
        duration: 3000,
        rotationSpeed: 1.5,
        foamShape: generateFoamShape(),
        foamStartTime: performance.now(),
      };
      playStirSound();
      if (baseShapesRef.current) {
        const bowl = baseShapesRef.current.bowl;
        const bx = (bowl[0].x + bowl[4].x) / 2;
        const by = (bowl[2].y + bowl[6].y) / 2 + 5;
        setTimeout(() => spawnSteam(bx, by, 20), 300);
      }
      addStirScore();
    } else {
      playWoodBlockSound();
    }
    forceRender(v => v + 1);
  }, [getClickTarget, spawnSteam, generateFoamShape, addPourScore, addStirScore]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = draggingRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !baseShapesRef.current || !shapesRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const dx = x - drag.startX;
    const dy = y - drag.startY;
    const dist = Math.hypot(dx, dy);

    if (dist > 4) {
      const maxDist = 35;
      const norm = Math.min(dist, maxDist) / maxDist;
      const shape = shapesRef.current[drag.type];
      const baseShape = baseShapesRef.current[drag.type];
      const idx = drag.vertexIndex;
      const nv = shape[idx];
      const bv = baseShape[idx];
      const dragX = (dx / dist) * norm * 28;
      const dragY = (dy / dist) * norm * 28;
      nv.x = bv.x + dragX;
      nv.y = bv.y + dragY;

      for (let i = 1; i < 3; i++) {
        const pI = (idx - i + shape.length) % shape.length;
        const nI = (idx + i) % shape.length;
        const factor = 1 / (i + 1);
        shape[pI].x = baseShape[pI].x + dragX * factor;
        shape[pI].y = baseShape[pI].y + dragY * factor;
        shape[nI].x = baseShape[nI].x + dragX * factor;
        shape[nI].y = baseShape[nI].y + dragY * factor;
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = draggingRef.current;
    const canvas = canvasRef.current;
    if (!drag || !canvas || !baseShapesRef.current || !shapesRef.current) {
      draggingRef.current = null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const dist = Math.hypot(x - drag.startX, y - drag.startY);

    const shape = shapesRef.current[drag.type];
    const baseShape = baseShapesRef.current[drag.type];
    const idx = drag.vertexIndex;
    const nv = shape[idx];
    const bv = baseShape[idx];
    const totalOffset = Math.hypot(nv.x - bv.x, nv.y - bv.y);

    if (totalOffset > 5) {
      deformRef.current = {
        type: drag.type,
        vertexIndex: idx,
        offsetX: nv.x - bv.x,
        offsetY: nv.y - bv.y,
        startTime: performance.now(),
        duration: 800,
      };
      spawnGlints(drag.type);
      addDeformationScore();
      ripplesActiveRef.current = true;
      setTimeout(() => { ripplesActiveRef.current = false; }, 1000);
    }

    if (dist < 6 && drag.type === 'bowl') {
      playWoodBlockSound();
    }

    draggingRef.current = null;
  }, [spawnGlints, addDeformationScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const now = performance.now();
      const W = canvas.width;
      const H = canvas.height;
      const cx = W / 2;
      const cy = H / 2;

      if (!baseShapesRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.clearRect(0, 0, W, H);

      const tempColor = getColorTemp(tempKRef.current, 1);
      const ambientColor = getColorTemp(tempKRef.current, 0.08);

      ctx.fillStyle = ambientColor;
      ctx.fillRect(0, 0, W, H);

      const tatamiBase = '#d7ccc8';
      const tatamiGap = '#bcaaa4';

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();

      for (let gy = 0; gy < H; gy += 50) {
        ctx.fillStyle = tatamiBase;
        ctx.fillRect(0, gy, W, 50);
        ctx.fillStyle = tatamiGap;
        ctx.fillRect(0, gy + 48, W, 2);
      }
      for (let gx = 0; gx < W; gx += 50) {
        ctx.fillStyle = tatamiGap;
        ctx.fillRect(gx + 48, 0, 2, H);
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(78,52,46,0.6)';
      ctx.lineWidth = 6;
      ctx.strokeRect(8, 8, W - 16, H - 16);
      ctx.strokeStyle = 'rgba(93,64,55,0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, W - 36, H - 36);

      if (isNightRef.current) {
        const corners = [
          { x: 80, y: 80 }, { x: W - 80, y: 80 },
          { x: 80, y: H - 80 }, { x: W - 80, y: H - 80 },
        ];
        corners.forEach(c => {
          const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 160);
          grad.addColorStop(0, 'rgba(255,204,128,0.5)');
          grad.addColorStop(0.5, 'rgba(255,204,128,0.15)');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);
        });
      }

      const wallTop = H * 0.08;
      const wallGrad = ctx.createLinearGradient(0, 0, 0, wallTop);
      wallGrad.addColorStop(0, isNightRef.current ? '#3e2723' : '#6d4c41');
      wallGrad.addColorStop(1, isNightRef.current ? '#5d4037' : '#8d6e63');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, W, wallTop);

      const drawTable = () => {
        const tableX = cx - 170 * scale;
        const tableY = cy - 40 * scale;
        const tableW = 340 * scale;
        const tableH = 280 * scale;
        const r = 12;

        const shadowColor = kelvinToShadow(tempKRef.current);
        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = isNightRef.current ? 0 : 8;
        ctx.shadowOffsetY = isNightRef.current ? 2 : 6;

        const tableGrad = ctx.createLinearGradient(tableX, tableY, tableX, tableY + tableH);
        tableGrad.addColorStop(0, '#795548');
        tableGrad.addColorStop(0.4, '#5d4037');
        tableGrad.addColorStop(1, '#4e342e');
        ctx.fillStyle = tableGrad;

        ctx.beginPath();
        ctx.moveTo(tableX + r, tableY);
        ctx.lineTo(tableX + tableW - r, tableY);
        ctx.quadraticCurveTo(tableX + tableW, tableY, tableX + tableW, tableY + r);
        ctx.lineTo(tableX + tableW, tableY + tableH - r);
        ctx.quadraticCurveTo(tableX + tableW, tableY + tableH, tableX + tableW - r, tableY + tableH);
        ctx.lineTo(tableX + r, tableY + tableH);
        ctx.quadraticCurveTo(tableX, tableY + tableH, tableX, tableY + tableH - r);
        ctx.lineTo(tableX, tableY + r);
        ctx.quadraticCurveTo(tableX, tableY, tableX + r, tableY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(tableX + r, tableY);
        ctx.lineTo(tableX + tableW - r, tableY);
        ctx.quadraticCurveTo(tableX + tableW, tableY, tableX + tableW, tableY + r);
        ctx.lineTo(tableX + tableW, tableY + tableH - r);
        ctx.quadraticCurveTo(tableX + tableW, tableY + tableH, tableX + tableW - r, tableY + tableH);
        ctx.lineTo(tableX + r, tableY + tableH);
        ctx.quadraticCurveTo(tableX, tableY + tableH, tableX, tableY + tableH - r);
        ctx.lineTo(tableX, tableY + r);
        ctx.quadraticCurveTo(tableX, tableY, tableX + r, tableY);
        ctx.closePath();
        ctx.clip();

        ctx.globalAlpha = 0.12;
        for (let gy = tableY; gy < tableY + tableH; gy += 8) {
          ctx.strokeStyle = '#3e2723';
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(tableX, gy + Math.sin(gy * 0.05) * 1.5);
          ctx.lineTo(tableX + tableW, gy + Math.sin((gy + 100) * 0.05) * 1.5);
          ctx.stroke();
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(62,39,35,0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(tableX + r, tableY);
        ctx.lineTo(tableX + tableW - r, tableY);
        ctx.quadraticCurveTo(tableX + tableW, tableY, tableX + tableW, tableY + r);
        ctx.lineTo(tableX + tableW, tableY + tableH - r);
        ctx.quadraticCurveTo(tableX + tableW, tableY + tableH, tableX + tableW - r, tableY + tableH);
        ctx.lineTo(tableX + r, tableY + tableH);
        ctx.quadraticCurveTo(tableX, tableY + tableH, tableX, tableY + tableH - r);
        ctx.lineTo(tableX, tableY + r);
        ctx.quadraticCurveTo(tableX, tableY, tableX + r, tableY);
        ctx.closePath();
        ctx.stroke();
      };

      const drawReflection = () => {
        if (!shapesRef.current || !baseShapesRef.current) return;
        const shapes = shapesRef.current;
        const bowl = shapes.bowl;
        const tableBottom = cy + 240 * scale;
        const reflectOffset = 5;

        ctx.save();
        ctx.globalAlpha = 0.2;

        ripplePhaseRef.current += 0.04;
        const rippleAmp = ripplesActiveRef.current || pouringActive || whirlRef.current.active ? 3 : 0.8;

        const drawReflectedShape = (shape: Vec2[], fillColor: string) => {
          ctx.beginPath();
          shape.forEach((v, i) => {
            const baseY = tableBottom + (tableBottom - v.y) + reflectOffset;
            const wave = Math.sin(ripplePhaseRef.current + v.x * 0.02) * rippleAmp;
            const y = baseY + wave;
            if (i === 0) ctx.moveTo(v.x, y);
            else ctx.lineTo(v.x, y);
          });
          ctx.closePath();
          ctx.fillStyle = fillColor;
          ctx.fill();
        };

        drawReflectedShape(shapes.whisk, '#d7ccc8');
        drawReflectedShape(shapes.teapot, '#bcaaa4');
        drawReflectedShape(bowl, '#ffccbc');

        ctx.restore();
      };

      const pouringActive = pourRef.current.active && (now - pourRef.current.startTime < pourRef.current.duration);

      drawReflection();
      drawTable();

      const drawOrigamiShape = (
        type: TeaSetType,
        shape: Vec2[],
        fillColor: string,
        strokeColor: string,
        highlight: boolean
      ) => {
        if (!baseShapesRef.current) return;
        const baseShape = baseShapesRef.current[type];
        const deform = deformRef.current;
        const isHL = highlight && (highlightedRef.current !== null) && (now - highlightStartRef.current < 300);

        if (deform && deform.type === type && !draggingRef.current) {
          const progress = (now - deform.startTime) / deform.duration;
          if (progress >= 1) {
            if (shapesRef.current) {
              shapesRef.current[type] = baseShape.map(v => ({ x: v.x, y: v.y }));
            }
          } else {
            const eased = easeOutElastic(Math.max(0, 1 - progress));
            for (let i = 0; i < shape.length; i++) {
              if (i === deform.vertexIndex) {
                shape[i].x = baseShape[i].x + deform.offsetX * eased;
                shape[i].y = baseShape[i].y + deform.offsetY * eased;
              } else {
                const diff = Math.abs(i - deform.vertexIndex);
                if (diff <= 2) {
                  const f = (1 / (diff + 1)) * eased;
                  shape[i].x = baseShape[i].x + deform.offsetX * f;
                  shape[i].y = baseShape[i].y + deform.offsetY * f;
                } else {
                  shape[i].x = lerp(shape[i].x, baseShape[i].x, 0.1);
                  shape[i].y = lerp(shape[i].y, baseShape[i].y, 0.1);
                }
              }
            }
          }
        }

        if (draggingRef.current?.type !== type && (!deform || deform.type !== type || now - deform.startTime > deform.duration)) {
          for (let i = 0; i < shape.length; i++) {
            shape[i].x = lerp(shape[i].x, baseShape[i].x, 0.08);
            shape[i].y = lerp(shape[i].y, baseShape[i].y, 0.08);
          }
        }

        const shadowC = kelvinToShadow(tempKRef.current);
        ctx.save();
        ctx.shadowColor = shadowC;
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = isNightRef.current ? 0 : 5;
        ctx.shadowOffsetY = isNightRef.current ? 1 : 4;

        ctx.beginPath();
        shape.forEach((v, i) => {
          if (i === 0) ctx.moveTo(v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();

        const cx_s = shape.reduce((a, v) => a + v.x, 0) / shape.length;
        const cy_s = shape.reduce((a, v) => a + v.y, 0) / shape.length;

        const linGrad = ctx.createLinearGradient(cx_s - 40, cy_s - 40, cx_s + 40, cy_s + 40);
        linGrad.addColorStop(0, lightenColor(fillColor, 25));
        linGrad.addColorStop(0.5, fillColor);
        linGrad.addColorStop(1, darkenColor(fillColor, 15));
        ctx.fillStyle = linGrad;
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        shape.forEach((v, i) => {
          if (i === 0) ctx.moveTo(v.x, v.y);
          else ctx.lineTo(v.x, v.y);
        });
        ctx.closePath();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = isHL ? 2.5 : 1.5;
        ctx.stroke();

        for (let i = 2; i < shape.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(cx_s, cy_s);
          ctx.lineTo(shape[i].x, shape[i].y);
          ctx.strokeStyle = 'rgba(62,39,35,0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
        ctx.restore();

        if (isHL) {
          const elapsed = now - highlightStartRef.current;
          const alpha = 1 - Math.min(1, elapsed / 300);
          if (alpha > 0) {
            ctx.save();
            ctx.beginPath();
            shape.forEach((v, i) => {
              if (i === 0) ctx.moveTo(v.x, v.y);
              else ctx.lineTo(v.x, v.y);
            });
            ctx.closePath();
            ctx.strokeStyle = `rgba(255,213,79,${alpha})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd54f';
            ctx.shadowBlur = 12;
            ctx.stroke();
            ctx.restore();
          }
        }

        if (draggingRef.current?.type === type && shape[draggingRef.current.vertexIndex]) {
          const v = shape[draggingRef.current.vertexIndex];
          ctx.save();
          ctx.beginPath();
          ctx.arc(v.x, v.y, 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,213,79,0.85)';
          ctx.shadowColor = '#ffd54f';
          ctx.shadowBlur = 16;
          ctx.fill();
          ctx.strokeStyle = '#ff8f00';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }
      };

      function lightenColor(hex: string, amt: number): string {
        const c = hex.replace('#', '');
        let r = parseInt(c.substring(0, 2), 16);
        let g = parseInt(c.substring(2, 4), 16);
        let b = parseInt(c.substring(4, 6), 16);
        r = Math.min(255, r + amt);
        g = Math.min(255, g + amt);
        b = Math.min(255, b + amt);
        return `rgb(${r},${g},${b})`;
      }

      function darkenColor(hex: string, amt: number): string {
        const c = hex.replace('#', '');
        let r = parseInt(c.substring(0, 2), 16);
        let g = parseInt(c.substring(2, 4), 16);
        let b = parseInt(c.substring(4, 6), 16);
        r = Math.max(0, r - amt);
        g = Math.max(0, g - amt);
        b = Math.max(0, b - amt);
        return `rgb(${r},${g},${b})`;
      }

      const drawTeapotDetails = () => {
        if (!shapesRef.current) return;
        const tp = shapesRef.current.teapot;
        const base = baseShapesRef.current!.teapot;
        const lidIdx = 10;
        const lid = tp[lidIdx];
        const lidBase = base[lidIdx];
        const lidTop = { x: lerp(lid.x, lidBase.x, 0.5) - 8 * scale, y: lid.y - 20 * scale };

        ctx.save();
        ctx.beginPath();
        ctx.arc(lidTop.x, lidTop.y, 6 * scale, 0, Math.PI * 2);
        ctx.fillStyle = '#8d6e63';
        ctx.fill();
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        ctx.save();
        const spoutStart = tp[5];
        const spoutMid = { x: spoutStart.x + 18 * scale, y: spoutStart.y - 5 * scale };
        const spoutEnd = { x: spoutStart.x + 32 * scale, y: spoutStart.y + 10 * scale };
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 5 * scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tp[4].x, tp[4].y);
        ctx.quadraticCurveTo(spoutMid.x, spoutMid.y, spoutEnd.x, spoutEnd.y);
        ctx.stroke();
        ctx.restore();
      };

      const drawWhiskDetails = () => {
        if (!shapesRef.current) return;
        const wh = shapesRef.current.whisk;
        const topIdx = 1;
        const topIdx2 = 2;
        const botIdx1 = 5;
        const botIdx2 = 6;

        ctx.save();
        ctx.strokeStyle = '#8d6e63';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
          const t = i / 3;
          const x1 = lerp(wh[topIdx].x, wh[topIdx2].x, t);
          const y1 = lerp(wh[topIdx].y, wh[topIdx2].y, t);
          const x2 = lerp(wh[botIdx1].x, wh[botIdx2].x, t);
          const y2 = lerp(wh[botIdx1].y, wh[botIdx2].y, t);
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2 + (Math.sin(i) * 3), y2);
          ctx.stroke();
        }
        ctx.restore();
      };

      const drawBowlDetails = () => {
        if (!shapesRef.current) return;
        const b = shapesRef.current.bowl;
        const bowl = b;
        const base = baseShapesRef.current!.bowl;

        const left = bowl[0];
        const right = bowl[4];
        const top = bowl[2];
        const bottom = bowl[6];

        const waterLevel = waterLevelRef.current;
        if (waterLevel > 0) {
          ctx.save();
          ctx.beginPath();
          bowl.forEach((v, i) => {
            if (i === 0) ctx.moveTo(v.x, v.y);
            else ctx.lineTo(v.x, v.y);
          });
          ctx.closePath();
          ctx.clip();

          const bowlTop = (top.y + base[0].y) / 2;
          const bowlBottom = bottom.y;
          const waterTopY = bowlBottom - (bowlBottom - bowlTop) * 0.2 * waterLevel;

          const whirl = whirlRef.current;
          const whirlActive = whirl.active && now - whirl.startTime < whirl.duration;
          const cx_b = (left.x + right.x) / 2;
          const cy_b = waterTopY + 20;

          if (whirlActive) {
            const wProg = (now - whirl.startTime) / whirl.duration;
            const wEase = easeOut(wProg);
            const rotation = wEase * whirl.rotationSpeed * 2 * Math.PI * 3;
            const radius = 20 * (1 - 0.2 * wEase);

            ctx.save();
            ctx.translate(cx_b, cy_b);
            for (let ring = 0; ring < 3; ring++) {
              ctx.beginPath();
              const rr = radius - ring * 4;
              for (let a = 0; a <= Math.PI * 2; a += Math.PI / 12) {
                const wobble = Math.sin(a * 4 + rotation + ring) * 1.5;
                const x = Math.cos(a + rotation * (ring % 2 ? -1 : 1)) * (rr + wobble);
                const y = Math.sin(a + rotation * (ring % 2 ? -1 : 1)) * (rr + wobble) * 0.6;
                if (a === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.closePath();
              ctx.fillStyle = `rgba(141,110,99,${0.4 - ring * 0.1})`;
              ctx.fill();
            }

            const foamProg = (now - whirl.foamStartTime) / 2000;
            if (foamProg < 1) {
              ctx.save();
              ctx.globalAlpha = 1 - easeOut(foamProg);
              ctx.rotate(rotation);
              ctx.beginPath();
              whirl.foamShape.forEach((p, i) => {
                const x = p.x + Math.cos(i + rotation * 2) * 2;
                const y = p.y + Math.sin(i + rotation * 2) * 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.closePath();
              ctx.fillStyle = '#aed581';
              ctx.fill();
              ctx.strokeStyle = '#7cb342';
              ctx.lineWidth = 0.8;
              ctx.stroke();
              ctx.restore();
            }
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(141,110,99,0.4)';
            ctx.ellipse(cx_b, cy_b, 40 * scale, 12 * scale, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(cx_b - 5, cy_b - 3, 20 * scale, 4 * scale, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.restore();
        }

        ctx.save();
        const highlight = isNightRef.current ? 'rgba(255,204,128,0.5)' : 'rgba(255,248,240,0.7)';
        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.ellipse((left.x + right.x) / 2 - 12, (bowl[1].y + bowl[2].y) / 2, 22 * scale, 6 * scale, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      const drawWaterPour = () => {
        const pour = pourRef.current;
        if (!pour.active) return;
        const elapsed = now - pour.startTime;
        if (elapsed >= pour.duration) return;
        if (!shapesRef.current || !baseShapesRef.current) return;

        const tp = shapesRef.current.teapot;
        const bowl = shapesRef.current.bowl;
        const startBase = baseShapesRef.current.teapot;
        const tpStart = startBase[5];
        const tpCur = tp[5];
        const startX = tpCur.x + 30 * scale;
        const startY = tpCur.y + 15 * scale;
        void tpStart;

        const endX = (bowl[0].x + bowl[4].x) / 2;
        const endY = (bowl[2].y + bowl[6].y) / 2;

        const progress = elapsed / pour.duration;
        const ease = easeInOut(progress);
        const visible = 1 - Math.abs(0.5 - progress) * 2;

        ctx.save();
        ctx.globalAlpha = 0.55 * visible;
        ctx.strokeStyle = 'rgba(187,222,251,0.9)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(187,222,251,0.8)';
        ctx.shadowBlur = 6;

        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const t = i / 40;
          const x = lerp(startX, endX, t);
          const parabola = Math.sin(t * Math.PI) * -55;
          const y = lerp(startY, endY, t) + parabola;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();

        if (progress > 0.55 && progress < 0.8) {
          ctx.save();
          ctx.globalAlpha = (1 - Math.abs(0.67 - progress) * 3) * 0.6;
          for (let i = 0; i < 8; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = 5 + Math.random() * 12;
            ctx.beginPath();
            ctx.arc(endX + Math.cos(a) * r, endY + 5, 1 + Math.random() * 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(187,222,251,0.8)';
            ctx.fill();
          }
          ctx.restore();
        }
      };

      const drawParticles = () => {
        const ps = particlesRef.current;
        for (let i = ps.length - 1; i >= 0; i--) {
          const p = ps[i];
          p.life += 16.67;
          if (p.life >= p.maxLife) {
            ps.splice(i, 1);
            continue;
          }
          p.x += p.vx;
          p.y += p.vy;
          p.vy *= 0.995;
          const lifeRatio = p.life / p.maxLife;
          const alpha = p.alpha * (1 - easeOut(lifeRatio));
          const size = p.size * (1 + lifeRatio * 0.8);

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = `rgba(${p.color},${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      const drawGlints = () => {
        for (let i = glintsRef.current.length - 1; i >= 0; i--) {
          const g = glintsRef.current[i];
          const elapsed = now - g.startTime;
          if (elapsed < 0) continue;
          const prog = elapsed / 1000;
          if (prog >= 1) {
            glintsRef.current.splice(i, 1);
            continue;
          }
          const alpha = (1 - Math.abs(0.5 - prog) * 2) * 0.6;
          const size = g.size * (1 + prog * 0.8);

          ctx.save();
          ctx.globalAlpha = alpha;
          const rad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, size);
          rad.addColorStop(0, 'rgba(255,255,255,1)');
          rad.addColorStop(0.4, 'rgba(255,248,240,0.7)');
          rad.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rad;
          ctx.beginPath();
          ctx.arc(g.x, g.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      };

      if (shapesRef.current) {
        const hl = highlightedRef.current;
        drawOrigamiShape('whisk', shapesRef.current.whisk, '#d7ccc8', '#8d6e63', hl === 'whisk');
        drawWhiskDetails();

        drawOrigamiShape('teapot', shapesRef.current.teapot, '#bcaaa4', '#6d4c41', hl === 'teapot');
        drawTeapotDetails();

        drawOrigamiShape('bowl', shapesRef.current.bowl, '#ffccbc', '#8d6e63', hl === 'bowl');
        drawBowlDetails();
      }

      drawWaterPour();
      drawParticles();
      drawGlints();

      if (isNightRef.current) {
        const lanterns = [
          { x: W * 0.18, y: wallTop + 30 },
          { x: W * 0.82, y: wallTop + 30 },
        ];
        lanterns.forEach(L => {
          ctx.save();
          const g = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, 70);
          g.addColorStop(0, 'rgba(255,204,128,0.7)');
          g.addColorStop(0.6, 'rgba(255,183,77,0.25)');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(L.x, L.y, 70, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(L.x, L.y + 10, 14, 22, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#ffcc80';
          ctx.fill();
          ctx.strokeStyle = '#8d6e63';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(L.x, L.y + 10, 10, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,248,225,0.85)';
          ctx.fill();
          ctx.restore();
        });
      }

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [getColorTemp, kelvinToShadow, kelvinToAmbient, scale]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const clickScale = isMobile ? 1.2 : 1;

  return (
    <div style={styles.wrapper}>
      <div
        ref={containerRef}
        style={{
          ...styles.roomContainer,
          width: roomSize,
          height: roomSize,
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        <canvas
          ref={canvasRef}
          width={Math.floor(roomSize * 2)}
          height={Math.floor(roomSize * 2)}
          style={{
            width: roomSize,
            height: roomSize,
            display: 'block',
            borderRadius: '6px',
            cursor: draggingRef.current ? 'grabbing' : 'grab',
            touchAction: 'none',
            transform: `scale(${clickScale})`,
            transformOrigin: 'center',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        <Scroll
          score={stats.totalScore}
          deformationCount={stats.deformationCount}
          pourCount={stats.pourCount}
          stirCount={stats.stirCount}
        />

        <Door isNight={isNight} onToggle={toggleDayNight} />

        <BookShelf reports={reports} />

        <div style={styles.topBar}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div style={styles.userText}>
              <div style={styles.userName}>{user?.username}</div>
              <div style={styles.userRole}>茶客</div>
            </div>
          </div>
          <button style={styles.logoutBtn} onClick={() => { saveDailyReport(); logout(); }}>
            离舍
          </button>
        </div>

        <div style={styles.hintBar}>
          <span style={styles.hintIcon}>茶</span>
          <span style={styles.hintText}>拖动折纸棱角形变 · 点击茶壶注水 · 点击茶筅搅拌</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(ellipse at center, #5d4037 0%, #3e2723 70%, #1b110e 100%)',
    overflow: 'auto',
    padding: '20px',
  },
  roomContainer: {
    position: 'relative',
    boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 0 2px rgba(109,76,65,0.5) inset',
    borderRadius: '6px',
    overflow: 'visible',
  },
  topBar: {
    position: 'absolute',
    top: '-52px',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 4px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #d7ccc8, #bcaaa4)',
    color: '#3e2723',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.1rem',
    fontWeight: 700,
    boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
    border: '2px solid #5d4037',
  },
  userText: {},
  userName: {
    color: '#f5f0e8',
    fontSize: '0.95rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  userRole: {
    color: '#bcaaa4',
    fontSize: '0.7rem',
    letterSpacing: '0.2em',
  },
  logoutBtn: {
    padding: '8px 18px',
    fontSize: '0.85rem',
    background: 'rgba(93,64,55,0.6)',
    color: '#d7ccc8',
    border: '1px solid rgba(188,170,164,0.3)',
    borderRadius: '3px',
    cursor: 'pointer',
    letterSpacing: '0.2em',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  hintBar: {
    position: 'absolute',
    bottom: '-44px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 16px',
    background: 'rgba(62,39,35,0.7)',
    border: '1px solid rgba(188,170,164,0.25)',
    borderRadius: '20px',
    backdropFilter: 'blur(8px)',
    whiteSpace: 'nowrap',
  },
  hintIcon: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#ffd54f',
    color: '#5d4037',
    fontSize: '0.7rem',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    color: '#d7ccc8',
    fontSize: '0.78rem',
    letterSpacing: '0.08em',
  },
};

export default TeaRoom;

import React, { useRef, useEffect, useCallback } from 'react';
import {
  Particle,
  Spark,
  Crater,
  ControlState,
  initParticles,
  updateParticle,
  buildSpatialGrid,
  checkCollisionsAndCreateSparks,
  updateSparks,
  updateCraters,
  createScatterEffect,
  createCrater,
  findNearestParticles,
} from '../utils/particleSystem';
import { playWindSound, cleanupAudio } from '../utils/audioUtils';

interface SandScapeProps {
  controls: ControlState;
}

const PARTICLE_COUNT = 1500;

const SandScape: React.FC<SandScapeProps> = ({ controls }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const cratersRef = useRef<Crater[]>([]);
  const lastSparkPositionsRef = useRef<Map<string, number>>(new Map());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dimensionsRef = useRef({ width: 0, height: 0 });
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const horizonY = height * 0.7;
    
    const skyGradient = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGradient.addColorStop(0, '#7a8b99');
    skyGradient.addColorStop(0.7, '#9aabb9');
    skyGradient.addColorStop(1, '#b8c4cc');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, horizonY);
    
    const groundGradient = ctx.createLinearGradient(0, horizonY, 0, height);
    groundGradient.addColorStop(0, '#d4a373');
    groundGradient.addColorStop(0.5, '#c48c47');
    groundGradient.addColorStop(1, '#b57a3a');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, horizonY, width, height - horizonY);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(width, horizonY);
    ctx.stroke();
  }, []);

  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.translate(particle.x, particle.y);
    ctx.rotate((particle.rotation * Math.PI) / 180);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = 0.9;
    
    ctx.beginPath();
    const s = particle.size;
    ctx.moveTo(-s / 2, -s / 4);
    ctx.lineTo(s / 2, -s / 2);
    ctx.lineTo(s / 2, s / 4);
    ctx.lineTo(-s / 2, s / 2);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }, []);

  const drawDuneStreamlines = useCallback((
    ctx: CanvasRenderingContext2D,
    particles: Particle[],
    _width: number,
    currentTime: number
  ) => {
    ctx.strokeStyle = 'rgba(230, 194, 128, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    const processed = new Set<string>();
    
    for (const particle of particles) {
      if (processed.has(particle.id)) continue;
      
      const nearest = findNearestParticles(particle, particles, 3, 35);
      if (nearest.length < 2) continue;
      
      const waveOffset = Math.sin(currentTime * 0.001 + particle.x * 0.02) * 5;
      
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      
      for (let i = 0; i < nearest.length; i++) {
        const next = nearest[i];
        const cpX = (particle.x + next.x) / 2 + waveOffset;
        const cpY = (particle.y + next.y) / 2 - waveOffset * 0.5;
        ctx.quadraticCurveTo(cpX, cpY, next.x, next.y);
        processed.add(next.id);
      }
      
      ctx.stroke();
      processed.add(particle.id);
    }
  }, []);

  const drawMirage = useCallback((
    ctx: CanvasRenderingContext2D,
    mainCtx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number
  ) => {
    const horizonY = height * 0.7;
    const mirageY = horizonY - 50;
    const mirageHeight = 100;
    
    if (mirageY < 0) return;
    
    const sourceY = horizonY - 80;
    const sourceHeight = 60;
    
    try {
      const imageData = mainCtx.getImageData(0, sourceY, width, sourceHeight);
      const data = imageData.data;
      
      const scale = 1.2 + Math.sin(currentTime * 0.001) * 0.3;
      
      for (let y = 0; y < mirageHeight; y++) {
        const sourceYMirrored = sourceHeight - 1 - Math.floor(y / scale);
        if (sourceYMirrored < 0 || sourceYMirrored >= sourceHeight) continue;
        
        const waveOffset = Math.sin(y * 0.02 + currentTime * 0.003) * 8;
        
        for (let x = 0; x < width; x++) {
          const sourceX = Math.floor(x - waveOffset);
          if (sourceX < 0 || sourceX >= width) continue;
          
          const destIdx = (y * width + x) * 4;
          const sourceIdx = (sourceYMirrored * width + sourceX) * 4;
          
          const alpha = (y / mirageHeight) * 0.5;
          
          data[destIdx] = data[sourceIdx];
          data[destIdx + 1] = data[sourceIdx + 1];
          data[destIdx + 2] = data[sourceIdx + 2];
          data[destIdx + 3] = Math.floor(alpha * 255);
        }
      }
      
      ctx.putImageData(imageData, 0, mirageY);
      
      const fadeGradient = ctx.createLinearGradient(0, mirageY, 0, mirageY + mirageHeight);
      fadeGradient.addColorStop(0, 'rgba(122, 139, 153, 0.3)');
      fadeGradient.addColorStop(0.5, 'rgba(122, 139, 153, 0.1)');
      fadeGradient.addColorStop(1, 'rgba(122, 139, 153, 0.4)');
      ctx.fillStyle = fadeGradient;
      ctx.fillRect(0, mirageY, width, mirageHeight);
      
    } catch (e) {
      console.warn('Mirage effect unavailable:', e);
    }
  }, []);

  const drawSpark = useCallback((
    ctx: CanvasRenderingContext2D,
    spark: Spark,
    currentTime: number
  ) => {
    const elapsed = currentTime - spark.createdAt;
    const progress = elapsed / spark.duration;
    const alpha = spark.opacity * (1 - progress * progress);
    
    if (alpha <= 0) return;
    
    const spikes = 4;
    const outerRadius = spark.size;
    const innerRadius = spark.size * 0.3;
    
    ctx.save();
    ctx.translate(spark.x, spark.y);
    ctx.rotate(currentTime * 0.01);
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fill();
    
    ctx.restore();
  }, []);

  const drawCrater = useCallback((
    ctx: CanvasRenderingContext2D,
    crater: Crater,
    currentTime: number
  ) => {
    const elapsed = currentTime - crater.createdAt;
    const progress = elapsed / crater.duration;
    const alpha = (1 - progress) * 0.6;
    
    if (alpha <= 0) return;
    
    const gradient = ctx.createRadialGradient(
      crater.x, crater.y, 0,
      crater.x, crater.y, crater.radius
    );
    gradient.addColorStop(0, `rgba(109, 76, 42, ${alpha})`);
    gradient.addColorStop(0.6, `rgba(109, 76, 42, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(109, 76, 42, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(crater.x, crater.y, crater.radius, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const currentTime = performance.now();
    
    playWindSound(800);
    
    particlesRef.current = createScatterEffect(
      particlesRef.current,
      x, y, 80, currentTime
    );
    
    cratersRef.current.push(createCrater(x, y, 80, currentTime));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    
    offscreenCanvasRef.current = offscreen;
    
    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      offscreen.width = width;
      offscreen.height = height;
      dimensionsRef.current = { width, height };
      
      particlesRef.current = initParticles(PARTICLE_COUNT, width, height);
    };
    
    resize();
    window.addEventListener('resize', resize);
    
    const animate = (currentTime: number) => {
      const { width, height } = dimensionsRef.current;
      const deltaTime = Math.min(currentTime - lastTimeRef.current, 32);
      lastTimeRef.current = currentTime;
      
      const currentControls = controlsRef.current;
      
      particlesRef.current = particlesRef.current.map(p => 
        updateParticle(p, currentControls, deltaTime, width, height, currentTime)
      );
      
      const grid = buildSpatialGrid(particlesRef.current, width, height);
      
      const newSparks = checkCollisionsAndCreateSparks(
        particlesRef.current,
        grid,
        currentControls,
        currentTime,
        lastSparkPositionsRef.current,
        width,
        height
      );
      sparksRef.current.push(...newSparks);
      sparksRef.current = updateSparks(sparksRef.current, currentTime);
      
      cratersRef.current = updateCraters(cratersRef.current, currentTime);
      
      drawBackground(ctx, width, height);
      
      for (const crater of cratersRef.current) {
        drawCrater(ctx, crater, currentTime);
      }
      
      if (currentControls.windSpeed > 5) {
        drawDuneStreamlines(offCtx, particlesRef.current, width, currentTime);
      } else {
        offCtx.clearRect(0, 0, width, height);
      }
      
      for (const particle of particlesRef.current) {
        drawParticle(ctx, particle);
      }
      
      ctx.drawImage(offscreen, 0, 0);
      
      const showMirage = currentControls.humidity >= 30 && 
                         currentControls.humidity <= 60 && 
                         currentControls.windSpeed >= 3 && 
                         currentControls.windSpeed <= 7;
      
      if (showMirage) {
        drawMirage(offCtx, ctx, width, height, currentTime);
        ctx.drawImage(offscreen, 0, 0);
      }
      
      for (const spark of sparksRef.current) {
        drawSpark(ctx, spark, currentTime);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameRef.current);
      cleanupAudio();
    };
  }, [drawBackground, drawParticle, drawDuneStreamlines, drawMirage, drawSpark, drawCrater]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor: 'crosshair',
      }}
    />
  );
};

export default SandScape;

import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import constellations, { ConstellationData, StarPoint } from '../data/stars';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

interface ConstellationPuzzleProps {
  outerAngle: number;
  currentConstellation: number;
  onSolved: (id: number) => void;
  onFail: () => void;
  showStars: boolean;
  particleActive: boolean;
}

function angleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

export default function ConstellationPuzzle({
  outerAngle,
  currentConstellation,
  onSolved,
  onFail,
  showStars,
  particleActive,
}: ConstellationPuzzleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const lastCheckRef = useRef(outerAngle);
  const checkedRef = useRef(false);

  useEffect(() => {
    checkedRef.current = false;
  }, [currentConstellation]);

  useEffect(() => {
    if (!particleActive || !showStars) return;

    const constellation = constellations[currentConstellation];
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const compassCx = rect.width / 2;
    const compassCy = rect.height / 2;

    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 80;
      newParticles.push({
        x: compassCx + Math.cos(angle) * dist,
        y: compassCy + Math.sin(angle) * dist,
        vx: (cx - (compassCx + Math.cos(angle) * dist)) / 90,
        vy: (cy - (compassCy + Math.sin(angle) * dist)) / 90 + 0.3,
        size: 2 + Math.random() * 3,
        life: 0,
        maxLife: 90,
      });
    }
    particlesRef.current = newParticles;

    const animate = () => {
      ctx!.clearRect(0, 0, rect.width, rect.height);
      particlesRef.current = particlesRef.current.filter((p) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02;
        if (p.life >= p.maxLife) return false;
        const alpha = 1 - p.life / p.maxLife;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx!.fill();
        return true;
      });
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [particleActive, showStars, currentConstellation]);

  useEffect(() => {
    const target = constellations[currentConstellation].targetAngle;
    const diff = angleDiff(outerAngle, target);
    if (diff <= 2 && !checkedRef.current) {
      checkedRef.current = true;
      onSolved(currentConstellation);
    }
  }, [outerAngle, currentConstellation, onSolved]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}

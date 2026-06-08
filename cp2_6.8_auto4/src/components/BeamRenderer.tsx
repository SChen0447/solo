import React, { useRef, useEffect, useCallback } from 'react';
import type { PathNode } from '../types';

interface BeamRendererProps {
  path: PathNode[];
  hexSize: number;
  gridWidth: number;
  gridHeight: number;
  isAnimating: boolean;
  onAnimationComplete?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const BeamRenderer: React.FC<BeamRendererProps> = ({
  path,
  hexSize,
  gridWidth,
  gridHeight,
  isAnimating,
  onAnimationComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const progressRef = useRef(0);
  const lastTimeRef = useRef(0);

  const hexWidth = hexSize * 2;
  const hexHeight = Math.sqrt(3) * hexSize;
  const horizontalSpacing = hexWidth * 0.75;
  const verticalSpacing = hexHeight;

  const canvasWidth = gridWidth * horizontalSpacing + hexWidth * 0.25;
  const canvasHeight = gridHeight * verticalSpacing + hexHeight * 0.5;

  const getHexCenter = useCallback(
    (x: number, y: number): { cx: number; cy: number } => {
      const cx = x * horizontalSpacing + hexSize;
      const cy =
        y * verticalSpacing +
        (x % 2 === 1 ? verticalSpacing / 2 : 0) +
        hexHeight / 2;
      return { cx, cy };
    },
    [horizontalSpacing, verticalSpacing, hexSize, hexHeight]
  );

  const getPathPoints = useCallback(() => {
    return path.map((node) => {
      const { cx, cy } = getHexCenter(node.x, node.y);
      return { x: cx, y: cy };
    });
  }, [path, getHexCenter]);

  const getColorAtProgress = (t: number): string => {
    const colors = [
      { r: 255, g: 107, b: 107 },
      { r: 254, g: 202, b: 87 },
      { r: 72, g: 219, b: 251 },
    ];

    const scaledT = t * (colors.length - 1);
    const idx = Math.floor(scaledT);
    const frac = scaledT - idx;

    if (idx >= colors.length - 1) {
      const c = colors[colors.length - 1];
      return `rgb(${c.r}, ${c.g}, ${c.b})`;
    }

    const c1 = colors[idx];
    const c2 = colors[idx + 1];

    const r = Math.round(c1.r + (c2.r - c1.r) * frac);
    const g = Math.round(c1.g + (c2.g - c1.g) * frac);
    const b = Math.round(c1.b + (c2.b - c1.b) * frac);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const spawnParticle = useCallback((x: number, y: number, color: string) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    particlesRef.current.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 30 + Math.random() * 30,
      size: 2 + Math.random() * 3,
      color,
    });
  }, []);

  const updateParticles = useCallback(() => {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= 1 / p.maxLife;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    while (particles.length > 200) {
      particles.shift();
    }
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const p of particlesRef.current) {
      const alpha = p.life;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const getPointOnPath = useCallback(
    (pathPoints: { x: number; y: number }[], progress: number) => {
      if (pathPoints.length < 2) return pathPoints[0] || { x: 0, y: 0 };

      const totalSegments = pathPoints.length - 1;
      const segmentProgress = progress * totalSegments;
      const segmentIndex = Math.min(
        Math.floor(segmentProgress),
        totalSegments - 1
      );
      const localProgress = segmentProgress - segmentIndex;

      const p1 = pathPoints[segmentIndex];
      const p2 = pathPoints[segmentIndex + 1];

      return {
        x: p1.x + (p2.x - p1.x) * localProgress,
        y: p1.y + (p2.y - p1.y) * localProgress,
      };
    },
    []
  );

  const drawBeam = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      pathPoints: { x: number; y: number }[],
      progress: number
    ) => {
      if (pathPoints.length < 2 || progress <= 0) return;

      const totalLength = pathPoints.length - 1;
      const currentLength = progress * totalLength;
      const fullSegments = Math.floor(currentLength);
      const partialProgress = currentLength - fullSegments;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let pass = 3; pass >= 0; pass--) {
        const glowSize = pass === 3 ? 20 : pass === 2 ? 12 : pass === 1 ? 6 : 2;
        const alpha = pass === 3 ? 0.15 : pass === 2 ? 0.3 : pass === 1 ? 0.6 : 1;

        ctx.globalAlpha = alpha;
        ctx.lineWidth = glowSize;

        for (let i = 0; i <= fullSegments && i < pathPoints.length - 1; i++) {
          const p1 = pathPoints[i];
          const p2 = pathPoints[i + 1];

          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          const t1 = i / totalLength;
          const t2 = (i + 1) / totalLength;
          gradient.addColorStop(0, getColorAtProgress(t1));
          gradient.addColorStop(1, getColorAtProgress(t2));

          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        if (partialProgress > 0 && fullSegments < pathPoints.length - 1) {
          const p1 = pathPoints[fullSegments];
          const p2 = pathPoints[fullSegments + 1];
          const endX = p1.x + (p2.x - p1.x) * partialProgress;
          const endY = p1.y + (p2.y - p1.y) * partialProgress;

          const gradient = ctx.createLinearGradient(p1.x, p1.y, endX, endY);
          const t1 = fullSegments / totalLength;
          const t2 = (fullSegments + partialProgress) / totalLength;
          gradient.addColorStop(0, getColorAtProgress(t1));
          gradient.addColorStop(1, getColorAtProgress(t2));

          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;

      if (progress > 0 && progress < 1) {
        const head = getPointOnPath(pathPoints, progress);
        const headColor = getColorAtProgress(progress);

        for (let i = 0; i < 3; i++) {
          const radius = 8 + i * 6;
          const alpha = 0.8 - i * 0.25;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = headColor;
          ctx.beginPath();
          ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
    [getColorAtProgress, getPointOnPath]
  );

  useEffect(() => {
    if (!isAnimating || path.length < 2) {
      progressRef.current = 0;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pathPoints = getPathPoints();
    const totalDuration = Math.min(Math.max(path.length * 0.15, 3), 5) * 1000;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      let progress = elapsed / totalDuration;
      progress = Math.min(progress, 1);
      progressRef.current = progress;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawBeam(ctx, pathPoints, progress);

      if (progress > 0) {
        const head = getPointOnPath(pathPoints, progress);
        const headColor = getColorAtProgress(progress);

        for (let i = 0; i < 2; i++) {
          spawnParticle(head.x, head.y, headColor);
        }
      }

      updateParticles();
      drawParticles(ctx);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setTimeout(() => {
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 500);
      }

      lastTimeRef.current = currentTime;
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [
    isAnimating,
    path,
    getPathPoints,
    drawBeam,
    getPointOnPath,
    getColorAtProgress,
    spawnParticle,
    updateParticles,
    drawParticles,
    onAnimationComplete,
  ]);

  useEffect(() => {
    if (!isAnimating && path.length >= 2) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const pathPoints = getPathPoints();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBeam(ctx, pathPoints, 1);
    }
  }, [isAnimating, path, getPathPoints, drawBeam]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="beam-canvas"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default BeamRenderer;

import React, { useRef, useEffect, useState } from 'react';

interface GrowthAnimationProps {
  growthProgress: number;
}

const GrowthAnimation: React.FC<GrowthAnimationProps> = ({ growthProgress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const duration = 4000;
    const targetProgress = growthProgress;
    const startProgress = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progressFraction = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progressFraction, 3);
      const current = startProgress + (targetProgress - startProgress) * eased;

      setAnimatedProgress(current);

      if (progressFraction < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [growthProgress]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const centerX = W / 2;
    const potTopY = H - 50;

    ctx.clearRect(0, 0, W, H);

    const drawPot = () => {
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.moveTo(centerX - 60, potTopY);
      ctx.lineTo(centerX + 60, potTopY);
      ctx.lineTo(centerX + 45, H - 10);
      ctx.lineTo(centerX - 45, H - 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#5D4037';
      ctx.fillRect(centerX - 65, potTopY - 8, 130, 10);

      ctx.fillStyle = '#6D4C41';
      ctx.fillRect(centerX - 55, potTopY + 2, 110, 6);
    };

    const lerpColor = (color1: string, color2: string, t: number): string => {
      const hex = (c: string) => parseInt(c, 16);
      const r1 = hex(color1.slice(1, 3));
      const g1 = hex(color1.slice(3, 5));
      const b1 = hex(color1.slice(5, 7));
      const r2 = hex(color2.slice(1, 3));
      const g2 = hex(color2.slice(3, 5));
      const b2 = hex(color2.slice(5, 7));
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return `rgb(${r}, ${g}, ${b})`;
    };

    drawPot();

    const p = Math.min(100, Math.max(0, animatedProgress));

    if (p < 20) {
      const seedProgress = p / 20;
      const seedW = 16 + seedProgress * 4;
      const seedH = 10 + seedProgress * 2;

      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(centerX, potTopY - 5, seedW, seedH, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
      ctx.beginPath();
      ctx.ellipse(centerX - 3, potTopY - 7, 4, 3, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const sproutProgress = Math.min((p - 20) / 25, 1);
      const stemHeight = 10 + sproutProgress * 40;
      const stemTopY = potTopY - stemHeight;

      ctx.strokeStyle = '#8BC34A';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(centerX, potTopY - 5);
      ctx.quadraticCurveTo(
        centerX + sproutProgress * 5,
        potTopY - stemHeight / 2,
        centerX,
        stemTopY
      );
      ctx.stroke();

      if (sproutProgress > 0.3) {
        const leafProgress = (sproutProgress - 0.3) / 0.7;
        const leafSize = 6 + leafProgress * 8;

        const leafColorProgress = leafProgress;
        const leafColor = lerpColor('#8BC34A', '#689F38', leafColorProgress);

        ctx.fillStyle = leafColor;
        ctx.beginPath();
        ctx.ellipse(centerX - 10, stemTopY + 3, leafSize, leafSize * 0.6, -0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.ellipse(centerX + 10, stemTopY + 3, leafSize, leafSize * 0.6, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p >= 45) {
        const adultProgress = Math.min((p - 45) / 55, 1);
        const mainStemHeight = stemHeight + adultProgress * 60;
        const mainStemTopY = potTopY - mainStemHeight;

        ctx.strokeStyle = '#689F38';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(centerX, potTopY - 5);
        ctx.quadraticCurveTo(
          centerX + adultProgress * 8,
          potTopY - mainStemHeight / 2,
          centerX,
          mainStemTopY
        );
        ctx.stroke();

        const branchConfigs = [
          { yRatio: 0.25, left: true, size: 14 },
          { yRatio: 0.25, left: false, size: 14 },
          { yRatio: 0.5, left: false, size: 18 },
          { yRatio: 0.5, left: true, size: 18 },
          { yRatio: 0.75, left: true, size: 20 },
          { yRatio: 0.75, left: false, size: 20 },
        ];

        branchConfigs.forEach((branch, idx) => {
          const appearAt = (idx / branchConfigs.length) * 0.8;
          if (adultProgress < appearAt) return;

          const branchProgress = Math.min((adultProgress - appearAt) / 0.4, 1);
          const branchY = potTopY - 5 - (mainStemHeight - 10) * branch.yRatio;
          const branchLength = 15 + branchProgress * 20;
          const branchEndX = branch.left ? centerX - branchLength : centerX + branchLength;
          const branchEndY = branchY - 10 - branchProgress * 5;

          ctx.strokeStyle = '#558B2F';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, branchY);
          ctx.quadraticCurveTo(
            branch.left ? centerX - branchLength * 0.7 : centerX + branchLength * 0.7,
            branchY - 5,
            branchEndX,
            branchEndY
          );
          ctx.stroke();

          const leafColorProgress = branchProgress;
          const leafColor = lerpColor('#8BC34A', '#4CAF50', leafColorProgress);
          const lSize = branch.size * (0.5 + branchProgress * 0.5);

          ctx.fillStyle = leafColor;
          const waves = 5;
          ctx.beginPath();
          ctx.moveTo(branchEndX, branchEndY);

          for (let i = 0; i <= waves; i++) {
            const t = i / waves;
            const angle = branch.left ? Math.PI * 0.3 + t * Math.PI * 1.2 : -Math.PI * 0.3 - t * Math.PI * 1.2;
            const r = lSize * (1 - Math.abs(t - 0.5) * 0.8);
            const waveOffset = Math.sin(t * Math.PI * 4) * 1.5;
            const x = branchEndX + Math.cos(angle) * (r + waveOffset);
            const y = branchEndY + Math.sin(angle) * (r + waveOffset);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        });

        if (adultProgress > 0.85) {
          const topLeafProgress = (adultProgress - 0.85) / 0.15;
          const leafColor = lerpColor('#8BC34A', '#4CAF50', topLeafProgress);

          ctx.fillStyle = leafColor;
          ctx.beginPath();
          ctx.ellipse(centerX - 12, mainStemTopY, 12 * topLeafProgress, 7 * topLeafProgress, -0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(centerX + 12, mainStemTopY, 12 * topLeafProgress, 7 * topLeafProgress, 0.4, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.ellipse(centerX, mainStemTopY - 8, 10 * topLeafProgress, 14 * topLeafProgress, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [animatedProgress]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};

export default GrowthAnimation;

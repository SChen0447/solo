import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import type { AvatarFeatures } from '../types';
import { CLOTHING_CONFIGS, EXPRESSION_CONFIGS } from '../types';

export interface AvatarCanvasHandle {
  exportPNG: (onProgress: (p: number) => void) => Promise<void>;
  playDissolveAnimation: (newFeatures: AvatarFeatures) => Promise<void>;
}

interface AvatarCanvasProps {
  features: AvatarFeatures;
  isAnimating: boolean;
}

const CANVAS_SIZE = 300;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

function darkenColor(hex: string, amount: number = 0.3): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`;
}

function lightenColor(hex: string, amount: number = 0.3): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.floor(r + (255 - r) * amount)}, ${Math.floor(g + (255 - g) * amount)}, ${Math.floor(b + (255 - b) * amount)})`;
}

function drawHandLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  jitter: number = 1.5
): void {
  const steps = Math.max(2, Math.floor(Math.hypot(x2 - x1, y2 - y1) / 10));
  ctx.beginPath();
  ctx.moveTo(x1 + (Math.random() - 0.5) * jitter, y1 + (Math.random() - 0.5) * jitter);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const AvatarCanvas = forwardRef<AvatarCanvasHandle, AvatarCanvasProps>(({ features, isAnimating }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [fadeOpacity, setFadeOpacity] = useState(1);
  const [exportProgress, setExportProgress] = useState(0);
  const [showExportProgress, setShowExportProgress] = useState(false);
  const animFrameRef = useRef<number>(0);
  const lastFeaturesRef = useRef<AvatarFeatures>(features);

  const drawAvatar = useCallback((ctx: CanvasRenderingContext2D, f: AvatarFeatures) => {
    const W = CANVAS_SIZE;
    const H = CANVAS_SIZE;
    const cx = W / 2;
    const cy = H / 2;

    ctx.clearRect(0, 0, W, H);
    ctx.save();

    const clothingConfig = CLOTHING_CONFIGS[f.clothing];

    // 服装
    ctx.save();
    ctx.fillStyle = clothingConfig.baseColor;
    ctx.strokeStyle = darkenColor(clothingConfig.baseColor, 0.4);
    ctx.lineWidth = 2;

    ctx.beginPath();
    if (f.clothing === 'shirt') {
      ctx.moveTo(cx - 90, cy + 95);
      ctx.lineTo(cx - 60, cy + 45);
      ctx.quadraticCurveTo(cx - 40, cy + 30, cx - 25, cy + 35);
      ctx.lineTo(cx, cy + 55);
      ctx.lineTo(cx + 25, cy + 35);
      ctx.quadraticCurveTo(cx + 40, cy + 30, cx + 60, cy + 45);
      ctx.lineTo(cx + 90, cy + 95);
      ctx.lineTo(cx - 90, cy + 95);
    } else if (f.clothing === 'tshirt') {
      ctx.moveTo(cx - 85, cy + 95);
      ctx.lineTo(cx - 70, cy + 50);
      ctx.lineTo(cx - 45, cy + 38);
      ctx.quadraticCurveTo(cx, cy + 50, cx + 45, cy + 38);
      ctx.lineTo(cx + 70, cy + 50);
      ctx.lineTo(cx + 85, cy + 95);
      ctx.lineTo(cx - 85, cy + 95);
    } else if (f.clothing === 'hoodie') {
      ctx.moveTo(cx - 95, cy + 95);
      ctx.lineTo(cx - 75, cy + 40);
      ctx.quadraticCurveTo(cx - 40, cy + 20, cx, cy + 35);
      ctx.quadraticCurveTo(cx + 40, cy + 20, cx + 75, cy + 40);
      ctx.lineTo(cx + 95, cy + 95);
      ctx.lineTo(cx - 95, cy + 95);
    } else if (f.clothing === 'dress') {
      ctx.moveTo(cx - 95, cy + 95);
      ctx.quadraticCurveTo(cx - 70, cy + 55, cx - 40, cy + 40);
      ctx.quadraticCurveTo(cx, cy + 52, cx + 40, cy + 40);
      ctx.quadraticCurveTo(cx + 70, cy + 55, cx + 95, cy + 95);
      ctx.lineTo(cx - 95, cy + 95);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (clothingConfig.pattern === 'dots') {
      ctx.fillStyle = clothingConfig.accentColor;
      for (let row = 0; row < 5; row++) {
        for (let col = -3; col <= 3; col++) {
          const px = cx + col * 22 + (row % 2) * 11;
          const py = cy + 45 + row * 12;
          if (py > cy + 40 && py < cy + 95) {
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();

    // 脖子
    ctx.fillStyle = darkenColor(f.skinColor, 0.1);
    ctx.strokeStyle = darkenColor(f.skinColor, 0.4);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 18, cy + 35);
    ctx.lineTo(cx - 15, cy + 58);
    ctx.lineTo(cx + 15, cy + 58);
    ctx.lineTo(cx + 18, cy + 35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 脸部（椭圆）
    const faceTop = cy - 75;
    const faceBottom = cy + 35;
    ctx.fillStyle = f.skinColor;
    ctx.strokeStyle = darkenColor(f.skinColor, 0.4);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, (faceTop + faceBottom) / 2, 55, (faceBottom - faceTop) / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 脸部柔和阴影
    ctx.save();
    const gradient = ctx.createRadialGradient(cx + 20, cy - 20, 5, cx + 20, cy - 20, 60);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(${hexToRgb(darkenColor(f.skinColor, 0.3)).r}, ${hexToRgb(darkenColor(f.skinColor, 0.3)).g}, ${hexToRgb(darkenColor(f.skinColor, 0.3)).b}, 0.25)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(cx, (faceTop + faceBottom) / 2, 54, (faceBottom - faceTop) / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 高光
    ctx.save();
    const highlightGrad = ctx.createRadialGradient(cx - 20, cy - 40, 3, cx - 20, cy - 40, 35);
    highlightGrad.addColorStop(0, `rgba(255, 255, 255, 0.25)`);
    highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.ellipse(cx, (faceTop + faceBottom) / 2, 54, (faceBottom - faceTop) / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const exprCfg = EXPRESSION_CONFIGS[f.expression];

    // 眉毛
    ctx.strokeStyle = darkenColor(f.hairColor, 0.3);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const browY = cy - 28;
    const browAngleRad = exprCfg.browAngle;

    drawHandLine(ctx, cx - 32, browY + browAngleRad * 20, cx - 12, browY - browAngleRad * 10, 0.8);
    drawHandLine(ctx, cx + 12, browY - browAngleRad * 10, cx + 32, browY + browAngleRad * 20, 0.8);

    // 眼睛
    const eyeY = cy - 12;
    const eyeLx = cx - 22;
    const eyeRx = cx + 22;
    const baseEyeRadius = 7 * exprCfg.eyeSize;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#2C1810';
    ctx.lineWidth = 2;

    const drawEye = (x: number, squint: number) => {
      ctx.beginPath();
      if (squint > 0.5) {
        ctx.moveTo(x - baseEyeRadius, eyeY);
        ctx.quadraticCurveTo(x, eyeY + 2, x + baseEyeRadius, eyeY);
        ctx.quadraticCurveTo(x, eyeY - 2, x - baseEyeRadius, eyeY);
      } else {
        const ry = baseEyeRadius * (1 - squint * 0.6);
        ctx.ellipse(x, eyeY, baseEyeRadius, ry, 0, 0, Math.PI * 2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if (squint < 0.8) {
        const pupilR = 3.5 * exprCfg.eyeSize * (1 - squint * 0.5);
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(x, eyeY, pupilR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x - 1, eyeY - 1.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const leftSquint = f.expression === 'wink' ? 1 : exprCfg.eyeSquint;
    drawEye(eyeLx, leftSquint);
    drawEye(eyeRx, exprCfg.eyeSquint);

    // 鼻子
    ctx.strokeStyle = darkenColor(f.skinColor, 0.45);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2);
    ctx.quadraticCurveTo(cx - 4, cy + 8, cx - 2, cy + 10);
    ctx.quadraticCurveTo(cx, cy + 12, cx + 2, cy + 10);
    ctx.quadraticCurveTo(cx + 4, cy + 8, cx, cy);
    ctx.stroke();

    // 腮红
    ctx.save();
    ctx.fillStyle = `rgba(255, 150, 150, 0.25)`;
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy + 8, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 35, cy + 8, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 嘴巴
    const mouthY = cy + 22;
    ctx.strokeStyle = '#C0392B';
    ctx.fillStyle = '#C0392B';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    if (f.expression === 'surprised') {
      ctx.ellipse(cx, mouthY, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const curveAmount = exprCfg.mouthCurve * 12;
      const openAmount = exprCfg.mouthOpen * 6;
      ctx.moveTo(cx - 16, mouthY);
      ctx.quadraticCurveTo(cx - 8, mouthY + curveAmount, cx, mouthY + curveAmount + openAmount);
      ctx.quadraticCurveTo(cx + 8, mouthY + curveAmount, cx + 16, mouthY);
      if (openAmount > 0) {
        ctx.quadraticCurveTo(cx + 8, mouthY + curveAmount + openAmount * 1.5, cx, mouthY + curveAmount + openAmount);
        ctx.quadraticCurveTo(cx - 8, mouthY + curveAmount + openAmount * 1.5, cx - 16, mouthY);
      }
      ctx.stroke();
    }

    // 头发
    if (f.hairStyle !== 'bald') {
      ctx.fillStyle = f.hairColor;
      ctx.strokeStyle = darkenColor(f.hairColor, 0.35);
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';

      if (f.hairStyle === 'short') {
        ctx.beginPath();
        ctx.moveTo(cx - 52, cy - 20);
        ctx.quadraticCurveTo(cx - 58, cy - 60, cx - 35, cy - 72);
        ctx.quadraticCurveTo(cx, cy - 85, cx + 35, cy - 72);
        ctx.quadraticCurveTo(cx + 58, cy - 60, cx + 52, cy - 20);
        ctx.quadraticCurveTo(cx + 48, cy - 35, cx + 42, cy - 30);
        ctx.quadraticCurveTo(cx, cy - 50, cx - 42, cy - 30);
        ctx.quadraticCurveTo(cx - 48, cy - 35, cx - 52, cy - 20);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 发丝
        ctx.strokeStyle = lightenColor(f.hairColor, 0.15);
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const hx = cx - 35 + i * 14;
          const hy1 = cy - 72 + Math.sin(i) * 3;
          const hy2 = cy - 45;
          drawHandLine(ctx, hx, hy1, hx - 3, hy2, 0.8);
        }
      } else if (f.hairStyle === 'ponytail') {
        // 刘海
        ctx.beginPath();
        ctx.moveTo(cx - 50, cy - 18);
        ctx.quadraticCurveTo(cx - 56, cy - 58, cx - 32, cy - 72);
        ctx.quadraticCurveTo(cx, cy - 85, cx + 32, cy - 72);
        ctx.quadraticCurveTo(cx + 56, cy - 58, cx + 50, cy - 18);
        ctx.quadraticCurveTo(cx + 30, cy - 40, cx + 10, cy - 35);
        ctx.quadraticCurveTo(cx - 10, cy - 30, cx - 30, cy - 40);
        ctx.quadraticCurveTo(cx - 45, cy - 38, cx - 50, cy - 18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 马尾
        ctx.beginPath();
        ctx.moveTo(cx + 40, cy - 55);
        ctx.quadraticCurveTo(cx + 70, cy - 40, cx + 65, cy + 10);
        ctx.quadraticCurveTo(cx + 60, cy - 5, cx + 50, cy - 15);
        ctx.quadraticCurveTo(cx + 55, cy - 30, cx + 40, cy - 55);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 绑带
        ctx.fillStyle = darkenColor(f.hairColor, 0.5);
        ctx.beginPath();
        ctx.ellipse(cx + 45, cy - 45, 6, 8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else if (f.hairStyle === 'curly') {
        // 卷发
        ctx.fillStyle = f.hairColor;
        ctx.beginPath();
        ctx.moveTo(cx - 55, cy - 10);
        for (let angle = Math.PI; angle <= Math.PI * 2; angle += 0.15) {
          const r = 60 + Math.sin(angle * 6) * 8;
          const x = cx + Math.cos(angle) * r;
          const y = (faceTop + faceBottom) / 2 - 40 + Math.sin(angle) * (r * 0.75);
          if (angle === Math.PI) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(cx + 55, cy - 10);
        ctx.quadraticCurveTo(cx + 45, cy - 30, cx + 35, cy - 25);
        ctx.quadraticCurveTo(cx, cy - 50, cx - 35, cy - 25);
        ctx.quadraticCurveTo(cx - 45, cy - 30, cx - 55, cy - 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 两侧卷发
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(cx + side * 55, cy - 15 + i * 18, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // 发丝高光
        ctx.strokeStyle = lightenColor(f.hairColor, 0.2);
        ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
          const hx = cx - 30 + i * 15;
          drawHandLine(ctx, hx, cy - 70, hx - 2, cy - 45, 0.6);
        }
      }
    }

    ctx.restore();
  }, []);

  const renderToCanvas = useCallback((f: AvatarFeatures) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawAvatar(ctx, f);
  }, [drawAvatar]);

  useEffect(() => {
    if (isAnimating) return;

    const hasChanged = JSON.stringify(lastFeaturesRef.current) !== JSON.stringify(features);
    if (!hasChanged) return;

    setFadeOpacity(0);
    const fadeTimer = setTimeout(() => {
      renderToCanvas(features);
      lastFeaturesRef.current = features;
      setFadeOpacity(1);
    }, 250);

    return () => clearTimeout(fadeTimer);
  }, [features, isAnimating, renderToCanvas]);

  useEffect(() => {
    renderToCanvas(features);
  }, []);

  useImperativeHandle(ref, () => ({
    exportPNG: async (onProgress: (p: number) => void): Promise<void> => {
      return new Promise((resolve) => {
        setShowExportProgress(true);
        const startTime = Date.now();
        const duration = 1000;

        const animateProgress = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          setExportProgress(progress * 100);
          onProgress(progress * 100);

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animateProgress);
          } else {
            const canvas = canvasRef.current;
            if (canvas) {
              const link = document.createElement('a');
              link.download = `avatar_${Date.now()}.png`;
              link.href = canvas.toDataURL('image/png');
              link.click();
            }
            setTimeout(() => {
              setShowExportProgress(false);
              setExportProgress(0);
              resolve();
            }, 200);
          }
        };
        animFrameRef.current = requestAnimationFrame(animateProgress);
      });
    },

    playDissolveAnimation: async (newFeatures: AvatarFeatures): Promise<void> => {
      return new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas) { resolve(); return; }
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(); return; }

        if (!bufferCanvasRef.current) {
          bufferCanvasRef.current = document.createElement('canvas');
          bufferCanvasRef.current.width = CANVAS_SIZE;
          bufferCanvasRef.current.height = CANVAS_SIZE;
        }
        const bufferCtx = bufferCanvasRef.current.getContext('2d');
        if (!bufferCtx) { resolve(); return; }

        drawAvatar(bufferCtx, newFeatures);
        const newImageData = bufferCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const oldImageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const resultData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);

        const pixelCount = CANVAS_SIZE * CANVAS_SIZE;
        const randomOrder = new Uint32Array(pixelCount);
        for (let i = 0; i < pixelCount; i++) randomOrder[i] = i;
        for (let i = pixelCount - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [randomOrder[i], randomOrder[j]] = [randomOrder[j], randomOrder[i]];
        }

        const duration = 2000;
        const startTime = Date.now();
        let lastUpdate = 0;

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(1, elapsed / duration);
          const pixelsToSwap = Math.floor(pixelCount * progress);

          if (elapsed - lastUpdate > 40) {
            for (let i = 0; i < pixelCount * 4; i++) {
              resultData.data[i] = oldImageData.data[i];
            }
            for (let i = 0; i < pixelsToSwap; i++) {
              const idx = randomOrder[i] * 4;
              resultData.data[idx] = newImageData.data[idx];
              resultData.data[idx + 1] = newImageData.data[idx + 1];
              resultData.data[idx + 2] = newImageData.data[idx + 2];
              resultData.data[idx + 3] = newImageData.data[idx + 3];
            }
            ctx.putImageData(resultData, 0, 0);
            lastUpdate = elapsed;
          }

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            drawAvatar(ctx, newFeatures);
            lastFeaturesRef.current = newFeatures;
            resolve();
          }
        };
        animFrameRef.current = requestAnimationFrame(animate);
      });
    }
  }), [drawAvatar]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const progressRadius = 50;
  const circumference = 2 * Math.PI * progressRadius;
  const strokeDashoffset = circumference - (exportProgress / 100) * circumference;

  return (
    <div style={{
      position: 'relative',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      border: '2px solid #7F8C8D',
      borderRadius: '8px',
      backgroundColor: '#34495E',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{
          opacity: fadeOpacity,
          transition: 'opacity 0.25s ease-in-out',
          borderRadius: '6px',
        }}
      />
      {showExportProgress && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(44, 62, 80, 0.7)',
          borderRadius: '6px',
        }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60"
              cy="60"
              r={progressRadius}
              stroke="#7F8C8D"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r={progressRadius}
              stroke="#3498DB"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: 'stroke-dashoffset 0.05s linear' }}
            />
          </svg>
          <span style={{
            position: 'absolute',
            color: '#ECF0F1',
            fontSize: '20px',
            fontWeight: 'bold',
          }}>
            {Math.floor(exportProgress)}%
          </span>
        </div>
      )}
    </div>
  );
});

AvatarCanvas.displayName = 'AvatarCanvas';

export default AvatarCanvas;

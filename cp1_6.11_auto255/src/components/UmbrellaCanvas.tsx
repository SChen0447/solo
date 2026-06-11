import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { hexToRgb, applyInkDiffusion, wetToDryColor, getWetHighlight, RGBColor } from '../utils/colorUtils';

interface UmbrellaCanvasProps {
  currentColor: string;
  isDrying: boolean;
  dryness: number;
  windSpeed: number;
  humidity: number;
  onStrokeComplete?: (sectorIndex: number) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

const UmbrellaCanvas: React.FC<UmbrellaCanvasProps> = ({
  currentColor,
  isDrying,
  dryness,
  windSpeed,
  humidity,
  onStrokeComplete,
  onCanvasReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [lastTime, setLastTime] = useState<number>(0);
  const [flashSector, setFlashSector] = useState<number | null>(null);
  
  const sectorDataRef = useRef<ImageData[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const centerX = 300;
  const centerY = 300;
  const radius = 280;
  const numSectors = 12;

  const boneBends = useMemo(() => {
    if (humidity >= 70) {
      return Array.from({ length: numSectors }, () => ({
        bend: (Math.random() - 0.5) * 6,
      }));
    }
    return Array.from({ length: numSectors }, () => ({ bend: 0 }));
  }, [humidity]);

  const tasselAngle = useMemo(() => {
    if (windSpeed >= 4) {
      return 45 + windSpeed * 3;
    }
    return windSpeed * 8;
  }, [windSpeed]);

  const initSectorData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sectorDataRef.current = [];
    for (let i = 0; i < numSectors; i++) {
      const sectorCanvas = document.createElement('canvas');
      sectorCanvas.width = 600;
      sectorCanvas.height = 600;
      const sCtx = sectorCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#faf0e6';
        sCtx.fillRect(0, 0, 600, 600);
      }
      sectorDataRef.current[i] = sCtx!.getImageData(0, 0, 600, 600);
    }
  }, [canvasRef]);

  const getSectorAtPoint = useCallback((x: number, y: number): number | null => {
    const dx = x - centerX;
    const dy = y - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > radius || dist < 30) return null;
    
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    const sectorAngle = 360 / numSectors;
    const sectorIndex = Math.floor((angle + sectorAngle / 2) / sectorAngle) % numSectors;
    
    return sectorIndex;
  }, []);

  const drawUmbrellaBase = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 600, 600);

    for (let i = 0; i < numSectors; i++) {
      const startAngle = ((i * 360) / numSectors - 90 - 15) * (Math.PI / 180);
      const endAngle = (((i + 1) * 360) / numSectors - 90 - 15) * (Math.PI / 180);

      const sectorData = sectorDataRef.current[i];
      if (sectorData) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.clip();

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 600;
        tempCanvas.height = 600;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          if (isDrying) {
            const imgData = new ImageData(
              new Uint8ClampedArray(sectorData.data),
              sectorData.width,
              sectorData.height
            );
            
            for (let p = 0; p < imgData.data.length; p += 4) {
              if (imgData.data[p + 3] > 0) {
                const color: RGBColor = {
                  r: imgData.data[p],
                  g: imgData.data[p + 1],
                  b: imgData.data[p + 2],
                  a: imgData.data[p + 3],
                };
                const dryColor = wetToDryColor(color, dryness);
                imgData.data[p] = dryColor.r;
                imgData.data[p + 1] = dryColor.g;
                imgData.data[p + 2] = dryColor.b;
              }
            }
            tempCtx.putImageData(imgData, 0, 0);
            
            const highlightOpacity = getWetHighlight(dryness);
            if (highlightOpacity > 0) {
              tempCtx.globalCompositeOperation = 'lighter';
              tempCtx.fillStyle = `rgba(255, 255, 255, ${highlightOpacity})`;
              tempCtx.fillRect(0, 0, 600, 600);
            }
          } else {
            tempCtx.putImageData(sectorData, 0, 0);
          }
          
          ctx.drawImage(tempCanvas, 0, 0);
        }

        if (flashSector === i) {
          ctx.fillStyle = 'rgba(255, 255, 200, 0.3)';
          ctx.fillRect(0, 0, 600, 600);
        }

        ctx.restore();
      }
    }

    for (let i = 0; i < numSectors; i++) {
      const angle = ((i * 360) / numSectors - 90) * (Math.PI / 180);
      const bend = boneBends[i].bend;
      
      ctx.beginPath();
      ctx.strokeStyle = i % 2 === 0 ? '#4e342e' : '#5d4037';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      
      const endX = centerX + Math.cos(angle) * (radius - 5);
      const endY = centerY + Math.sin(angle) * (radius - 5);
      
      const midX = centerX + Math.cos(angle) * (radius * 0.6) + bend;
      const midY = centerY + Math.sin(angle) * (radius * 0.6);
      
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#5d4037';
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3;
    ctx.stroke();
  }, [isDrying, dryness, flashSector, boneBends]);

  const drawHandle = useCallback(() => {
    const handleHeight = 120;
    const handleX = centerX;
    const handleY = centerY + radius + 10;
    
    return (
      <svg
        className="umbrella-handle"
        style={{
          position: 'absolute',
          top: centerY + radius - 10,
          left: centerX - 8,
          pointerEvents: 'none',
        }}
        width="60"
        height={handleHeight + 80}
        viewBox="0 0 60 200"
      >
        <path
          d={`M16 0 Q16 ${handleHeight * 0.3} 20 ${handleHeight * 0.6} Q24 ${handleHeight * 0.85} 16 ${handleHeight}`}
          stroke="#5d4037"
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M16 0 Q16 ${handleHeight * 0.3} 20 ${handleHeight * 0.6} Q24 ${handleHeight * 0.85} 16 ${handleHeight}`}
          stroke="#8d6e63"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        
        <g style={{ transformOrigin: '16px 120px', transform: `rotate(${tasselAngle}deg)`, transition: 'transform 0.5s ease' }}>
          <ellipse cx="16" cy="125" rx="10" ry="6" fill="#f9a825" />
          <path d="M10 128 Q8 160 12 180" stroke="#f9a825" strokeWidth="2" fill="none" />
          <path d="M16 130 Q16 165 16 185" stroke="#fbc02d" strokeWidth="3" fill="none" />
          <path d="M22 128 Q24 160 20 180" stroke="#f9a825" strokeWidth="2" fill="none" />
          <circle cx="12" cy="180" r="3" fill="#f57f17" />
          <circle cx="16" cy="185" r="3.5" fill="#f57f17" />
          <circle cx="20" cy="180" r="3" fill="#f57f17" />
        </g>
      </svg>
    );
  }, [tasselAngle]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const sectorIndex = getSectorAtPoint(x, y);
    if (sectorIndex !== null) {
      setIsDrawing(true);
      setLastPos({ x, y });
      setLastTime(Date.now());
    }
  }, [isDrying, canvasRef, getSectorAtPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos || isDrying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastTime;
    const dist = Math.sqrt((x - lastPos.x) ** 2 + (y - lastPos.y) ** 2);
    const speed = timeDiff > 0 ? dist / timeDiff : 0;

    const maxSpeed = 2;
    const pressure = Math.max(0.1, Math.min(1, 1 - speed / maxSpeed));
    
    const baseRadius = 8;
    const brushRadius = baseRadius * (0.3 + pressure * 0.7);
    const intensity = 0.3 + pressure * 0.7;

    const steps = Math.max(1, Math.floor(dist / 2));
    const color = hexToRgb(currentColor);

    const sectorIndex = getSectorAtPoint(x, y);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = lastPos.x + (x - lastPos.x) * t;
      const py = lastPos.y + (y - lastPos.y) * t;

      const currentSector = getSectorAtPoint(px, py);
      if (currentSector !== null && sectorDataRef.current[currentSector]) {
        applyInkDiffusion(
          sectorDataRef.current[currentSector],
          px,
          py,
          brushRadius,
          color,
          intensity
        );
      }
    }

    const ctx = canvas.getContext('2d');
    if (ctx) {
      drawUmbrellaBase(ctx);
    }

    setLastPos({ x, y });
    setLastTime(currentTime);
  }, [isDrawing, lastPos, lastTime, isDrying, currentColor, canvasRef, getSectorAtPoint, drawUmbrellaBase]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing && lastPos) {
      const sectorIndex = getSectorAtPoint(lastPos.x, lastPos.y);
      if (sectorIndex !== null) {
        setFlashSector(sectorIndex);
        setTimeout(() => setFlashSector(null), 300);
        
        if (onStrokeComplete) {
          onStrokeComplete(sectorIndex);
        }
      }
    }
    setIsDrawing(false);
    setLastPos(null);
  }, [isDrawing, lastPos, getSectorAtPoint, onStrokeComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (sectorDataRef.current.length === 0) {
      initSectorData();
    }

    drawUmbrellaBase(ctx);
    
    if (onCanvasReady) {
      onCanvasReady(canvas);
    }
  }, [canvasRef, initSectorData, drawUmbrellaBase, onCanvasReady]);

  useEffect(() => {
    if (!isDrying) return;

    const animate = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawUmbrellaBase(ctx);
        }
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDrying, dryness, canvasRef, drawUmbrellaBase]);

  return (
    <div className="umbrella-canvas-container" style={{ width: 600, height: 750 }}>
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDrying ? 'default' : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M4 20L8 16L16 8L20 4' stroke='${encodeURIComponent(currentColor)}' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3Ccircle cx='4' cy='20' r='3' fill='${encodeURIComponent(currentColor)}'/%3E%3C/svg%3E") 2 22, crosshair`,
        }}
      />
      {drawHandle()}
    </div>
  );
};

export default UmbrellaCanvas;

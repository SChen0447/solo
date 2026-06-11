import React, { useState, useEffect, useRef, useCallback } from 'react';
import { applyBrushStroke, calculateRubbingProgress, convertToRubbingEffect } from '../utils/paperPhysics';
import html2canvas from 'html2canvas';

type ToolType = 'soft' | 'hard' | 'sponge' | 'roller';

const TOOLS: { id: ToolType; name: string; icon: React.ReactNode }[] = [
  {
    id: 'soft',
    name: '软毛刷',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <path d="M4 28c0-4 4-6 8-6s8 2 8 6-4 4-8 4-8-2-8-4zm4-18c4 0 8 2 8 6v8H8v-8c0-4 0-6 0-6zm8-4c6 0 10 4 10 10v8h-4v-8c0-4-2-6-6-6V6z" />
      </svg>
    )
  },
  {
    id: 'hard',
    name: '硬毛刷',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <path d="M6 26h20v4H6zM10 4h2v16h-2zM14 4h2v16h-2zM18 4h2v16h-2zM22 4h2v16h-2zM8 22h16v4H8z" />
      </svg>
    )
  },
  {
    id: 'sponge',
    name: '海绵拍',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <ellipse cx="16" cy="22" rx="12" ry="6" />
        <path d="M6 22V16c0-4 4-6 10-6s10 2 10 6v6" />
        <circle cx="12" cy="20" r="1.5" fill="#faf0e6" />
        <circle cx="20" cy="18" r="2" fill="#faf0e6" />
        <circle cx="16" cy="24" r="1.5" fill="#faf0e6" />
      </svg>
    )
  },
  {
    id: 'roller',
    name: '滚筒',
    icon: (
      <svg viewBox="0 0 32 32" fill="currentColor">
        <rect x="4" y="8" width="24" height="10" rx="3" />
        <path d="M26 13h2v3h-2z" />
        <rect x="12" y="20" width="8" height="3" />
        <rect x="14" y="24" width="4" height="6" rx="1" />
      </svg>
    )
  }
];

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 400;

interface RubbingCanvasProps {
  paperCanvas: HTMLCanvasElement | null;
}

const RubbingCanvas: React.FC<RubbingCanvasProps> = ({ paperCanvas }) => {
  const [selectedTool, setSelectedTool] = useState<ToolType>('soft');
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const progressCheckRef = useRef(0);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !paperCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const sourceCanvas = document.createElement('canvas');
    sourceCanvas.width = paperCanvas.width;
    sourceCanvas.height = paperCanvas.height;
    const sourceCtx = sourceCanvas.getContext('2d');
    if (sourceCtx) {
      sourceCtx.drawImage(paperCanvas, 0, 0);
      const sourceData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const convertedData = convertToRubbingEffect(sourceData, 0.5);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = convertedData.width;
      tempCanvas.height = convertedData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.putImageData(convertedData, 0, 0);
        const targetCtx = canvas.getContext('2d');
        if (targetCtx) {
          targetCtx.fillStyle = '#1a1a1a';
          targetCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        (window as any).__rubbingSource = tempCanvas;
      }
    }

    setProgress(0);
    setIsComplete(false);
  }, [paperCanvas]);

  useEffect(() => {
    if (paperCanvas) {
      initCanvas();
    }
  }, [paperCanvas, initCanvas]);

  const interpolatePoints = (
    x0: number, y0: number,
    x1: number, y1: number,
    step: number = 5
  ): Array<{ x: number; y: number }> => {
    const points: Array<{ x: number; y: number }> = [];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(Math.ceil(dist / step), 1);

    for (let i = 0; i <= steps; i++) {
      points.push({
        x: x0 + (dx * i) / steps,
        y: y0 + (dy * i) / steps
      });
    }
    return points;
  };

  const applyStroke = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    const sourceCanvas = (window as any).__rubbingSource as HTMLCanvasElement | undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx || !sourceCanvas) return;

    if (lastPosRef.current) {
      const points = interpolatePoints(lastPosRef.current.x, lastPosRef.current.y, x, y, 3);
      for (const p of points) {
        drawFromSource(canvas, sourceCanvas, p.x, p.y, selectedTool);
      }
    } else {
      drawFromSource(canvas, sourceCanvas, x, y, selectedTool);
    }

    lastPosRef.current = { x, y };

    progressCheckRef.current++;
    if (progressCheckRef.current % 30 === 0) {
      const currentProgress = calculateRubbingProgress(canvas);
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        setIsComplete(true);
      }
    }
  }, [selectedTool]);

  const drawFromSource = (
    targetCanvas: HTMLCanvasElement,
    sourceCanvas: HTMLCanvasElement,
    centerX: number,
    centerY: number,
    toolType: ToolType
  ) => {
    const brushSizes: Record<string, number> = {
      soft: 45,
      hard: 25,
      sponge: 60,
      roller: 80
    };
    const brushSize = brushSizes[toolType] || 40;
    const radius = brushSize / 2;

    const targetCtx = targetCanvas.getContext('2d');
    const sourceCtx = sourceCanvas.getContext('2d');
    if (!targetCtx || !sourceCtx) return;

    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(targetCanvas.width, Math.ceil(centerX + radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(targetCanvas.height, Math.ceil(centerY + radius));

    const srcStartX = Math.floor(startX * (sourceCanvas.width / targetCanvas.width));
    const srcEndX = Math.ceil(endX * (sourceCanvas.width / targetCanvas.width));
    const srcStartY = Math.floor(startY * (sourceCanvas.height / targetCanvas.height));
    const srcEndY = Math.ceil(endY * (sourceCanvas.height / targetCanvas.height));

    const srcW = Math.max(srcEndX - srcStartX, 1);
    const srcH = Math.max(srcEndY - srcStartY, 1);

    try {
      const srcImageData = sourceCtx.getImageData(
        Math.max(0, srcStartX),
        Math.max(0, srcStartY),
        Math.min(srcW, sourceCanvas.width),
        Math.min(srcH, sourceCanvas.height)
      );

      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      targetCtx.clip();

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          const falloff = 1 - (dist / radius);
          let effectStrength: number;
          switch (toolType) {
            case 'soft':
              effectStrength = falloff * 0.85;
              break;
            case 'hard':
              effectStrength = dist < radius * 0.8 ? 1 : Math.max(0, (radius - dist) / (radius * 0.2));
              break;
            case 'sponge':
              const noise = Math.sin(x * 0.5 + y * 0.7) * Math.cos(x * 0.3 - y * 0.5);
              effectStrength = Math.min(1, falloff * (0.5 + noise * 0.3 + Math.random() * 0.4));
              break;
            case 'roller':
              const lineEffect = Math.abs(Math.sin((x + y) * 0.08));
              effectStrength = falloff * (0.6 + lineEffect * 0.35);
              break;
            default:
              effectStrength = falloff;
          }

          if (effectStrength < 0.1) continue;

          const srcX = Math.min(Math.floor((x / targetCanvas.width) * sourceCanvas.width) - srcStartX, srcImageData.width - 1);
          const srcY = Math.min(Math.floor((y / targetCanvas.height) * sourceCanvas.height) - srcStartY, srcImageData.height - 1);
          const srcIdx = (Math.max(0, srcY) * srcImageData.width + Math.max(0, srcX)) * 4;

          const r = srcImageData.data[srcIdx];
          const g = srcImageData.data[srcIdx + 1];
          const b = srcImageData.data[srcIdx + 2];

          targetCtx.globalAlpha = effectStrength;
          targetCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          targetCtx.fillRect(x, y, 1, 1);
        }
      }

      targetCtx.restore();
    } catch (e) {
      console.warn('Source canvas access error:', e);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastPosRef.current = null;
    applyStroke(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    applyStroke(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    lastPosRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      const currentProgress = calculateRubbingProgress(canvas);
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        setIsComplete(true);
      }
    }
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
    lastPosRef.current = null;
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 800;
    exportCanvas.height = 600;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.fillStyle = '#1a1a1a';
    exportCtx.fillRect(0, 0, 800, 600);

    const scale = Math.min(800 / CANVAS_WIDTH, 600 / CANVAS_HEIGHT) * 0.9;
    const w = CANVAS_WIDTH * scale;
    const h = CANVAS_HEIGHT * scale;
    const x = (800 - w) / 2;
    const y = (600 - h) / 2;

    exportCtx.fillStyle = '#f5f5f5';
    exportCtx.fillRect(x - 10, y - 10, w + 20, h + 20);
    exportCtx.drawImage(canvas, x, y, w, h);

    exportCtx.fillStyle = '#5d4037';
    exportCtx.font = 'bold 24px serif';
    exportCtx.textAlign = 'center';
    exportCtx.fillText('古法拓印', 400, y + h + 45);
    exportCtx.font = '14px serif';
    exportCtx.fillStyle = '#8d6e63';
    exportCtx.fillText(new Date().toLocaleDateString('zh-CN'), 400, y + h + 68);

    const link = document.createElement('a');
    link.download = `rubbing_${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="rubbing-layout">
      <div className="panel tool-panel">
        <div className="panel-title">拓印工具</div>
        {TOOLS.map(tool => (
          <div
            key={tool.id}
            className={`tool-item ${selectedTool === tool.id ? 'selected' : ''}`}
            onClick={() => setSelectedTool(tool.id)}
          >
            <div className="tool-icon">{tool.icon}</div>
            <div className="tool-name">{tool.name}</div>
          </div>
        ))}
        {isComplete && (
          <button className="btn export-btn" onClick={handleExport}>
            导出拓印图
          </button>
        )}
      </div>

      <div
        className="rubbing-canvas-wrapper"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="rubbing-progress">
          拓印进度: {progress}%
          {isComplete && <span style={{ color: '#ffd54f', marginLeft: 8 }}>✓ 完成</span>}
        </div>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            cursor: selectedTool ? 'crosshair' : 'default',
            touchAction: 'none'
          }}
        />
      </div>
    </div>
  );
};

export default RubbingCanvas;

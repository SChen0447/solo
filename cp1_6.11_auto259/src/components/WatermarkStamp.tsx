import React, { useState, useEffect, useRef, useCallback } from 'react';
import { applyWatermarkGrayscale } from '../utils/paperPhysics';

export interface Stamp {
  id: string;
  name: string;
  svg: React.ReactNode;
}

const STAMPS: Stamp[] = [
  {
    id: 'orchid',
    name: '兰花',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 8c-2 6-8 10-8 16 0 4 3 7 8 7s8-3 8-7c0-6-6-10-8-16z" fill="#5d4037" />
        <path d="M24 28c-6 2-10 8-8 14 2 4 6 4 8 2 4-4 6-10 0-16z" fill="#5d4037" />
        <path d="M40 28c6 2 10 8 8 14-2 4-6 4-8 2-4-4-6-10 0-16z" fill="#5d4037" />
        <path d="M32 32l-4 20 4-8 4 8-4-20z" fill="#5d4037" />
        <path d="M32 40c-6 4-12 6-16 8l4-4c4-2 8-4 12-4z" fill="#5d4037" />
        <path d="M32 40c6 4 12 6 16 8l-4-4c-4-2-8-4-12-4z" fill="#5d4037" />
      </svg>
    )
  },
  {
    id: 'bamboo',
    name: '竹叶',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M28 56V8c0-2 8-2 8 0v48" fill="#5d4037" />
        <path d="M36 16c8-4 16-6 20-4-2 6-10 10-20 12" fill="#5d4037" />
        <path d="M36 28c10-2 18 0 22 4-4 6-14 8-22 6" fill="#5d4037" />
        <path d="M28 20c-8-4-16-6-20-4 2 6 10 10 20 12" fill="#5d4037" />
        <path d="M28 32c-10-2-18 0-22 4 4 6 14 8 22 6" fill="#5d4037" />
        <path d="M36 44c6-2 12-2 16 0-2 4-10 6-16 4" fill="#5d4037" />
        <circle cx="32" cy="22" r="2" fill="#faf0e6" />
        <circle cx="32" cy="38" r="2" fill="#faf0e6" />
      </svg>
    )
  },
  {
    id: 'mountain',
    name: '山形',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 52L24 20l10 16 6-8 16 24H8z" fill="#5d4037" />
        <path d="M24 20l4-8 6 8-10 0z" fill="#faf0e6" />
        <path d="M40 28l3-4 4 4-7 0z" fill="#faf0e6" />
        <circle cx="52" cy="14" r="6" fill="#5d4037" opacity="0.5" />
      </svg>
    )
  },
  {
    id: 'cloud',
    name: '云纹',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 40c0-8 6-14 14-14 2-8 12-10 16-4 6-2 12 2 12 8 4 2 6 6 6 10H12c-2 0-2-4 0-0z" fill="#5d4037" />
        <path d="M20 38c2-4 8-6 10-2" stroke="#faf0e6" strokeWidth="2" fill="none" />
        <path d="M36 32c4-2 8 0 10 4" stroke="#faf0e6" strokeWidth="2" fill="none" />
        <path d="M48 38c2-2 4-2 6 0" stroke="#faf0e6" strokeWidth="2" fill="none" />
      </svg>
    )
  },
  {
    id: 'longevity',
    name: '寿字',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 6c-6 0-10 2-10 6 0 2 2 4 4 4h12c2 0 4-2 4-4 0-4-4-6-10-6z" fill="#5d4037" />
        <rect x="20" y="20" width="24" height="4" fill="#5d4037" />
        <rect x="28" y="16" width="8" height="28" fill="#5d4037" />
        <path d="M16 44h32v4c0 4-6 10-16 10S16 52 16 48v-4z" fill="#5d4037" />
        <circle cx="24" cy="40" r="2" fill="#faf0e6" />
        <circle cx="40" cy="40" r="2" fill="#faf0e6" />
      </svg>
    )
  },
  {
    id: 'bat',
    name: '蝙蝠',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 20c-4 0-8 2-8 6 0-4-8-6-12-2-2 4 0 10 4 14 4-2 8-2 12 2-2 4-6 6-6 10 6-4 10-6 10-6s4 2 10 6c0-4-4-6-6-10 4-4 8-4 12-2 4-4 6-10 4-14-4-4-10-2-12 2 0-4-4-6-8-6z" fill="#5d4037" />
        <circle cx="28" cy="26" r="2" fill="#faf0e6" />
        <circle cx="36" cy="26" r="2" fill="#faf0e6" />
        <path d="M30 32c2 2 2 2 4 0" stroke="#faf0e6" strokeWidth="1" fill="none" />
      </svg>
    )
  },
  {
    id: 'taiji',
    name: '太极',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="#5d4037" />
        <path d="M32 4a28 28 0 0 1 0 56 14 14 0 0 0 0-28 14 14 0 0 1 0-28z" fill="#faf0e6" />
        <circle cx="32" cy="18" r="5" fill="#5d4037" />
        <circle cx="32" cy="46" r="5" fill="#faf0e6" />
      </svg>
    )
  },
  {
    id: 'vase',
    name: '宝瓶',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 4h16v4h-4v6c6 2 10 8 10 16 0 10-4 20-14 22v6h-4v-6c-10-2-14-12-14-22 0-8 4-14 10-16V8h-4V4z" fill="#5d4037" />
        <path d="M26 30h12v4H26z" fill="#faf0e6" />
        <path d="M28 40c2 2 6 2 8 0" stroke="#faf0e6" strokeWidth="1.5" fill="none" />
        <path d="M28 16c4-2 4-2 8 0" stroke="#faf0e6" strokeWidth="1" fill="none" />
      </svg>
    )
  },
  {
    id: 'lotus',
    name: '莲花',
    svg: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="48" rx="22" ry="6" fill="#5d4037" />
        <path d="M32 48V28c0-4 8-8 8-4 0 6-8 12-8 24" fill="#5d4037" />
        <path d="M32 48V28c0-4-8-8-8-4 0 6 8 12 8 24" fill="#5d4037" />
        <path d="M32 36c-10-6-18-4-18 4 0 6 10 8 18 8" fill="#5d4037" />
        <path d="M32 36c10-6 18-4 18 4 0 6-10 8-18 8" fill="#5d4037" />
        <path d="M32 28c-4-8-12-10-12-4 0 6 8 10 12 8" fill="#5d4037" />
        <path d="M32 28c4-8 12-10 12-4 0 6-8 10-12 8" fill="#5d4037" />
        <circle cx="32" cy="40" r="3" fill="#faf0e6" />
      </svg>
    )
  }
];

const STAMP_SIZE = 56;

interface WatermarkStampProps {
  paperCanvas: HTMLCanvasElement | null;
  onWatermarkApplied: () => void;
}

const WatermarkStamp: React.FC<WatermarkStampProps> = ({ paperCanvas, onWatermarkApplied }) => {
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [isOnPaper, setIsOnPaper] = useState(false);
  const paperWorkspaceRef = useRef<HTMLDivElement>(null);
  const stampCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderStampToCanvas = useCallback((stampId: string): HTMLCanvasElement | null => {
    const stamp = STAMPS.find(s => s.id === stampId);
    if (!stamp) return null;

    const canvas = document.createElement('canvas');
    canvas.width = STAMP_SIZE;
    canvas.height = STAMP_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'rgba(93, 64, 55, 1)';
    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${STAMP_SIZE}" height="${STAMP_SIZE}" viewBox="0 0 64 64">
        <defs>
          <filter id="smooth">
            <feGaussianBlur stdDeviation="0.3" />
          </filter>
        </defs>
        <g filter="url(#smooth)">
          ${stamp.svg}
        </g>
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.src = url;
    img.onload = () => {
      ctx.clearRect(0, 0, STAMP_SIZE, STAMP_SIZE);
      ctx.drawImage(img, 0, 0, STAMP_SIZE, STAMP_SIZE);
      URL.revokeObjectURL(url);
    };

    stampCanvasRef.current = canvas;
    return canvas;
  }, []);

  const applyStampToPaper = useCallback((x: number, y: number) => {
    if (!paperCanvas || !selectedStamp) return;

    const stampCanvas = renderStampToCanvas(selectedStamp);
    if (!stampCanvas) return;

    const paperCtx = paperCanvas.getContext('2d');
    if (!paperCtx) return;

    const paperWidth = paperCanvas.width;
    const paperHeight = paperCanvas.height;
    const stampCtx = stampCanvas.getContext('2d');
    if (!stampCtx) return;

    const stampImageData = stampCtx.getImageData(0, 0, STAMP_SIZE, STAMP_SIZE);
    const paperImageData = paperCtx.getImageData(0, 0, paperWidth, paperHeight);

    const offsetX = Math.round(x - STAMP_SIZE / 2);
    const offsetY = Math.round(y - STAMP_SIZE / 2);

    const resultData = applyWatermarkGrayscale(
      paperImageData.data,
      stampImageData.data,
      offsetX,
      offsetY,
      paperWidth,
      paperHeight,
      STAMP_SIZE,
      STAMP_SIZE,
      8,
      [0.2, 0.5]
    );

    const finalData = new Uint8ClampedArray(resultData.buffer as ArrayBuffer);
    const newImageData = new ImageData(finalData, paperWidth, paperHeight);
    paperCtx.putImageData(newImageData, 0, 0);

    onWatermarkApplied();
  }, [paperCanvas, selectedStamp, renderStampToCanvas, onWatermarkApplied]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selectedStamp) return;
      setCursorPos({ x: e.clientX, y: e.clientY });

      if (paperWorkspaceRef.current) {
        const rect = paperWorkspaceRef.current.getBoundingClientRect();
        const onPaper = e.clientX >= rect.left && e.clientX <= rect.right &&
                        e.clientY >= rect.top && e.clientY <= rect.bottom;
        setIsOnPaper(onPaper);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [selectedStamp]);

  const handleStampSelect = (stampId: string) => {
    setSelectedStamp(stampId === selectedStamp ? null : stampId);
    if (stampId !== selectedStamp) {
      renderStampToCanvas(stampId);
    }
  };

  const handlePaperClick = (e: React.MouseEvent) => {
    if (!selectedStamp || !paperWorkspaceRef.current) return;

    const rect = paperWorkspaceRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const scaleX = (paperCanvas?.width || 500) / rect.width;
    const scaleY = (paperCanvas?.height || 400) / rect.height;

    applyStampToPaper(x * scaleX, y * scaleY);
  };

  const selectedStampData = STAMPS.find(s => s.id === selectedStamp);

  return (
    <div className="watermark-panel">
      <div
        ref={paperWorkspaceRef}
        className="paper-workspace panel"
        onClick={handlePaperClick}
        style={{
          background: '#faf0e6',
          cursor: selectedStamp ? (isOnPaper ? 'copy' : 'not-allowed') : 'default'
        }}
      >
        <canvas
          ref={canvas => {
            if (canvas && paperCanvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = paperCanvas.width;
                canvas.height = paperCanvas.height;
                ctx.drawImage(paperCanvas, 0, 0, canvas.width, canvas.height);
              }
            }
          }}
          style={{ width: '100%', height: '100%', borderRadius: 'inherit' }}
        />
      </div>

      <div className="stamp-tray">
        {STAMPS.map(stamp => (
          <div
            key={stamp.id}
            className={`stamp-item ${selectedStamp === stamp.id ? 'selected' : ''}`}
            onClick={() => handleStampSelect(stamp.id)}
            title={stamp.name}
          >
            <svg viewBox="0 0 64 64" width="26" height="26">
              {stamp.svg}
            </svg>
          </div>
        ))}
      </div>

      {selectedStamp && cursorPos && (
        <div
          className="watermark-preview"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            width: STAMP_SIZE * 0.8,
            height: STAMP_SIZE * 0.8,
            opacity: isOnPaper ? 0.3 : 0.1
          }}
        >
          <svg viewBox="0 0 64 64" width="100%" height="100%" style={{ display: 'block' }}>
            {selectedStampData?.svg}
          </svg>
        </div>
      )}
    </div>
  );
};

export default WatermarkStamp;
export { STAMPS };

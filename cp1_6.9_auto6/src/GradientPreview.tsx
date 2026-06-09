import React, { useRef, useEffect, useCallback, useState } from 'react';
import { GradientConfig, ColorStop, generateGradientCss, generateSvgBackground } from './gradientUtils';

interface GradientPreviewProps {
  config: GradientConfig;
  cssCode: string;
  onColorStopMove?: (id: string, position: number) => void;
  onColorStopSelect?: (id: string | null) => void;
  selectedStopId: string | null;
}

const GradientPreview: React.FC<GradientPreviewProps> = ({
  config,
  cssCode,
  onColorStopMove,
  onColorStopSelect,
  selectedStopId
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopsBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const drawGradient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const sortedStops = [...config.colorStops].sort((a, b) => a.position - b.position);

    let gradient: CanvasGradient;

    if (config.type === 'linear') {
      const angleRad = (config.angle * Math.PI) / 180;
      const cx = width / 2;
      const cy = height / 2;
      const maxLength = Math.sqrt(width * width + height * height) / 2;
      const x1 = cx - Math.cos(angleRad) * maxLength;
      const y1 = cy - Math.sin(angleRad) * maxLength;
      const x2 = cx + Math.cos(angleRad) * maxLength;
      const y2 = cy + Math.sin(angleRad) * maxLength;
      gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    } else {
      const cx = (config.centerX / 100) * width;
      const cy = (config.centerY / 100) * height;
      const radiusX = config.shape === 'ellipse' ? width / 2 : Math.max(width, height) / 2;
      const radiusY = config.shape === 'ellipse' ? height / 2 : Math.max(width, height) / 2;
      gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(radiusX, radiusY));
    }

    sortedStops.forEach((stop) => {
      const hexColor = stop.color.startsWith('#') ? stop.color : '#ffffff';
      if (stop.opacity < 1) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        gradient.addColorStop(stop.position / 100, `rgba(${r}, ${g}, ${b}, ${stop.opacity})`);
      } else {
        gradient.addColorStop(stop.position / 100, hexColor);
      }
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }, [config]);

  useEffect(() => {
    drawGradient();
  }, [drawGradient]);

  const handleStopMouseDown = (e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(stopId);
    onColorStopSelect?.(stopId);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !stopsBarRef.current) return;
      const rect = stopsBarRef.current.getBoundingClientRect();
      let position = ((e.clientX - rect.left) / rect.width) * 100;
      position = Math.max(0, Math.min(100, position));
      onColorStopMove?.(isDragging, position);
    },
    [isDragging, onColorStopMove]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleCopyCss = async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleExportSvg = () => {
    const svgContent = generateSvgBackground(config, 800, 600);
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gradient-background.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sortedStops = [...config.colorStops].sort((a, b) => a.position - b.position);
  const stopsBarGradient = generateGradientCss({
    ...config,
    type: 'linear',
    angle: 90
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '20px' }}>
      <h2 style={{ margin: 0, color: '#333', fontSize: '18px', fontWeight: 600 }}>实时预览</h2>

      <div
        style={{
          position: 'relative',
          width: 400,
          height: 300,
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
      </div>

      <div style={{ width: 400 }}>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px', fontWeight: 500 }}>色标位置（可拖拽）</div>
        <div
          ref={stopsBarRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '24px',
            borderRadius: '4px',
            background: stopsBarGradient,
            cursor: 'pointer'
          }}
          onClick={() => onColorStopSelect?.(null)}
        >
          {sortedStops.map((stop: ColorStop) => (
            <div
              key={stop.id}
              onMouseDown={(e) => handleStopMouseDown(e, stop.id)}
              style={{
                position: 'absolute',
                top: '50%',
                left: `${stop.position}%`,
                transform: `translateX(-50%) translateY(-50%) ${selectedStopId === stop.id ? 'scale(1.2)' : 'scale(1)'}`,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: selectedStopId === stop.id ? '3px solid #333' : '2px solid #fff',
                backgroundColor: stop.color,
                cursor: 'grab',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                transition: 'transform 0.15s ease, border-color 0.15s ease',
                zIndex: selectedStopId === stop.id ? 10 : 1,
                opacity: stop.opacity
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ width: 400 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#666', fontWeight: 500 }}>CSS 代码</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCopyCss}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                background: copied ? '#4CAF50' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              {copied ? '已复制 ✓' : '复制代码'}
            </button>
            <button
              onClick={handleExportSvg}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: '#fff',
                color: '#333',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              导出 SVG
            </button>
          </div>
        </div>
        <div
          style={{
            padding: '12px',
            background: '#2d2d2d',
            color: '#f8f8f2',
            borderRadius: '6px',
            fontFamily: '"Consolas", "Monaco", monospace',
            fontSize: '12px',
            lineHeight: 1.5,
            wordBreak: 'break-all',
            userSelect: 'all'
          }}
        >
          {cssCode}
        </div>
      </div>
    </div>
  );
};

export default GradientPreview;

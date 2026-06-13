import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface TasteData {
  spicy: number;
  sour: number;
  sweet: number;
  salty: number;
  umami: number;
  fatty: number;
}

export const tasteLabels: Record<keyof TasteData, string> = {
  spicy: '辣度',
  sour: '酸度',
  sweet: '甜度',
  salty: '咸度',
  umami: '鲜度',
  fatty: '油脂感'
};

export const tasteKeys: (keyof TasteData)[] = ['spicy', 'sour', 'sweet', 'salty', 'umami', 'fatty'];

interface RadarChartProps {
  taste: TasteData;
  onChange?: (taste: TasteData) => void;
  interactive?: boolean;
  size?: number;
  showIndex?: boolean;
  className?: string;
}

const elasticEase = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

const RadarChart: React.FC<RadarChartProps> = ({
  taste,
  onChange,
  interactive = false,
  size = 300,
  showIndex = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayTaste, setDisplayTaste] = useState<Taste>(taste);
  const [animatingKey, setAnimatingKey] = useState<keyof TasteData | null>(null);
  const animRef = useRef<number | null>(null);
  const startValRef = useRef<number>(0);
  const targetValRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;

  const getPoint = useCallback((index: number, value: number, r: number) => {
    const angle = (Math.PI * 2 * index) / 6 - Math.PI / 2;
    const v = Math.max(0, Math.min(10, value)) / 10;
    return {
      x: centerX + Math.cos(angle) * r * v,
      y: centerY + Math.sin(angle) * r * v
    };
  }, [centerX, centerY]);

  const draw = useCallback((tasteData: TasteData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    for (let i = 1; i <= 5; i++) {
      const r = (radius * i) / 5;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI * 2 * j) / 6 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(232, 133, 64, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius);
      ctx.strokeStyle = 'rgba(232, 133, 64, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, 'rgba(255, 200, 150, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 140, 80, 0.7)');
    gradient.addColorStop(1, 'rgba(200, 50, 30, 0.8)');

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const key = tasteKeys[i];
      const point = getPoint(i, tasteData[key], radius);
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#E88540';
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let i = 0; i < 6; i++) {
      const key = tasteKeys[i];
      const point = getPoint(i, tasteData[key], radius);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#E88540';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (size >= 200) {
      ctx.font = `${size * 0.04}px sans-serif`;
      ctx.fillStyle = '#666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const labelRadius = radius + size * 0.08;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        ctx.fillText(tasteLabels[tasteKeys[i]], x, y);
      }
    }
  }, [size, centerX, centerY, radius, getPoint]);

  useEffect(() => {
    draw(displayTaste);
  }, [draw, displayTaste]);

  useEffect(() => {
    setDisplayTaste(taste);
  }, [taste]);

  const animateTo = (key: keyof TasteData, target: number) => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
    }
    startValRef.current = displayTaste[key];
    targetValRef.current = target;
    startTimeRef.current = performance.now();
    setAnimatingKey(key);

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const duration = 400;
      const t = Math.min(1, elapsed / duration);
      const eased = elasticEase(t);
      const current = startValRef.current + (targetValRef.current - startValRef.current) * eased;

      setDisplayTaste(prev => ({ ...prev, [key]: parseFloat(current.toFixed(1)) }));

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setAnimatingKey(null);
        animRef.current = null;
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  const handleSliderChange = (key: keyof TasteData, value: number) => {
    const clampedValue = parseFloat(Math.max(0, Math.min(10, value)).toFixed(1));
    if (onChange) {
      const newTaste = { ...taste, [key]: clampedValue };
      onChange(newTaste);
    }
    animateTo(key, clampedValue);
  };

  const compositeIndex = (() => {
    const values = Object.values(displayTaste) as number[];
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / 6).toFixed(1));
  })();

  return (
    <div className={`radar-chart-container ${className}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
      />
      {showIndex && (
        <div style={{ marginTop: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#999', marginBottom: '4px' }}>口味综合指数</div>
          <div
            className="composite-index"
            style={{
              fontSize: size >= 200 ? '32px' : '20px',
              fontWeight: 'bold',
              color: '#E88540',
              textShadow: '0 0 10px rgba(232, 133, 64, 0.5)',
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            {compositeIndex}
            <span style={{ fontSize: '16px', color: '#999', marginLeft: '4px' }}>/10</span>
          </div>
        </div>
      )}
      {interactive && (
        <div style={{ width: '100%', marginTop: '20px' }}>
          {tasteKeys.map(key => (
            <div key={key} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>{tasteLabels[key]}</span>
                <span style={{ fontSize: '14px', color: '#E88540', fontWeight: 'bold' }}>{displayTaste[key].toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.1"
                value={displayTaste[key]}
                onChange={(e) => handleSliderChange(key, parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  borderRadius: '3px',
                  background: `linear-gradient(to right, #FFD4B8 0%, #E88540 ${displayTaste[key] * 10}%, #F0E6DC ${displayTaste[key] * 10}%, #F0E6DC 100%)`,
                  appearance: 'none',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              />
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { text-shadow: 0 0 10px rgba(232, 133, 64, 0.5); }
          50% { text-shadow: 0 0 20px rgba(232, 133, 64, 0.9), 0 0 30px rgba(244, 208, 63, 0.5); }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #E88540;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(232, 133, 64, 0.3);
          transition: transform 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #E88540;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(232, 133, 64, 0.3);
        }
      `}</style>
    </div>
  );
};

export default RadarChart;

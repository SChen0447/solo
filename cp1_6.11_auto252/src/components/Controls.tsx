import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ControlState } from '../utils/particleSystem';

interface ControlsProps {
  controls: ControlState;
  onControlsChange: (controls: ControlState) => void;
}

const Controls: React.FC<ControlsProps> = ({ controls, onControlsChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const vaneRef = useRef<SVGSVGElement>(null);
  const [pressedSlider, setPressedSlider] = useState<string | null>(null);

  const handleVaneDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleVaneDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !vaneRef.current) return;
    
    const rect = vaneRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    const normalizedAngle = ((angle + 360) % 360);
    
    onControlsChange({
      ...controls,
      windDirection: Math.round(normalizedAngle),
    });
  }, [isDragging, controls, onControlsChange]);

  const handleVaneDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleVaneDrag);
      window.addEventListener('mouseup', handleVaneDragEnd);
      window.addEventListener('touchmove', handleVaneDrag);
      window.addEventListener('touchend', handleVaneDragEnd);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleVaneDrag);
      window.removeEventListener('mouseup', handleVaneDragEnd);
      window.removeEventListener('touchmove', handleVaneDrag);
      window.removeEventListener('touchend', handleVaneDragEnd);
    };
  }, [isDragging, handleVaneDrag, handleVaneDragEnd]);

  const handleWindSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onControlsChange({
      ...controls,
      windSpeed: Number(e.target.value),
    });
  };

  const handleHumidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onControlsChange({
      ...controls,
      humidity: Number(e.target.value),
    });
  };

  const getWindDirectionLabel = (deg: number): string => {
    const directions = ['东', '东北', '北', '西北', '西', '西南', '南', '东南'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  const getWindSpeedLabel = (speed: number): string => {
    const labels = ['无风', '软风', '轻风', '微风', '和风', '清风', '强风', '疾风', '大风', '烈风', '狂风'];
    return labels[Math.min(speed, 10)];
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        width: 280,
        padding: 20,
        borderRadius: 16,
        background: 'rgba(212, 163, 115, 0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        userSelect: 'none',
      }}
    >
      <h2
        style={{
          margin: 0,
          marginBottom: 16,
          fontSize: 18,
          fontWeight: 600,
          color: '#fff',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          letterSpacing: 0.5,
        }}
      >
        气象控制台
      </h2>

      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <label style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
            风向
          </label>
          <span
            style={{
              fontSize: 13,
              color: '#e6c280',
              fontWeight: 500,
              background: 'rgba(230, 194, 128, 0.15)',
              padding: '4px 10px',
              borderRadius: 8,
            }}
          >
            {getWindDirectionLabel(controls.windDirection)} · {controls.windDirection}°
          </span>
        </div>
        
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 8,
          }}
        >
          <svg
            ref={vaneRef}
            width="120"
            height="120"
            style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleVaneDragStart}
            onTouchStart={handleVaneDragStart}
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <circle
              cx="60"
              cy="60"
              r="50"
              fill="rgba(255, 255, 255, 0.05)"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="1"
            />
            
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const x1 = 60 + Math.cos(rad) * 42;
              const y1 = 60 + Math.sin(rad) * 42;
              const x2 = 60 + Math.cos(rad) * 48;
              const y2 = 60 + Math.sin(rad) * 48;
              return (
                <line
                  key={deg}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="rgba(255, 255, 255, 0.3)"
                  strokeWidth="1.5"
                />
              );
            })}
            
            {['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'].map((label, i) => {
              const deg = i * 45;
              const rad = (deg * Math.PI) / 180;
              const x = 60 + Math.cos(rad) * 36;
              const y = 60 + Math.sin(rad) * 36;
              return (
                <text
                  key={label}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="rgba(255, 255, 255, 0.6)"
                  fontWeight="500"
                >
                  {label}
                </text>
              );
            })}
            
            <g
              style={{
                transformOrigin: '60px 60px',
                transform: `rotate(${controls.windDirection}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <defs>
                <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#c48c47" />
                  <stop offset="100%" stopColor="#e6c280" />
                </linearGradient>
              </defs>
              
              <path
                d="M 60 15 L 68 55 L 60 50 L 52 55 Z"
                fill="url(#arrowGradient)"
                filter="url(#glow)"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="0.5"
              />
              
              <rect
                x="57"
                y="50"
                width="6"
                height="35"
                fill="url(#arrowGradient)"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="0.5"
              />
              
              <path
                d="M 52 85 L 60 95 L 68 85 L 60 80 Z"
                fill="#7a8b99"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="0.5"
              />
            </g>
            
            <circle
              cx="60"
              cy="60"
              r="5"
              fill="#d4a373"
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="1"
            />
          </svg>
        </div>
        
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.5)',
            margin: '8px 0 0 0',
          }}
        >
          拖拽箭头调整风向
        </p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <label style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
            风速
          </label>
          <span
            style={{
              fontSize: 13,
              color: '#e6c280',
              fontWeight: 500,
            }}
          >
            {controls.windSpeed}级 · {getWindSpeedLabel(controls.windSpeed)}
          </span>
        </div>
        
        <div style={{ position: 'relative', height: 24 }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 6,
              transform: 'translateY(-50%)',
              borderRadius: 3,
              background: 'linear-gradient(to right, #d4a373, #b57a3a)',
              opacity: 0.6,
            }}
          />
          <input
            type="range"
            min="1"
            max="10"
            value={controls.windSpeed}
            onChange={handleWindSpeedChange}
            onMouseDown={() => setPressedSlider('wind')}
            onMouseUp={() => setPressedSlider(null)}
            onTouchStart={() => setPressedSlider('wind')}
            onTouchEnd={() => setPressedSlider(null)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 24,
              margin: 0,
              padding: 0,
              appearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #e6c280, #c48c47);
              border: 2px solid rgba(255, 255, 255, 0.4);
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
              transform: scale(${pressedSlider === 'wind' ? 0.95 : 1});
            }
            input[type="range"]::-webkit-slider-thumb:active {
              transform: scale(0.9);
            }
            input[type="range"]::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #e6c280, #c48c47);
              border: 2px solid rgba(255, 255, 255, 0.4);
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
          `}</style>
        </div>
        
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <label style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
            沙粒湿度
          </label>
          <span
            style={{
              fontSize: 13,
              color: '#e6c280',
              fontWeight: 500,
            }}
          >
            {controls.humidity}%
          </span>
        </div>
        
        <div style={{ position: 'relative', height: 24 }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 6,
              transform: 'translateY(-50%)',
              borderRadius: 3,
              background: 'linear-gradient(to right, #d4a373, #8b6914)',
              opacity: 0.6,
            }}
          />
          <input
            type="range"
            min="0"
            max="100"
            value={controls.humidity}
            onChange={handleHumidityChange}
            onMouseDown={() => setPressedSlider('humidity')}
            onMouseUp={() => setPressedSlider(null)}
            onTouchStart={() => setPressedSlider('humidity')}
            onTouchEnd={() => setPressedSlider(null)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: 24,
              margin: 0,
              padding: 0,
              appearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
              outline: 'none',
            }}
          />
          <style>{`
            input[type="range"]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #e6c280, #c48c47);
              border: 2px solid rgba(255, 255, 255, 0.4);
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
              transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
              transform: scale(${pressedSlider === 'humidity' ? 0.95 : 1});
            }
            input[type="range"]::-webkit-slider-thumb:active {
              transform: scale(0.9);
            }
            input[type="range"]::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: linear-gradient(135deg, #e6c280, #c48c47);
              border: 2px solid rgba(255, 255, 255, 0.4);
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
          `}</style>
        </div>
        
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 12,
          borderRadius: 10,
          background: 'rgba(122, 139, 153, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.6)',
            lineHeight: 1.6,
          }}
        >
          💡 提示：点击沙丘区域可产生沙粒爆散效果。调节风速至6级以上可观察沙丘流线，湿度30-60%且风速3-7级时会出现海市蜃楼。
        </p>
      </div>
    </motion.div>
  );
};

export default Controls;

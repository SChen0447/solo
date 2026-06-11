import React, { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { getColorFromPosition, getEmotionFromPosition, getComplementaryColor } from '../utils/emotionMapper';

export interface ControlPanelProps {
  lightColor: string;
  lightPositionX: number;
  lightPositionY: number;
  lightRadius: number;
  lightIntensity: number;
  isAnimating: boolean;
  onColorChange: (color: string, position: number) => void;
  onPositionXChange: (value: number) => void;
  onPositionYChange: (value: number) => void;
  onRadiusChange: (value: number) => void;
  onIntensityChange: (value: number) => void;
  onToggleAnimation: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  lightColor,
  lightPositionX,
  lightPositionY,
  lightRadius,
  lightIntensity,
  isAnimating,
  onColorChange,
  onPositionXChange,
  onPositionYChange,
  onRadiusChange,
  onIntensityChange,
  onToggleAnimation,
}) => {
  const colorBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingColor, setIsDraggingColor] = useState(false);

  const getPositionFromEvent = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
      const bar = colorBarRef.current;
      if (!bar) return 0;

      const rect = bar.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const position = Math.max(0, Math.min(1, x / rect.width));
      return position;
    },
    [],
  );

  const handleColorBarMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      setIsDraggingColor(true);
      const position = getPositionFromEvent(e);
      const color = getColorFromPosition(position);
      onColorChange(color, position);
    },
    [getPositionFromEvent, onColorChange],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingColor) return;
      const position = getPositionFromEvent(e);
      const color = getColorFromPosition(position);
      onColorChange(color, position);
    },
    [isDraggingColor, getPositionFromEvent, onColorChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingColor(false);
  }, []);

  React.useEffect(() => {
    if (isDraggingColor) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingColor, handleMouseMove, handleMouseUp]);

  const currentPosition = React.useMemo(() => {
    const warm = { r: 255, g: 140, b: 0 };
    const cold = { r: 0, g: 191, b: 255 };
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(lightColor);
    if (!match) return 0.5;

    const r = parseInt(match[1], 16);
    const g = parseInt(match[2], 16);
    const b = parseInt(match[3], 16);

    const warmDist = Math.sqrt(Math.pow(r - warm.r, 2) + Math.pow(g - warm.g, 2) + Math.pow(b - warm.b, 2));
    const totalDist = Math.sqrt(
      Math.pow(cold.r - warm.r, 2) + Math.pow(cold.g - warm.g, 2) + Math.pow(cold.b - warm.b, 2),
    );

    return Math.max(0, Math.min(1, warmDist / totalDist));
  }, [lightColor]);

  const emotion = getEmotionFromPosition(currentPosition);
  const complementaryColor = getComplementaryColor(lightColor);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="control-panel"
      style={{
        width: '320px',
        padding: '24px',
        backgroundColor: 'rgba(30, 30, 30, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#ffffff',
          textAlign: 'center',
          paddingBottom: '16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        灯光调控面板
      </h2>

      <div className="control-group">
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '12px',
          }}
        >
          色温选择
        </label>
        <div
          ref={colorBarRef}
          onMouseDown={handleColorBarMouseDown}
          style={{
            position: 'relative',
            height: '36px',
            borderRadius: '18px',
            background: 'linear-gradient(to right, #ff8c00, #00bfff)',
            cursor: isDraggingColor ? 'grabbing' : 'pointer',
            transition: 'all 0.2s ease-out',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
          }}
        >
          <motion.div
            animate={{ left: `${currentPosition * 100}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: lightColor,
              border: '3px solid #ffffff',
              boxShadow: `0 0 15px ${lightColor}, 0 2px 8px rgba(0, 0, 0, 0.4)`,
              transition: 'transform 0.2s ease-out',
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 1.3 }}
          />
        </div>

        <motion.div
          key={emotion.name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            marginTop: '12px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: `${complementaryColor}15`,
            border: `1px solid ${complementaryColor}30`,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: lightColor,
              marginBottom: '6px',
              textShadow: `0 0 8px ${lightColor}40`,
            }}
          >
            {emotion.name}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: '1.5',
            }}
          >
            {emotion.description}
          </div>
        </motion.div>
      </div>

      <div className="control-group">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            光位 X 轴
          </label>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'monospace',
            }}
          >
            {lightPositionX.toFixed(0)}px
          </span>
        </div>
        <input
          type="range"
          min="-100"
          max="100"
          value={lightPositionX}
          onChange={(e) => onPositionXChange(Number(e.target.value))}
          style={{
            transition: 'all 0.3s ease-out',
          }}
        />
      </div>

      <div className="control-group">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            光位 Y 轴
          </label>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'monospace',
            }}
          >
            {lightPositionY.toFixed(0)}px
          </span>
        </div>
        <input
          type="range"
          min="-50"
          max="50"
          value={lightPositionY}
          onChange={(e) => onPositionYChange(Number(e.target.value))}
          style={{
            transition: 'all 0.3s ease-out',
          }}
        />
      </div>

      <div className="control-group">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            光斑半径
          </label>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'monospace',
            }}
          >
            {lightRadius.toFixed(0)}px
          </span>
        </div>
        <input
          type="range"
          min="50"
          max="200"
          value={lightRadius}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          style={{
            transition: 'all 0.3s ease-out',
          }}
        />
      </div>

      <div className="control-group">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <label
            style={{
              fontSize: '14px',
              fontWeight: '500',
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            灯光强度
          </label>
          <span
            style={{
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.6)',
              fontFamily: 'monospace',
            }}
          >
            {(lightIntensity * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={lightIntensity}
          onChange={(e) => onIntensityChange(Number(e.target.value))}
          style={{
            transition: 'all 0.3s ease-out',
          }}
        />
      </div>

      <motion.button
        onClick={onToggleAnimation}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        style={{
          padding: '14px 20px',
          borderRadius: '8px',
          border: 'none',
          fontSize: '15px',
          fontWeight: '600',
          backgroundColor: isAnimating ? '#e74c3c' : '#d4af37',
          color: '#121212',
          boxShadow: isAnimating
            ? '0 4px 15px rgba(231, 76, 60, 0.4)'
            : '0 4px 15px rgba(212, 175, 55, 0.4)',
          transition: 'all 0.2s ease-out',
        }}
      >
        {isAnimating ? '⏹ 停止循环' : '▶ 循环切换情绪'}
      </motion.button>

      <style>{`
        @media (max-width: 768px) {
          .control-panel {
            width: 100% !important;
            max-width: 700px;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default ControlPanel;

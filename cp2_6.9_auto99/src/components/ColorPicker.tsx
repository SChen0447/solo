import React, { useState, useRef, useCallback, useEffect } from 'react';

export interface ColorHsl {
  h: number;
  s: number;
  l: number;
}

interface ColorPickerProps {
  color: ColorHsl;
  onColorChange: (color: ColorHsl) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onColorChange }) => {
  const wheelRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);
  const [isDraggingWheel, setIsDraggingWheel] = useState(false);
  const [isDraggingSquare, setIsDraggingSquare] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const WHEEL_SIZE = isHovered ? 280 : 260;
  const SQUARE_SIZE = 200;

  const handleWheelMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!wheelRef.current) return;
      const rect = wheelRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      angle = (angle + 360) % 360;
      onColorChange({ ...color, h: Math.round(angle) });
    },
    [color, onColorChange]
  );

  const handleSquareMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!squareRef.current) return;
      const rect = squareRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
      const s = Math.round((x / rect.width) * 100);
      const l = Math.round(100 - (y / rect.height) * 100);
      onColorChange({ ...color, s, l });
    },
    [color, onColorChange]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingWheel) handleWheelMove(e.clientX, e.clientY);
      if (isDraggingSquare) handleSquareMove(e.clientX, e.clientY);
    };
    const handleMouseUp = () => {
      setIsDraggingWheel(false);
      setIsDraggingSquare(false);
    };

    if (isDraggingWheel || isDraggingSquare) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingWheel, isDraggingSquare, handleWheelMove, handleSquareMove]);

  const wheelAngle = color.h;
  const wheelRadius = WHEEL_SIZE / 2 - 10;
  const wheelX = wheelRadius + wheelRadius * Math.cos((wheelAngle * Math.PI) / 180);
  const wheelY = wheelRadius + wheelRadius * Math.sin((wheelAngle * Math.PI) / 180);

  const squareX = (color.s / 100) * SQUARE_SIZE;
  const squareY = (1 - color.l / 100) * SQUARE_SIZE;

  return (
    <div className="color-picker" style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div
        ref={wheelRef}
        className="color-wheel"
        style={{
          width: WHEEL_SIZE,
          height: WHEEL_SIZE,
          borderRadius: '50%',
          background: `conic-gradient(
            hsl(0, 100%, 50%),
            hsl(60, 100%, 50%),
            hsl(120, 100%, 50%),
            hsl(180, 100%, 50%),
            hsl(240, 100%, 50%),
            hsl(300, 100%, 50%),
            hsl(360, 100%, 50%)
          )`,
          cursor: 'crosshair',
          transition: 'width 0.3s ease, height 0.3s ease',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={(e) => {
          setIsDraggingWheel(true);
          handleWheelMove(e.clientX, e.clientY);
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#fff',
            border: '3px solid #333',
            left: wheelX - 8,
            top: wheelY - 8,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        />
        <div
          ref={squareRef}
          className="color-square"
          style={{
            position: 'absolute',
            width: SQUARE_SIZE,
            height: SQUARE_SIZE,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            borderRadius: 8,
            background: `linear-gradient(to top, #000, transparent),
                         linear-gradient(to right, #fff, hsl(${color.h}, 100%, 50%))`,
            cursor: 'crosshair',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.3)',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsDraggingSquare(true);
            handleSquareMove(e.clientX, e.clientY);
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
              border: '2px solid #fff',
              left: squareX - 7,
              top: squareY - 7,
              pointerEvents: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#666' }}>
        <span>H: {color.h}°</span>
        <span>S: {color.s}%</span>
        <span>L: {color.l}%</span>
      </div>
    </div>
  );
};

export default ColorPicker;

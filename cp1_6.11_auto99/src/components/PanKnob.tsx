import { useState, useCallback, useEffect, useRef } from 'react';

interface PanKnobProps {
  value: number;
  onChange: (angle: number) => void;
  color: string;
}

export default function PanKnob({ value, onChange, color }: PanKnobProps) {
  const [dragging, setDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const startYRef = useRef(0);
  const startValRef = useRef(0);

  useEffect(() => {
    if (!dragging) {
      setDisplayValue(value);
    }
  }, [value, dragging]);

  const rotation = ((displayValue + 90) / 180) * 180 - 90;

  const handleMove = useCallback(
    (clientY: number) => {
      const delta = startYRef.current - clientY;
      const newAngle = Math.max(-90, Math.min(90, startValRef.current + delta * 0.5));
      onChange(Math.round(newAngle * 10) / 10);
      setDisplayValue(newAngle);
    },
    [onChange]
  );

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => setDragging(false);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, handleMove]);

  const label = displayValue === 0 ? 'C' : displayValue < 0 ? `L${Math.abs(Math.round(displayValue))}` : `R${Math.round(displayValue)}`;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="relative cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          setDragging(true);
          startYRef.current = e.clientY;
          startValRef.current = displayValue;
        }}
        title={`声像: ${displayValue.toFixed(1)}°`}
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `
            repeating-conic-gradient(
              rgba(255,255,255,0.06) 0deg 10deg,
              transparent 10deg 20deg
            ),
            radial-gradient(circle at 40% 35%, rgba(255,255,255,0.12), transparent 60%),
            linear-gradient(145deg, #1e2a4a, #0f1628)
          `,
          border: `1.5px solid ${color}40`,
          boxShadow: `0 0 8px ${color}20, inset 0 1px 0 rgba(255,255,255,0.08)`,
          transform: `rotate(${rotation}deg)`,
          transition: dragging ? 'none' : 'transform 0.15s ease-out, box-shadow 0.2s',
        }}
      >
        <div
          className="absolute top-1 left-1/2 -translate-x-1/2"
          style={{
            width: 2,
            height: 8,
            borderRadius: 1,
            background: color,
            boxShadow: `0 0 4px ${color}80`,
          }}
        />
      </div>
      <div
        className="text-[10px] font-mono"
        style={{ color: `${color}aa`, fontFamily: 'Rajdhani, sans-serif' }}
      >
        {label}
      </div>
    </div>
  );
}

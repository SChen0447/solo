import { useRef, useState, useCallback, useEffect } from 'react';

interface VolumeFaderProps {
  value: number;
  onChange: (db: number) => void;
  color: string;
}

export default function VolumeFader({ value, onChange, color }: VolumeFaderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const animRef = useRef<number>(0);

  const MIN_DB = -50;
  const MAX_DB = 6;
  const TRACK_HEIGHT = 120;

  useEffect(() => {
    if (!dragging) {
      const start = displayValue;
      const end = value;
      const duration = 100;
      const startTime = performance.now();

      const animate = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = t * (2 - t);
        const current = start + (end - start) * eased;
        setDisplayValue(current);
        if (t < 1) {
          animRef.current = requestAnimationFrame(animate);
        }
      };

      animRef.current = requestAnimationFrame(animate);
    }

    return () => cancelAnimationFrame(animRef.current);
  }, [value, dragging]);

  const position = ((displayValue - MIN_DB) / (MAX_DB - MIN_DB)) * TRACK_HEIGHT;

  const handleMove = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const y = clientY - rect.top;
      const ratio = 1 - Math.max(0, Math.min(1, y / TRACK_HEIGHT));
      const db = MIN_DB + ratio * (MAX_DB - MIN_DB);
      onChange(Math.round(db * 10) / 10);
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

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-[10px] font-mono text-center w-12 truncate"
        style={{ color: `${color}cc`, fontFamily: 'Rajdhani, sans-serif' }}
        title={`音量: ${displayValue.toFixed(1)} dB`}
      >
        {displayValue.toFixed(1)}dB
      </div>
      <div
        ref={trackRef}
        className="relative cursor-pointer rounded-full"
        style={{
          width: 8,
          height: TRACK_HEIGHT,
          background: 'linear-gradient(to top, #1a1a2e 0%, rgba(255,255,255,0.05) 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          borderRight: '1px solid rgba(255,255,255,0.05)',
        }}
        onMouseDown={(e) => {
          setDragging(true);
          handleMove(e.clientY);
        }}
      >
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: position - 6,
            width: 22,
            height: 12,
            borderRadius: 3,
            background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.1))`,
            backdropFilter: 'blur(4px)',
            border: `1px solid ${color}50`,
            boxShadow: `0 0 6px ${color}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
            transition: dragging ? 'none' : 'box-shadow 0.2s',
            cursor: 'grab',
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-[0.5px] rounded-full"
          style={{
            bottom: 0,
            width: 2,
            height: position,
            background: `linear-gradient(to top, ${color}20, ${color}80)`,
          }}
        />
      </div>
      <div
        className="text-[9px] text-gray-500 uppercase tracking-widest"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        VOL
      </div>
    </div>
  );
}

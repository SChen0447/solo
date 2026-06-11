import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface Props {
  volume: number;
  reverbTime: number;
  onVolumeChange: (v: number) => void;
  onReverbChange: (t: number) => void;
  hoveredElement: string | null;
  setHoveredElement: (el: string | null) => void;
}

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  id: string;
  hoveredElement: string | null;
  setHoveredElement: (el: string | null) => void;
  onChange: (v: number) => void;
  displayFormatter?: (v: number) => string;
}

function CustomSlider({
  label,
  value,
  min,
  max,
  step,
  unit,
  id,
  hoveredElement,
  setHoveredElement,
  onChange,
  displayFormatter,
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const trackLength = 120;
  const thumbRadius = 8;

  const normalized = (value - min) / (max - min);
  const thumbX = normalized * trackLength;

  const updateFromX = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      let newVal = min + ratio * (max - min);
      newVal = Math.round(newVal / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(newVal);
    },
    [min, max, step, onChange]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    updateFromX(e.clientX);

    const handleMove = (ev: MouseEvent) => updateFromX(ev.clientX);
    const handleUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragging(true);
    if (e.touches[0]) updateFromX(e.touches[0].clientX);

    const handleMove = (ev: TouchEvent) => {
      if (ev.touches[0]) updateFromX(ev.touches[0].clientX);
    };
    const handleEnd = () => {
      setDragging(false);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);
  };

  const isHovered = hoveredElement === id;
  const scale = isHovered ? 1.1 : dragging ? 0.95 : 1;

  const displayVal = displayFormatter
    ? displayFormatter(value)
    : `${Math.round(value)}${unit}`;

  return (
    <div
      style={{
        marginBottom: 16,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#c5c6c7',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: 'sans-serif',
            fontSize: '11px',
            color: '#66fcf1',
            fontWeight: 600,
          }}
        >
          {displayVal}
        </span>
      </div>
      <div
        ref={trackRef}
        onMouseEnter={() => setHoveredElement(id)}
        onMouseLeave={() => !dragging && setHoveredElement(null)}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          position: 'relative',
          width: trackLength + thumbRadius * 2,
          height: 22,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            left: thumbRadius,
            width: trackLength,
            height: 6,
            borderRadius: 3,
            backgroundColor: 'rgba(69, 162, 158, 0.3)',
          }}
        />
        {/* Track filled */}
        <div
          style={{
            position: 'absolute',
            left: thumbRadius,
            width: thumbX,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#45a29e',
            boxShadow: isHovered ? '0 0 6px #45a29e' : 'none',
            transition: 'box-shadow 0.15s ease',
          }}
        />
        {/* Thumb */}
        <motion.div
          animate={{
            left: thumbRadius + thumbX - thumbRadius,
            scale,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            position: 'absolute',
            top: '50%',
            marginTop: -thumbRadius,
            width: thumbRadius * 2,
            height: thumbRadius * 2,
            borderRadius: '50%',
            backgroundColor: '#66fcf1',
            boxShadow: isHovered
              ? '0 0 6px 2px #66fcf1, 0 0 12px rgba(102,252,241,0.5)'
              : '0 0 3px rgba(102,252,241,0.5)',
            border: '1px solid rgba(255,255,255,0.6)',
            zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}

export default function ControlPanel({
  volume,
  reverbTime,
  onVolumeChange,
  onReverbChange,
  hoveredElement,
  setHoveredElement,
}: Props) {
  const panelId = 'volume-reverb-panel';
  const isHovered = hoveredElement === panelId;

  return (
    <div
      onMouseEnter={() => setHoveredElement(panelId)}
      onMouseLeave={() => setHoveredElement(null)}
      style={{
        position: 'absolute',
        bottom: '24px',
        right: '24px',
        padding: '16px 20px',
        backgroundColor: 'rgba(11, 12, 16, 0.85)',
        border: `1px solid ${isHovered ? 'rgba(102,252,241,0.5)' : 'rgba(69,162,158,0.3)'}`,
        borderRadius: '8px',
        boxShadow: isHovered
          ? '0 0 12px rgba(102,252,241,0.2), inset 0 0 20px rgba(69,162,158,0.05)'
          : '0 0 6px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(6px)',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transformOrigin: 'bottom right',
        zIndex: 10,
      }}
    >
      <div
        style={{
          fontFamily: 'sans-serif',
          fontSize: '12px',
          fontWeight: 600,
          color: '#66fcf1',
          marginBottom: 12,
          letterSpacing: '0.5px',
        }}
      >
        🎵 声学控制
      </div>
      <CustomSlider
        id="volume-slider"
        label="音量"
        value={volume}
        min={0}
        max={100}
        step={1}
        unit="%"
        hoveredElement={hoveredElement}
        setHoveredElement={setHoveredElement}
        onChange={onVolumeChange}
        displayFormatter={(v) => `${Math.round(v)}%`}
      />
      <CustomSlider
        id="reverb-slider"
        label="混响时间"
        value={reverbTime}
        min={0.5}
        max={3}
        step={0.1}
        unit="s"
        hoveredElement={hoveredElement}
        setHoveredElement={setHoveredElement}
        onChange={onReverbChange}
        displayFormatter={(v) => `${v.toFixed(1)}秒`}
      />
    </div>
  );
}

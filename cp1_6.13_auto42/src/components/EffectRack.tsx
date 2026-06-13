import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

export type EffectType = 'eq' | 'compressor' | 'reverb' | 'delay';

export interface EffectParams {
  eq: { low: number; mid: number; high: number };
  compressor: { threshold: number; ratio: number };
  reverb: { roomSize: number; dryWet: number };
  delay: { time: number; feedback: number };
}

export interface EffectSlot {
  type: EffectType;
  params: EffectParams[EffectType];
  expanded: boolean;
}

export const DEFAULT_PARAMS: EffectParams = {
  eq: { low: 0, mid: 0, high: 0 },
  compressor: { threshold: -20, ratio: 4 },
  reverb: { roomSize: 50, dryWet: 30 },
  delay: { time: 300, feedback: 40 },
};

export const EFFECT_LABELS: Record<EffectType, string> = {
  eq: '均衡器',
  compressor: '压缩器',
  reverb: '混响',
  delay: '延迟',
};

function DraggableEffect({ type }: { type: EffectType }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `effect-${type}`,
    data: { type },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #16213e 0%, #1a1a2e 100%)',
    border: '1px solid rgba(226,169,59,0.3)',
    borderRadius: '8px',
    cursor: 'grab',
    fontSize: '13px',
    color: '#e2a93b',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 6px rgba(226,169,59,0.1)',
    userSelect: 'none',
    transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onMouseDown={(e) => {
        listeners?.onMouseDown?.(e);
      }}
    >
      {EFFECT_LABELS[type]}
    </div>
  );
}

function DroppableSlot({
  slotIndex,
  slot,
  onRemove,
  onToggleExpand,
  onParamChange,
  flashing,
}: {
  slotIndex: number;
  slot: EffectSlot | null;
  onRemove: () => void;
  onToggleExpand: () => void;
  onParamChange: (paramName: string, value: number) => void;
  flashing: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slotIndex}`,
    data: { slotIndex },
  });

  if (!slot) {
    return (
      <div
        ref={setNodeRef}
        style={{
          width: '100%',
          height: '56px',
          border: isOver ? '2px dashed #e2a93b' : '2px dashed rgba(226,169,59,0.25)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOver ? '#e2a93b' : 'rgba(226,169,59,0.4)',
          fontSize: '12px',
          background: isOver
            ? 'rgba(226,169,59,0.08)'
            : 'rgba(22,33,62,0.3)',
          transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: isOver
            ? '0 0 16px rgba(226,169,59,0.3), inset 0 0 12px rgba(226,169,59,0.1)'
            : 'none',
        }}
      >
        拖入效果器
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={flashing ? 'effect-flash' : ''}
      style={{
        background: 'linear-gradient(135deg, #16213e 0%, #0f1629 100%)',
        border: '1px solid rgba(226,169,59,0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.3), 0 0 8px rgba(226,169,59,0.1)',
        animation: flashing ? 'flashPulse 0.6s ease' : 'none',
      }}
    >
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ color: '#e2a93b', fontSize: '13px', fontWeight: 600 }}>
          {EFFECT_LABELS[slot.type]}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(226,169,59,0.5)',
              transition: 'transform 0.3s ease',
              transform: slot.expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              background: 'rgba(255,80,80,0.15)',
              border: '1px solid rgba(255,80,80,0.3)',
              borderRadius: '4px',
              color: '#ff5050',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '2px 8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,80,80,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,80,80,0.15)';
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div
        style={{
          maxHeight: slot.expanded ? '300px' : '0px',
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: slot.expanded ? '0 12px 12px' : '0 12px',
        }}
      >
        <EffectPanel type={slot.type} params={slot.params} onParamChange={onParamChange} />
      </div>
    </div>
  );
}

function Knob({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startY.current = e.clientY;
      startValue.current = value;

      const handleMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta = (startY.current - ev.clientY) * 0.3;
        const range = max - min;
        let newVal = startValue.current + (delta / 100) * range;
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(Math.round(newVal * 10) / 10);
      };

      const handleMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [value, min, max, onChange]
  );

  const normalizedValue = (value - min) / (max - min);
  const angle = -135 + normalizedValue * 270;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <div
        ref={knobRef}
        onMouseDown={handleMouseDown}
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'conic-gradient(from -135deg, #e2a93b 0deg, #e2a93b ' +
            (normalizedValue * 270) + 'deg, rgba(226,169,59,0.15) ' +
            (normalizedValue * 270) + 'deg, rgba(226,169,59,0.15) 270deg, transparent 270deg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'ns-resize',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.05)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: '2px',
              height: '12px',
              background: '#e2a93b',
              borderRadius: '1px',
              transformOrigin: 'center 12px',
              transform: `rotate(${angle}deg)`,
              boxShadow: '0 0 4px rgba(226,169,59,0.5)',
            }}
          />
          <span
            style={{
              fontSize: '9px',
              color: '#e2a93b',
              fontWeight: 600,
              position: 'absolute',
              bottom: '2px',
            }}
          >
            {typeof value === 'number' ? value.toFixed(1) : value}
          </span>
        </div>
      </div>
      <span style={{ fontSize: '10px', color: 'rgba(226,169,59,0.6)' }}>{label}</span>
    </div>
  );
}

function ParticleSlider({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; opacity: number }>>([]);
  const animRef = useRef<number>(0);

  const normalizedValue = (value - min) / (max - min);

  useEffect(() => {
    const tick = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            y: p.y - 0.5 - Math.random() * 0.5,
            opacity: p.opacity - 0.02,
            x: p.x + (Math.random() - 0.5) * 0.3,
          }))
          .filter((p) => p.opacity > 0);
        if (Math.random() < 0.3) {
          next.push({
            id: Date.now() + Math.random(),
            x: normalizedValue * 100 + (Math.random() - 0.5) * 4,
            y: 0,
            opacity: 0.8,
          });
        }
        return next.slice(-20);
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [normalizedValue]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;

      const updateValue = (ev: MouseEvent) => {
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        onChange(Math.round(min + ratio * (max - min)));
      };

      updateValue(e.nativeEvent);

      const handleMouseMove = (ev: MouseEvent) => updateValue(ev);
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [min, max, onChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'rgba(226,169,59,0.6)' }}>{label}</span>
        <span style={{ fontSize: '10px', color: '#e2a93b' }}>{value}</span>
      </div>
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'relative',
          height: '20px',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            height: '4px',
            background: 'rgba(226,169,59,0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${normalizedValue * 100}%`,
              background: 'linear-gradient(90deg, #e2a93b, #ff9500)',
              borderRadius: '2px',
              boxShadow: '0 0 6px rgba(226,169,59,0.4)',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: `${normalizedValue * 100}%`,
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#e2a93b',
            boxShadow: '0 0 8px rgba(226,169,59,0.5)',
            transition: 'left 0.05s linear',
          }}
        />
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${8 + p.y}px`,
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: '#e2a93b',
              opacity: p.opacity,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function SimpleSlider({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const normalizedValue = (value - min) / (max - min);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      if (!track) return;

      const updateValue = (ev: MouseEvent) => {
        const rect = track.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
        onChange(Math.round(min + ratio * (max - min)));
      };

      updateValue(e.nativeEvent);

      const handleMouseMove = (ev: MouseEvent) => updateValue(ev);
      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [min, max, onChange]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: 'rgba(226,169,59,0.6)' }}>{label}</span>
        <span style={{ fontSize: '10px', color: '#e2a93b' }}>{value}</span>
      </div>
      <div ref={trackRef} onMouseDown={handleMouseDown} style={{ position: 'relative', height: '20px', cursor: 'pointer' }}>
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: 0,
            right: 0,
            height: '4px',
            background: 'rgba(226,169,59,0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${normalizedValue * 100}%`,
              background: 'linear-gradient(90deg, #e2a93b, #ff9500)',
              borderRadius: '2px',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: `${normalizedValue * 100}%`,
            transform: 'translateX(-50%)',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#e2a93b',
            boxShadow: '0 0 8px rgba(226,169,59,0.5)',
            transition: 'left 0.05s linear',
          }}
        />
      </div>
    </div>
  );
}

function EffectPanel({
  type,
  params,
  onParamChange,
}: {
  type: EffectType;
  params: EffectParams[EffectType];
  onParamChange: (paramName: string, value: number) => void;
}) {
  switch (type) {
    case 'eq': {
      const p = params as EffectParams['eq'];
      return (
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
          <Knob value={p.low} min={-12} max={12} label="低频" onChange={(v) => onParamChange('low', v)} />
          <Knob value={p.mid} min={-12} max={12} label="中频" onChange={(v) => onParamChange('mid', v)} />
          <Knob value={p.high} min={-12} max={12} label="高频" onChange={(v) => onParamChange('high', v)} />
        </div>
      );
    }
    case 'compressor': {
      const p = params as EffectParams['compressor'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
          <SimpleSlider value={p.threshold} min={-60} max={0} label="阈值 (dB)" onChange={(v) => onParamChange('threshold', v)} />
          <SimpleSlider value={p.ratio} min={1} max={20} label="比率" onChange={(v) => onParamChange('ratio', v)} />
        </div>
      );
    }
    case 'reverb': {
      const p = params as EffectParams['reverb'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
          <ParticleSlider value={p.roomSize} min={0} max={100} label="房间大小" onChange={(v) => onParamChange('roomSize', v)} />
          <ParticleSlider value={p.dryWet} min={0} max={100} label="干湿比" onChange={(v) => onParamChange('dryWet', v)} />
        </div>
      );
    }
    case 'delay': {
      const p = params as EffectParams['delay'];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
          <SimpleSlider value={p.time} min={10} max={2000} label="时间 (ms)" onChange={(v) => onParamChange('time', v)} />
          <SimpleSlider value={p.feedback} min={0} max={90} label="反馈 (%)" onChange={(v) => onParamChange('feedback', v)} />
        </div>
      );
    }
    default:
      return null;
  }
}

interface EffectRackProps {
  slots: (EffectSlot | null)[];
  onSlotChange: (slotIndex: number, effectType: EffectType) => void;
  onSlotRemove: (slotIndex: number) => void;
  onToggleExpand: (slotIndex: number) => void;
  onParamChange: (slotIndex: number, paramName: string, value: number) => void;
  flashingSlots: Set<number>;
}

const EffectRack: React.FC<EffectRackProps> = ({
  slots,
  onSlotChange,
  onSlotRemove,
  onToggleExpand,
  onParamChange,
  flashingSlots,
}) => {
  const effectTypes: EffectType[] = ['eq', 'compressor', 'reverb', 'delay'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        {effectTypes.map((type) => (
          <DraggableEffect key={type} type={type} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {slots.map((slot, idx) => (
          <DroppableSlot
            key={idx}
            slotIndex={idx}
            slot={slot}
            onRemove={() => onSlotRemove(idx)}
            onToggleExpand={() => onToggleExpand(idx)}
            onParamChange={(paramName, value) => onParamChange(idx, paramName, value)}
            flashing={flashingSlots.has(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default EffectRack;

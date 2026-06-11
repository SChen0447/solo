import React, { useCallback, useEffect, useState } from 'react';
import { AltarSlot, ELEMENT_INFO, ELEMENT_CYCLE, ElementType, LiquidEssence, Spirit } from './types';
import SpiritComponent from './Spirit';

interface AltarProps {
  slots: AltarSlot[];
  onPourEssence: (slotPosition: number, essence: LiquidEssence) => void;
  onAllActivated: () => void;
  activeSpirit: Spirit | null;
  perfectResonance: boolean;
  onSpiritClick: (spiritId: string) => void;
}

const PENTAGRAM_ANGLES = [-90, -18, 54, 126, 198];
const PENTAGRAM_RADIUS = 130;
const CENTER_X = 200;
const CENTER_Y = 200;

const getPentagramPoint = (index: number) => {
  const angle = (PENTAGRAM_ANGLES[index] * Math.PI) / 180;
  return {
    x: CENTER_X + PENTAGRAM_RADIUS * Math.cos(angle),
    y: CENTER_Y + PENTAGRAM_RADIUS * Math.sin(angle),
  };
};

const PENTAGRAM_LINES = [
  [0, 2], [2, 4], [4, 1], [1, 3], [3, 0],
];

const PulseRing: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => (
  <div
    style={{
      position: 'absolute',
      left: x - 30,
      top: y - 30,
      width: 60,
      height: 60,
      borderRadius: '50%',
      border: `2px solid ${color}`,
      animation: 'pulseRing 1.5s ease-out forwards',
      pointerEvents: 'none',
    }}
  />
);

const MagicCircle: React.FC<{ active: boolean; speed: number }> = ({ active, speed }) => {
  if (!active) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: CENTER_X - 60,
        top: CENTER_Y - 60,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(100,150,255,0.1) 40%, rgba(255,100,50,0.05) 70%, transparent 100%)`,
        animation: `magicCircleRotate ${speed}s linear infinite`,
        boxShadow: '0 0 30px rgba(100,150,255,0.4), 0 0 60px rgba(255,100,50,0.2)',
        pointerEvents: 'none',
      }}
    >
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(100,150,255,0.3)" strokeWidth="0.5" strokeDasharray="5 5" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(255,100,50,0.2)" strokeWidth="0.5" />
        {Array.from({ length: 5 }, (_, i) => {
          const angle = (i * 72 - 90) * (Math.PI / 180);
          return (
            <line
              key={i}
              x1="60"
              y1="60"
              x2={60 + 55 * Math.cos(angle)}
              y2={60 + 55 * Math.sin(angle)}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="0.5"
            />
          );
        })}
        {[0, 72, 144, 216, 288].map((angle, i) => {
          const rad = ((angle - 90) * Math.PI) / 180;
          return (
            <text
              key={i}
              x={60 + 40 * Math.cos(rad)}
              y={60 + 40 * Math.sin(rad)}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,200,100,0.5)"
              fontSize="8"
            >
              {ELEMENT_INFO[ELEMENT_CYCLE[i]].symbol}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const Altar: React.FC<AltarProps> = ({
  slots,
  onPourEssence,
  onAllActivated,
  activeSpirit,
  perfectResonance,
  onSpiritClick,
}) => {
  const [pulseRings, setPulseRings] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const [dropHighlight, setDropHighlight] = useState<number | null>(null);
  const [allActivated, setAllActivated] = useState(false);
  const [pendingEssence, setPendingEssence] = useState<LiquidEssence | null>(null);

  useEffect(() => {
    if (slots.every(s => s.activated)) {
      if (!allActivated) {
        setAllActivated(true);
        onAllActivated();
      }
    } else {
      setAllActivated(false);
    }
  }, [slots, allActivated, onAllActivated]);

  const handleSlotClick = useCallback(
    (position: number) => {
      const slot = slots[position];
      if (slot.activated) return;

      const nextUnactivated = slots.findIndex(s => !s.activated);
      if (nextUnactivated !== position) return;

      const el = ELEMENT_CYCLE[position];
      onPourEssence(position, {
        id: `essence-${Date.now()}`,
        element: el,
        color: ELEMENT_INFO[el].color,
      });

      const pt = getPentagramPoint(position);
      const ringId = Date.now() + position;
      setPulseRings(prev => [...prev, { id: ringId, x: pt.x, y: pt.y, color: ELEMENT_INFO[el].color }]);
      setTimeout(() => {
        setPulseRings(prev => prev.filter(r => r.id !== ringId));
      }, 1500);
    },
    [slots, onPourEssence]
  );

  const handleDragOver = useCallback((e: React.DragEvent, position: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropHighlight(position);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, position: number) => {
      e.preventDefault();
      setDropHighlight(null);
      const data = e.dataTransfer.getData('essence');
      if (data) {
        try {
          const essence: LiquidEssence = JSON.parse(data);
          onPourEssence(position, essence);
          const pt = getPentagramPoint(position);
          const ringId = Date.now() + position;
          setPulseRings(prev => [...prev, { id: ringId, x: pt.x, y: pt.y, color: ELEMENT_INFO[essence.element].color }]);
          setTimeout(() => {
            setPulseRings(prev => prev.filter(r => r.id !== ringId));
          }, 1500);
        } catch {}
      }
    },
    [onPourEssence]
  );

  const rotationSpeed = perfectResonance ? 1 : 5;

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ fontFamily: "'MedievalSharp', cursive", color: '#33aaff', fontSize: 20, marginBottom: 8, textShadow: '0 0 10px #33aaff88' }}>
        ✦ 元素祭坛 ✦
      </div>

      <div
        style={{
          position: 'relative',
          width: 400,
          height: 400,
        }}
      >
        <svg width="400" height="400" viewBox="0 0 400 400" style={{ position: 'absolute', top: 0, left: 0 }}>
          <defs>
            <radialGradient id="altarGlow" cx="50%" cy="50%">
              <stop offset="0%" stopColor="rgba(100,150,255,0.1)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <circle cx={CENTER_X} cy={CENTER_Y} r={PENTAGRAM_RADIUS + 20} fill="url(#altarGlow)" />
          <circle cx={CENTER_X} cy={CENTER_Y} r={PENTAGRAM_RADIUS + 5} fill="none" stroke="rgba(100,150,255,0.15)" strokeWidth="1" />

          {PENTAGRAM_LINES.map(([from, to], i) => {
            const p1 = getPentagramPoint(from);
            const p2 = getPentagramPoint(to);
            const bothActivated = slots[from].activated && slots[to].activated;
            const anyActivated = slots[from].activated || slots[to].activated;
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={bothActivated ? 'rgba(255,200,100,0.6)' : anyActivated ? 'rgba(100,150,255,0.3)' : 'rgba(80,80,100,0.3)'}
                strokeWidth={bothActivated ? 2 : 1}
              />
            );
          })}
        </svg>

        <MagicCircle active={allActivated} speed={rotationSpeed} />

        {slots.map((slot, i) => {
          const pt = getPentagramPoint(i);
          const info = ELEMENT_INFO[slot.expectedElement];
          const isHighlighted = dropHighlight === i;
          return (
            <div
              key={i}
              onDragOver={e => handleDragOver(e, i)}
              onDragLeave={() => setDropHighlight(null)}
              onDrop={e => handleDrop(e, i)}
              onClick={() => handleSlotClick(i)}
              style={{
                position: 'absolute',
                left: pt.x - 28,
                top: pt.y - 28,
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: slot.activated
                  ? `radial-gradient(circle, ${info.glowColor}44, ${info.color}22)`
                  : 'rgba(30,30,40,0.8)',
                border: `2px solid ${slot.activated ? info.color : isHighlighted ? '#ff6a33' : '#444'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: slot.activated ? 'default' : 'pointer',
                transition: 'all 0.3s',
                boxShadow: slot.activated
                  ? `0 0 20px ${info.color}66, inset 0 0 10px ${info.color}33`
                  : isHighlighted
                  ? '0 0 15px rgba(255,106,51,0.4)'
                  : 'none',
                animation: slot.activated ? 'slotGlow 2s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={e => {
                if (!slot.activated) e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: 16, opacity: slot.activated ? 1 : 0.5 }}>
                {info.symbol}
              </span>
              <span style={{ fontSize: 9, color: slot.activated ? info.color : '#665544', marginTop: 1 }}>
                {info.name}
              </span>
            </div>
          );
        })}

        {pulseRings.map(ring => (
          <PulseRing key={ring.id} x={ring.x} y={ring.y} color={ring.color} />
        ))}

        {activeSpirit && (
          <div style={{ position: 'absolute', left: CENTER_X, top: CENTER_Y, transform: 'translate(-50%, -50%)' }}>
            <SpiritComponent
              spirit={activeSpirit}
              perfectResonance={perfectResonance}
              onClick={() => onSpiritClick(activeSpirit.id)}
            />
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, color: '#665544', fontSize: 13, textAlign: 'center', fontFamily: "'MedievalSharp', cursive" }}>
        元素循环: 火 → 土 → 金 → 水 → 木
        <br />
        <span style={{ fontSize: 11, color: '#554433' }}>点击槽位注入对应精华</span>
      </div>
    </div>
  );
};

export default Altar;

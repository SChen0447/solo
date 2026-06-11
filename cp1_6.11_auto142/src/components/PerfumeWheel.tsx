import React, { useState, useRef, useCallback } from 'react';
import {
  Scent,
  PlacedScent,
  NoteType,
  TOP_NOTES,
  MIDDLE_NOTES,
  BASE_NOTES,
} from '@/utils/formula';

interface Ripple {
  id: number;
  ring: NoteType;
  slotIndex: number;
  color: string;
}

interface PerfumeWheelProps {
  topNotes: (PlacedScent | null)[];
  middleNotes: (PlacedScent | null)[];
  baseNotes: (PlacedScent | null)[];
  onPlaceScent: (type: NoteType, slotIndex: number, scent: Scent) => void;
  onRemoveScent: (type: NoteType, slotIndex: number) => void;
  onConcentrationChange: (
    type: NoteType,
    slotIndex: number,
    concentration: number,
  ) => void;
  presetAnimation: boolean;
  onPresetAnimationComplete: () => void;
}

const RING_CONFIG: Record<NoteType, { radius: number; label: string }> = {
  top: { radius: 120, label: '前调' },
  middle: { radius: 80, label: '中调' },
  base: { radius: 40, label: '基底' },
};

const SLOT_COUNT = 5;
const WHEEL_CENTER = 200;
const WHEEL_SIZE = 400;

const PerfumeWheel: React.FC<PerfumeWheelProps> = ({
  topNotes,
  middleNotes,
  baseNotes,
  onPlaceScent,
  onRemoveScent,
  onConcentrationChange,
  presetAnimation,
  onPresetAnimationComplete,
}) => {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [draggedScent, setDraggedScent] = useState<Scent | null>(null);
  const [activeSlider, setActiveSlider] = useState<{
    type: NoteType;
    slotIndex: number;
  } | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{
    type: NoteType;
    slotIndex: number;
  } | null>(null);
  const [animateSlots, setAnimateSlots] = useState<Set<string>>(new Set());
  const rippleIdRef = useRef(0);

  const getSlotPosition = (radius: number, index: number) => {
    const angle = (index * 2 * Math.PI) / SLOT_COUNT - Math.PI / 2;
    return {
      x: WHEEL_CENTER + radius * Math.cos(angle),
      y: WHEEL_CENTER + radius * Math.sin(angle),
    };
  };

  const getNotesForType = (type: NoteType): (PlacedScent | null)[] => {
    switch (type) {
      case 'top':
        return topNotes;
      case 'middle':
        return middleNotes;
      case 'base':
        return baseNotes;
    }
  };

  const createRipple = useCallback(
    (ring: NoteType, slotIndex: number, color: string) => {
      const id = rippleIdRef.current++;
      setRipples((prev) => [...prev, { id, ring, slotIndex, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 1200);
    },
    [],
  );

  const handleDragStart = (scent: Scent) => {
    setDraggedScent(scent);
  };

  const handleDragEnd = () => {
    setDraggedScent(null);
    setHoveredSlot(null);
  };

  const handleSlotDragOver = (e: React.DragEvent, type: NoteType, slotIndex: number) => {
    e.preventDefault();
    if (draggedScent && draggedScent.type === type) {
      setHoveredSlot({ type, slotIndex });
    }
  };

  const handleSlotDragLeave = () => {
    setHoveredSlot(null);
  };

  const handleSlotDrop = (e: React.DragEvent, type: NoteType, slotIndex: number) => {
    e.preventDefault();
    if (draggedScent && draggedScent.type === type) {
      onPlaceScent(type, slotIndex, draggedScent);
      createRipple(type, slotIndex, draggedScent.color);
    }
    setDraggedScent(null);
    setHoveredSlot(null);
  };

  const handleScentClick = (type: NoteType, slotIndex: number) => {
    const notes = getNotesForType(type);
    if (notes[slotIndex]) {
      setActiveSlider({ type, slotIndex });
    }
  };

  const handleConcentrationChange = (value: number) => {
    if (activeSlider) {
      onConcentrationChange(activeSlider.type, activeSlider.slotIndex, value);
    }
  };

  const handleRemove = () => {
    if (activeSlider) {
      onRemoveScent(activeSlider.type, activeSlider.slotIndex);
      setActiveSlider(null);
    }
  };

  React.useEffect(() => {
    if (presetAnimation) {
      const allSlots: { type: NoteType; slotIndex: number }[] = [];
      (['top', 'middle', 'base'] as NoteType[]).forEach((type) => {
        const notes = getNotesForType(type);
        notes.forEach((note, idx) => {
          if (note) {
            allSlots.push({ type, slotIndex: idx });
          }
        });
      });

      let delay = 0;
      allSlots.forEach((slot) => {
        setTimeout(() => {
          setAnimateSlots((prev) => new Set(prev).add(`${slot.type}-${slot.slotIndex}`));
          setTimeout(() => {
            setAnimateSlots(
              (prev) =>
                new Set([...prev].filter((s) => s !== `${slot.type}-${slot.slotIndex}`)),
            );
          }, 400);
        }, delay);
        delay += 200;
      });

      setTimeout(() => {
        onPresetAnimationComplete();
      }, delay + 500);
    }
  }, [presetAnimation]);

  const renderScentCard = (scent: Scent, draggable = false) => (
    <div
      className={`scent-card ${draggable ? 'draggable' : ''}`}
      draggable={draggable}
      onDragStart={draggable ? () => handleDragStart(scent) : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      style={{
        backgroundColor: `${scent.color}33`,
        borderColor: scent.color,
      }}
    >
      <div className="scent-color-dot" style={{ backgroundColor: scent.color }} />
      <span className="scent-name">{scent.name}</span>
    </div>
  );

  const renderSlot = (type: NoteType, slotIndex: number) => {
    const notes = getNotesForType(type);
    const note = notes[slotIndex];
    const pos = getSlotPosition(RING_CONFIG[type].radius, slotIndex);
    const isHovered =
      hoveredSlot?.type === type && hoveredSlot?.slotIndex === slotIndex;
    const hasRipple = ripples.some(
      (r) => r.ring === type && r.slotIndex === slotIndex,
    );
    const rippleColor = ripples.find(
      (r) => r.ring === type && r.slotIndex === slotIndex,
    )?.color;
    const isAnimating = animateSlots.has(`${type}-${slotIndex}`);
    const isActive =
      activeSlider?.type === type && activeSlider?.slotIndex === slotIndex;

    return (
      <g
        key={`${type}-${slotIndex}`}
        onDragOver={(e) => handleSlotDragOver(e, type, slotIndex)}
        onDragLeave={handleSlotDragLeave}
        onDrop={(e) => handleSlotDrop(e, type, slotIndex)}
        onClick={() => note && handleScentClick(type, slotIndex)}
        style={{ cursor: note ? 'pointer' : 'default' }}
      >
        <circle
          cx={pos.x}
          cy={pos.y}
          r={28}
          fill={isHovered ? '#ffffff88' : 'transparent'}
          stroke={isHovered ? '#c49a6c' : '#c49a6c44'}
          strokeWidth={isHovered ? 2 : 1}
          strokeDasharray={note ? 'none' : '4 4'}
          style={{
            transition: 'all 0.2s ease',
            transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
            transformOrigin: `${pos.x}px ${pos.y}px`,
            opacity: isAnimating ? 1 : 0.8,
          }}
        />
        {note && (
          <>
            <circle
              cx={pos.x}
              cy={pos.y}
              r={25}
              fill={`${note.color}44`}
              stroke={note.color}
              strokeWidth={isActive ? 3 : 2}
              style={{
                transition: 'all 0.2s ease',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: `${pos.x}px ${pos.y}px`,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
              }}
            />
            <text
              x={pos.x}
              y={pos.y + 4}
              textAnchor="middle"
              fill="#333"
              fontSize="11"
              fontWeight="500"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {note.name}
            </text>
            <text
              x={pos.x}
              y={pos.y + 18}
              textAnchor="middle"
              fill={note.color}
              fontSize="9"
              fontWeight="600"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {note.concentration}%
            </text>
          </>
        )}
        {hasRipple && rippleColor && (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={0}
            fill="none"
            stroke={rippleColor}
            strokeWidth={2}
            style={{
              animation: 'ripple 1.2s ease-out forwards',
              transformOrigin: `${pos.x}px ${pos.y}px`,
            }}
          />
        )}
      </g>
    );
  };

  const activeNote = activeSlider
    ? getNotesForType(activeSlider.type)[activeSlider.slotIndex]
    : null;

  return (
    <div className="perfume-wheel-container">
      <div className="scent-shelf">
        <div className="shelf-section">
          <h4 className="shelf-title">前调</h4>
          <div className="shelf-cards">
            {TOP_NOTES.map((scent) => (
              <div key={scent.id}>{renderScentCard(scent, true)}</div>
            ))}
          </div>
        </div>
        <div className="shelf-section">
          <h4 className="shelf-title">中调</h4>
          <div className="shelf-cards">
            {MIDDLE_NOTES.map((scent) => (
              <div key={scent.id}>{renderScentCard(scent, true)}</div>
            ))}
          </div>
        </div>
        <div className="shelf-section">
          <h4 className="shelf-title">基底</h4>
          <div className="shelf-cards">
            {BASE_NOTES.map((scent) => (
              <div key={scent.id}>{renderScentCard(scent, true)}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="wheel-wrapper">
        <svg width={WHEEL_SIZE} height={WHEEL_SIZE} className="perfume-wheel">
          <defs>
            <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f7f3ee" />
              <stop offset="100%" stopColor="#e8d8c8" />
            </radialGradient>
          </defs>

          <circle
            cx={WHEEL_CENTER}
            cy={WHEEL_CENTER}
            r={150}
            fill="url(#wheelBg)"
            style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.1))' }}
          />

          {(['base', 'middle', 'top'] as NoteType[]).map((type) => (
            <circle
              key={type}
              cx={WHEEL_CENTER}
              cy={WHEEL_CENTER}
              r={RING_CONFIG[type].radius}
              fill="none"
              stroke="#c49a6c66"
              strokeWidth={1}
            />
          ))}

          <text
            x={WHEEL_CENTER}
            y={WHEEL_CENTER + 4}
            textAnchor="middle"
            fill="#8b7355"
            fontSize="14"
            fontWeight="600"
            style={{ userSelect: 'none' }}
          >
            调香台
          </text>

          {(['base', 'middle', 'top'] as NoteType[]).map((type) =>
            Array(SLOT_COUNT)
              .fill(null)
              .map((_, idx) => renderSlot(type, idx)),
          )}
        </svg>

        <div className="ring-labels">
          {(['top', 'middle', 'base'] as NoteType[]).map((type) => {
            const pos = getSlotPosition(RING_CONFIG[type].radius + 35, 0);
            return (
              <span
                key={type}
                className="ring-label"
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${WHEEL_CENTER - RING_CONFIG[type].radius - 10}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                {RING_CONFIG[type].label}
              </span>
            );
          })}
        </div>
      </div>

      {activeSlider && activeNote && (
        <div className="concentration-popup">
          <div className="popup-header">
            <div
              className="popup-scent-preview"
              style={{ backgroundColor: activeNote.color }}
            />
            <span className="popup-scent-name">{activeNote.name}</span>
            <button
              className="popup-close-btn"
              onClick={() => setActiveSlider(null)}
            >
              ×
            </button>
          </div>
          <div className="popup-content">
            <label className="concentration-label">
              浓度: {activeNote.concentration}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={activeNote.concentration}
              onChange={(e) => handleConcentrationChange(Number(e.target.value))}
              className="concentration-slider"
              style={{
                background: `linear-gradient(to right, ${activeNote.color} 0%, ${activeNote.color} ${activeNote.concentration}%, #ddd ${activeNote.concentration}%, #ddd 100%)`,
              }}
            />
            <button className="remove-btn" onClick={handleRemove}>
              移除香料
            </button>
          </div>
        </div>
      )}

      <style>{`
        .perfume-wheel-container {
          display: flex;
          gap: 30px;
          align-items: flex-start;
        }

        .scent-shelf {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(8px);
          border-radius: 16px;
          border: 1px solid rgba(196, 154, 108, 0.3);
          min-width: 100px;
        }

        .shelf-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shelf-title {
          margin: 0;
          font-size: 12px;
          color: #8b7355;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .shelf-cards {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .scent-card {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 50px;
          height: 30px;
          padding: 0 6px;
          border-radius: 6px;
          border: 1px solid;
          background: rgba(255, 255, 255, 0.5);
          backdrop-filter: blur(4px);
          cursor: grab;
          transition: all 0.15s ease;
          user-select: none;
        }

        .scent-card:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .scent-card:active {
          transform: scale(0.98);
          cursor: grabbing;
        }

        .scent-color-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .scent-name {
          font-size: 10px;
          font-weight: 500;
          color: #333;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .wheel-wrapper {
          position: relative;
        }

        .perfume-wheel {
          display: block;
        }

        .ring-label {
          font-size: 11px;
          font-weight: 600;
          color: #8b7355;
          background: rgba(255, 255, 255, 0.8);
          padding: 2px 8px;
          border-radius: 10px;
          pointer-events: none;
        }

        .concentration-popup {
          position: absolute;
          right: -200px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 1px solid rgba(196, 154, 108, 0.3);
          width: 180px;
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .popup-scent-preview {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .popup-scent-name {
          flex: 1;
          font-weight: 600;
          color: #333;
          font-size: 14px;
        }

        .popup-close-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: #999;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          line-height: 1;
        }

        .popup-close-btn:hover {
          color: #333;
        }

        .popup-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .concentration-label {
          font-size: 12px;
          color: #666;
          font-weight: 500;
        }

        .concentration-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 3px;
          outline: none;
        }

        .concentration-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #c49a6c;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .concentration-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          border: 2px solid #c49a6c;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .remove-btn {
          background: #fff0f0;
          color: #c96567;
          border: 1px solid #c96567;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .remove-btn:hover {
          background: #c96567;
          color: white;
        }

        @keyframes ripple {
          0% {
            r: 0;
            opacity: 1;
            stroke-width: 3;
          }
          100% {
            r: 50;
            opacity: 0;
            stroke-width: 1;
          }
        }

        @media (max-width: 768px) {
          .perfume-wheel-container {
            flex-direction: column;
            align-items: center;
          }

          .scent-shelf {
            flex-direction: row;
            gap: 12px;
            overflow-x: auto;
            max-width: 100%;
          }

          .concentration-popup {
            position: fixed;
            right: 20px;
            top: auto;
            bottom: 20px;
            transform: none;
          }
        }
      `}</style>
    </div>
  );
};

export default PerfumeWheel;

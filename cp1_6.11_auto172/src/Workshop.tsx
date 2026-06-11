import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Part,
  SelectedParts,
  PartType,
  ENGINE_PARTS,
  WING_PARTS,
  PROPELLER_PARTS,
  COCKPIT_PARTS,
  playMetalSnapSound
} from './utils';

interface WorkshopProps {
  selectedParts: SelectedParts;
  onPartSelect: (part: Part) => void;
  onPartRemove: (type: PartType) => void;
  disabled?: boolean;
}

interface DragState {
  part: Part;
  x: number;
  y: number;
}

const PART_TYPE_LABELS: Record<PartType, string> = {
  engine: '引擎',
  wing: '机翼',
  propeller: '螺旋桨',
  cockpit: '驾驶舱'
};

const PART_GROUPS: { type: PartType; parts: Part[] }[] = [
  { type: 'engine', parts: ENGINE_PARTS },
  { type: 'wing', parts: WING_PARTS },
  { type: 'propeller', parts: PROPELLER_PARTS },
  { type: 'cockpit', parts: COCKPIT_PARTS }
];

const Workshop: React.FC<WorkshopProps> = ({
  selectedParts,
  onPartSelect,
  onPartRemove,
  disabled = false
}) => {
  const assemblyAreaRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);

  const updateDragPosition = useCallback(() => {
    if (dragState && animationFrameRef.current) {
      setDragState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          x: dragPositionRef.current.x,
          y: dragPositionRef.current.y
        };
      });
      animationFrameRef.current = requestAnimationFrame(updateDragPosition);
    }
  }, [dragState]);

  const handleDragStart = (part: Part, e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragPositionRef.current = { x: clientX, y: clientY };
    setDragState({ part, x: clientX, y: clientY });

    animationFrameRef.current = requestAnimationFrame(updateDragPosition);
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragPositionRef.current = { x: clientX, y: clientY };
  }, [dragState]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragState || !assemblyAreaRef.current) {
      setDragState(null);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

    const rect = assemblyAreaRef.current.getBoundingClientRect();
    const isInAssemblyArea =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (isInAssemblyArea) {
      onPartSelect(dragState.part);
      playMetalSnapSound();
    }

    setDragState(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [dragState, onPartSelect]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove, { passive: false });
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragState, handleDragMove, handleDragEnd]);

  const renderPartIcon = (part: Part, size: 'small' | 'medium' = 'medium') => {
    const scale = size === 'small' ? 0.6 : 1;
    const w = part.width * scale;
    const h = part.height * scale;

    switch (part.type) {
      case 'engine':
        return (
          <svg width={w} height={h} viewBox={`0 0 ${part.width} ${part.height}`}>
            <rect x="5" y="5" width={part.width - 10} height={part.height - 10}
                  fill={part.color} stroke="#3b2b1a" strokeWidth="2" rx="4"/>
            <circle cx={part.width / 2} cy={part.height / 2} r="8"
                    fill={part.accentColor} stroke="#3b2b1a" strokeWidth="2"/>
            <rect x="8" y="8" width="6" height="6" fill="#f5deb3" rx="1"/>
            <rect x={part.width - 14} y="8" width="6" height="6" fill="#f5deb3" rx="1"/>
          </svg>
        );
      case 'wing':
        return (
          <svg width={w} height={h} viewBox={`0 0 ${part.width} ${part.height}`}>
            <path d={`M${part.width / 2},5 L${part.width - 5},${part.height / 2} L${part.width / 2},${part.height - 5} L5,${part.height / 2} Z`}
                  fill={part.color} stroke="#3b2b1a" strokeWidth="2"/>
            <line x1={part.width / 2} y1="5" x2={part.width / 2} y2={part.height - 5}
                  stroke={part.accentColor} strokeWidth="2"/>
          </svg>
        );
      case 'propeller':
        return (
          <svg width={w} height={h} viewBox={`0 0 ${part.width} ${part.height}`}>
            <ellipse cx={part.width / 2} cy={part.height / 2}
                     rx={part.width / 2 - 2} ry="6"
                     fill={part.color} stroke="#3b2b1a" strokeWidth="2"/>
            <ellipse cx={part.width / 2} cy={part.height / 2}
                     rx="6" ry={part.height / 2 - 2}
                     fill={part.accentColor} stroke="#3b2b1a" strokeWidth="2"/>
            <circle cx={part.width / 2} cy={part.height / 2} r="5"
                    fill="#7a3a2a" stroke="#3b2b1a" strokeWidth="2"/>
          </svg>
        );
      case 'cockpit':
        return (
          <svg width={w} height={h} viewBox={`0 0 ${part.width} ${part.height}`}>
            <path d={`M10,${part.height - 5} Q10,5 ${part.width / 2},5 Q${part.width - 10},5 ${part.width - 10},${part.height - 5} Z`}
                  fill={part.color} stroke="#3b2b1a" strokeWidth="2"/>
            <ellipse cx={part.width / 2} cy={part.height / 2 - 5}
                     rx={part.width / 3} ry={part.height / 4}
                     fill={part.accentColor} stroke="#3b2b1a" strokeWidth="1" opacity="0.7"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const renderAssembledAircraft = () => {
    const parts = selectedParts;
    const hasAnyPart = parts.engine || parts.wing || parts.propeller || parts.cockpit;

    if (!hasAnyPart) {
      return (
        <div className="assembly-placeholder">
          <span>拖拽零件到此处组装</span>
        </div>
      );
    }

    return (
      <div className="assembled-aircraft">
        {parts.wing && (
          <div className="aircraft-part wing-part"
               style={{ top: '30%', left: '50%', transform: 'translateX(-50%)' }}>
            {renderPartIcon(parts.wing)}
          </div>
        )}
        {parts.engine && (
          <div className="aircraft-part engine-part"
               style={{ top: '45%', left: '20%' }}>
            {renderPartIcon(parts.engine)}
          </div>
        )}
        {parts.cockpit && (
          <div className="aircraft-part cockpit-part"
               style={{ top: '35%', left: '55%' }}>
            {renderPartIcon(parts.cockpit)}
          </div>
        )}
        {parts.propeller && (
          <div className="aircraft-part propeller-part"
               style={{ top: '45%', right: '10%' }}>
            {renderPartIcon(parts.propeller)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`workshop ${disabled ? 'disabled' : ''}`}>
      <style>{`
        .workshop {
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding: 20px;
        }

        .workshop.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .parts-sidebar {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .part-group {
          background: linear-gradient(145deg, #5a3a2a, #3b2b1a);
          border: 2px solid #7a3a2a;
          border-radius: 8px;
          padding: 12px;
          min-width: 120px;
        }

        .part-group-title {
          color: #f5deb3;
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 10px;
          text-align: center;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
          border-bottom: 1px solid #7a3a2a;
          padding-bottom: 6px;
        }

        .part-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .part-item {
          background: linear-gradient(145deg, #8b6b4a, #6b4b2a);
          border: 2px solid #b87333;
          border-radius: 6px;
          padding: 8px;
          cursor: grab;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          user-select: none;
        }

        .part-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(184, 115, 51, 0.4);
          border-color: #d4a574;
        }

        .part-item:active {
          cursor: grabbing;
        }

        .part-item.selected {
          border-color: #f5deb3;
          box-shadow: 0 0 10px rgba(245, 222, 179, 0.5);
        }

        .part-item-name {
          color: #f5deb3;
          font-size: 11px;
          font-weight: bold;
          text-align: center;
        }

        .part-item-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
        }

        .assembly-area-wrapper {
          display: flex;
          justify-content: center;
        }

        .assembly-area {
          width: 300px;
          height: 200px;
          background: linear-gradient(180deg, #8b6b4a 0%, #6b4b2a 100%);
          border: 4px solid #5a3a2a;
          border-radius: 8px;
          position: relative;
          box-shadow: 
            inset 0 2px 4px rgba(0,0,0,0.3),
            0 4px 8px rgba(0,0,0,0.4);
          background-image: 
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 28px,
              rgba(59, 43, 26, 0.3) 28px,
              rgba(59, 43, 26, 0.3) 30px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 38px,
              rgba(59, 43, 26, 0.2) 38px,
              rgba(59, 43, 26, 0.2) 40px
            );
        }

        .assembly-placeholder {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: rgba(245, 222, 179, 0.5);
          font-size: 14px;
          text-align: center;
          pointer-events: none;
        }

        .assembled-aircraft {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .aircraft-part {
          position: absolute;
          transition: all 0.3s ease;
        }

        .wing-part {
          z-index: 1;
        }

        .engine-part {
          z-index: 2;
        }

        .cockpit-part {
          z-index: 3;
        }

        .propeller-part {
          z-index: 2;
          animation: propellerSpin 0.5s linear infinite;
          animation-play-state: paused;
        }

        @keyframes propellerSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .drag-preview {
          position: fixed;
          pointer-events: none;
          z-index: 1000;
          opacity: 0.8;
          filter: drop-shadow(0 0 6px #4a90d9);
          transform: translate(-50%, -50%);
        }

        .workbench-label {
          text-align: center;
          color: #f5deb3;
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          letter-spacing: 2px;
        }

        .remove-btn {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #7a3a2a;
          color: #f5deb3;
          border: 2px solid #b87333;
          font-size: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }

        .aircraft-part:hover .remove-btn {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .workshop {
            padding: 10px;
            gap: 10px;
          }

          .parts-sidebar {
            gap: 8px;
          }

          .part-group {
            min-width: 80px;
            padding: 8px;
          }

          .part-group-title {
            font-size: 11px;
          }

          .part-item {
            padding: 4px;
          }

          .part-item-name {
            font-size: 9px;
          }

          .part-item-icon {
            width: 35px;
            height: 35px;
          }

          .assembly-area {
            width: 250px;
            height: 160px;
          }
        }
      `}</style>

      <div className="parts-sidebar">
        {PART_GROUPS.map(group => (
          <div key={group.type} className="part-group">
            <div className="part-group-title">
              {PART_TYPE_LABELS[group.type]}
            </div>
            <div className="part-list">
              {group.parts.map(part => (
                <div
                  key={part.id}
                  className={`part-item ${selectedParts[part.type]?.id === part.id ? 'selected' : ''}`}
                  onMouseDown={(e) => handleDragStart(part, e)}
                  onTouchStart={(e) => handleDragStart(part, e)}
                  title={part.description}
                >
                  <div className="part-item-icon">
                    {renderPartIcon(part, 'small')}
                  </div>
                  <span className="part-item-name">{part.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="workbench-label">◆ 组装工作台 ◆</div>

      <div className="assembly-area-wrapper">
        <div
          ref={assemblyAreaRef}
          className="assembly-area"
        >
          {renderAssembledAircraft()}
        </div>
      </div>

      {dragState && (
        <div
          className="drag-preview"
          style={{
            left: dragState.x,
            top: dragState.y
          }}
        >
          {renderPartIcon(dragState.part)}
        </div>
      )}
    </div>
  );
};

export default Workshop;

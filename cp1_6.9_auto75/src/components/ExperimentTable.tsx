import React, { useRef, useEffect, useCallback } from 'react';
import type { ReagentId } from '../data/reactions';
import { calculateNewPosition, snapToGrid, type Position } from '../utils/dragState';

export type EquipmentType = 'beaker' | 'test-tube' | 'alcohol-lamp' | 'dropper';

export interface Equipment {
  id: string;
  type: EquipmentType;
  position: Position;
  isContainer: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  duration: number;
}

export interface ContainerState {
  reagents: ReagentId[];
  temperature: number;
  reactionProgress: number;
  isReacting: boolean;
  reactionResult?: {
    equation: string;
    description: string;
  };
  colorChange?: string;
  particles: Particle[];
  showTooltip: boolean;
}

export interface EquipmentStates {
  [equipmentId: string]: ContainerState;
}

interface ExperimentTableProps {
  equipments: Equipment[];
  equipmentStates: EquipmentStates;
  draggingId: string | null;
  onEquipmentMove: (id: string, position: Position) => void;
  onEquipmentClick: (id: string) => void;
  onDragStart: (id: string, offset: Position) => void;
  onDragEnd: () => void;
}

const EQUIPMENT_SIZES: Record<EquipmentType, { width: number; height: number }> = {
  'beaker': { width: 100, height: 120 },
  'test-tube': { width: 40, height: 140 },
  'alcohol-lamp': { width: 70, height: 90 },
  'dropper': { width: 30, height: 100 }
};

const BeakerSVG: React.FC = () => (
  <svg width="100" height="120" viewBox="0 0 100 120">
    <defs>
      <linearGradient id="beakerGlass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
      </linearGradient>
      <linearGradient id="beakerEdge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(200,220,255,0.9)" />
        <stop offset="100%" stopColor="rgba(150,180,220,0.6)" />
      </linearGradient>
    </defs>
    <path
      d="M15 10 L15 105 Q15 115 25 115 L75 115 Q85 115 85 105 L85 10"
      fill="url(#beakerGlass)"
      stroke="url(#beakerEdge)"
      strokeWidth="2"
    />
    <line x1="10" y1="10" x2="90" y2="10" stroke="url(#beakerEdge)" strokeWidth="3" strokeLinecap="round" />
    <line x1="10" y1="8" x2="90" y2="8" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinecap="round" />
    <path
      d="M18 15 Q25 20 22 90"
      stroke="rgba(255,255,255,0.5)"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

const TestTubeSVG: React.FC = () => (
  <svg width="40" height="140" viewBox="0 0 40 140">
    <defs>
      <linearGradient id="tubeGlass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0.5)" />
      </linearGradient>
      <linearGradient id="tubeEdge" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(200,220,255,0.9)" />
        <stop offset="100%" stopColor="rgba(150,180,220,0.6)" />
      </linearGradient>
    </defs>
    <ellipse cx="20" cy="130" rx="15" ry="8" fill="url(#tubeGlass)" stroke="url(#tubeEdge)" strokeWidth="2" />
    <rect x="5" y="5" width="30" height="125" rx="0" fill="url(#tubeGlass)" stroke="url(#tubeEdge)" strokeWidth="2" />
    <line x1="3" y1="5" x2="37" y2="5" stroke="url(#tubeEdge)" strokeWidth="3" strokeLinecap="round" />
    <line x1="3" y1="3" x2="37" y2="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1" strokeLinecap="round" />
    <path d="M8 10 Q12 15 10 120" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

const AlcoholLampSVG: React.FC = () => (
  <svg width="70" height="90" viewBox="0 0 70 90">
    <defs>
      <linearGradient id="lampBody" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF9800" />
        <stop offset="100%" stopColor="#E65100" />
      </linearGradient>
      <radialGradient id="flameOuterGrad" cx="50%" cy="80%" r="50%">
        <stop offset="0%" stopColor="#FFEB3B" />
        <stop offset="50%" stopColor="#FF9800" />
        <stop offset="100%" stopColor="#F44336" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="flameInnerGrad" cx="50%" cy="80%" r="50%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#FFEB3B" />
        <stop offset="100%" stopColor="#FF9800" stopOpacity="0" />
      </radialGradient>
    </defs>
    <ellipse cx="35" cy="82" rx="28" ry="6" fill="rgba(0,0,0,0.2)" />
    <path d="M12 45 Q8 55 8 75 Q8 82 18 82 L52 82 Q62 82 62 75 Q62 55 58 45 Z" fill="url(#lampBody)" />
    <rect x="28" y="30" width="14" height="18" rx="2" fill="#795548" />
    <rect x="30" y="25" width="10" height="8" rx="1" fill="#5D4037" />
    <line x1="35" y1="5" x2="35" y2="28" stroke="#333" strokeWidth="2" />
    <g className="flame-outer">
      <ellipse cx="35" cy="12" rx="10" ry="18" fill="url(#flameOuterGrad)" />
    </g>
    <g className="flame-inner">
      <ellipse cx="35" cy="14" rx="5" ry="10" fill="url(#flameInnerGrad)" />
    </g>
  </svg>
);

const DropperSVG: React.FC = () => (
  <svg width="30" height="100" viewBox="0 0 30 100">
    <defs>
      <linearGradient id="dropperRubber" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#E91E63" />
        <stop offset="100%" stopColor="#C2185B" />
      </linearGradient>
      <linearGradient id="dropperGlass" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
        <stop offset="100%" stopColor="rgba(200,220,255,0.4)" />
      </linearGradient>
    </defs>
    <ellipse cx="15" cy="12" rx="12" ry="14" fill="url(#dropperRubber)" />
    <rect x="11" y="25" width="8" height="60" fill="url(#dropperGlass)" stroke="rgba(150,180,220,0.6)" strokeWidth="1" />
    <polygon points="11,85 19,85 17,98 13,98" fill="url(#dropperGlass)" stroke="rgba(150,180,220,0.6)" strokeWidth="1" />
  </svg>
);

const renderEquipmentSVG = (type: EquipmentType): React.ReactNode => {
  switch (type) {
    case 'beaker': return <BeakerSVG />;
    case 'test-tube': return <TestTubeSVG />;
    case 'alcohol-lamp': return <AlcoholLampSVG />;
    case 'dropper': return <DropperSVG />;
  }
};

const getContainerContentStyle = (type: EquipmentType): React.CSSProperties => {
  switch (type) {
    case 'beaker':
      return { left: 20, top: 40, width: 60, height: 70, borderRadius: '0 0 8px 8px' };
    case 'test-tube':
      return { left: 8, top: 50, width: 24, height: 78, borderRadius: '0 0 12px 12px' };
    default:
      return {};
  }
};

const ExperimentTable: React.FC<ExperimentTableProps> = ({
  equipments,
  equipmentStates,
  draggingId,
  onEquipmentMove,
  onEquipmentClick,
  onDragStart,
  onDragEnd
}) => {
  const tableRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, equipment: Equipment) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    onDragStart(equipment.id, offset);
  }, [onDragStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingId || !tableRef.current) return;
    const equipment = equipments.find(eq => eq.id === draggingId);
    if (!equipment) return;

    const containerRect = tableRef.current.getBoundingClientRect();
    const size = EQUIPMENT_SIZES[equipment.type];

    const rawPosition = calculateNewPosition(
      e.clientX,
      e.clientY,
      containerRect,
      { x: 0, y: 0 },
      size.width,
      size.height,
      containerRect.width,
      containerRect.height
    );

    const offset = (() => {
      const target = e.target as HTMLElement;
      const equipmentEl = target.closest('.equipment');
      if (!equipmentEl) return { x: 0, y: 0 };
      const eqRect = equipmentEl.getBoundingClientRect();
      return {
        x: e.clientX - eqRect.left,
        y: e.clientY - eqRect.top
      };
    })();

    const finalPos = {
      x: Math.max(0, Math.min(rawPosition.x - offset.x, containerRect.width - size.width)),
      y: Math.max(0, Math.min(rawPosition.y - offset.y, containerRect.height - size.height))
    };

    onEquipmentMove(draggingId, finalPos);
  }, [draggingId, equipments, onEquipmentMove]);

  const handleMouseUp = useCallback(() => {
    if (draggingId) {
      const equipment = equipments.find(eq => eq.id === draggingId);
      if (equipment) {
        const snapped = snapToGrid(equipment.position);
        onEquipmentMove(draggingId, snapped);
      }
      onDragEnd();
    }
  }, [draggingId, equipments, onEquipmentMove, onDragEnd]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingId, handleMouseMove, handleMouseUp]);

  const renderContainerState = (equipment: Equipment) => {
    const state = equipmentStates[equipment.id];
    if (!state || !equipment.isContainer) return null;

    const contentStyle = getContainerContentStyle(equipment.type);
    const fillHeight = state.reagents.length > 0 ? `${Math.min(state.reagents.length * 25, 80)}%` : '0%';
    const bgColor = state.colorChange ||
      (state.reagents.length > 0 ? 'rgba(180, 200, 230, 0.5)' : 'transparent');

    return (
      <>
        <div
          className="container-content"
          style={{
            ...contentStyle,
            bottom: equipment.type === 'beaker' ? 10 : 12,
            top: 'auto',
            height: fillHeight,
            backgroundColor: bgColor,
            transition: 'height 0.3s ease, background-color 0.5s ease'
          }}
        />
        {state.particles.map(particle => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: particle.x,
              top: particle.y,
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}ms`
            }}
          />
        ))}
        {state.isReacting && (
          <>
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${state.reactionProgress}%` }}
              />
            </div>
            <div className="temperature-display">
              {state.temperature}°C
            </div>
          </>
        )}
        {state.showTooltip && state.reactionResult && (
          <div className="reaction-tooltip">
            <div className="equation">{state.reactionResult.equation}</div>
            <div className="description">{state.reactionResult.description}</div>
          </div>
        )}
      </>
    );
  };

  return (
    <div ref={tableRef} className="experiment-table">
      {equipments.map(equipment => (
        <div
          key={equipment.id}
          className={`equipment ${draggingId === equipment.id ? 'dragging' : ''}`}
          style={{
            left: equipment.position.x,
            top: equipment.position.y,
            width: EQUIPMENT_SIZES[equipment.type].width,
            height: EQUIPMENT_SIZES[equipment.type].height
          }}
          onMouseDown={(e) => handleMouseDown(e, equipment)}
          onClick={(e) => {
            e.stopPropagation();
            if (!draggingId) onEquipmentClick(equipment.id);
          }}
        >
          {renderEquipmentSVG(equipment.type)}
          {renderContainerState(equipment)}
        </div>
      ))}
    </div>
  );
};

export default ExperimentTable;

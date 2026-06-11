import React, { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Forge from './Forge';
import Altar from './Altar';
import { MiniSpirit, SpiritDetailModal } from './Spirit';
import {
  ElementType,
  ELEMENT_CYCLE,
  ELEMENT_INFO,
  ELEMENT_NAMES,
  AltarSlot,
  LiquidEssence,
  Spirit,
  SpiritParticle,
  SummonRecord,
} from './types';

interface GameState {
  inventory: ElementType[];
  smeltingElement: ElementType | null;
  smeltingProgress: number;
  liquidEssences: LiquidEssence[];
  altarSlots: AltarSlot[];
  activeSpirit: Spirit | null;
  summonHistory: SummonRecord[];
  consecutiveSuccesses: number;
  perfectResonance: boolean;
  perfectResonanceEnd: number | null;
}

type GameAction =
  | { type: 'START_SMELTING'; element: ElementType }
  | { type: 'SMELTING_TICK' }
  | { type: 'SMELTING_COMPLETE' }
  | { type: 'POUR_ESSENCE'; slotPosition: number; essence: LiquidEssence }
  | { type: 'ALL_ACTIVATED' }
  | { type: 'RESET_ALTAR' }
  | { type: 'END_PERFECT_RESONANCE' }
  | { type: 'CLEAR_SPIRIT' };

const INITIAL_INVENTORY: ElementType[] = [
  'fire', 'water', 'wind', 'earth', 'light',
  'fire', 'water', 'wind', 'earth', 'light',
];

const createAltarSlots = (): AltarSlot[] =>
  ELEMENT_CYCLE.map((el, i) => ({
    position: i,
    expectedElement: el,
    currentElement: null,
    activated: false,
  }));

const generateSpiritName = (elements: ElementType[]): string => {
  const unique = [...new Set(elements)];
  const nameParts = unique.map(el => ELEMENT_NAMES[el]);
  return nameParts.join('') + '灵';
};

const generateSpiritParticles = (colors: string[]): SpiritParticle[] => {
  const count = 12 + Math.floor(Math.random() * 9);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * 360 + Math.random() * 30,
    orbitRadiusX: 40 + Math.random() * 20,
    orbitRadiusY: 15 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    speed: 0.5 + Math.random() * 1,
    size: 2 + Math.random() * 3,
  }));
};

const createSpirit = (elements: ElementType[]): Spirit => {
  const colors = elements.map(el => ELEMENT_INFO[el].color);
  const radius = 25 + Math.random() * 15;
  return {
    id: uuidv4(),
    elements,
    name: generateSpiritName(elements),
    colors,
    radius,
    particles: generateSpiritParticles(colors),
    createdAt: Date.now(),
  };
};

const initialState: GameState = {
  inventory: [...INITIAL_INVENTORY],
  smeltingElement: null,
  smeltingProgress: 0,
  liquidEssences: [],
  altarSlots: createAltarSlots(),
  activeSpirit: null,
  summonHistory: [],
  consecutiveSuccesses: 0,
  perfectResonance: false,
  perfectResonanceEnd: null,
};

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_SMELTING': {
      const idx = state.inventory.indexOf(action.element);
      if (idx === -1 || state.smeltingElement !== null) return state;
      const newInventory = [...state.inventory];
      newInventory.splice(idx, 1);
      return {
        ...state,
        inventory: newInventory,
        smeltingElement: action.element,
        smeltingProgress: 0,
      };
    }
    case 'SMELTING_TICK': {
      if (!state.smeltingElement) return state;
      const newProgress = Math.min(100, state.smeltingProgress + 3.33);
      return {
        ...state,
        smeltingProgress: newProgress,
      };
    }
    case 'SMELTING_COMPLETE': {
      if (!state.smeltingElement) return state;
      return {
        ...state,
        smeltingElement: null,
        smeltingProgress: 0,
        liquidEssences: [
          ...state.liquidEssences,
          {
            id: uuidv4(),
            element: state.smeltingElement,
            color: ELEMENT_INFO[state.smeltingElement].color,
          },
        ],
      };
    }
    case 'POUR_ESSENCE': {
      const slot = state.altarSlots[action.slotPosition];
      if (!slot || slot.activated) return state;

      const isCorrect = slot.expectedElement === action.essence.element;
      const newSlots = state.altarSlots.map((s, i) =>
        i === action.slotPosition
          ? { ...s, currentElement: action.essence.element, activated: isCorrect }
          : s
      );

      const newEssences = state.liquidEssences.filter(e => e.id !== action.essence.id);

      return {
        ...state,
        altarSlots: newSlots,
        liquidEssences: newEssences,
      };
    }
    case 'ALL_ACTIVATED': {
      const spirit = createSpirit(ELEMENT_CYCLE);
      const time = new Date();
      const timeStr = time.toTimeString().slice(0, 8);
      const newSuccesses = state.consecutiveSuccesses + 1;
      const isPerfect = newSuccesses >= 3;

      const record: SummonRecord = {
        id: uuidv4(),
        spirit,
        time: timeStr,
      };

      const newHistory = [record, ...state.summonHistory].slice(0, 10);

      return {
        ...state,
        activeSpirit: spirit,
        summonHistory: newHistory,
        consecutiveSuccesses: newSuccesses,
        perfectResonance: isPerfect ? true : state.perfectResonance,
        perfectResonanceEnd: isPerfect ? Date.now() + 10000 : state.perfectResonanceEnd,
      };
    }
    case 'RESET_ALTAR': {
      return {
        ...state,
        altarSlots: createAltarSlots(),
        activeSpirit: null,
        inventory: state.inventory.length < 5
          ? [...state.inventory, ...INITIAL_INVENTORY]
          : state.inventory,
      };
    }
    case 'END_PERFECT_RESONANCE': {
      return {
        ...state,
        perfectResonance: false,
        perfectResonanceEnd: null,
        consecutiveSuccesses: 0,
      };
    }
    case 'CLEAR_SPIRIT': {
      return {
        ...state,
        activeSpirit: null,
      };
    }
    default:
      return state;
  }
}

const CycleDiagram: React.FC<{ slots: AltarSlot[] }> = ({ slots }) => {
  const cx = 80;
  const cy = 80;
  const r = 50;
  const angles = ELEMENT_CYCLE.map((_, i) => (i * 72 - 90) * (Math.PI / 180));
  const points = angles.map(a => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }));

  return (
    <svg width="160" height="160" viewBox="0 0 160 160">
      {points.map((p, i) => {
        const nextIdx = (i + 1) % 5;
        const bothActivated = slots[i].activated && slots[nextIdx].activated;
        const anyActivated = slots[i].activated || slots[nextIdx].activated;
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={points[nextIdx].x}
            y2={points[nextIdx].y}
            stroke={bothActivated ? '#ffcc44' : anyActivated ? '#665544' : '#332222'}
            strokeWidth={bothActivated ? 2 : 1}
          />
        );
      })}
      {ELEMENT_CYCLE.map((el, i) => {
        const info = ELEMENT_INFO[el];
        const p = points[i];
        const activated = slots[i].activated;
        return (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={12}
              fill={activated ? `${info.color}44` : '#1a1a1a'}
              stroke={activated ? info.color : '#444'}
              strokeWidth={activated ? 2 : 1}
            />
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={activated ? info.glowColor : '#665544'}
              fontSize="9"
              fontFamily="'MedievalSharp', cursive"
            >
              {info.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [detailSpirit, setDetailSpirit] = useState<Spirit | null>(null);
  const smeltTimerRef = useRef<number | null>(null);
  const completeTimerRef = useRef<number | null>(null);
  const perfectTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.smeltingElement && state.smeltingProgress < 100) {
      smeltTimerRef.current = window.setInterval(() => {
        dispatch({ type: 'SMELTING_TICK' });
      }, 100);
      return () => {
        if (smeltTimerRef.current) clearInterval(smeltTimerRef.current);
      };
    } else if (state.smeltingElement && state.smeltingProgress >= 100) {
      if (smeltTimerRef.current) clearInterval(smeltTimerRef.current);
      completeTimerRef.current = window.setTimeout(() => {
        dispatch({ type: 'SMELTING_COMPLETE' });
      }, 300);
      return () => {
        if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
      };
    }
  }, [state.smeltingElement, state.smeltingProgress]);

  useEffect(() => {
    if (state.perfectResonance && state.perfectResonanceEnd) {
      const remaining = state.perfectResonanceEnd - Date.now();
      if (remaining > 0) {
        perfectTimerRef.current = window.setTimeout(() => {
          dispatch({ type: 'END_PERFECT_RESONANCE' });
        }, remaining);
        return () => {
          if (perfectTimerRef.current) clearTimeout(perfectTimerRef.current);
        };
      } else {
        dispatch({ type: 'END_PERFECT_RESONANCE' });
      }
    }
  }, [state.perfectResonance, state.perfectResonanceEnd]);

  const handleStartSmelting = useCallback(
    (element: ElementType) => {
      dispatch({ type: 'START_SMELTING', element });
    },
    []
  );

  const handleSmeltComplete = useCallback(
    (essence: LiquidEssence) => {
      const nextSlot = state.altarSlots.findIndex(s => !s.activated);
      if (nextSlot !== -1) {
        dispatch({ type: 'POUR_ESSENCE', slotPosition: nextSlot, essence });
      }
    },
    [state.altarSlots]
  );

  const handlePourEssence = useCallback(
    (slotPosition: number, essence: LiquidEssence) => {
      dispatch({ type: 'POUR_ESSENCE', slotPosition, essence });
    },
    []
  );

  const handleAllActivated = useCallback(() => {
    dispatch({ type: 'ALL_ACTIVATED' });
    setTimeout(() => {
      dispatch({ type: 'RESET_ALTAR' });
    }, 5000);
  }, []);

  const handleSpiritClick = useCallback(() => {}, []);

  const fireColor = state.smeltingElement
    ? ELEMENT_INFO[state.smeltingElement].glowColor
    : '#ff6a33';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #1a1a1a 0%, #3a1a0a 100%)',
        color: '#ccc',
        fontFamily: "'MedievalSharp', cursive",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
        position: 'relative',
        ...(state.perfectResonance
          ? {
              boxShadow: 'inset 0 0 100px rgba(255,200,50,0.3), inset 0 0 200px rgba(255,150,50,0.15)',
            }
          : {}),
      }}
    >
      {state.perfectResonance && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 0 80px rgba(255,200,50,0.25), inset 0 0 150px rgba(255,150,50,0.1)',
            pointerEvents: 'none',
            zIndex: 100,
            animation: 'perfectGlow 1s ease-in-out infinite alternate',
          }}
        />
      )}

      <h1
        style={{
          color: '#ffddaa',
          textShadow: '0 0 20px rgba(255,106,51,0.5)',
          fontSize: 28,
          marginBottom: 16,
          letterSpacing: 4,
        }}
      >
        ⚗ 魔法熔炼与元素祭坛 🔮
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 32,
          alignItems: 'flex-start',
          justifyContent: 'center',
          maxWidth: 1200,
          width: '100%',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
            minWidth: 180,
          }}
        >
          <div
            style={{
              color: '#998877',
              fontSize: 14,
              textAlign: 'center',
              textShadow: '0 0 5px rgba(100,150,255,0.3)',
            }}
          >
            元素循环
          </div>
          <CycleDiagram slots={state.altarSlots} />
          <div style={{ color: '#776655', fontSize: 12, textAlign: 'center' }}>
            {state.consecutiveSuccesses > 0 && (
              <div>
                连续成功: <span style={{ color: '#ffcc44' }}>{state.consecutiveSuccesses}</span>
              </div>
            )}
            {state.perfectResonance && (
              <div style={{ color: '#ffcc44', fontSize: 14, animation: 'perfectText 0.5s ease-in-out infinite alternate' }}>
                ✦ 完美共鸣 ✦
              </div>
            )}
          </div>
          {state.inventory.length > 0 && (
            <div style={{ color: '#665544', fontSize: 11 }}>
              剩余晶石: {state.inventory.length}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Forge
            inventory={state.inventory}
            onSmeltComplete={handleSmeltComplete}
            smeltingElement={state.smeltingElement}
            smeltingProgress={state.smeltingProgress}
            onStartSmelting={handleStartSmelting}
            fireColor={fireColor}
          />

          <Altar
            slots={state.altarSlots}
            onPourEssence={handlePourEssence}
            onAllActivated={handleAllActivated}
            activeSpirit={state.activeSpirit}
            perfectResonance={state.perfectResonance}
            onSpiritClick={handleSpiritClick}
          />
        </div>

        <div
          style={{
            width: 200,
            background: 'rgba(30,25,20,0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: 10,
            border: '1px solid rgba(100,80,60,0.4)',
            padding: 12,
            maxHeight: 500,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              color: '#ffddaa',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 10,
              textShadow: '0 0 8px rgba(255,200,100,0.3)',
            }}
          >
            📜 召唤记录
          </div>
          {state.summonHistory.length === 0 && (
            <div style={{ color: '#554433', fontSize: 12, textAlign: 'center' }}>
              尚无召唤记录
            </div>
          )}
          {state.summonHistory.map(record => (
            <div
              key={record.id}
              onClick={() => setDetailSpirit(record.spirit)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 4px',
                borderBottom: '1px solid rgba(80,60,40,0.3)',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <MiniSpirit spirit={record.spirit} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: record.spirit.colors[0] || '#aaa',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {record.spirit.name}
                </div>
                <div style={{ fontSize: 10, color: '#665544' }}>{record.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailSpirit && (
        <SpiritDetailModal spirit={detailSpirit} onClose={() => setDetailSpirit(null)} />
      )}

      <style>{`
        @keyframes fireFloat {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-30px) scale(0.3); opacity: 0; }
        }
        @keyframes splashOut {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.2); opacity: 0; }
        }
        @keyframes liquidRise {
          0% { transform: translateY(40px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes liquidPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.05); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes slotGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
        @keyframes magicCircleRotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spiritFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes orbitParticle {
          0% { transform: rotate(0deg) translateX(var(--orbit-x, 50px)) translateY(var(--orbit-y, 20px)); }
          100% { transform: rotate(360deg) translateX(var(--orbit-x, 50px)) translateY(var(--orbit-y, 20px)); }
        }
        @keyframes perfectGlow {
          0% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        @keyframes perfectText {
          0% { textShadow: 0 0 5px rgba(255,200,50,0.5); }
          100% { textShadow: 0 0 20px rgba(255,200,50,0.9); }
        }

        @media (max-width: 1200px) {
          body { font-size: 14px; }
        }

        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(30,25,20,0.5);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(100,80,60,0.5);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default App;

import React, { useCallback, useRef, useEffect } from 'react';
import ExperimentTable, { type Equipment, type EquipmentStates, type Particle, type EquipmentType } from './components/ExperimentTable';
import ReagentPanel from './components/ReagentPanel';
import ReactionLog, { type LogEntry, type LogType } from './components/ReactionLog';
import { REAGENTS, findReaction, type ReagentId, type ReactionResult } from './data/reactions';
import { createInitialDragState, type Position, type DragState } from './utils/dragState';

type AppAction =
  | { type: 'ADD_EQUIPMENT'; payload: Equipment }
  | { type: 'MOVE_EQUIPMENT'; payload: { id: string; position: Position } }
  | { type: 'START_DRAG'; payload: { id: string; offset: Position } }
  | { type: 'END_DRAG' }
  | { type: 'SELECT_REAGENT'; payload: ReagentId | null }
  | { type: 'ADD_REAGENT'; payload: { equipmentId: string; reagentId: ReagentId } }
  | { type: 'START_REACTION'; payload: { equipmentId: string; result: ReactionResult } }
  | { type: 'UPDATE_REACTION_PROGRESS'; payload: { equipmentId: string; progress: number; temperature: number } }
  | { type: 'ADD_PARTICLE'; payload: { equipmentId: string; particle: Particle } }
  | { type: 'REMOVE_PARTICLES'; payload: { equipmentId: string } }
  | { type: 'COMPLETE_REACTION'; payload: { equipmentId: string } }
  | { type: 'HIDE_TOOLTIP'; payload: { equipmentId: string } }
  | { type: 'ADD_LOG'; payload: LogEntry };

interface AppState {
  equipments: Equipment[];
  equipmentStates: EquipmentStates;
  dragState: DragState;
  selectedReagent: ReagentId | null;
  logs: LogEntry[];
}

const initialState: AppState = {
  equipments: [],
  equipmentStates: {},
  dragState: createInitialDragState(),
  selectedReagent: null,
  logs: []
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_EQUIPMENT': {
      const eq = action.payload;
      return {
        ...state,
        equipments: [...state.equipments, eq],
        equipmentStates: eq.isContainer
          ? {
              ...state.equipmentStates,
              [eq.id]: {
                reagents: [],
                temperature: 25,
                reactionProgress: 0,
                isReacting: false,
                particles: [],
                showTooltip: false
              }
            }
          : state.equipmentStates
      };
    }
    case 'MOVE_EQUIPMENT': {
      return {
        ...state,
        equipments: state.equipments.map(eq =>
          eq.id === action.payload.id ? { ...eq, position: action.payload.position } : eq
        )
      };
    }
    case 'START_DRAG': {
      return {
        ...state,
        dragState: {
          isDragging: true,
          draggedId: action.payload.id,
          offset: action.payload.offset
        }
      };
    }
    case 'END_DRAG': {
      return {
        ...state,
        dragState: createInitialDragState()
      };
    }
    case 'SELECT_REAGENT': {
      return {
        ...state,
        selectedReagent: action.payload
      };
    }
    case 'ADD_REAGENT': {
      const { equipmentId, reagentId } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            reagents: [...current.reagents, reagentId]
          }
        }
      };
    }
    case 'START_REACTION': {
      const { equipmentId, result } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            isReacting: true,
            reactionProgress: 0,
            temperature: 25,
            colorChange: result.colorChange || current.colorChange,
            reactionResult: {
              equation: result.equation,
              description: result.description
            },
            showTooltip: false,
            particles: []
          }
        }
      };
    }
    case 'UPDATE_REACTION_PROGRESS': {
      const { equipmentId, progress, temperature } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            reactionProgress: progress,
            temperature
          }
        }
      };
    }
    case 'ADD_PARTICLE': {
      const { equipmentId, particle } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            particles: [...current.particles, particle]
          }
        }
      };
    }
    case 'REMOVE_PARTICLES': {
      const { equipmentId } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            particles: []
          }
        }
      };
    }
    case 'COMPLETE_REACTION': {
      const { equipmentId } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            isReacting: false,
            reactionProgress: 100,
            showTooltip: true,
            particles: []
          }
        }
      };
    }
    case 'HIDE_TOOLTIP': {
      const { equipmentId } = action.payload;
      const current = state.equipmentStates[equipmentId];
      if (!current) return state;
      return {
        ...state,
        equipmentStates: {
          ...state.equipmentStates,
          [equipmentId]: {
            ...current,
            showTooltip: false
          }
        }
      };
    }
    case 'ADD_LOG': {
      return {
        ...state,
        logs: [action.payload, ...state.logs]
      };
    }
    default:
      return state;
  }
}

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const getTimestamp = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
};

const getEquipmentTypeName = (type: EquipmentType): string => {
  switch (type) {
    case 'beaker': return '烧杯';
    case 'test-tube': return '试管';
    case 'alcohol-lamp': return '酒精灯';
    case 'dropper': return '滴管';
  }
};

const PALETTE_EQUIPMENTS: { type: EquipmentType; label: string; isContainer: boolean }[] = [
  { type: 'beaker', label: '烧杯', isContainer: true },
  { type: 'test-tube', label: '试管', isContainer: true },
  { type: 'alcohol-lamp', label: '酒精灯', isContainer: false },
  { type: 'dropper', label: '滴管', isContainer: false }
];

const App: React.FC = () => {
  const [state, dispatch] = React.useReducer(appReducer, initialState);
  const reactionTimersRef = useRef<Record<string, { progress: number | null; particles: number | null; tooltip: number | null }>>({});

  const addEquipment = useCallback((type: EquipmentType, isContainer: boolean) => {
    const equipment: Equipment = {
      id: generateId(),
      type,
      position: { x: 100 + state.equipments.length * 40, y: 100 + state.equipments.length * 30 },
      isContainer
    };
    dispatch({ type: 'ADD_EQUIPMENT', payload: equipment });
  }, [state.equipments.length]);

  const handleEquipmentMove = useCallback((id: string, position: Position) => {
    dispatch({ type: 'MOVE_EQUIPMENT', payload: { id, position } });
  }, []);

  const handleDragStart = useCallback((id: string, offset: Position) => {
    dispatch({ type: 'START_DRAG', payload: { id, offset } });
  }, []);

  const handleDragEnd = useCallback(() => {
    dispatch({ type: 'END_DRAG' });
  }, []);

  const handleSelectReagent = useCallback((id: ReagentId | null) => {
    dispatch({ type: 'SELECT_REAGENT', payload: id });
  }, []);

  const cleanupReactionTimers = useCallback((equipmentId: string) => {
    const timers = reactionTimersRef.current[equipmentId];
    if (timers) {
      if (timers.progress !== null) window.clearInterval(timers.progress);
      if (timers.particles !== null) window.clearInterval(timers.particles);
      if (timers.tooltip !== null) window.clearTimeout(timers.tooltip);
      delete reactionTimersRef.current[equipmentId];
    }
  }, []);

  const addLogEntry = useCallback((type: LogType, data: Partial<LogEntry> = {}, success: boolean = true) => {
    const entry: LogEntry = {
      id: generateId(),
      timestamp: getTimestamp(),
      type,
      success,
      ...data
    };
    dispatch({ type: 'ADD_LOG', payload: entry });
  }, []);

  const handleEquipmentClick = useCallback((equipmentId: string) => {
    if (!state.selectedReagent) return;

    const equipment = state.equipments.find(e => e.id === equipmentId);
    if (!equipment || !equipment.isContainer) return;

    const containerState = state.equipmentStates[equipmentId];
    if (!containerState) return;
    if (containerState.isReacting) return;

    const reagentId = state.selectedReagent;
    const reagent = REAGENTS.find(r => r.id === reagentId);

    dispatch({ type: 'ADD_REAGENT', payload: { equipmentId, reagentId } });

    addLogEntry('add-reagent', {
      equipmentType: getEquipmentTypeName(equipment.type),
      reagentName: reagent?.name
    });

    const newReagents = [...containerState.reagents, reagentId];
    if (newReagents.length >= 2) {
      const lastTwo = newReagents.slice(-2);
      const reactionResult = findReaction(lastTwo[0], lastTwo[1]);

      if (reactionResult) {
        dispatch({ type: 'START_REACTION', payload: { equipmentId, result: reactionResult } });

        addLogEntry('reaction-start', {
          reactionEquation: reactionResult.equation
        });

        cleanupReactionTimers(equipmentId);
        reactionTimersRef.current[equipmentId] = { progress: null, particles: null, tooltip: null };

        const startTime = Date.now();
        const duration = 2000;
        const startTemp = 25;
        const endTemp = 25 + reactionResult.temperatureChange;

        reactionTimersRef.current[equipmentId].progress = window.setInterval(() => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min((elapsed / duration) * 100, 100);
          const temperature = Math.round(startTemp + (endTemp - startTemp) * (progress / 100));

          dispatch({
            type: 'UPDATE_REACTION_PROGRESS',
            payload: { equipmentId, progress, temperature }
          });

          if (progress >= 100) {
            if (reactionTimersRef.current[equipmentId]?.progress !== null) {
              window.clearInterval(reactionTimersRef.current[equipmentId].progress!);
              reactionTimersRef.current[equipmentId].progress = null;
            }
            dispatch({ type: 'COMPLETE_REACTION', payload: { equipmentId } });
            dispatch({ type: 'REMOVE_PARTICLES', payload: { equipmentId } });
            addLogEntry('reaction-complete', {
              reactionDescription: reactionResult.description
            });

            reactionTimersRef.current[equipmentId].tooltip = window.setTimeout(() => {
              dispatch({ type: 'HIDE_TOOLTIP', payload: { equipmentId } });
              cleanupReactionTimers(equipmentId);
            }, 4000);
          }
        }, 50);

        if (reactionResult.particleConfig) {
          const cfg = reactionResult.particleConfig;
          reactionTimersRef.current[equipmentId].particles = window.setInterval(() => {
            for (let i = 0; i < Math.ceil(cfg.rate / 10); i++) {
              const particle: Particle = {
                id: generateId(),
                x: 20 + Math.random() * 40,
                y: 20 + Math.random() * 30,
                size: cfg.minSize + Math.random() * (cfg.maxSize - cfg.minSize),
                opacity: cfg.opacity,
                color: cfg.color || 'rgba(255, 255, 255, 0.7)',
                duration: 800 + Math.random() * 600
              };
              dispatch({ type: 'ADD_PARTICLE', payload: { equipmentId, particle } });

              window.setTimeout(() => {
                const current = state.equipmentStates[equipmentId];
                if (current) {
                  const updated = current.particles.filter(p => p.id !== particle.id);
                  if (updated.length !== current.particles.length) {
                    dispatch({ type: 'REMOVE_PARTICLES', payload: { equipmentId } });
                    updated.forEach(p => {
                      dispatch({ type: 'ADD_PARTICLE', payload: { equipmentId, particle: p } });
                    });
                  }
                }
              }, particle.duration);
            }
          }, 100);

          window.setTimeout(() => {
            if (reactionTimersRef.current[equipmentId]?.particles !== null) {
              window.clearInterval(reactionTimersRef.current[equipmentId].particles!);
              reactionTimersRef.current[equipmentId].particles = null;
            }
          }, cfg.duration);
        }
      } else {
        addLogEntry('reaction-fail', {}, false);
      }
    }
  }, [state.selectedReagent, state.equipments, state.equipmentStates, addLogEntry, cleanupReactionTimers]);

  useEffect(() => {
    return () => {
      Object.keys(reactionTimersRef.current).forEach(id => cleanupReactionTimers(id));
    };
  }, [cleanupReactionTimers]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🧪 虚拟化学实验箱</h1>
        <p>拖拽器材到实验台，选择试剂进行化学实验</p>
      </header>

      <div className="main-layout">
        <div className="experiment-table-wrapper">
          <div className="equipment-palette">
            {PALETTE_EQUIPMENTS.map(item => (
              <div
                key={item.type}
                className="equipment-palette-item"
                onClick={() => addEquipment(item.type, item.isContainer)}
              >
                <span style={{ fontSize: 20 }}>
                  {item.type === 'beaker' && '🥛'}
                  {item.type === 'test-tube' && '🧪'}
                  {item.type === 'alcohol-lamp' && '🔥'}
                  {item.type === 'dropper' && '💧'}
                </span>
                <span className="equipment-palette-label">{item.label}</span>
              </div>
            ))}
          </div>

          <ExperimentTable
            equipments={state.equipments}
            equipmentStates={state.equipmentStates}
            draggingId={state.dragState.draggedId}
            onEquipmentMove={handleEquipmentMove}
            onEquipmentClick={handleEquipmentClick}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        </div>

        <ReagentPanel
          selectedReagent={state.selectedReagent}
          onSelectReagent={handleSelectReagent}
        />
      </div>

      <ReactionLog logs={state.logs} />
    </div>
  );
};

export default App;

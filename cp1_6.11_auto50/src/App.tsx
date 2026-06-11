import React, { useReducer, useEffect, useRef, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { FaSun, FaMoon, FaCat, FaDog } from 'react-icons/fa';
import {
  PetState,
  Action,
  PetType,
  InteractionType,
  ThemeType,
  StateKey,
  NegativeState,
  LogEntry,
  StateValues,
  INTERACTION_NAME,
  NEGATIVE_STATE_MAP,
} from './types';
import {
  createInitialStates,
  createInitialLastDecay,
  decayStates,
  handleInteraction,
  checkNegativeStates,
  getStateFromNegative,
} from './pet';
import PetDisplay from './components/PetDisplay';
import StatusPanel from './components/StatusPanel';
import LogPanel from './components/LogPanel';
import InteractionButtons from './components/InteractionButtons';

const initialState: PetState = {
  petType: null,
  states: createInitialStates(),
  negativeStates: new Set<NegativeState>(),
  logs: [],
  theme: ThemeType.WARM,
  currentInteraction: null,
  recoveryStates: new Set<StateKey>(),
};

function reducer(state: PetState, action: Action): PetState {
  switch (action.type) {
    case 'SET_PET_TYPE':
      return { ...state, petType: action.payload };

    case 'UPDATE_STATES':
      return {
        ...state,
        states: { ...state.states, ...action.payload },
      };

    case 'ADD_LOG': {
      const newLog: LogEntry = {
        id: uuidv4(),
        timestamp: new Date(),
        message: action.payload.message,
        valueChanges: action.payload.changes,
      };
      const newLogs = [newLog, ...state.logs].slice(0, 20);
      return { ...state, logs: newLogs };
    }

    case 'START_INTERACTION':
      return { ...state, currentInteraction: action.payload };

    case 'END_INTERACTION':
      return { ...state, currentInteraction: null };

    case 'TOGGLE_THEME':
      return {
        ...state,
        theme: state.theme === ThemeType.WARM ? ThemeType.SCIFI : ThemeType.WARM,
      };

    case 'SET_NEGATIVE_STATES':
      return { ...state, negativeStates: new Set(action.payload) };

    case 'START_RECOVERY': {
      const newRecoveryStates = new Set(state.recoveryStates);
      newRecoveryStates.add(action.payload);
      return {
        ...state,
        recoveryStates: newRecoveryStates,
        states: {
          ...state.states,
          [action.payload]: 100,
        },
      };
    }

    case 'END_RECOVERY': {
      const newRecoveryStates = new Set(state.recoveryStates);
      newRecoveryStates.delete(action.payload);
      return { ...state, recoveryStates: newRecoveryStates };
    }

    default:
      return state;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [selectedPet, setSelectedPet] = useState<PetType | null>(null);
  const [showAdoption, setShowAdoption] = useState(true);

  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const lastDecayRef = useRef<Record<StateKey, number>>(createInitialLastDecay());
  const negativeStartTimesRef = useRef<Map<NegativeState, number>>(new Map());
  const statesRef = useRef<StateValues>(state.states);
  const recoveryRef = useRef<Set<StateKey>>(state.recoveryStates);

  useEffect(() => {
    statesRef.current = state.states;
  }, [state.states]);

  useEffect(() => {
    recoveryRef.current = state.recoveryStates;
  }, [state.recoveryStates]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  const addLog = useCallback((message: string, changes: Partial<StateValues>) => {
    dispatch({ type: 'ADD_LOG', payload: { message, changes } });
  }, []);

  useEffect(() => {
    if (showAdoption || state.petType === null) return;

    const gameLoop = (timestamp: number) => {
      if (document.hidden) {
        lastTimeRef.current = timestamp;
        animationFrameRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const { newStates, newLastDecay, decayedKeys } = decayStates(
        statesRef.current,
        elapsed,
        lastDecayRef.current,
        recoveryRef.current
      );

      lastDecayRef.current = newLastDecay;

      if (decayedKeys.length > 0) {
        const statesToUpdate: Partial<StateValues> = {};
        decayedKeys.forEach(key => {
          statesToUpdate[key] = newStates[key];
        });
        dispatch({ type: 'UPDATE_STATES', payload: statesToUpdate });

        decayedKeys.forEach(key => {
          const changes: Partial<StateValues> = { [key]: -1 };
          dispatch({ type: 'ADD_LOG', payload: { message: '状态自然衰减', changes } });
        });
      }

      const newNegativeStates = checkNegativeStates(newStates);

      newNegativeStates.forEach(ns => {
        if (!negativeStartTimesRef.current.has(ns)) {
          negativeStartTimesRef.current.set(ns, timestamp);
          const stateKey = getStateFromNegative(ns);
          if (!recoveryRef.current.has(stateKey)) {
            const changes: Partial<StateValues> = { [stateKey]: 0 };
            dispatch({ type: 'ADD_LOG', payload: { message: `宠物${NEGATIVE_STATE_MAP[stateKey] === ns ? '处于负面状态' : '出现问题'}`, changes } });
          }
        }
      });

      negativeStartTimesRef.current.forEach((startTime, ns) => {
        if (!newNegativeStates.has(ns)) {
          negativeStartTimesRef.current.delete(ns);
        } else if (timestamp - startTime >= 10000) {
          const stateKey = getStateFromNegative(ns);
          if (!recoveryRef.current.has(stateKey)) {
            dispatch({ type: 'START_RECOVERY', payload: stateKey });
            negativeStartTimesRef.current.delete(ns);

            const changes: Partial<StateValues> = { [stateKey]: 100 };
            dispatch({ type: 'ADD_LOG', payload: { message: '状态自动恢复', changes } });

            setTimeout(() => {
              dispatch({ type: 'END_RECOVERY', payload: stateKey });
            }, 1500);
          }
        }
      });

      dispatch({ type: 'SET_NEGATIVE_STATES', payload: newNegativeStates });

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [showAdoption, state.petType]);

  const handleAdopt = useCallback(() => {
    if (selectedPet) {
      dispatch({ type: 'SET_PET_TYPE', payload: selectedPet });
      setShowAdoption(false);
      addLog(`领养了一只${selectedPet === PetType.CAT ? '猫' : '狗'}`, {});
    }
  }, [selectedPet, addLog]);

  const handleInteraction = useCallback((type: InteractionType) => {
    if (state.currentInteraction !== null) return;

    dispatch({ type: 'START_INTERACTION', payload: type });

    const { newStates, changes } = handleInteraction(statesRef.current, type);
    dispatch({ type: 'UPDATE_STATES', payload: newStates });
    addLog(`进行了${INTERACTION_NAME[type]}互动`, changes);
  }, [state.currentInteraction, addLog]);

  const handleInteractionComplete = useCallback(() => {
    dispatch({ type: 'END_INTERACTION' });
  }, []);

  const handleToggleTheme = useCallback(() => {
    dispatch({ type: 'TOGGLE_THEME' });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🐾 虚拟宠物养成</h1>
        <button className="theme-toggle" onClick={handleToggleTheme}>
          {state.theme === ThemeType.WARM ? <FaMoon /> : <FaSun />}
          <span>{state.theme === ThemeType.WARM ? '科幻模式' : '温馨模式'}</span>
        </button>
      </header>

      <main className="main-content">
        <StatusPanel states={state.states} recoveryStates={state.recoveryStates} />

        <div className="panel pet-area">
          {state.petType && (
            <>
              <PetDisplay
                petType={state.petType}
                currentInteraction={state.currentInteraction}
                negativeStates={state.negativeStates}
                theme={state.theme}
                energy={state.states.energy}
                onInteractionComplete={handleInteractionComplete}
              />
              <InteractionButtons
                onInteraction={handleInteraction}
                disabled={state.currentInteraction !== null}
              />
            </>
          )}
        </div>

        <LogPanel logs={state.logs} />
      </main>

      {showAdoption && (
        <div className="adoption-overlay">
          <div className="adoption-modal">
            <h2 className="adoption-title">选择你的宠物</h2>
            <div className="pet-options">
              <button
                className={`pet-option ${selectedPet === PetType.CAT ? 'selected' : ''}`}
                onClick={() => setSelectedPet(PetType.CAT)}
              >
                <div className="pet-option-icon"><FaCat style={{ fontSize: '64px', color: 'var(--accent-color)' }} /></div>
                <div className="pet-option-name">猫咪</div>
              </button>
              <button
                className={`pet-option ${selectedPet === PetType.DOG ? 'selected' : ''}`}
                onClick={() => setSelectedPet(PetType.DOG)}
              >
                <div className="pet-option-icon"><FaDog style={{ fontSize: '64px', color: 'var(--accent-color)' }} /></div>
                <div className="pet-option-name">狗狗</div>
              </button>
            </div>
            <button
              className="confirm-btn"
              onClick={handleAdopt}
              disabled={selectedPet === null}
            >
              确认领养
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

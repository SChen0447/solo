import { useEffect, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AppState, AppAction, Batch, DrawRecord } from './types';
import { createBatch, performDraw, getUserDrawCount, redeemPrizeByCode } from './utils/lottery';
import BatchManager from './components/BatchManager';
import GachaMachine from './components/GachaMachine';
import './styles/App.css';

const STORAGE_KEY = 'blind-box-lottery-state';

function getInitialUserId(): string {
  let uid = localStorage.getItem('blind-box-user-id');
  if (!uid) {
    uid = uuidv4();
    localStorage.setItem('blind-box-user-id', uid);
  }
  return uid;
}

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        currentUserId: getInitialUserId()
      };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return {
    batches: [],
    drawRecords: [],
    currentTab: 'user',
    currentUserId: getInitialUserId(),
    selectedBatchId: null
  };
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, currentTab: action.payload };
    case 'ADD_BATCH':
      return { ...state, batches: [action.payload, ...state.batches] };
    case 'UPDATE_BATCH': {
      const batches = state.batches.map((b) =>
        b.id === action.payload.id ? action.payload : b
      );
      return { ...state, batches };
    }
    case 'SET_SELECTED_BATCH':
      return { ...state, selectedBatchId: action.payload };
    case 'ADD_DRAW_RECORD':
      return { ...state, drawRecords: [action.payload, ...state.drawRecords] };
    case 'UPDATE_DRAW_RECORD': {
      const drawRecords = state.drawRecords.map((r) =>
        r.id === action.payload.id ? action.payload : r
      );
      return { ...state, drawRecords };
    }
    case 'SET_STATE':
      return action.payload;
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    const { currentUserId, ...persistState } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistState));
  }, [state]);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          dispatch({
            type: 'SET_STATE',
            payload: { ...parsed, currentUserId: getInitialUserId() }
          });
        } catch (err) {
          console.error('Failed to sync state', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleCreateBatch = (params: {
    name: string;
    totalQuantity: number;
    prizes: Array<{ name: string; rarity: 'hidden' | 'normal' | 'participation'; ratio: number; isPhysical: boolean }>;
    startTime: number;
    maxDrawsPerUser: number;
  }) => {
    const batch = createBatch(
      params.name,
      params.totalQuantity,
      params.prizes,
      params.startTime,
      params.maxDrawsPerUser
    );
    dispatch({ type: 'ADD_BATCH', payload: batch });
  };

  const handleDraw = (batch: Batch): DrawRecord | null => {
    const userDrawCount = getUserDrawCount(
      state.drawRecords,
      batch.id,
      state.currentUserId
    );
    const result = performDraw(batch, state.currentUserId, userDrawCount);
    if (result) {
      dispatch({ type: 'UPDATE_BATCH', payload: result.updatedBatch });
      dispatch({ type: 'ADD_DRAW_RECORD', payload: result.record });
      return result.record;
    }
    return null;
  };

  const handleRedeemCode = (code: string): DrawRecord | null => {
    const updated = redeemPrizeByCode(state.drawRecords, code);
    if (updated) {
      dispatch({ type: 'UPDATE_DRAW_RECORD', payload: updated });
      return updated;
    }
    return null;
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🎰 盲盒抽签站</h1>
        <nav className="app-nav">
          <button
            className={`nav-btn ${state.currentTab === 'user' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', payload: 'user' })}
          >
            用户抽签
          </button>
          <button
            className={`nav-btn ${state.currentTab === 'admin' ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_TAB', payload: 'admin' })}
          >
            店主管理
          </button>
        </nav>
      </header>

      <main className="app-main">
        {state.currentTab === 'user' ? (
          <GachaMachine
            batches={state.batches}
            drawRecords={state.drawRecords}
            currentUserId={state.currentUserId}
            onDraw={handleDraw}
          />
        ) : (
          <BatchManager
            batches={state.batches}
            drawRecords={state.drawRecords}
            onCreateBatch={handleCreateBatch}
            onRedeemCode={handleRedeemCode}
            onUpdateRecord={(record) => dispatch({ type: 'UPDATE_DRAW_RECORD', payload: record })}
          />
        )}
      </main>
    </div>
  );
}

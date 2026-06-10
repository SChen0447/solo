import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppAction, Fragment, CameraState } from '../types';
import { loadState, saveState } from '../utils/storage';
import { generateFragments } from '../data/fragments';

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  collectFragment: (id: string) => void;
  setCamera: (camera: Partial<CameraState>) => void;
  startMix: () => void;
  endMix: () => void;
  setActiveFragment: (id: string | null) => void;
  resetState: () => void;
  getFragmentById: (id: string) => Fragment | undefined;
  collectedCount: number;
  isAllCollected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialCamera: CameraState = {
  azimuth: 0,
  polar: Math.PI / 3,
  distance: 12
};

const createInitialState = (): AppState => {
  const saved = loadState();
  if (saved) {
    return {
      ...saved,
      isPlayingMix: false,
      activeFragmentId: null
    };
  }
  return {
    fragments: generateFragments(),
    camera: initialCamera,
    isPlayingMix: false,
    activeFragmentId: null
  };
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'COLLECT_FRAGMENT':
      return {
        ...state,
        fragments: state.fragments.map(f =>
          f.id === action.payload ? { ...f, collected: true } : f
        )
      };
    case 'SET_CAMERA':
      return {
        ...state,
        camera: { ...state.camera, ...action.payload }
      };
    case 'START_MIX':
      return { ...state, isPlayingMix: true };
    case 'END_MIX':
      return { ...state, isPlayingMix: false };
    case 'SET_ACTIVE_FRAGMENT':
      return { ...state, activeFragmentId: action.payload };
    case 'RESET_STATE':
      return {
        fragments: generateFragments(),
        camera: initialCamera,
        isPlayingMix: false,
        activeFragmentId: null
      };
    default:
      return state;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, undefined, createInitialState);

  useEffect(() => {
    saveState({
      fragments: state.fragments,
      camera: state.camera,
      isPlayingMix: false,
      activeFragmentId: null
    });
  }, [state.fragments, state.camera]);

  const collectFragment = (id: string) => {
    dispatch({ type: 'COLLECT_FRAGMENT', payload: id });
  };

  const setCamera = (camera: Partial<CameraState>) => {
    dispatch({ type: 'SET_CAMERA', payload: camera });
  };

  const startMix = () => dispatch({ type: 'START_MIX' });
  const endMix = () => dispatch({ type: 'END_MIX' });
  const setActiveFragment = (id: string | null) => dispatch({ type: 'SET_ACTIVE_FRAGMENT', payload: id });
  const resetState = () => dispatch({ type: 'RESET_STATE' });

  const getFragmentById = (id: string) => state.fragments.find(f => f.id === id);
  const collectedCount = state.fragments.filter(f => f.collected).length;
  const isAllCollected = state.fragments.every(f => f.collected);

  return (
    <AppContext.Provider value={{
      state,
      dispatch,
      collectFragment,
      setCamera,
      startMix,
      endMix,
      setActiveFragment,
      resetState,
      getFragmentById,
      collectedCount,
      isAllCollected
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

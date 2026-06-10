import React, { createContext, useContext, useReducer, useCallback, useState, ReactNode } from 'react';
import type { Potion, Material, Recipe } from '../shared/types';

interface AppState {
  userPotions: Potion[];
  materials: Material[];
  recipes: Recipe[];
  loading: boolean;
}

type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_MATERIALS'; payload: Material[] }
  | { type: 'SET_RECIPES'; payload: Recipe[] }
  | { type: 'SET_USER_POTIONS'; payload: Potion[] }
  | { type: 'ADD_POTION'; payload: Potion }
  | { type: 'UPDATE_POTION'; payload: Potion }
  | { type: 'REMOVE_POTION'; payload: string };

const initialState: AppState = {
  userPotions: [],
  materials: [],
  recipes: [],
  loading: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_MATERIALS':
      return { ...state, materials: action.payload };
    case 'SET_RECIPES':
      return { ...state, recipes: action.payload };
    case 'SET_USER_POTIONS':
      return { ...state, userPotions: action.payload };
    case 'ADD_POTION':
      return { ...state, userPotions: [...state.userPotions, action.payload] };
    case 'UPDATE_POTION':
      return {
        ...state,
        userPotions: state.userPotions.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case 'REMOVE_POTION':
      return {
        ...state,
        userPotions: state.userPotions.filter((p) => p.id !== action.payload),
      };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  userId: string;
  userName: string;
  showToast: (message: string, type: 'success' | 'error') => void;
  toast: { message: string; type: 'success' | 'error' } | null;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const userId = 'local-user';
  const userName = '炼金学徒';

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch, userId, userName, showToast, toast }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}

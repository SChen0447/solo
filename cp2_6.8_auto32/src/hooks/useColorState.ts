import { useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ComponentType, ThemeColors, THEMES, MAX_HISTORY, Theme } from '../utils/constants';

export interface HistoryItem {
  id: string;
  timestamp: number;
  component: ComponentType;
  oldColor: string;
  newColor: string;
}

interface ColorState {
  colors: ThemeColors;
  history: HistoryItem[];
  currentThemeId: string;
  initialColors: ThemeColors;
}

type ColorAction =
  | { type: 'SET_COLOR'; component: ComponentType; color: string }
  | { type: 'RESTORE_FROM_HISTORY'; historyId: string }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_THEME'; theme: Theme };

const initialTheme = THEMES[0];

const initialState: ColorState = {
  colors: { ...initialTheme.colors },
  history: [],
  currentThemeId: initialTheme.id,
  initialColors: { ...initialTheme.colors },
};

function colorReducer(state: ColorState, action: ColorAction): ColorState {
  switch (action.type) {
    case 'SET_COLOR': {
      const oldColor = state.colors[action.component];
      if (oldColor === action.color) {
        return state;
      }
      const newHistoryItem: HistoryItem = {
        id: uuidv4(),
        timestamp: Date.now(),
        component: action.component,
        oldColor,
        newColor: action.color,
      };
      const newHistory = [newHistoryItem, ...state.history].slice(0, MAX_HISTORY);
      return {
        ...state,
        colors: {
          ...state.colors,
          [action.component]: action.color,
        },
        history: newHistory,
      };
    }
    case 'RESTORE_FROM_HISTORY': {
      const itemIndex = state.history.findIndex(h => h.id === action.historyId);
      if (itemIndex === -1) {
        return state;
      }
      const item = state.history[itemIndex];
      const newColors = { ...state.colors };
      newColors[item.component] = item.oldColor;
      
      const restoreRecord: HistoryItem = {
        id: uuidv4(),
        timestamp: Date.now(),
        component: item.component,
        oldColor: item.newColor,
        newColor: item.oldColor,
      };
      
      const remainingHistory = state.history.slice(itemIndex + 1);
      const newHistory = [restoreRecord, ...remainingHistory].slice(0, MAX_HISTORY);
      
      return {
        ...state,
        colors: newColors,
        history: newHistory,
      };
    }
    case 'CLEAR_HISTORY': {
      return {
        ...state,
        colors: { ...state.initialColors },
        history: [],
      };
    }
    case 'SET_THEME': {
      return {
        ...state,
        colors: { ...action.theme.colors },
        currentThemeId: action.theme.id,
        initialColors: { ...action.theme.colors },
        history: [],
      };
    }
    default:
      return state;
  }
}

export function useColorState() {
  const [state, dispatch] = useReducer(colorReducer, initialState);

  const setColor = useCallback((component: ComponentType, color: string) => {
    dispatch({ type: 'SET_COLOR', component, color });
  }, []);

  const restoreFromHistory = useCallback((historyId: string) => {
    dispatch({ type: 'RESTORE_FROM_HISTORY', historyId });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR_HISTORY' });
  }, []);

  const setTheme = useCallback((theme: Theme) => {
    dispatch({ type: 'SET_THEME', theme });
  }, []);

  return {
    colors: state.colors,
    history: state.history,
    currentThemeId: state.currentThemeId,
    setColor,
    restoreFromHistory,
    clearHistory,
    setTheme,
  };
}

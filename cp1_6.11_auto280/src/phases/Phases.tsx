import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AlchemyState, RecipeMaterial, OperationParams, Recipe, Achievement } from '@/types';
import { getMaterialById, MATERIALS } from '@/data/materials';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '@/utils/storage';
import { playResonanceSound, playSuccessSound, playFailSound } from '@/utils/audio';

const initialState: AlchemyState = {
  crucibleMaterials: [],
  temperature: 25,
  stirSpeed: 0,
  cooling: false,
  isResonating: false,
  resonatingMaterialIds: [],
  synthesisResult: 'idle',
  duration: 0,
  successCount: 0
};

type Action =
  | { type: 'ADD_MATERIAL'; payload: RecipeMaterial }
  | { type: 'REMOVE_MATERIAL'; payload: string }
  | { type: 'CLEAR_CRUCIBLE' }
  | { type: 'SET_TEMPERATURE'; payload: number }
  | { type: 'SET_STIR_SPEED'; payload: number }
  | { type: 'SET_COOLING'; payload: boolean }
  | { type: 'SET_RESONATING'; payload: { isResonating: boolean; materialIds: string[] } }
  | { type: 'SET_SYNTHESIS_RESULT'; payload: AlchemyState['synthesisResult'] }
  | { type: 'INCREMENT_DURATION' }
  | { type: 'INCREMENT_SUCCESS_COUNT' }
  | { type: 'LOAD_STATE'; payload: Partial<AlchemyState> }
  | { type: 'RESET' };

const alchemyReducer = (state: AlchemyState, action: Action): AlchemyState => {
  switch (action.type) {
    case 'ADD_MATERIAL':
      if (state.crucibleMaterials.length >= 4) return state;
      return { ...state, crucibleMaterials: [...state.crucibleMaterials, action.payload] };
    case 'REMOVE_MATERIAL':
      return { ...state, crucibleMaterials: state.crucibleMaterials.filter((_, i) => i.toString() !== action.payload) };
    case 'CLEAR_CRUCIBLE':
      return { ...state, crucibleMaterials: [], isResonating: false, resonatingMaterialIds: [], synthesisResult: 'idle', duration: 0 };
    case 'SET_TEMPERATURE':
      return { ...state, temperature: Math.max(0, Math.min(100, action.payload)) };
    case 'SET_STIR_SPEED':
      return { ...state, stirSpeed: Math.max(0, Math.min(10, action.payload)) };
    case 'SET_COOLING':
      return { ...state, cooling: action.payload };
    case 'SET_RESONATING':
      return { ...state, isResonating: action.payload.isResonating, resonatingMaterialIds: action.payload.materialIds };
    case 'SET_SYNTHESIS_RESULT':
      return { ...state, synthesisResult: action.payload };
    case 'INCREMENT_DURATION':
      return { ...state, duration: state.duration + 1 };
    case 'INCREMENT_SUCCESS_COUNT':
      return { ...state, successCount: state.successCount + 1 };
    case 'LOAD_STATE':
      return { ...state, ...action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
};

interface AlchemyContextType {
  state: AlchemyState;
  addMaterial: (materialId: string, x?: number, y?: number) => void;
  removeMaterial: (index: number) => void;
  clearCrucible: () => void;
  setTemperature: (temp: number) => void;
  setStirSpeed: (speed: number) => void;
  setCooling: (cooling: boolean) => void;
  checkResonance: () => void;
  performSynthesis: () => boolean;
  saveRecipe: () => Promise<Recipe | null>;
  loadRecipe: (recipe: Recipe) => void;
  getSuccessRate: () => number;
  getAchievements: () => Achievement[];
  unlockedFirstAchievement: boolean;
}

const AlchemyContext = createContext<AlchemyContextType | null>(null);

export const AlchemyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(alchemyReducer, initialState);
  const [unlockedFirstAchievement, setUnlockedFirstAchievement] = React.useState(false);

  useEffect(() => {
    const saved = loadFromStorage<Partial<AlchemyState>>(STORAGE_KEYS.ALCHEMY_STATE);
    if (saved) {
      dispatch({ type: 'LOAD_STATE', payload: saved });
    }
    const achUnlocked = loadFromStorage<boolean>(STORAGE_KEYS.FIRST_ACHIEVEMENT);
    if (achUnlocked) setUnlockedFirstAchievement(true);
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.ALCHEMY_STATE, {
      crucibleMaterials: state.crucibleMaterials,
      temperature: state.temperature,
      stirSpeed: state.stirSpeed,
      successCount: state.successCount
    });
  }, [state.crucibleMaterials, state.temperature, state.stirSpeed, state.successCount]);

  const addMaterial = useCallback((materialId: string, x = 0, y = 0) => {
    if (state.crucibleMaterials.length < 4) {
      dispatch({ type: 'ADD_MATERIAL', payload: { materialId, position: { x, y } } });
    }
  }, [state.crucibleMaterials.length]);

  const removeMaterial = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_MATERIAL', payload: index.toString() });
  }, []);

  const clearCrucible = useCallback(() => {
    dispatch({ type: 'CLEAR_CRUCIBLE' });
  }, []);

  const setTemperature = useCallback((temp: number) => {
    dispatch({ type: 'SET_TEMPERATURE', payload: temp });
  }, []);

  const setStirSpeed = useCallback((speed: number) => {
    dispatch({ type: 'SET_STIR_SPEED', payload: speed });
  }, []);

  const setCooling = useCallback((cooling: boolean) => {
    dispatch({ type: 'SET_COOLING', payload: cooling });
  }, []);

  const checkResonance = useCallback(() => {
    const resonatingIds: string[] = [];
    state.crucibleMaterials.forEach(rm => {
      const mat = getMaterialById(rm.materialId);
      if (mat) {
        const diff = Math.abs(state.temperature - mat.resonanceThreshold);
        if (diff <= 8) {
          resonatingIds.push(mat.id);
        }
      }
    });
    if (resonatingIds.length > 0 && !state.isResonating) {
      const mat = getMaterialById(resonatingIds[0]);
      if (mat) playResonanceSound(mat.resonanceFrequency);
    }
    dispatch({ type: 'SET_RESONATING', payload: { isResonating: resonatingIds.length > 0, materialIds: resonatingIds } });
  }, [state.crucibleMaterials, state.temperature, state.isResonating]);

  const getSuccessRate = useCallback((): number => {
    let baseRate = 0.7;
    const materialIds = state.crucibleMaterials.map(m => m.materialId).sort();
    const hasFirePair = materialIds.includes('fire_sulfur') && materialIds.includes('dragon_blood');
    const hasWaterEarth = state.crucibleMaterials.some(rm => {
      const m = getMaterialById(rm.materialId);
      return m?.element === 'water';
    }) && state.crucibleMaterials.some(rm => {
      const m = getMaterialById(rm.materialId);
      return m?.element === 'earth';
    });
    if (hasFirePair) baseRate += 0.1;
    if (hasWaterEarth) baseRate += 0.05;
    if (state.isResonating) baseRate += 0.05;
    return Math.min(0.85, baseRate);
  }, [state.crucibleMaterials, state.isResonating]);

  const performSynthesis = useCallback((): boolean => {
    if (state.crucibleMaterials.length === 0) return false;
    dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: 'processing' });
    const rate = getSuccessRate();
    const success = Math.random() < rate;
    setTimeout(() => {
      dispatch({ type: 'SET_SYNTHESIS_RESULT', payload: success ? 'success' : 'fail' });
      if (success) {
        playSuccessSound();
        dispatch({ type: 'INCREMENT_SUCCESS_COUNT' });
      } else {
        playFailSound();
      }
    }, 1500);
    return success;
  }, [state.crucibleMaterials.length, getSuccessRate]);

  const saveRecipe = useCallback(async (): Promise<Recipe | null> => {
    if (state.synthesisResult === 'idle' || state.synthesisResult === 'processing') return null;
    const operations: OperationParams = {
      temperature: state.temperature,
      stirSpeed: state.stirSpeed,
      cooling: state.cooling,
      duration: state.duration
    };
    const recipe: Recipe = {
      id: uuidv4(),
      materials: [...state.crucibleMaterials],
      operations,
      success: state.synthesisResult === 'success',
      createdAt: new Date()
    };
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recipe)
      });
      if (res.ok) {
        const recipes = loadFromStorage<Recipe[]>(STORAGE_KEYS.RECIPES) || [];
        recipes.push(recipe);
        saveToStorage(STORAGE_KEYS.RECIPES, recipes);
        if (recipe.success) {
          const history = loadFromStorage<Recipe[]>(STORAGE_KEYS.HISTORY) || [];
          history.push(recipe);
          saveToStorage(STORAGE_KEYS.HISTORY, history);
          if (history.filter(r => r.success).length >= 10 && !unlockedFirstAchievement) {
            setUnlockedFirstAchievement(true);
            saveToStorage(STORAGE_KEYS.FIRST_ACHIEVEMENT, true);
          }
        }
        return recipe;
      }
    } catch (e) {
      const recipes = loadFromStorage<Recipe[]>(STORAGE_KEYS.RECIPES) || [];
      recipes.push(recipe);
      saveToStorage(STORAGE_KEYS.RECIPES, recipes);
      return recipe;
    }
    return null;
  }, [state.crucibleMaterials, state.temperature, state.stirSpeed, state.cooling, state.duration, state.synthesisResult, unlockedFirstAchievement]);

  const loadRecipe = useCallback((recipe: Recipe) => {
    dispatch({ type: 'CLEAR_CRUCIBLE' });
    setTimeout(() => {
      recipe.materials.forEach((m, i) => {
        setTimeout(() => addMaterial(m.materialId, m.position.x, m.position.y), i * 200);
      });
      setTimeout(() => {
        dispatch({ type: 'SET_TEMPERATURE', payload: recipe.operations.temperature });
        dispatch({ type: 'SET_STIR_SPEED', payload: recipe.operations.stirSpeed });
        dispatch({ type: 'SET_COOLING', payload: recipe.operations.cooling });
      }, recipe.materials.length * 200 + 100);
    }, 100);
  }, [addMaterial]);

  const getAchievements = useCallback((): Achievement[] => {
    const history = loadFromStorage<Recipe[]>(STORAGE_KEYS.HISTORY) || [];
    const successCount = history.filter(r => r.success).length;
    return [
      {
        id: 'novice_alchemist',
        name: '初级炼金术师',
        description: '成功合成10个配方',
        requiredCount: 10,
        unlocked: successCount >= 10,
        unlockedAt: successCount >= 10 ? new Date() : undefined
      }
    ];
  }, []);

  return (
    <AlchemyContext.Provider value={{
      state,
      addMaterial,
      removeMaterial,
      clearCrucible,
      setTemperature,
      setStirSpeed,
      setCooling,
      checkResonance,
      performSynthesis,
      saveRecipe,
      loadRecipe,
      getSuccessRate,
      getAchievements,
      unlockedFirstAchievement
    }}>
      {children}
    </AlchemyContext.Provider>
  );
};

export const useAlchemy = (): AlchemyContextType => {
  const ctx = useContext(AlchemyContext);
  if (!ctx) throw new Error('useAlchemy must be used within AlchemyProvider');
  return ctx;
};

export { MATERIALS };

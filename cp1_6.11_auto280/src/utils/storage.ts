export const STORAGE_KEYS = {
  RECIPES: 'alchemy_recipes',
  HISTORY: 'alchemy_history',
  ALCHEMY_STATE: 'alchemy_state',
  FIRST_ACHIEVEMENT: 'alchemy_first_achievement',
  ACHIEVEMENTS: 'alchemy_achievements'
} as const;

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
  }
};

export const loadFromStorage = <T>(key: string): T | null => {
  try {
    const serialized = localStorage.getItem(key);
    if (serialized === null) return null;
    return JSON.parse(serialized) as T;
  } catch (error) {
    console.warn(`Failed to load ${key} from localStorage:`, error);
    return null;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage:`, error);
  }
};

export const clearStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear storage:', error);
  }
};

import { Fragment, AppState } from '../types';

const STORAGE_KEY = 'sound_island_wander_state';

export const loadState = (): AppState | null => {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (serialized === null) return null;
    return JSON.parse(serialized);
  } catch (err) {
    console.warn('Failed to load state from localStorage:', err);
    return null;
  }
};

export const saveState = (state: AppState): void => {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (err) {
    console.warn('Failed to save state to localStorage:', err);
  }
};

export const clearState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear state:', err);
  }
};

export const getCollectedCount = (fragments: Fragment[]): number => {
  return fragments.filter(f => f.collected).length;
};

export const isAllCollected = (fragments: Fragment[]): boolean => {
  return fragments.every(f => f.collected);
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEY, INITIAL_DATA } from '../constants';
import type { AppData } from '../types';

export function useStorage() {
  const [data, setData] = useState<AppData>(INITIAL_DATA);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppData;
        setData(parsed);
      }
    } catch (e) {
      console.error('Failed to load from localStorage:', e);
    }
    setLoaded(true);
  }, []);

  const saveData = useCallback((newData: AppData) => {
    setData(newData);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      } catch (e) {
        console.error('Failed to save to localStorage:', e);
      }
    }, 300);
  }, []);

  return { data, loaded, saveData };
}

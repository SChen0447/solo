import { useState, useCallback } from 'react';
import { Layer, MAX_HISTORY } from '../types';

interface HistoryState {
  past: Layer[][];
  present: Layer[];
  future: Layer[][];
}

export function useHistory(initialState: Layer[]) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const setState = useCallback((newPresent: Layer[]) => {
    setHistory((prev) => {
      const newPast = [...prev.past, prev.present];
      if (newPast.length > MAX_HISTORY) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: newPresent,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const newPast = [...prev.past];
      const previous = newPast.pop()!;
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const newFuture = [...prev.future];
      const next = newFuture.shift()!;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    layers: history.present,
    setLayers: setState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}

import { useState, useCallback, useRef } from 'react';
import { HistoryItem, MixState } from '../types';
import { generateThumbnail } from '../utils/canvasUtils';

const MAX_HISTORY = 20;
const THUMBNAIL_SIZE = 60;

interface UseHistoryOptions {
  maxHistory?: number;
  thumbnailSize?: number;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { maxHistory = MAX_HISTORY, thumbnailSize = THUMBNAIL_SIZE } = options;
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const idCounter = useRef(0);
  const pendingThumbnailRef = useRef<number | null>(null);

  const addHistory = useCallback((state: MixState, sourceCanvas: HTMLCanvasElement) => {
    const id = ++idCounter.current;
    const timestamp = Date.now();
    
    let thumbnail = '';
    try {
      thumbnail = generateThumbnail(sourceCanvas, thumbnailSize);
    } catch (e) {
      thumbnail = '';
    }

    const newItem: HistoryItem = {
      id,
      timestamp,
      state,
      thumbnail,
    };

    setHistory(prev => {
      const updated = [newItem, ...prev];
      if (updated.length > maxHistory) {
        return updated.slice(0, maxHistory);
      }
      return updated;
    });
  }, [maxHistory, thumbnailSize]);

  const addHistoryAsync = useCallback((state: MixState, sourceCanvas: HTMLCanvasElement) => {
    if (pendingThumbnailRef.current) {
      cancelAnimationFrame(pendingThumbnailRef.current);
    }
    
    pendingThumbnailRef.current = requestAnimationFrame(() => {
      addHistory(state, sourceCanvas);
      pendingThumbnailRef.current = null;
    });
  }, [addHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    idCounter.current = 0;
  }, []);

  const getHistoryItem = useCallback((id: number): HistoryItem | undefined => {
    return history.find(item => item.id === id);
  }, [history]);

  const exportHistoryItem = useCallback((id: number): string | null => {
    const item = getHistoryItem(id);
    return item ? item.thumbnail : null;
  }, [getHistoryItem]);

  return {
    history,
    addHistory,
    addHistoryAsync,
    clearHistory,
    getHistoryItem,
    exportHistoryItem,
  };
}

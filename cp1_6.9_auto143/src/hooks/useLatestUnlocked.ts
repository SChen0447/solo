import { useState, useEffect, useCallback, useRef } from 'react';
import type { Flower } from '../types';
import { flowerAPI } from '../utils/api';

export function useLatestUnlocked() {
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const [newUnlocks, setNewUnlocks] = useState<Flower[]>([]);

  const poll = useCallback(async () => {
    try {
      const latest = await flowerAPI.latest();
      setFlowers(latest);
      const newOnes = latest.filter((f) => !seenIds.current.has(f._id));
      if (newOnes.length > 0) {
        setNewUnlocks((prev) => [...prev, ...newOnes]);
        newOnes.forEach((f) => seenIds.current.add(f._id));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, 10000);
    return () => clearInterval(timer);
  }, [poll]);

  const dismissUnlock = useCallback((id: string) => {
    setNewUnlocks((prev) => prev.filter((f) => f._id !== id));
  }, []);

  return { flowers, newUnlocks, dismissUnlock };
}

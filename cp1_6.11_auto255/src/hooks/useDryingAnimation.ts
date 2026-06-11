import { useState, useEffect, useRef, useCallback } from 'react';

interface DryingParams {
  humidity: number;
  windSpeed: number;
  sunAngle: number;
}

const calculateDryingRate = (params: DryingParams): number => {
  const humidityFactor = 1 - (params.humidity - 20) / 70 * 0.6;
  const windFactor = 1 + (params.windSpeed / 5) * 0.5;
  const sunFactor = 1 + (params.sunAngle / 90) * 0.3;
  return humidityFactor * windFactor * sunFactor;
};

export const useDryingAnimation = (
  isDrying: boolean,
  params: DryingParams,
  onProgress?: (progress: number) => void
) => {
  const [dryness, setDryness] = useState(0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const totalDurationRef = useRef<number>(20000);

  const startDrying = useCallback(() => {
    setDryness(0);
    const rate = calculateDryingRate(params);
    totalDurationRef.current = 20000 / rate;
  }, [params]);

  const resetDrying = useCallback(() => {
    setDryness(0);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isDrying) {
      return;
    }

    if (dryness >= 1) {
      return;
    }

    const animate = (currentTime: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      const rate = calculateDryingRate(params);
      const progressIncrement = (deltaTime / totalDurationRef.current) * rate;

      setDryness((prev) => {
        const newDryness = Math.min(1, prev + progressIncrement);
        if (onProgress) {
          onProgress(newDryness);
        }
        return newDryness;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDrying, params, onProgress]);

  return {
    dryness,
    isDrying,
    startDrying,
    resetDrying,
  };
};

export default useDryingAnimation;

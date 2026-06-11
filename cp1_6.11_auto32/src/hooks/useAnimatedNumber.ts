import { useState, useEffect, useRef } from 'react';

export const useAnimatedNumber = (
  targetValue: number,
  duration: number = 600
): { value: number; isUpdating: boolean } => {
  const [displayValue, setDisplayValue] = useState(targetValue);
  const [isUpdating, setIsUpdating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startValueRef = useRef(targetValue);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (targetValue === displayValue) return;

    startValueRef.current = displayValue;
    startTimeRef.current = null;
    setIsUpdating(true);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(
        startValueRef.current + (targetValue - startValueRef.current) * easeOutQuart
      );

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsUpdating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return { value: displayValue, isUpdating };
};

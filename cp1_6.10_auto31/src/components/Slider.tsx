import React, { useRef, useCallback, useState, useEffect } from 'react';

interface SliderProps {
  position: number;
  onChange: (position: number) => void;
  isHorizontal?: boolean;
}

const DAMPING = 0.8;

const Slider: React.FC<SliderProps> = ({ position, onChange, isHorizontal = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const lastPosRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const calculatePosition = useCallback(
    (clientX: number, clientY: number) => {
      const parent = (document.querySelector('.compare-image-wrapper') ||
        document.querySelector('.side-by-side')) as HTMLElement;
      if (!parent) return position;

      const rect = parent.getBoundingClientRect();
      let newPosition: number;

      if (isHorizontal) {
        newPosition = ((clientY - rect.top) / rect.height) * 100;
      } else {
        newPosition = ((clientX - rect.left) / rect.width) * 100;
      }

      return Math.max(0, Math.min(100, newPosition));
    },
    [isHorizontal, position],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setVelocity(0);
      lastPosRef.current = isHorizontal ? e.clientY : e.clientX;
      lastTimeRef.current = performance.now();

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [isHorizontal],
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const currentPos = isHorizontal ? e.clientY : e.clientX;
      const dt = Math.max(1, now - lastTimeRef.current);
      const dp = currentPos - lastPosRef.current;

      setVelocity(dp / dt);
      lastPosRef.current = currentPos;
      lastTimeRef.current = now;

      const newPos = calculatePosition(e.clientX, e.clientY);
      onChange(newPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);

      if (Math.abs(velocity) > 0.1) {
        let v = velocity * 16;
        let lastTime = performance.now();

        const animate = () => {
          const now = performance.now();
          const dt = (now - lastTime) / 16;
          lastTime = now;

          v *= Math.pow(DAMPING, dt);

          if (Math.abs(v) < 0.5) {
            rafRef.current = null;
            return;
          }

          const parent = (document.querySelector('.compare-image-wrapper') ||
            document.querySelector('.side-by-side')) as HTMLElement;
          if (parent) {
            const rect = parent.getBoundingClientRect();
            const size = isHorizontal ? rect.height : rect.width;
            const deltaPercent = (v / size) * 100;
            const newPosition = Math.max(0, Math.min(100, position + deltaPercent));
            onChange(newPosition);
          }

          rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isHorizontal, calculatePosition, onChange, velocity, position]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const style: React.CSSProperties = isHorizontal
    ? { top: `${position}%` }
    : { left: `${position}%` };

  return (
    <div
      className={`slider-line ${isHorizontal ? 'horizontal' : ''} ${isDragging ? 'dragging' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
    >
      <div className="slider-handle" />
    </div>
  );
};

export default Slider;

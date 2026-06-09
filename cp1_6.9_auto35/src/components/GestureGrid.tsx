import React, { useRef, useState, useCallback, useEffect } from 'react';

export type LineStyle = 'default' | 'dashed-blue' | 'solid-green' | 'solid-red';

interface GestureGridProps {
  onPatternComplete: (pattern: number[]) => void;
  disabled?: boolean;
  lineStyle?: LineStyle;
  showRipple?: boolean;
  shake?: boolean;
  resetTrigger?: number;
}

const POINT_COUNT = 9;
const GRID_SIZE = 3;
const MIN_POINTS = 4;

const GestureGrid: React.FC<GestureGridProps> = ({
  onPatternComplete,
  disabled = false,
  lineStyle = 'default',
  showRipple = false,
  shake = false,
  resetTrigger = 0
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pattern, setPattern] = useState<number[]>([]);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [pointPositions, setPointPositions] = useState<{ x: number; y: number }[]>([]);
  const [activatedPoints, setActivatedPoints] = useState<Set<number>>(new Set());
  const [animatingPoints, setAnimatingPoints] = useState<Set<number>>(new Set());
  const [ripplePoints, setRipplePoints] = useState<Set<number>>(new Set());

  const calculatePositions = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const positions: { x: number; y: number }[] = [];
    const cellWidth = rect.width / GRID_SIZE;
    const cellHeight = rect.height / GRID_SIZE;

    for (let i = 0; i < POINT_COUNT; i++) {
      const row = Math.floor(i / GRID_SIZE);
      const col = i % GRID_SIZE;
      positions.push({
        x: col * cellWidth + cellWidth / 2,
        y: row * cellHeight + cellHeight / 2
      });
    }
    setPointPositions(positions);
  }, []);

  useEffect(() => {
    calculatePositions();
    window.addEventListener('resize', calculatePositions);
    return () => window.removeEventListener('resize', calculatePositions);
  }, [calculatePositions]);

  useEffect(() => {
    setPattern([]);
    setActivatedPoints(new Set());
    setCurrentPos(null);
    setIsDrawing(false);
    setRipplePoints(new Set());
    setAnimatingPoints(new Set());
  }, [resetTrigger]);

  const getTouchedPoint = useCallback((clientX: number, clientY: number): number | null => {
    if (!containerRef.current || pointPositions.length === 0) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const threshold = rect.width / GRID_SIZE / 2;

    for (let i = 0; i < pointPositions.length; i++) {
      const dx = x - pointPositions[i].x;
      const dy = y - pointPositions[i].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < threshold) {
        return i;
      }
    }
    return null;
  }, [pointPositions]);

  const addPointToPattern = useCallback((pointIndex: number) => {
    setPattern(prev => {
      if (prev.includes(pointIndex)) return prev;
      const newPattern = [...prev, pointIndex];
      
      setActivatedPoints(prevSet => {
        const newSet = new Set(prevSet);
        newSet.add(pointIndex);
        return newSet;
      });

      setAnimatingPoints(prevSet => {
        const newSet = new Set(prevSet);
        newSet.add(pointIndex);
        return newSet;
      });

      setTimeout(() => {
        setAnimatingPoints(prevSet => {
          const newSet = new Set(prevSet);
          newSet.delete(pointIndex);
          return newSet;
        });
      }, 300);

      return newPattern;
    });
  }, []);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDrawing(true);
    setPattern([]);
    setActivatedPoints(new Set());
    setRipplePoints(new Set());
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentPos({
      x: clientX - rect.left,
      y: clientY - rect.top
    });

    const point = getTouchedPoint(clientX, clientY);
    if (point !== null) {
      addPointToPattern(point);
    }
  }, [disabled, getTouchedPoint, addPointToPattern]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDrawing || disabled) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCurrentPos({
      x: clientX - rect.left,
      y: clientY - rect.top
    });

    const point = getTouchedPoint(clientX, clientY);
    if (point !== null) {
      addPointToPattern(point);
    }
  }, [isDrawing, disabled, getTouchedPoint, addPointToPattern]);

  const handleEnd = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPos(null);

    if (pattern.length >= MIN_POINTS) {
      if (showRipple) {
        setRipplePoints(new Set(pattern));
        setTimeout(() => setRipplePoints(new Set()), 600);
      }
      onPatternComplete(pattern);
    }
  }, [isDrawing, pattern, showRipple, onPatternComplete]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    handleMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => handleEnd();
  const onMouseLeave = () => {
    if (isDrawing) handleEnd();
  };

  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  const renderLines = () => {
    if (pattern.length === 0) return null;
    const lines: JSX.Element[] = [];

    for (let i = 0; i < pattern.length - 1; i++) {
      const from = pointPositions[pattern[i]];
      const to = pointPositions[pattern[i + 1]];
      if (!from || !to) continue;

      let strokeColor = 'rgba(255, 255, 255, 0.7)';
      let strokeDasharray = '';

      switch (lineStyle) {
        case 'dashed-blue':
          strokeColor = '#4dabf7';
          strokeDasharray = '8, 4';
          break;
        case 'solid-green':
          strokeColor = '#40c057';
          break;
        case 'solid-red':
          strokeColor = '#ff6b6b';
          break;
        default:
          strokeColor = 'rgba(255, 255, 255, 0.7)';
      }

      lines.push(
        <line
          key={`line-${i}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={strokeColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          style={{
            filter: lineStyle === 'default' ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : 
                    lineStyle === 'solid-green' ? 'drop-shadow(0 0 10px rgba(64, 192, 87, 0.6))' :
                    lineStyle === 'solid-red' ? 'drop-shadow(0 0 10px rgba(255, 107, 107, 0.6))' :
                    'drop-shadow(0 0 8px rgba(77, 171, 247, 0.5))'
          }}
        />
      );
    }

    if (isDrawing && currentPos && pattern.length > 0) {
      const lastPoint = pointPositions[pattern[pattern.length - 1]];
      if (lastPoint) {
        lines.push(
          <line
            key="current-line"
            x1={lastPoint.x}
            y1={lastPoint.y}
            x2={currentPos.x}
            y2={currentPos.y}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={3}
            strokeLinecap="round"
            style={{
              filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))'
            }}
          />
        );
      }
    }

    return lines;
  };

  const getPointStyle = (index: number) => {
    const isActivated = activatedPoints.has(index);
    const isAnimating = animatingPoints.has(index);
    const hasRipple = ripplePoints.has(index);

    let background = 'rgba(255, 255, 255, 0.2)';
    let borderColor = 'rgba(255, 255, 255, 0.3)';
    let innerBg = 'rgba(255, 255, 255, 0.5)';
    let transform = isAnimating ? 'scale(1.2)' : 'scale(1)';

    if (isActivated) {
      switch (lineStyle) {
        case 'dashed-blue':
          background = 'linear-gradient(135deg, #4dabf7 0%, #339af0 100%)';
          borderColor = '#74c0fc';
          innerBg = '#ffffff';
          break;
        case 'solid-green':
          background = 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)';
          borderColor = '#69db7c';
          innerBg = '#ffffff';
          break;
        case 'solid-red':
          background = 'linear-gradient(135deg, #ff8787 0%, #ff6b6b 100%)';
          borderColor = '#ffa8a8';
          innerBg = '#ffffff';
          break;
        default:
          background = 'linear-gradient(135deg, #ffa94d 0%, #ff922b 100%)';
          borderColor = '#ffc078';
          innerBg = '#ffffff';
      }
    }

    return {
      background,
      borderColor,
      innerBg,
      transform,
      hasRipple
    };
  };

  return (
    <div
      ref={containerRef}
      className={`gesture-grid-container ${shake ? 'shake-animation' : ''}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <svg ref={svgRef} className="gesture-svg">
        {renderLines()}
      </svg>
      <div className="gesture-points-grid">
        {Array.from({ length: POINT_COUNT }, (_, i) => {
          const style = getPointStyle(i);
          return (
            <div key={i} className="gesture-point-wrapper">
              <div
                className={`gesture-point ${activatedPoints.has(i) ? 'activated' : ''}`}
                style={{
                  background: style.background,
                  borderColor: style.borderColor,
                  transform: style.transform,
                  transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                }}
              >
                <div
                  className="gesture-point-inner"
                  style={{ background: style.innerBg }}
                />
              </div>
              {style.hasRipple && (
                <>
                  <div className="ripple ripple-1" />
                  <div className="ripple ripple-2" />
                </>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .gesture-grid-container {
          position: relative;
          width: clamp(260px, 80vw, 360px);
          height: clamp(260px, 80vw, 360px);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: clamp(20px, 6vw, 35px);
          touch-action: none;
          cursor: ${disabled ? 'not-allowed' : 'crosshair'};
        }

        .gesture-svg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .gesture-points-grid {
          position: relative;
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(3, 1fr);
          z-index: 2;
        }

        .gesture-point-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .gesture-point {
          width: clamp(32px, 10vw, 40px);
          height: clamp(32px, 10vw, 40px);
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
        }

        .gesture-point-inner {
          width: 35%;
          height: 35%;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.5);
        }

        .ripple {
          position: absolute;
          width: clamp(32px, 10vw, 40px);
          height: clamp(32px, 10vw, 40px);
          border-radius: 50%;
          border: 2px solid #40c057;
          animation: ripple-anim 0.6s ease-out forwards;
          pointer-events: none;
        }

        .ripple-2 {
          animation-delay: 0.15s;
        }

        @keyframes ripple-anim {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }

        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default GestureGrid;

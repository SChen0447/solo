import React, { useRef, useState, useCallback, useEffect } from 'react';
import { ColorStop, gradientToStopsArray, hslToString } from './utils';

interface GradientBarProps {
  stops: ColorStop[];
  selectedStopId: string | null;
  onStopsChange: (stops: ColorStop[]) => void;
  onSelectStop: (id: string | null) => void;
  onOpenColorPicker: (stopId: string) => void;
  onAddStop?: (position: number) => void;
}

const GradientBar: React.FC<GradientBarProps> = ({
  stops,
  selectedStopId,
  onStopsChange,
  onSelectStop,
  onOpenColorPicker,
  onAddStop,
}) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPosRef = useRef<number>(0);

  const updateStopPosition = useCallback(
    (id: string, position: number) => {
      onStopsChange(
        stops.map((s) => {
          if (s.id !== id) return s;
          const idx = stops.findIndex((st) => st.id === id);
          const sorted = [...stops].sort((a, b) => a.position - b.position);
          const sortedIdx = sorted.findIndex((st) => st.id === id);

          let minPos = 0;
          let maxPos = 100;
          const minGap = 10 / 100;

          if (sortedIdx > 0) {
            minPos = sorted[sortedIdx - 1].position + minGap * 100;
          }
          if (sortedIdx < sorted.length - 1) {
            maxPos = sorted[sortedIdx + 1].position - minGap * 100;
          }

          const clampedPos = Math.max(minPos, Math.min(maxPos, position));
          return { ...s, position: clampedPos };
        })
      );
    },
    [stops, onStopsChange]
  );

  const handleMouseDown = (e: React.MouseEvent, stopId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(stopId);
    onSelectStop(stopId);
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const position = ((e.clientX - rect.left) / rect.width) * 100;

      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        if (Math.abs(position - lastPosRef.current) > 0.05) {
          lastPosRef.current = position;
          updateStopPosition(draggingId, position);
        }
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, updateStopPosition]);

  const handleDoubleClick = (stopId: string) => {
    onOpenColorPicker(stopId);
  };

  const handleBarClick = (e: React.MouseEvent) => {
    if (!onAddStop || !barRef.current || stops.length >= 10) return;
    const rect = barRef.current.getBoundingClientRect();
    const position = ((e.clientX - rect.left) / rect.width) * 100;
    onSelectStop(null);
    onAddStop(position);
  };

  const gradientCSS = gradientToStopsArray(stops);
  const sortedStops = [...stops].sort((a, b) => a.position - b.position);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: 40 }}>
        {sortedStops.map((stop) => {
          const isSelected = stop.id === selectedStopId;
          const isDragging = stop.id === draggingId;
          return (
            <div
              key={stop.id}
              onMouseDown={(e) => handleMouseDown(e, stop.id)}
              onDoubleClick={() => handleDoubleClick(stop.id)}
              style={{
                position: 'absolute',
                left: `${stop.position}%`,
                top: 0,
                transform: `translateX(-50%) ${isDragging ? 'scale(1.15)' : 'scale(1)'}`,
                width: 16,
                height: 16,
                borderRadius: '50%',
                backgroundColor: hslToString(stop.color),
                border: `1.5px solid ${isSelected ? '#0066ff' : 'white'}`,
                boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
                cursor: 'grab',
                zIndex: isDragging || isSelected ? 10 : 1,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                outline: isSelected ? '2px dashed #0066ff' : 'none',
                outlineOffset: 2,
              }}
              title="拖拽调整位置，双击编辑颜色"
            />
          );
        })}
      </div>
      <div
        ref={barRef}
        onClick={handleBarClick}
        style={{
          width: '100%',
          height: 60,
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.15)',
          background: `linear-gradient(90deg, ${gradientCSS})`,
          cursor: stops.length >= 10 ? 'default' : 'crosshair',
          position: 'relative',
        }}
      >
        {stops.length >= 10 && (
          <div
            style={{
              position: 'absolute',
              right: 8,
              top: 8,
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)',
              backgroundColor: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: 4,
            }}
          >
            最多10个色标
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(GradientBar);

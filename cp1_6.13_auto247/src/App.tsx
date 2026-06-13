import React, { useState, useCallback } from 'react';
import { useFurnace } from './hooks/useFurnace';
import MaterialPanel, { MaterialType } from './components/MaterialPanel';

const App: React.FC = () => {
  const {
    canvasRef,
    energy,
    flashOpacity,
    dropMaterial,
    handleMouseMove,
    energyColors,
    FURNACE_SIZE,
  } = useFurnace();

  const [dragOver, setDragOver] = useState(false);
  const [, setDragging] = useState<{ type: MaterialType; color: string } | null>(null);

  const handleDragStart = useCallback((type: MaterialType, color: string) => {
    setDragging({ type, color });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const half = FURNACE_SIZE / 2;
    const x = e.clientX;
    const y = e.clientY;
    setDragOver(
      x >= cx - half && x <= cx + half && y >= cy - half && y <= cy + half
    );
  }, [canvasRef, FURNACE_SIZE]);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('material-type') as MaterialType;
    const color = e.dataTransfer.getData('material-color') || '#ff9ff3';
    const canvas = canvasRef.current;
    if (!canvas || !type) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    dropMaterial(x, y, color);
    setDragOver(false);
    setDragging(null);
  }, [canvasRef, dropMaterial]);

  const energySegments = energyColors.map((color, i) => {
    const segStart = i * 10;
    const segEnd = (i + 1) * 10;
    const segEnergy = Math.max(0, Math.min(10, energy - segStart));
    const fill = (segEnergy / 10) * 100;
    return { color, fill, active: segEnergy > 0 };
  });

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #130f40 0%, #0c0c1d 100%)',
      }}
    >
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '60%',
            maxWidth: 800,
            height: 6,
            display: 'flex',
            gap: 2,
            borderRadius: 3,
            padding: '1px 0',
          }}
        >
          {energySegments.map((seg, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '100%',
                borderRadius: 3,
                background: `linear-gradient(90deg, ${seg.color}40, ${seg.color}20)`,
                overflow: 'hidden',
                boxShadow: seg.active ? `0 0 8px ${seg.color}60` : 'none',
                transition: 'box-shadow 300ms ease',
              }}
            >
              <div
                style={{
                  width: `${seg.fill}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${seg.color}, ${seg.color}dd)`,
                  borderRadius: 3,
                  boxShadow: `0 0 10px ${seg.color}, 0 0 20px ${seg.color}80`,
                  transition: 'width 300ms ease',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <MaterialPanel onDragStart={handleDragStart} onDragEnd={handleDragEnd} />

      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: dragOver ? 'copy' : 'default',
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, rgba(255,255,255,0.6), rgba(255,200,150,0.2))',
          pointerEvents: 'none',
          opacity: flashOpacity,
          zIndex: 100,
          transition: 'opacity 100ms linear',
        }}
      />

      {dragOver && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: FURNACE_SIZE,
            height: FURNACE_SIZE,
            border: '2px dashed rgba(162, 155, 254, 0.6)',
            borderRadius: 4,
            pointerEvents: 'none',
            zIndex: 5,
            boxShadow: 'inset 0 0 40px rgba(162, 155, 254, 0.15)',
          }}
        />
      )}
    </div>
  );
};

export default App;

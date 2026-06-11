import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { PlacedPlant, PlantType, FlyingButterfly, Butterfly } from '../types';
import { PLANT_DATA, PLANT_TYPES } from '../utils/plantData';
import PlantIcon from './PlantIcon';
import ButterflyCanvas from './ButterflyCanvas';

interface ButterflyGardenProps {
  plants: PlacedPlant[];
  setPlants: React.Dispatch<React.SetStateAction<PlacedPlant[]>>;
  onButterflyCapture?: (butterfly: Butterfly) => void;
  capturedButterflies: Butterfly[];
  selectedButterfly: FlyingButterfly | null;
  setSelectedButterfly: React.Dispatch<React.SetStateAction<FlyingButterfly | null>>;
  releaseButterflyData?: Butterfly | null;
  onReleased?: () => void;
}

const GRID_SIZE = 80;
const GRID_COLS = 6;
const GRID_ROWS = 6;
const CANVAS_WIDTH = GRID_COLS * GRID_SIZE;
const CANVAS_HEIGHT = GRID_ROWS * GRID_SIZE;

const ButterflyGarden: React.FC<ButterflyGardenProps> = ({
  plants,
  setPlants,
  onButterflyCapture,
  capturedButterflies,
  selectedButterfly,
  setSelectedButterfly,
  releaseButterflyData,
  onReleased
}) => {
  const [draggedPlant, setDraggedPlant] = useState<PlantType | null>(null);
  const [captureAnimation, setCaptureAnimation] = useState<string | null>(null);
  const [releaseAnimation, setReleaseAnimation] = useState<{ id: string; targetX: number; targetY: number } | null>(null);
  const [showCaptureConfirm, setShowCaptureConfirm] = useState(false);
  const nectarTimerRef = useRef<number>(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlants(prev => prev.map(plant => {
        const hoursElapsed = 1 / 60;
        const recoveryRate = 5 * hoursElapsed;

        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysSinceVisit = (now - plant.lastVisitedAt) / msPerDay;

        let newNectar = plant.nectar + recoveryRate;

        if (daysSinceVisit > 3 && plant.daysWithoutVisit >= 3) {
          newNectar *= 0.9;
        }

        newNectar = Math.max(0, Math.min(PLANT_DATA[plant.type].maxNectar, newNectar));

        return {
          ...plant,
          nectar: newNectar,
          daysWithoutVisit: Math.floor(daysSinceVisit)
        };
      }));
    }, 1000);

    nectarTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [setPlants]);

  useEffect(() => {
    if (releaseButterflyData) {
      const plantedPlants = plants.filter(p => p);
      if (plantedPlants.length > 0) {
        const targetPlant = plantedPlants[Math.floor(Math.random() * plantedPlants.length)];
        const targetX = targetPlant.gridX * GRID_SIZE + GRID_SIZE / 2;
        const targetY = targetPlant.gridY * GRID_SIZE + GRID_SIZE / 2;

        setReleaseAnimation({
          id: releaseButterflyData.id,
          targetX,
          targetY
        });

        setTimeout(() => {
          setReleaseAnimation(null);
          onReleased?.();
        }, 800);
      } else {
        onReleased?.();
      }
    }
  }, [releaseButterflyData, plants, onReleased]);

  const handleDragStart = (type: PlantType) => {
    setDraggedPlant(type);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (gridX: number, gridY: number) => {
    if (!draggedPlant) return;

    const existingPlant = plants.find(p => p.gridX === gridX && p.gridY === gridY);
    if (existingPlant) return;

    const newPlant: PlacedPlant = {
      id: uuidv4(),
      type: draggedPlant,
      gridX,
      gridY,
      nectar: PLANT_DATA[draggedPlant].maxNectar * 0.8,
      lastVisitedAt: Date.now(),
      daysWithoutVisit: 0,
      plantedAt: Date.now()
    };

    setPlants(prev => [...prev, newPlant]);
    setDraggedPlant(null);
  };

  const handleButterflyClick = useCallback((butterfly: FlyingButterfly) => {
    setSelectedButterfly(butterfly);
  }, [setSelectedButterfly]);

  const handleNectarConsume = useCallback((plantId: string, amount: number) => {
    setPlants(prev => prev.map(p =>
      p.id === plantId
        ? { ...p, nectar: Math.max(0, p.nectar - amount), lastVisitedAt: Date.now(), daysWithoutVisit: 0 }
        : p
    ));
  }, [setPlants]);

  const handlePlantVisit = useCallback((plantId: string) => {
    setPlants(prev => prev.map(p =>
      p.id === plantId
        ? { ...p, lastVisitedAt: Date.now(), daysWithoutVisit: 0 }
        : p
    ));
  }, [setPlants]);

  const handleCapture = () => {
    if (!selectedButterfly) return;

    setCaptureAnimation(selectedButterfly.id);
    setShowCaptureConfirm(true);

    setTimeout(() => {
      const captured: Butterfly = {
        ...selectedButterfly,
        isWild: false,
        isCaptured: true,
        capturedAt: Date.now(),
        lastActiveAt: Date.now()
      };
      onButterflyCapture?.(captured);
      setCaptureAnimation(null);
      setSelectedButterfly(null);
      setShowCaptureConfirm(false);
    }, 300);
  };

  const capturedIds = capturedButterflies.map(b => b.id);

  return (
    <div className="butterfly-garden" style={{ display: 'flex', gap: 20, padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
        <h3 style={{ color: '#ecf0f1', margin: 0, fontFamily: "'Crimson Text', serif" }}>
          植物工具
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 12,
          backgroundColor: '#2c3e50', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
          {PLANT_TYPES.map(type => (
            <div
              key={type}
              draggable
              onDragStart={() => handleDragStart(type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 8,
                borderRadius: 6,
                cursor: 'grab',
                backgroundColor: draggedPlant === type ? 'rgba(122, 176, 122, 0.2)' : 'transparent',
                transition: 'background-color 0.2s'
              }}
            >
              <PlantIcon type={type} size={40} />
              <span style={{ color: '#ecf0f1', fontSize: 13 }}>
                {PLANT_DATA[type].name}
              </span>
            </div>
          ))}
        </div>
        <p style={{ color: '#7f8c8d', fontSize: 12, margin: 0 }}>
          拖拽植物到花园中种植
        </p>
      </div>

      <div style={{ position: 'relative' }}>
        <div
          className="garden-grid"
          style={{
            position: 'relative',
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            background: 'radial-gradient(circle, #2d5a3d 0%, #1e3a3e 100%)',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)'
          }}
          onDragOver={handleDragOver}
        >
          <svg
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          >
            {Array.from({ length: GRID_COLS + 1 }).map((_, i) => (
              <line
                key={`v${i}`}
                x1={i * GRID_SIZE}
                y1={0}
                x2={i * GRID_SIZE}
                y2={CANVAS_HEIGHT}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: GRID_ROWS + 1 }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={0}
                y1={i * GRID_SIZE}
                x2={CANVAS_WIDTH}
                y2={i * GRID_SIZE}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
            ))}
          </svg>

          {Array.from({ length: GRID_ROWS }).map((_, row) =>
            Array.from({ length: GRID_COLS }).map((_, col) => {
              const plant = plants.find(p => p.gridX === col && p.gridY === row);
              return (
                <div
                  key={`${row}-${col}`}
                  style={{
                    position: 'absolute',
                    left: col * GRID_SIZE,
                    top: row * GRID_SIZE,
                    width: GRID_SIZE,
                    height: GRID_SIZE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: draggedPlant ? 'copy' : 'default'
                  }}
                  onDrop={() => handleDrop(col, row)}
                  onDragOver={handleDragOver}
                >
                  {plant && (
                    <PlantIcon
                      type={plant.type}
                      size={GRID_SIZE * 0.7}
                      showNectar
                      nectar={plant.nectar}
                    />
                  )}

                  {captureAnimation && !plant && (
                    <div
                      style={{
                        position: 'absolute',
                        width: 40,
                        height: 50,
                        border: '2px dashed #7a9ab0',
                        borderRadius: '50% 50% 0 0',
                        opacity: 0.5,
                        animation: 'cage-pulse 0.3s ease-out'
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

          <ButterflyCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            plants={plants}
            gridSize={GRID_SIZE}
            onButterflyClick={handleButterflyClick}
            onNectarConsume={handleNectarConsume}
            onPlantVisit={handlePlantVisit}
            selectedButterflyId={selectedButterfly?.id || null}
            capturedButterflyIds={capturedIds}
          />

          {releaseAnimation && (
            <div
              style={{
                position: 'absolute',
                left: releaseAnimation.targetX - 20,
                top: releaseAnimation.targetY - 20,
                width: 40,
                height: 40,
                animation: 'release-spiral 0.8s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 5
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <ellipse cx="15" cy="20" rx="8" ry="12" fill="#FFD700" opacity="0.8" />
                <ellipse cx="25" cy="20" rx="8" ry="12" fill="#FFD700" opacity="0.8" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {selectedButterfly && (
        <div
          style={{
            width: 220,
            backgroundColor: '#2c3e50',
            borderRadius: 8,
            padding: 16,
            color: '#ecf0f1',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontFamily: "'Crimson Text', serif" }}>
            {selectedButterfly.speciesName}
          </h3>

          <div style={{ fontSize: 13, lineHeight: 1.8, color: '#bdc3c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>翅膀展宽:</span>
              <span style={{ color: '#ecf0f1' }}>{selectedButterfly.wingspanMm}mm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>触角长度比:</span>
              <span style={{ color: '#ecf0f1' }}>{selectedButterfly.antennaeRatio.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>翅膀主色:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 3,
                  backgroundColor: selectedButterfly.primaryColor,
                  border: '1px solid rgba(255,255,255,0.3)'
                }} />
                <span style={{ color: '#ecf0f1', fontSize: 11 }}>{selectedButterfly.primaryColor}</span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>翅膀辅色:</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  width: 16, height: 16, borderRadius: 3,
                  backgroundColor: selectedButterfly.secondaryColor,
                  border: '1px solid rgba(255,255,255,0.3)'
                }} />
                <span style={{ color: '#ecf0f1', fontSize: 11 }}>{selectedButterfly.secondaryColor}</span>
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>斑纹密度:</span>
              <span style={{ color: '#ecf0f1' }}>{selectedButterfly.patternDensity}%</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ marginBottom: 6 }}>蜜源偏好 (前3种):</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {selectedButterfly.nectarPreferences.slice(0, 3).map((pref, i) => {
                  const plantData = Object.values(PLANT_DATA).find(p => p.type === pref);
                  return (
                    <div key={pref} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 12
                    }}>
                      <span style={{ color: '#f39c12' }}>{i + 1}.</span>
                      <span style={{ color: '#ecf0f1' }}>{plantData?.name || pref}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            onClick={handleCapture}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '10px 16px',
              background: 'linear-gradient(180deg, #5c8a5c 0%, #7ab07a 100%)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 5,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'filter 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            <span style={{ fontSize: 18 }}>🥅</span>
            捕获
          </button>
        </div>
      )}
    </div>
  );
};

export default ButterflyGarden;

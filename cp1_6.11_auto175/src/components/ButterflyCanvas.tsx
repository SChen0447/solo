import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FlyingButterfly, PlacedPlant, Butterfly } from '../types';
import { drawButterfly } from '../utils/butterflyRenderer';
import {
  createWildButterfly,
  generateBezierPath,
  getPointOnBezier
} from '../utils/butterflyEngine';
import { ButterflySpecies } from '../types';
import { PLANT_DATA } from '../utils/plantData';

interface ButterflyCanvasProps {
  width: number;
  height: number;
  plants: PlacedPlant[];
  gridSize: number;
  onButterflyClick?: (butterfly: FlyingButterfly) => void;
  onNectarConsume?: (plantId: string, amount: number) => void;
  onPlantVisit?: (plantId: string) => void;
  selectedButterflyId?: string | null;
  capturedButterflyIds?: string[];
}

const ButterflyCanvas: React.FC<ButterflyCanvasProps> = ({
  width,
  height,
  plants,
  gridSize,
  onButterflyClick,
  onNectarConsume,
  onPlantVisit,
  selectedButterflyId,
  capturedButterflyIds = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const butterfliesRef = useRef<FlyingButterfly[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastSpawnRef = useRef<number>(Date.now());
  const nextSpawnIntervalRef = useRef<number>(3000 + Math.random() * 4000);
  const frameCountRef = useRef<number>(0);
  const [hoveredButterfly, setHoveredButterfly] = useState<FlyingButterfly | null>(null);
  const [hoverStartTime, setHoverStartTime] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const speciesList: ButterflySpecies[] = ['citrus_swallowtail', 'golden_pansy', 'dead_leaf', 'cabbage_white'];

  const getPlantWorldPosition = useCallback((plant: PlacedPlant) => {
    return {
      x: plant.gridX * gridSize + gridSize / 2,
      y: plant.gridY * gridSize + gridSize / 2
    };
  }, [gridSize]);

  const findNearestPlant = useCallback((x: number, y: number): { plant: PlacedPlant; distance: number; pos: { x: number; y: number } } | null => {
    let nearest = null;
    let minDist = Infinity;

    for (const plant of plants) {
      const pos = getPlantWorldPosition(plant);
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = { plant, distance: dist, pos };
      }
    }

    return nearest;
  }, [plants, getPlantWorldPosition]);

  const buildSpatialHash = useCallback((butterflies: FlyingButterfly[], cellSize: number) => {
    const grid: Map<string, FlyingButterfly[]> = new Map();

    for (const b of butterflies) {
      const key = `${Math.floor(b.x / cellSize)},${Math.floor(b.y / cellSize)}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(b);
    }

    return grid;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      frameCountRef.current++;

      const now = Date.now();

      if (now - lastSpawnRef.current > nextSpawnIntervalRef.current
        && butterfliesRef.current.length < 8) {
        const species = speciesList[Math.floor(Math.random() * speciesList.length)];
        const butterfly = createWildButterfly(species);

        const side = Math.floor(Math.random() * 4);
        switch (side) {
          case 0: butterfly.x = -30; butterfly.y = Math.random() * height; break;
          case 1: butterfly.x = width + 30; butterfly.y = Math.random() * height; break;
          case 2: butterfly.x = Math.random() * width; butterfly.y = -30; break;
          default: butterfly.x = Math.random() * width; butterfly.y = height + 30; break;
        }

        butterfly.targetX = 50 + Math.random() * (width - 100);
        butterfly.targetY = 50 + Math.random() * (height - 100);
        butterfly.bezierPoints = generateBezierPath(butterfly.x, butterfly.y, butterfly.targetX, butterfly.targetY);
        butterfly.pathProgress = 0;

        butterfliesRef.current.push(butterfly);
        lastSpawnRef.current = now;
        nextSpawnIntervalRef.current = 3000 + Math.random() * 4000;
      }

      const activeButterflies = butterfliesRef.current.filter(
        b => !capturedButterflyIds.includes(b.id)
      );

      for (const butterfly of activeButterflies) {
        butterfly.wingPhase += deltaTime * 15;

        if (butterfly.isHovering) {
          butterfly.antennaeWiggle += deltaTime * 10;

          if (now > butterfly.hoverEndTime) {
            butterfly.isHovering = false;
            butterfly.hoverPlantId = undefined;
            butterfly.targetX = 50 + Math.random() * (width - 100);
            butterfly.targetY = 50 + Math.random() * (height - 100);
            butterfly.bezierPoints = generateBezierPath(
              butterfly.x, butterfly.y,
              butterfly.targetX, butterfly.targetY
            );
            butterfly.pathProgress = 0;
          }
        } else {
          butterfly.pathProgress += deltaTime * butterfly.speed * 0.3;

          if (butterfly.pathProgress >= 1 || butterfly.bezierPoints.length < 4) {
            const nearest = findNearestPlant(butterfly.x, butterfly.y);

            if (nearest && nearest.distance < 60 && nearest.plant.nectar > 10) {
              const attractionScore = PLANT_DATA[nearest.plant.type].butterflyPreference.indexOf(butterfly.species) !== -1;
              if (attractionScore || Math.random() < 0.3) {
                butterfly.isHovering = true;
                butterfly.hoverEndTime = now + 2000 + Math.random() * 2000;
                butterfly.hoverPlantId = nearest.plant.id;
                butterfly.x = nearest.pos.x;
                butterfly.y = nearest.pos.y - 10;

                const consumeAmount = 8 + Math.random() * 7;
                onNectarConsume?.(nearest.plant.id, consumeAmount);
                onPlantVisit?.(nearest.plant.id);
                continue;
              }
            }

            butterfly.targetX = 50 + Math.random() * (width - 100);
            butterfly.targetY = 50 + Math.random() * (height - 100);
            butterfly.bezierPoints = generateBezierPath(
              butterfly.x, butterfly.y,
              butterfly.targetX, butterfly.targetY
            );
            butterfly.pathProgress = 0;
          }

          const point = getPointOnBezier(butterfly.bezierPoints, butterfly.pathProgress);
          butterfly.x = point.x;
          butterfly.y = point.y;
        }
      }

      butterfliesRef.current = butterfliesRef.current.filter(
        b => b.isWild && !capturedButterflyIds.includes(b.id)
      );

      ctx.clearRect(0, 0, width, height);

      if (frameCountRef.current % 2 === 0) {
        for (const butterfly of activeButterflies) {
          drawButterfly(ctx, butterfly, 1);
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [width, height, plants, findNearestPlant, capturedButterflyIds, onNectarConsume, onPlantVisit]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activeButterflies = butterfliesRef.current.filter(
      b => !capturedButterflyIds.includes(b.id)
    );

    let found: FlyingButterfly | null = null;
    for (const b of activeButterflies) {
      const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
      if (dist < 25 * b.wingSize) {
        found = b;
        break;
      }
    }

    if (found) {
      if (!hoveredButterfly || found.id !== hoveredButterfly.id) {
        setHoveredButterfly(found);
        setHoverStartTime(Date.now());
        setShowTooltip(false);
      } else if (!showTooltip && Date.now() - hoverStartTime > 1500) {
        setShowTooltip(true);
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      setHoveredButterfly(null);
      setShowTooltip(false);
    }
  }, [hoveredButterfly, hoverStartTime, showTooltip, capturedButterflyIds]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const activeButterflies = butterfliesRef.current.filter(
      b => !capturedButterflyIds.includes(b.id)
    );

    for (const b of activeButterflies) {
      const dist = Math.sqrt((x - b.x) ** 2 + (y - b.y) ** 2);
      if (dist < 30 * b.wingSize) {
        onButterflyClick?.(b);
        break;
      }
    }
  }, [onButterflyClick, capturedButterflyIds]);

  const getHoveredPlantName = () => {
    if (!hoveredButterfly?.hoverPlantId) return '飞行中';
    const plant = plants.find(p => p.id === hoveredButterfly.hoverPlantId);
    return plant ? PLANT_DATA[plant.type].name : '飞行中';
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          borderRadius: 8,
          cursor: hoveredButterfly ? 'pointer' : 'default'
        }}
      />
      {showTooltip && hoveredButterfly && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.x + 15,
            top: tooltipPos.y - 10,
            backgroundColor: 'rgba(44, 62, 80, 0.95)',
            color: '#ecf0f1',
            padding: '10px 14px',
            borderRadius: 8,
            fontSize: 13,
            pointerEvents: 'none',
            zIndex: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: 150
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>
            {hoveredButterfly.speciesName}
          </div>
          <div style={{ color: '#bdc3c7', fontSize: 12, lineHeight: 1.6 }}>
            <div>翅膀展宽: {hoveredButterfly.wingspanMm}mm</div>
            <div>蜜源植物: {getHoveredPlantName()}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ButterflyCanvas;

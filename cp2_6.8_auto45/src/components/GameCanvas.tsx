import { useRef, useEffect, useCallback } from 'react';
import { GameEngine } from '../GameEngine';
import { Renderer } from '../Renderer';
import { DEFAULT_CONFIG } from '../types';

interface GameCanvasProps {
  engine: GameEngine | null;
  onRendererReady?: (renderer: Renderer) => void;
}

export function GameCanvas({ engine, onRendererReady }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const dragTowerRef = useRef<{ id: number; offsetX: number; offsetY: number } | null>(null);

  const getCanvasCoords = useCallback((e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!engine) return;

    const { x, y } = getCanvasCoords(e);
    const tower = engine.getTowerAtPosition(x, y);

    if (tower && !tower.isPlaced) {
      dragTowerRef.current = {
        id: tower.id,
        offsetX: x - tower.position.x,
        offsetY: y - tower.position.y
      };
      engine.setTowerDragging(tower.id, true);
    }
  }, [engine, getCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!engine || !dragTowerRef.current) return;

    const { x, y } = getCanvasCoords(e);
    const { id, offsetX, offsetY } = dragTowerRef.current;
    engine.setTowerPosition(id, x - offsetX, y - offsetY);
  }, [engine, getCanvasCoords]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!engine || !dragTowerRef.current) return;

    const { id } = dragTowerRef.current;
    const { x, y } = getCanvasCoords(e);

    const tower = engine.towerManager.getTowerById(id);
    if (tower && x > 50 && x < DEFAULT_CONFIG.canvasWidth - 50 && y > 50 && y < DEFAULT_CONFIG.canvasHeight - 50) {
      engine.placeTower(id);
    }

    engine.setTowerDragging(id, false);
    dragTowerRef.current = null;
  }, [engine, getCanvasCoords]);

  useEffect(() => {
    if (!canvasRef.current || !engine) return;

    const renderer = new Renderer(canvasRef.current, engine, DEFAULT_CONFIG);
    rendererRef.current = renderer;
    renderer.start();

    if (onRendererReady) {
      onRendererReady(renderer);
    }

    const handleResize = () => {
      renderer.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.stop();
    };
  }, [engine, onRendererReady]);

  return (
    <div className="game-canvas-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
}

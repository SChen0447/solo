import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Layer,
  StickerLayer,
  TextLayer,
  PhotoLayer,
  DrawingLayer,
  DrawingPath,
  BrushType,
  ContextMenuPosition,
  EditPanelState,
  BRUSH_SIZES,
  MIN_SCALE,
  MAX_SCALE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLOR_PALETTE,
} from '../types';

interface CollageCanvasProps {
  layers: Layer[];
  selectedLayerId: string | null;
  activeTool: 'select' | 'brush';
  activeBrush: BrushType;
  activeColor: string;
  canvasRef: React.RefObject<HTMLDivElement>;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  onContextMenu: (layerId: string, position: ContextMenuPosition) => void;
  onDoubleClick: (layerId: string, position: ContextMenuPosition) => void;
  onAddDrawingPath: (path: DrawingPath) => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';

interface InteractionState {
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  isDrawing: boolean;
  resizeHandle: ResizeHandle | null;
  startX: number;
  startY: number;
  startLayerX: number;
  startLayerY: number;
  startWidth: number;
  startHeight: number;
  startRotation: number;
  layerId: string | null;
  centerX: number;
  centerY: number;
  drawingPath: DrawingPath | null;
}

const CollageCanvas: React.FC<CollageCanvasProps> = ({
  layers,
  selectedLayerId,
  activeTool,
  activeBrush,
  activeColor,
  canvasRef,
  onSelectLayer,
  onUpdateLayer,
  onContextMenu,
  onDoubleClick,
  onAddDrawingPath,
}) => {
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);

  const interactionRef = useRef<InteractionState>({
    isDragging: false,
    isResizing: false,
    isRotating: false,
    isDrawing: false,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    startLayerX: 0,
    startLayerY: 0,
    startWidth: 0,
    startHeight: 0,
    startRotation: 0,
    layerId: null,
    centerX: 0,
    centerY: 0,
    drawingPath: null,
  });

  const rafIdRef = useRef<number | null>(null);

  const getCanvasCoordinates = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, [canvasRef]);

  const getLayerCenter = useCallback((layer: Layer) => {
    return {
      x: layer.x + layer.width / 2,
      y: layer.y + layer.height / 2,
    };
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawingLayers = layers.filter(l => l.type === 'drawing') as DrawingLayer[];
    drawingLayers.forEach(layer => {
      layer.paths.forEach(path => {
        drawPath(ctx, path);
      });
    });

    const interaction = interactionRef.current;
    if (interaction.drawingPath && interaction.isDrawing) {
      drawPath(ctx, interaction.drawingPath);
    }
  }, [layers]);

  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 1) return;

    ctx.save();
    ctx.strokeStyle = path.color;
    ctx.lineWidth = BRUSH_SIZES[path.brushType];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (path.isStraightLine && path.points.length >= 2) {
      const start = path.points[0];
      const end = path.points[path.points.length - 1];
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i];
        const prevPoint = path.points[i - 1];
        const midX = (prevPoint.x + point.x) / 2;
        const midY = (prevPoint.y + point.y) / 2;
        ctx.quadraticCurveTo(prevPoint.x, prevPoint.y, midX, midY);
      }
      if (path.points.length > 1) {
        const last = path.points[path.points.length - 1];
        ctx.lineTo(last.x, last.y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const interaction = interactionRef.current;

    if (activeTool === 'brush') {
      interaction.isDrawing = true;
      interaction.drawingPath = {
        points: [{ x, y }],
        brushType: activeBrush,
        color: activeColor,
        isStraightLine: e.shiftKey,
      };
      redrawCanvas();
      return;
    }

    const target = e.target as HTMLElement;
    const layerElement = target.closest('[data-layer-id]');
    const handleElement = target.closest('[data-handle]');
    const rotateElement = target.closest('[data-rotate]');

    if (handleElement) {
      const handle = handleElement.getAttribute('data-handle') as ResizeHandle;
      const layerId = layerElement?.getAttribute('data-layer-id');
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      interaction.isResizing = true;
      interaction.resizeHandle = handle;
      interaction.startX = e.clientX;
      interaction.startY = e.clientY;
      interaction.startLayerX = layer.x;
      interaction.startLayerY = layer.y;
      interaction.startWidth = layer.width;
      interaction.startHeight = layer.height;
      interaction.layerId = layer.id;

      const center = getLayerCenter(layer);
      interaction.centerX = center.x;
      interaction.centerY = center.y;
    } else if (rotateElement) {
      const layerId = layerElement?.getAttribute('data-layer-id');
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      interaction.isRotating = true;
      interaction.startX = e.clientX;
      interaction.startY = e.clientY;
      interaction.startRotation = layer.rotation;
      interaction.layerId = layer.id;
      setIsRotating(true);
      setCurrentRotation(layer.rotation);

      const center = getLayerCenter(layer);
      interaction.centerX = center.x;
      interaction.centerY = center.y;
    } else if (layerElement) {
      const layerId = layerElement.getAttribute('data-layer-id');
      const layer = layers.find(l => l.id === layerId);
      if (!layer) return;

      onSelectLayer(layer.id);
      interaction.isDragging = true;
      interaction.startX = e.clientX;
      interaction.startY = e.clientY;
      interaction.startLayerX = layer.x;
      interaction.startLayerY = layer.y;
      interaction.layerId = layer.id;
    } else {
      onSelectLayer(null);
    }
  }, [activeTool, activeBrush, activeColor, layers, canvasRef, getCanvasCoordinates, getLayerCenter, onSelectLayer, redrawCanvas]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const interaction = interactionRef.current;

    if (interaction.isDrawing && interaction.drawingPath) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      
      if (interaction.drawingPath.isStraightLine) {
        interaction.drawingPath.points = [
          interaction.drawingPath.points[0],
          { x, y },
        ];
      } else {
        interaction.drawingPath.points.push({ x, y });
      }

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(() => {
        redrawCanvas();
      });
      return;
    }

    if (!interaction.isDragging && !interaction.isResizing && !interaction.isRotating) return;
    if (!interaction.layerId) return;

    const layer = layers.find(l => l.id === interaction.layerId);
    if (!layer) return;

    if (interaction.isDragging && !e.ctrlKey && !e.shiftKey) {
      const deltaX = e.clientX - interaction.startX;
      const deltaY = e.clientY - interaction.startY;
      const newX = Math.max(0, Math.min(CANVAS_WIDTH - layer.width, interaction.startLayerX + deltaX));
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT - layer.height, interaction.startLayerY + deltaY));

      onUpdateLayer(interaction.layerId, { x: newX, y: newY });
    } else if (interaction.isResizing && e.shiftKey) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      const handle = interaction.resizeHandle;

      let scaleX = 1;
      let scaleY = 1;
      let newX = interaction.startLayerX;
      let newY = interaction.startLayerY;

      const originalDiag = Math.sqrt(
        Math.pow(interaction.startWidth, 2) + Math.pow(interaction.startHeight, 2)
      );

      if (handle === 'se') {
        const newDiag = Math.sqrt(
          Math.pow(x - interaction.startLayerX, 2) + Math.pow(y - interaction.startLayerY, 2)
        );
        scaleX = scaleY = Math.min(Math.max(MIN_SCALE, newDiag / originalDiag), MAX_SCALE);
      } else if (handle === 'sw') {
        const newDiag = Math.sqrt(
          Math.pow(interaction.startLayerX + interaction.startWidth - x, 2) +
          Math.pow(y - interaction.startLayerY, 2)
        );
        scaleX = scaleY = Math.min(Math.max(MIN_SCALE, newDiag / originalDiag), MAX_SCALE);
        newX = interaction.startLayerX + interaction.startWidth * (1 - scaleX);
      } else if (handle === 'ne') {
        const newDiag = Math.sqrt(
          Math.pow(x - interaction.startLayerX, 2) +
          Math.pow(interaction.startLayerY + interaction.startHeight - y, 2)
        );
        scaleX = scaleY = Math.min(Math.max(MIN_SCALE, newDiag / originalDiag), MAX_SCALE);
        newY = interaction.startLayerY + interaction.startHeight * (1 - scaleY);
      } else if (handle === 'nw') {
        const newDiag = Math.sqrt(
          Math.pow(interaction.startLayerX + interaction.startWidth - x, 2) +
          Math.pow(interaction.startLayerY + interaction.startHeight - y, 2)
        );
        scaleX = scaleY = Math.min(Math.max(MIN_SCALE, newDiag / originalDiag), MAX_SCALE);
        newX = interaction.startLayerX + interaction.startWidth * (1 - scaleX);
        newY = interaction.startLayerY + interaction.startHeight * (1 - scaleY);
      }

      const newWidth = interaction.startWidth * scaleX;
      const newHeight = interaction.startHeight * scaleY;

      onUpdateLayer(interaction.layerId, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      });
    } else if (interaction.isRotating && e.ctrlKey) {
      const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
      
      const startAngle = Math.atan2(
        interaction.startY - (canvasRef.current?.getBoundingClientRect().top || 0) - interaction.centerY,
        interaction.startX - (canvasRef.current?.getBoundingClientRect().left || 0) - interaction.centerX
      );
      const currentAngle = Math.atan2(y - interaction.centerY, x - interaction.centerX);
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);
      let newRotation = Math.round(interaction.startRotation + deltaAngle);
      newRotation = ((newRotation % 360) + 360) % 360;

      setCurrentRotation(newRotation);
      onUpdateLayer(interaction.layerId, { rotation: newRotation });
    }
  }, [layers, getCanvasCoordinates, onUpdateLayer, redrawCanvas, canvasRef]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    const interaction = interactionRef.current;

    if (interaction.isDrawing && interaction.drawingPath) {
      if (interaction.drawingPath.points.length > 1) {
        onAddDrawingPath(interaction.drawingPath);
      }
      interaction.isDrawing = false;
      interaction.drawingPath = null;
      redrawCanvas();
    }

    if (interaction.isRotating) {
      setIsRotating(false);
    }

    interaction.isDragging = false;
    interaction.isResizing = false;
    interaction.isRotating = false;
    interaction.resizeHandle = null;
    interaction.layerId = null;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, [onAddDrawingPath, redrawCanvas]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const layerElement = target.closest('[data-layer-id]');
    
    if (layerElement) {
      const layerId = layerElement.getAttribute('data-layer-id');
      if (layerId) {
        onSelectLayer(layerId);
        onContextMenu(layerId, { x: e.clientX, y: e.clientY });
      }
    }
  }, [onSelectLayer, onContextMenu]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const layerElement = target.closest('[data-layer-id]');
    
    if (layerElement) {
      const layerId = layerElement.getAttribute('data-layer-id');
      if (layerId) {
        onSelectLayer(layerId);
        onDoubleClick(layerId, { x: e.clientX, y: e.clientY });
      }
    }
  }, [onSelectLayer, onDoubleClick]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const renderLayerContent = (layer: Layer) => {
    switch (layer.type) {
      case 'sticker':
        return (
          <div
            className="layer-content sticker"
            style={{ color: (layer as StickerLayer).color }}
          >
            {(layer as StickerLayer).emoji}
          </div>
        );
      case 'text':
        return (
          <div
            className="layer-content text"
            style={{
              fontSize: `${(layer as TextLayer).fontSize}px`,
              color: (layer as TextLayer).color,
              fontFamily: (layer as TextLayer).fontFamily,
            }}
          >
            {(layer as TextLayer).content}
          </div>
        );
      case 'photo':
        return (
          <div className="layer-content photo">
            <img
              src={(layer as PhotoLayer).imageUrl}
              alt=""
              style={{
                filter: `brightness(${(layer as PhotoLayer).brightness}%) contrast(${(layer as PhotoLayer).contrast}%)`,
              }}
            />
          </div>
        );
      default:
        return null;
    }
  };

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const visibleLayers = sortedLayers.filter(l => l.type !== 'drawing');

  return (
    <div
      ref={canvasRef}
      className={`collage-canvas ${activeTool === 'brush' ? 'brush-active' : ''}`}
      onMouseDown={handleMouseDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={handleDoubleClick}
    >
      {visibleLayers.map(layer => (
        <div
          key={layer.id}
          data-layer-id={layer.id}
          className={`canvas-layer ${layer.id === selectedLayerId ? 'selected' : ''} ${
            layer.filter !== 'none' ? `filter-${layer.filter}` : ''
          }`}
          style={{
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            transform: `translate3d(0, 0, 0) rotate(${layer.rotation}deg)`,
            zIndex: layer.zIndex,
          }}
        >
          {layer.filter !== 'none' && (
            <div className="layer-filter-indicator">
              <div className={`filter-band ${layer.filter}`} />
            </div>
          )}
          {renderLayerContent(layer)}
          {layer.id === selectedLayerId && (
            <div className="layer-handles">
              {isRotating && (
                <div className="rotation-indicator">{currentRotation}°</div>
              )}
              <div className="rotate-line" />
              <div className="rotate-handle" data-rotate="true" />
              <div className="resize-handle nw" data-handle="nw" />
              <div className="resize-handle ne" data-handle="ne" />
              <div className="resize-handle sw" data-handle="sw" />
              <div className="resize-handle se" data-handle="se" />
            </div>
          )}
        </div>
      ))}
      <canvas
        ref={drawingCanvasRef}
        className={`drawing-canvas ${activeTool === 'brush' ? 'active' : ''}`}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
    </div>
  );
};

CollageCanvas.displayName = 'CollageCanvas';

export default CollageCanvas;

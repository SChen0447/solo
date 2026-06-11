import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Layer } from '../types';

interface CanvasProps {
  layers: Layer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onUpdateLayer: (id: string, updates: Partial<Layer>) => void;
  onAddImageLayers: (files: FileList) => void;
  onEditText: (id: string) => void;
  onExport: () => void;
  exporting: boolean;
  exportProgress: number;
}

const Canvas: React.FC<CanvasProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onAddImageLayers,
  onEditText,
  onExport,
  exporting,
  exportProgress,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragState, setDragState] = useState<{
    layerId: string;
    startX: number;
    startY: number;
    layerStartX: number;
    layerStartY: number;
  } | null>(null);
  const [resizeState, setResizeState] = useState<{
    layerId: string;
    corner: string;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    startLeft: number;
    startTop: number;
  } | null>(null);
  const [rotateState, setRotateState] = useState<{
    layerId: string;
    startAngle: number;
    startRotation: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onAddImageLayers(files);
      }
    },
    [onAddImageLayers]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
        onSelectLayer(null);
      }
    },
    [onSelectLayer]
  );

  const handleLayerMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.stopPropagation();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer || layer.isEditing) return;
      onSelectLayer(layerId);
      setDragState({
        layerId,
        startX: e.clientX,
        startY: e.clientY,
        layerStartX: layer.x,
        layerStartY: layer.y,
      });
    },
    [layers, onSelectLayer]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string, corner: string) => {
      e.stopPropagation();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;
      setResizeState({
        layerId,
        corner,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: layer.width,
        startHeight: layer.height,
        startLeft: layer.x,
        startTop: layer.y,
      });
    },
    [layers]
  );

  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent, layerId: string) => {
      e.stopPropagation();
      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      const el = document.getElementById(`layer-${layerId}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const startAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);

      setRotateState({
        layerId,
        startAngle,
        startRotation: layer.rotation,
        centerX,
        centerY,
      });
    },
    [layers]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState) {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        onUpdateLayer(dragState.layerId, {
          x: dragState.layerStartX + dx,
          y: dragState.layerStartY + dy,
        });
      }
      if (resizeState) {
        const dx = e.clientX - resizeState.startX;
        const dy = e.clientY - resizeState.startY;
        const aspect = resizeState.startWidth / resizeState.startHeight;
        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;

        if (resizeState.corner === 'se') {
          newWidth = Math.max(40, resizeState.startWidth + dx);
          newHeight = newWidth / aspect;
        } else if (resizeState.corner === 'sw') {
          newWidth = Math.max(40, resizeState.startWidth - dx);
          newHeight = newWidth / aspect;
        } else if (resizeState.corner === 'ne') {
          newWidth = Math.max(40, resizeState.startWidth + dx);
          newHeight = newWidth / aspect;
        } else if (resizeState.corner === 'nw') {
          newWidth = Math.max(40, resizeState.startWidth - dx);
          newHeight = newWidth / aspect;
        }
        onUpdateLayer(resizeState.layerId, {
          width: newWidth,
          height: newHeight,
        });
      }
      if (rotateState) {
        const angle = Math.atan2(e.clientY - rotateState.centerY, e.clientX - rotateState.centerX) * (180 / Math.PI);
        const newRotation = rotateState.startRotation + (angle - rotateState.startAngle);
        onUpdateLayer(rotateState.layerId, { rotation: newRotation });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      setResizeState(null);
      setRotateState(null);
    };

    if (dragState || resizeState || rotateState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, resizeState, rotateState, onUpdateLayer]);

  const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

  const isInteracting = dragState || resizeState || rotateState;

  return (
    <div
      ref={canvasRef}
      className="canvas-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
    >
      <div className="canvas-bg">
        {dragOver && <div className="canvas-drop-overlay">拖放图片到此处</div>}

        {sortedLayers.map((layer) => (
          <div
            key={layer.id}
            id={`layer-${layer.id}`}
            className={`canvas-layer ${selectedLayerId === layer.id ? 'canvas-layer-selected' : ''} ${isInteracting ? 'canvas-layer-interacting' : ''}`}
            style={{
              left: layer.x,
              top: layer.y,
              width: layer.width,
              height: layer.height,
              transform: `rotate(${layer.rotation}deg)`,
              zIndex: layer.zIndex,
              transition: isInteracting && dragState?.layerId !== layer.id ? 'transform 0.2s ease, box-shadow 0.2s ease' : 'box-shadow 0.2s ease',
            }}
            onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
            onDoubleClick={() => {
              if (layer.type === 'text') onEditText(layer.id);
            }}
          >
            {layer.type === 'image' && layer.imageUrl && (
              <img
                src={layer.imageUrl}
                alt=""
                draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', borderRadius: 4 }}
              />
            )}
            {layer.type === 'text' && (
              <div
                className={`text-layer-content ${layer.isEditing ? 'text-layer-editing' : ''}`}
                style={{
                  fontFamily: layer.fontFamily,
                  fontSize: layer.fontSize,
                  color: layer.fontColor,
                }}
              >
                {layer.isEditing ? (
                  <textarea
                    className="text-layer-textarea"
                    defaultValue={layer.text}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      onUpdateLayer(layer.id, { text: e.target.value, isEditing: false });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        onUpdateLayer(layer.id, { isEditing: false });
                      }
                    }}
                    style={{
                      fontFamily: layer.fontFamily,
                      fontSize: layer.fontSize,
                      color: layer.fontColor,
                    }}
                  />
                ) : (
                  <span className="text-layer-span">{layer.text}</span>
                )}
              </div>
            )}

            {selectedLayerId === layer.id && (
              <>
                <div className="resize-handle resize-handle-nw" onMouseDown={(e) => handleResizeMouseDown(e, layer.id, 'nw')} />
                <div className="resize-handle resize-handle-ne" onMouseDown={(e) => handleResizeMouseDown(e, layer.id, 'ne')} />
                <div className="resize-handle resize-handle-sw" onMouseDown={(e) => handleResizeMouseDown(e, layer.id, 'sw')} />
                <div className="resize-handle resize-handle-se" onMouseDown={(e) => handleResizeMouseDown(e, layer.id, 'se')} />
                <div className="rotate-handle" onMouseDown={(e) => handleRotateMouseDown(e, layer.id)} />
              </>
            )}
          </div>
        ))}

        {layers.length === 0 && !dragOver && (
          <div className="canvas-empty-hint">
            <div className="canvas-empty-icon">📷</div>
            <div>拖拽图片到画布</div>
            <div className="canvas-empty-sub">支持 JPG / PNG / WebP</div>
          </div>
        )}
      </div>

      {exporting && (
        <div className="export-overlay">
          <div className="export-progress-container">
            <div className="export-progress-bar" style={{ width: `${exportProgress}%` }} />
          </div>
          <div className="export-progress-text">导出中 {exportProgress}%</div>
        </div>
      )}

      <button
        className="canvas-export-btn"
        onClick={onExport}
        disabled={exporting}
        title="导出为PNG"
      >
        {exporting ? '导出中...' : '导出为PNG'}
      </button>
    </div>
  );
};

export default Canvas;

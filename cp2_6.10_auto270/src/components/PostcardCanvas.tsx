import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CanvasElement, fontFamilies } from '../utils/colorPalette';

interface PostcardCanvasProps {
  mode: 'front' | 'back';
  elements: CanvasElement[];
  setElements: (elements: CanvasElement[]) => void;
  currentFont: string;
  currentFontSize: number;
  currentColor: string;
  currentAlign: 'left' | 'center' | 'right';
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

const CANVAS_WIDTH = 620;
const CANVAS_HEIGHT = 874;
const SCALE = 0.5;

const PostcardCanvas: React.FC<PostcardCanvasProps> = ({
  mode,
  elements,
  setElements,
  currentFont,
  currentFontSize,
  currentColor,
  currentAlign,
  selectedId,
  setSelectedId,
  canvasRef,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [contextMenuElementId, setContextMenuElementId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / SCALE;
    const y = (e.clientY - rect.top) / SCALE;

    const newElement: CanvasElement = {
      id: uuidv4(),
      type: 'text',
      x,
      y,
      width: 200,
      height: 40,
      rotation: 0,
      opacity: 1,
      zIndex: elements.length + 1,
      content: '点击编辑文字',
      fontFamily: currentFont,
      fontSize: currentFontSize,
      color: currentColor,
      textAlign: currentAlign,
    };

    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  };

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  }, [elements, setElements]);

  const handleWheel = (e: React.WheelEvent, element: CanvasElement) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      const delta = e.deltaY > 0 ? 15 : -15;
      updateElement(element.id, { rotation: element.rotation + delta });
    } else {
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newWidth = Math.max(50, Math.min(400, element.width * delta));
      const newHeight = Math.max(50, Math.min(400, element.height * delta));
      const scale = newWidth / element.width;
      updateElement(element.id, {
        width: newWidth,
        height: newHeight,
        x: element.x - (newWidth - element.width) / 2,
        y: element.y - (newHeight - element.height) / 2,
      });
    }
  };

  const handleDoubleClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setContextMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setContextMenuElementId(elementId);
    setShowContextMenu(true);
  };

  const handleTextChange = (id: string, content: string) => {
    updateElement(id, { content });
  };

  const handleOpacityChange = (opacity: number) => {
    if (contextMenuElementId) {
      updateElement(contextMenuElementId, { opacity });
    }
  };

  const bringToFront = () => {
    if (!contextMenuElementId) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex));
    updateElement(contextMenuElementId, { zIndex: maxZ + 1 });
    setShowContextMenu(false);
  };

  const sendToBack = () => {
    if (!contextMenuElementId) return;
    const minZ = Math.min(...elements.map((e) => e.zIndex));
    updateElement(contextMenuElementId, { zIndex: minZ - 1 });
    setShowContextMenu(false);
  };

  const deleteElement = () => {
    if (!contextMenuElementId) return;
    setElements(elements.filter((el) => el.id !== contextMenuElementId));
    setSelectedId(null);
    setShowContextMenu(false);
  };

  const renderGrid = () => {
    if (mode !== 'back') return null;
    const lines = [];
    const step = 20 / SCALE;
    for (let x = step; x < CANVAS_WIDTH / SCALE; x += step) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={CANVAS_HEIGHT / SCALE}
          stroke="#999"
          strokeWidth="0.5"
          strokeDasharray="4 4"
          opacity="0.3"
        />
      );
    }
    for (let y = step; y < CANVAS_HEIGHT / SCALE; y += step) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={CANVAS_WIDTH / SCALE}
          y2={y}
          stroke="#999"
          strokeWidth="0.5"
          strokeDasharray="4 4"
          opacity="0.3"
        />
      );
    }
    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        width={CANVAS_WIDTH / SCALE}
        height={CANVAS_HEIGHT / SCALE}
        style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}
      >
        {lines}
      </svg>
    );
  };

  const renderAddressLines = () => {
    if (mode !== 'back') return null;
    const lineY = [CANVAS_HEIGHT / SCALE / 2 - 16, CANVAS_HEIGHT / SCALE / 2, CANVAS_HEIGHT / SCALE / 2 + 16];
    return (
      <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
        {lineY.map((y, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 60,
              top: y / SCALE,
              width: (CANVAS_WIDTH / SCALE - 120),
              height: 1,
              backgroundColor: '#666',
            }}
          />
        ))}
      </div>
    );
  };

  const renderStampArea = () => {
    if (mode !== 'back') return null;
    return (
      <div className="absolute pointer-events-none" style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>
        <div
          style={{
            position: 'absolute',
            right: 20 / SCALE,
            top: 20 / SCALE,
            width: 123 / SCALE,
            height: 172 / SCALE,
            border: '2px dashed #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
            fontSize: 10,
            fontFamily: "'Courier Prime', monospace",
          }}
        >
          邮票区
        </div>
      </div>
    );
  };

  const renderElement = (element: CanvasElement) => {
    const isSelected = selectedId === element.id;
    const isHovered = hoveredId === element.id;

    const commonStyle: React.CSSProperties = {
      position: 'absolute',
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation}deg)`,
      opacity: element.opacity,
      zIndex: element.zIndex,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: 'box-shadow 0.15s ease, border 0.15s ease',
      border: isSelected
        ? '2px solid #7ab4d4'
        : isHovered
        ? '2px dashed #7ab4d4'
        : '2px solid transparent',
      boxShadow: isSelected ? '0 0 6px #7ab4d4' : 'none',
    };

    return (
      <motion.div
        key={element.id}
        drag
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setIsDragging(false)}
        style={commonStyle}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedId(element.id);
        }}
        onMouseEnter={() => setHoveredId(element.id)}
        onMouseLeave={() => setHoveredId(null)}
        onWheel={(e) => handleWheel(e, element)}
        onDoubleClick={(e) => handleDoubleClick(e, element.id)}
        animate={{ x: 0, y: 0 }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
      >
        {element.type === 'text' && (
          <div
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => handleTextChange(element.id, e.currentTarget.innerText)}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              fontFamily: element.fontFamily,
              fontSize: `${element.fontSize}px`,
              color: element.color,
              textAlign: element.textAlign,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden',
              userSelect: 'text',
            }}
          >
            {element.content}
          </div>
        )}
        {(element.type === 'stamp' || element.type === 'decoration') && element.src && (
          <div
            dangerouslySetInnerHTML={{ __html: element.src }}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        )}
      </motion.div>
    );
  };

  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  return (
    <div className="flex items-center justify-center p-8 overflow-auto" style={{ background: '#faf0e0' }}>
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        onWheel={(e) => { e.stopPropagation(); e.preventDefault(); }}
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundColor: mode === 'front' ? '#faf0e0' : '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transform: `scale(${SCALE})`,
          transformOrigin: 'center center',
          cursor: 'crosshair',
        }}
      >
        {renderGrid()}
        {renderAddressLines()}
        {renderStampArea()}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          {elements.map(renderElement)}
        </div>

        <AnimatePresence>
          {showContextMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                left: contextMenuPos.x + (canvasRef.current?.getBoundingClientRect().left || 0),
                top: contextMenuPos.y + (canvasRef.current?.getBoundingClientRect().top || 0),
                background: '#4a3525',
                color: '#fdf6e3',
                borderRadius: 8,
                padding: 8,
                boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                zIndex: 10000,
                minWidth: 160,
              }}
            >
              <div style={{ padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #6b4a35', marginBottom: 4 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>透明度</label>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.1"
                  value={elements.find((e) => e.id === contextMenuElementId)?.opacity || 1}
                  onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={bringToFront}
                style={menuButtonStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3d5a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                图层置顶
              </button>
              <button
                onClick={sendToBack}
                style={menuButtonStyle}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#3d5a3a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                图层置底
              </button>
              <button
                onClick={deleteElement}
                style={{ ...menuButtonStyle, color: '#ff9999' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#8b2a27')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                删除
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const menuButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '8px 12px',
  background: 'transparent',
  border: 'none',
  color: '#fdf6e3',
  textAlign: 'left',
  cursor: 'pointer',
  borderRadius: 4,
  fontSize: 13,
  transition: 'background 0.2s ease-out',
};

export default PostcardCanvas;

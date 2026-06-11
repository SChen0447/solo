import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Shape, Note, ToolType, Point, COLOR_PALETTE } from '../types';
import { screenToWorld, isPointInShape, isPointInNote, isPointOnResizeHandle, isPointOnNoteCorner, generateId, getShapeBounds } from '../utils/canvasUtils';

interface CanvasProps {
  shapes: Shape[];
  notes: Note[];
  selectedTool: ToolType;
  selectedColor: string;
  onShapeAdd: (shape: Shape) => void;
  onShapeUpdate: (shape: Shape, addToHistory?: boolean) => void;
  onShapeDelete: (shapeId: string) => void;
  onNoteUpdate: (note: Note, addToHistory?: boolean) => void;
  onNoteDelete: (noteId: string) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  shapes,
  notes,
  selectedTool,
  selectedColor,
  onShapeAdd,
  onShapeUpdate,
  onShapeDelete,
  onNoteUpdate,
  onNoteDelete,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [lastOffset, setLastOffset] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState<Point | null>(null);
  const [currentDrawing, setCurrentDrawing] = useState<Shape | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isMovingShape, setIsMovingShape] = useState(false);
  const [isResizingShape, setIsResizingShape] = useState(false);
  const [moveStart, setMoveStart] = useState<Point | null>(null);
  const [originalShape, setOriginalShape] = useState<Shape | null>(null);
  const [originalNote, setOriginalNote] = useState<Note | null>(null);

  const [isMovingNote, setIsMovingNote] = useState(false);
  const [isResizingNote, setIsResizingNote] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerPos, setColorPickerPos] = useState<Point>({ x: 0, y: 0 });
  const [colorPickerTarget, setColorPickerTarget] = useState<{ type: 'shape' | 'note'; id: string } | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const GRID_SIZE = 20;
  const MIN_SCALE = 0.3;
  const MAX_SCALE = 3.0;

  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return screenToWorld(e.clientX - rect.left, e.clientY - rect.top, offset.x, offset.y, scale);
  }, [offset, scale]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * delta));

    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - offset.x) / scale;
      const worldY = (mouseY - offset.y) / scale;

      const newOffsetX = mouseX - worldX * newScale;
      const newOffsetY = mouseY - worldY * newScale;

      setScale(newScale);
      setOffset({ x: newOffsetX, y: newOffsetY });
    }
  }, [scale, offset]);

  const startDrawing = useCallback((startPoint: Point) => {
    const id = generateId();
    let newShape: Shape;

    switch (selectedTool) {
      case 'line':
      case 'curve':
        newShape = {
          id,
          type: selectedTool,
          color: selectedColor,
          strokeWidth: 2,
          points: [startPoint],
        };
        setDrawingPoints([startPoint]);
        break;
      case 'rect':
        newShape = {
          id,
          type: 'rect',
          color: selectedColor,
          strokeWidth: 2,
          x: startPoint.x,
          y: startPoint.y,
          width: 0,
          height: 0,
        };
        break;
      case 'circle':
        newShape = {
          id,
          type: 'circle',
          color: selectedColor,
          strokeWidth: 2,
          x: startPoint.x,
          y: startPoint.y,
          radius: 0,
        };
        break;
      default:
        return;
    }

    setCurrentDrawing(newShape);
    setDrawingStart(startPoint);
    setIsDrawing(true);
  }, [selectedTool, selectedColor]);

  const updateDrawing = useCallback((currentPoint: Point) => {
    if (!currentDrawing || !drawingStart) return;

    let updated: Shape;

    switch (selectedTool) {
      case 'line':
      case 'curve':
        const newPoints = [...drawingPoints, currentPoint];
        updated = { ...currentDrawing, points: newPoints };
        setDrawingPoints(newPoints);
        break;
      case 'rect':
        const x = Math.min(drawingStart.x, currentPoint.x);
        const y = Math.min(drawingStart.y, currentPoint.y);
        const width = Math.abs(currentPoint.x - drawingStart.x);
        const height = Math.abs(currentPoint.y - drawingStart.y);
        updated = { ...currentDrawing, x, y, width, height };
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(currentPoint.x - drawingStart.x, 2) +
          Math.pow(currentPoint.y - drawingStart.y, 2)
        );
        updated = { ...currentDrawing, radius };
        break;
      default:
        return;
    }

    setCurrentDrawing(updated);
  }, [currentDrawing, drawingStart, drawingPoints, selectedTool]);

  const finishDrawing = useCallback(() => {
    if (currentDrawing) {
      onShapeAdd(currentDrawing);
    }
    setCurrentDrawing(null);
    setDrawingStart(null);
    setDrawingPoints([]);
    setIsDrawing(false);
  }, [currentDrawing, onShapeAdd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || selectedTool === 'pan') {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setLastOffset({ ...offset });
      return;
    }

    if (e.button !== 0) return;

    const pos = getMousePos(e);

    if (editingNoteId) {
      setEditingNoteId(null);
      setNoteText('');
    }

    if (selectedTool === 'select') {
      let foundShape: Shape | null = null;
      let foundNote: Note | null = null;

      for (let i = shapes.length - 1; i >= 0; i--) {
        if (isPointInShape(pos, shapes[i])) {
          foundShape = shapes[i];
          break;
        }
      }

      for (let i = notes.length - 1; i >= 0; i--) {
        if (isPointInNote(pos, notes[i])) {
          foundNote = notes[i];
          break;
        }
      }

      if (foundNote) {
        setSelectedNoteId(foundNote.id);
        setSelectedShapeId(null);
        setShowDeleteConfirm(null);

        const corner = isPointOnNoteCorner(pos, foundNote);
        if (corner) {
          setIsResizingNote(true);
          setResizeCorner(corner);
          setOriginalNote({ ...foundNote });
          setMoveStart(pos);
        } else {
          setIsMovingNote(true);
          setOriginalNote({ ...foundNote });
          setMoveStart(pos);
        }
        return;
      }

      if (foundShape) {
        setSelectedShapeId(foundShape.id);
        setSelectedNoteId(null);
        setShowDeleteConfirm(null);

        if (isPointOnResizeHandle(pos, foundShape)) {
          setIsResizingShape(true);
        } else {
          setIsMovingShape(true);
        }
        setOriginalShape({ ...foundShape });
        setMoveStart(pos);
        return;
      }

      setSelectedShapeId(null);
      setSelectedNoteId(null);
      setShowColorPicker(false);
      setShowDeleteConfirm(null);
      return;
    }

    if (['line', 'curve', 'rect', 'circle'].includes(selectedTool)) {
      setSelectedShapeId(null);
      setSelectedNoteId(null);
      startDrawing(pos);
    }
  }, [selectedTool, getMousePos, offset, shapes, notes, editingNoteId, startDrawing]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    if (isDragging && dragStart) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setOffset({
        x: lastOffset.x + dx,
        y: lastOffset.y + dy,
      });
      return;
    }

    if (isDrawing) {
      updateDrawing(pos);
      return;
    }

    if (isMovingShape && selectedShapeId && originalShape && moveStart) {
      const dx = pos.x - moveStart.x;
      const dy = pos.y - moveStart.y;

      let updated: Shape;
      if (originalShape.type === 'rect') {
        updated = {
          ...originalShape,
          x: originalShape.x! + dx,
          y: originalShape.y! + dy,
        };
      } else if (originalShape.type === 'circle') {
        updated = {
          ...originalShape,
          x: originalShape.x! + dx,
          y: originalShape.y! + dy,
        };
      } else if (originalShape.points) {
        updated = {
          ...originalShape,
          points: originalShape.points.map((p) => ({
            x: p.x + dx,
            y: p.y + dy,
          })),
        };
      } else {
        return;
      }

      onShapeUpdate(updated, false);
      return;
    }

    if (isResizingShape && selectedShapeId && originalShape && moveStart) {
      const dx = pos.x - moveStart.x;
      const dy = pos.y - moveStart.y;

      let updated: Shape;
      if (originalShape.type === 'rect') {
        const newWidth = Math.max(10, originalShape.width! + dx);
        const newHeight = Math.max(10, originalShape.height! + dy);
        updated = {
          ...originalShape,
          width: newWidth,
          height: newHeight,
        };
      } else if (originalShape.type === 'circle') {
        const newRadius = Math.max(5, originalShape.radius! + Math.max(dx, dy));
        updated = {
          ...originalShape,
          radius: newRadius,
        };
      } else {
        return;
      }

      onShapeUpdate(updated, false);
      return;
    }

    if (isMovingNote && selectedNoteId && originalNote && moveStart) {
      const dx = pos.x - moveStart.x;
      const dy = pos.y - moveStart.y;

      const updated: Note = {
        ...originalNote,
        x: originalNote.x + dx,
        y: originalNote.y + dy,
      };

      onNoteUpdate(updated, false);
      return;
    }

    if (isResizingNote && selectedNoteId && originalNote && moveStart && resizeCorner) {
      const dx = pos.x - moveStart.x;
      const dy = pos.y - moveStart.y;

      let newX = originalNote.x;
      let newY = originalNote.y;
      let newWidth = originalNote.width;
      let newHeight = originalNote.height;

      if (resizeCorner.includes('r')) {
        newWidth = Math.max(100, Math.min(400, originalNote.width + dx));
      }
      if (resizeCorner.includes('l')) {
        const newW = Math.max(100, Math.min(400, originalNote.width - dx));
        newX = originalNote.x + (originalNote.width - newW);
        newWidth = newW;
      }
      if (resizeCorner.includes('b')) {
        newHeight = Math.max(100, Math.min(400, originalNote.height + dy));
      }
      if (resizeCorner.includes('t')) {
        const newH = Math.max(100, Math.min(400, originalNote.height - dy));
        newY = originalNote.y + (originalNote.height - newH);
        newHeight = newH;
      }

      const updated: Note = {
        ...originalNote,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };

      onNoteUpdate(updated, false);
      return;
    }
  }, [
    isDragging,
    dragStart,
    lastOffset,
    isDrawing,
    isMovingShape,
    isResizingShape,
    selectedShapeId,
    originalShape,
    moveStart,
    isMovingNote,
    isResizingNote,
    selectedNoteId,
    originalNote,
    resizeCorner,
    getMousePos,
    updateDrawing,
    onShapeUpdate,
    onNoteUpdate,
  ]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
    }

    if (isDrawing) {
      finishDrawing();
    }

    if (isMovingShape || isResizingShape) {
      if (selectedShapeId && originalShape) {
        const currentShape = shapes.find((s) => s.id === selectedShapeId);
        if (currentShape) {
          onShapeUpdate(currentShape, true);
        }
      }
      setIsMovingShape(false);
      setIsResizingShape(false);
      setOriginalShape(null);
      setMoveStart(null);
    }

    if (isMovingNote || isResizingNote) {
      if (selectedNoteId && originalNote) {
        const currentNote = notes.find((n) => n.id === selectedNoteId);
        if (currentNote) {
          onNoteUpdate(currentNote, true);
        }
      }
      setIsMovingNote(false);
      setIsResizingNote(false);
      setOriginalNote(null);
      setMoveStart(null);
      setResizeCorner(null);
    }
  }, [isDragging, isDrawing, isMovingShape, isResizingShape, isMovingNote, isResizingNote, selectedShapeId, selectedNoteId, originalShape, originalNote, shapes, notes, finishDrawing, onShapeUpdate, onNoteUpdate]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const pos = getMousePos(e);

    for (let i = notes.length - 1; i >= 0; i--) {
      if (isPointInNote(pos, notes[i])) {
        setEditingNoteId(notes[i].id);
        setNoteText(notes[i].text);
        setSelectedNoteId(notes[i].id);
        return;
      }
    }
  }, [getMousePos, notes]);

  const handleNoteTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value.slice(0, 500);
    setNoteText(text);
    if (editingNoteId) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) {
        onNoteUpdate({ ...note, text }, false);
      }
    }
  }, [editingNoteId, notes, onNoteUpdate]);

  const handleNoteTextBlur = useCallback(() => {
    if (editingNoteId) {
      const note = notes.find((n) => n.id === editingNoteId);
      if (note) {
        onNoteUpdate({ ...note, text: noteText }, true);
      }
    }
    setEditingNoteId(null);
    setNoteText('');
  }, [editingNoteId, noteText, notes, onNoteUpdate]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedShapeId && !editingNoteId) {
        e.preventDefault();
        onShapeDelete(selectedShapeId);
        setSelectedShapeId(null);
      }
      if (selectedNoteId && !editingNoteId) {
        e.preventDefault();
        onNoteDelete(selectedNoteId);
        setSelectedNoteId(null);
      }
    }
  }, [selectedShapeId, selectedNoteId, editingNoteId, onShapeDelete, onNoteDelete]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleNoteLongPress = useCallback((noteId: string) => {
    longPressTimer.current = setTimeout(() => {
      setIsShaking(noteId);
      setShowDeleteConfirm(noteId);
    }, 2000);
  }, []);

  const handleNoteLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const confirmDeleteNote = useCallback((noteId: string) => {
    onNoteDelete(noteId);
    setShowDeleteConfirm(null);
    setIsShaking(null);
    setSelectedNoteId(null);
  }, [onNoteDelete]);

  const cancelDeleteNote = useCallback(() => {
    setShowDeleteConfirm(null);
    setIsShaking(null);
  }, []);

  const handleShapeColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedShapeId) {
      const shape = shapes.find((s) => s.id === selectedShapeId);
      if (shape) {
        const bounds = getShapeBounds(shape);
        setColorPickerPos({ x: bounds.x + bounds.width, y: bounds.y });
        setColorPickerTarget({ type: 'shape', id: selectedShapeId });
        setShowColorPicker(true);
      }
    }
  }, [selectedShapeId, shapes]);

  const handleNoteColorClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedNoteId) {
      const note = notes.find((n) => n.id === selectedNoteId);
      if (note) {
        setColorPickerPos({ x: note.x + note.width, y: note.y });
        setColorPickerTarget({ type: 'note', id: selectedNoteId });
        setShowColorPicker(true);
      }
    }
  }, [selectedNoteId, notes]);

  const pickColor = useCallback((color: string) => {
    if (colorPickerTarget) {
      if (colorPickerTarget.type === 'shape') {
        const shape = shapes.find((s) => s.id === colorPickerTarget.id);
        if (shape) {
          onShapeUpdate({ ...shape, color }, true);
        }
      } else if (colorPickerTarget.type === 'note') {
        const note = notes.find((n) => n.id === colorPickerTarget.id);
        if (note) {
          onNoteUpdate({ ...note, color }, true);
        }
      }
    }
    setShowColorPicker(false);
    setColorPickerTarget(null);
  }, [colorPickerTarget, shapes, notes, onShapeUpdate, onNoteUpdate]);

  const renderShape = (shape: Shape, isSelected: boolean, isPreview: boolean = false) => {
    const commonProps = {
      stroke: shape.color,
      strokeWidth: shape.strokeWidth / scale,
      fill: 'none',
      strokeLinecap: 'round' as const,
      strokeLinejoin: 'round' as const,
      strokeDasharray: isPreview ? '5,5' : undefined,
      style: { transition: isPreview ? 'none' : 'all 0.2s ease' },
    };

    switch (shape.type) {
      case 'line':
      case 'curve':
        if (!shape.points || shape.points.length < 2) return null;
        let pathD = `M ${shape.points[0].x} ${shape.points[0].y}`;
        if (shape.type === 'curve' && shape.points.length > 2) {
          for (let i = 1; i < shape.points.length - 1; i++) {
            const xc = (shape.points[i].x + shape.points[i + 1].x) / 2;
            const yc = (shape.points[i].y + shape.points[i + 1].y) / 2;
            pathD += ` Q ${shape.points[i].x} ${shape.points[i].y} ${xc} ${yc}`;
          }
          const last = shape.points.length - 1;
          pathD += ` T ${shape.points[last].x} ${shape.points[last].y}`;
        } else {
          for (let i = 1; i < shape.points.length; i++) {
            pathD += ` L ${shape.points[i].x} ${shape.points[i].y}`;
          }
        }
        return <path key={shape.id} d={pathD} {...commonProps} />;

      case 'rect':
        return (
          <rect
            key={shape.id}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            {...commonProps}
          />
        );

      case 'circle':
        return (
          <circle
            key={shape.id}
            cx={shape.x}
            cy={shape.y}
            r={shape.radius}
            {...commonProps}
          />
        );

      default:
        return null;
    }
  };

  const renderSelection = (shape: Shape) => {
    const bounds = getShapeBounds(shape);
    const handleSize = 8 / scale;

    return (
      <g key={`selection-${shape.id}`}>
        <rect
          x={bounds.x - 4 / scale}
          y={bounds.y - 4 / scale}
          width={bounds.width + 8 / scale}
          height={bounds.height + 8 / scale}
          stroke="#00d4ff"
          strokeWidth={2 / scale}
          strokeDasharray={`${8 / scale},${4 / scale}`}
          fill="none"
        />
        <rect
          x={bounds.x + bounds.width - handleSize / 2}
          y={bounds.y + bounds.height - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="#fff"
          stroke="#00d4ff"
          strokeWidth={1 / scale}
          style={{ cursor: 'se-resize' }}
        />
        <rect
          x={bounds.x + bounds.width + 6 / scale}
          y={bounds.y - 20 / scale}
          width={16 / scale}
          height={16 / scale}
          fill={shape.color}
          stroke="#fff"
          strokeWidth={1 / scale}
          style={{ cursor: 'pointer' }}
          onClick={handleShapeColorClick}
        />
      </g>
    );
  };

  const renderNote = (note: Note) => {
    const isSelected = selectedNoteId === note.id;
    const isEditing = editingNoteId === note.id;
    const isShakingNote = isShaking === note.id;
    const showDelete = showDeleteConfirm === note.id;
    const cornerSize = 12 / scale;

    return (
      <g
        key={note.id}
        className={`note ${isShakingNote ? 'shake' : ''}`}
        onMouseDown={() => {
          if (!isEditing) {
            handleNoteLongPress(note.id);
          }
        }}
        onMouseUp={handleNoteLongPressEnd}
        onMouseLeave={handleNoteLongPressEnd}
      >
        <rect
          x={note.x}
          y={note.y}
          width={note.width}
          height={note.height}
          fill={note.color}
          stroke={isSelected ? '#00d4ff' : 'rgba(0,0,0,0.2)'}
          strokeWidth={isSelected ? 2 / scale : 1 / scale}
          rx={4 / scale}
          style={{
            cursor: isEditing ? 'text' : 'move',
            filter: isMovingNote || isResizingNote ? 'drop-shadow(0 12px 20px rgba(0,0,0,0.4))' : 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
            transition: 'filter 0.2s ease',
          }}
        />

        {!isEditing && (
          <foreignObject
            x={note.x + 12 / scale}
            y={note.y + 12 / scale}
            width={note.width - 24 / scale}
            height={note.height - 24 / scale}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                fontSize: 14 / scale + 'px',
                lineHeight: 1.5,
                color: '#333',
                overflow: 'hidden',
                wordWrap: 'break-word',
                pointerEvents: 'none',
              }}
            >
              {note.text || ''}
            </div>
          </foreignObject>
        )}

        {isEditing && (
          <foreignObject
            x={note.x + 10 / scale}
            y={note.y + 10 / scale}
            width={note.width - 20 / scale}
            height={note.height - 20 / scale}
          >
            <textarea
              value={noteText}
              onChange={handleNoteTextChange}
              onBlur={handleNoteTextBlur}
              autoFocus
              style={{
                width: '100%',
                height: '100%',
                fontSize: 14 / scale + 'px',
                lineHeight: 1.5,
                color: '#333',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </foreignObject>
        )}

        {isSelected && !isEditing && (
          <>
            {(['tl', 'tr', 'bl', 'br'] as const).map((corner) => {
              let cx = note.x;
              let cy = note.y;
              if (corner.includes('r')) cx = note.x + note.width;
              if (corner.includes('b')) cy = note.y + note.height;

              return (
                <rect
                  key={corner}
                  x={cx - cornerSize / 2}
                  y={cy - cornerSize / 2}
                  width={cornerSize}
                  height={cornerSize}
                  fill="#fff"
                  stroke="#00d4ff"
                  strokeWidth={1 / scale}
                  style={{
                    cursor: corner === 'tl' || corner === 'br' ? `${corner}-resize` : `${corner === 'tr' || corner === 'bl' ? 'nesw' : 'nwse'}-resize`,
                  }}
                />
              );
            })}
            <rect
              x={note.x + note.width + 6 / scale}
              y={note.y - 20 / scale}
              width={16 / scale}
              height={16 / scale}
              fill={note.color}
              stroke="#fff"
              strokeWidth={1 / scale}
              style={{ cursor: 'pointer' }}
              onClick={handleNoteColorClick}
            />
          </>
        )}

        {showDelete && (
          <>
            <rect
              x={note.x}
              y={note.y}
              width={note.width}
              height={note.height}
              fill="rgba(255, 0, 0, 0.5)"
              rx={4 / scale}
            />
            <text
              x={note.x + note.width / 2}
              y={note.y + note.height / 2 - 10 / scale}
              textAnchor="middle"
              fill="white"
              fontSize={16 / scale}
              fontWeight="bold"
            >
              确定删除?
            </text>
            <g style={{ cursor: 'pointer' }} onClick={() => confirmDeleteNote(note.id)}>
              <rect
                x={note.x + note.width / 4 - 20 / scale}
                y={note.y + note.height / 2 + 10 / scale}
                width={40 / scale}
                height={24 / scale}
                fill="#ff4757"
                rx={4 / scale}
              />
              <text
                x={note.x + note.width / 4}
                y={note.y + note.height / 2 + 27 / scale}
                textAnchor="middle"
                fill="white"
                fontSize={12 / scale}
              >
                删除
              </text>
            </g>
            <g style={{ cursor: 'pointer' }} onClick={cancelDeleteNote}>
              <rect
                x={note.x + (note.width * 3) / 4 - 20 / scale}
                y={note.y + note.height / 2 + 10 / scale}
                width={40 / scale}
                height={24 / scale}
                fill="#57606f"
                rx={4 / scale}
              />
              <text
                x={note.x + (note.width * 3) / 4}
                y={note.y + note.height / 2 + 27 / scale}
                textAnchor="middle"
                fill="white"
                fontSize={12 / scale}
              >
                取消
              </text>
            </g>
          </>
        )}
      </g>
    );
  };

  const renderGrid = () => {
    const lines = [];
    const width = 2000;
    const height = 2000;

    for (let x = -width; x <= width; x += GRID_SIZE) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={-height}
          x2={x}
          y2={height}
          stroke="rgba(26, 26, 62, 0.5)"
          strokeWidth={1 / scale}
        />
      );
    }

    for (let y = -height; y <= height; y += GRID_SIZE) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={-width}
          y1={y}
          x2={width}
          y2={y}
          stroke="rgba(26, 26, 62, 0.5)"
          strokeWidth={1 / scale}
        />
      );
    }

    return lines;
  };

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        style={{
          cursor: selectedTool === 'pan' ? 'grab' : selectedTool === 'select' ? 'default' : 'crosshair',
        }}
      >
        <defs>
          <style>{`
            .shake {
              animation: shake 0.5s ease-in-out infinite;
            }
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-3px); }
              75% { transform: translateX(3px); }
            }
          `}</style>
        </defs>
        <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
          {renderGrid()}

          {shapes.map((shape) => renderShape(shape, selectedShapeId === shape.id))}

          {currentDrawing && renderShape(currentDrawing, true, true)}

          {selectedShapeId && shapes.map((s) =>
            s.id === selectedShapeId ? renderSelection(s) : null
          )}

          {notes.map((note) => renderNote(note))}

          {showColorPicker && colorPickerTarget && (
            <g transform={`translate(${colorPickerPos.x + 10}, ${colorPickerPos.y})`}>
              <rect
                x={-5}
                y={-5}
                width={200}
                height={60}
                fill="#1a1a3e"
                rx={8}
                stroke="#2a2a5e"
              />
              {COLOR_PALETTE.map((color, i) => (
                <rect
                  key={color}
                  x={5 + (i % 6) * 30}
                  y={5 + Math.floor(i / 6) * 25}
                  width={20}
                  height={20}
                  fill={color}
                  stroke="#fff"
                  strokeWidth={1}
                  rx={4}
                  style={{ cursor: 'pointer' }}
                  onClick={() => pickColor(color)}
                />
              ))}
            </g>
          )}
        </g>
      </svg>

      <div className="canvas-controls">
        <button className="zoom-btn" onClick={() => setScale((s) => Math.max(MIN_SCALE, s * 0.9))}>
          −
        </button>
        <div className="zoom-level">{Math.round(scale * 100)}%</div>
        <button className="zoom-btn" onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.1))}>
          +
        </button>
      </div>
    </div>
  );
};

export default Canvas;

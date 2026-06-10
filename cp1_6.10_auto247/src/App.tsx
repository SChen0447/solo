import React, { useState, useRef, useEffect, useCallback } from 'react';
import Canvas, { CanvasHandle } from './Canvas';
import Toolbar from './Toolbar';
import {
  ToolType,
  CanvasElement,
  RectElement,
  CircleElement,
  PathElement,
  StickyElement,
  CoauthorCursor,
  Point,
  randomId,
  saveElements,
  loadElements,
  createCoauthor,
  updateCoauthor,
  getStickyHeight,
  distance
} from './utils';

const DEFAULT_COLOR = '#3b82f6';
const STICKY_WIDTH = 160;
const PATH_MIN_DISTANCE = 10;

type DrawingState =
  | { type: 'none' }
  | { type: 'rect'; start: Point; current: RectElement }
  | { type: 'circle'; start: Point; current: CircleElement }
  | { type: 'path'; current: PathElement; lastPoint: Point }
  | { type: 'handwrite'; current: PathElement; lastPoint: Point };

const App: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>(() => loadElements());
  const [selectedTool, setSelectedTool] = useState<ToolType | null>(null);
  const [currentColor, setCurrentColor] = useState<string>(DEFAULT_COLOR);
  const [coauthors, setCoauthors] = useState<CoauthorCursor[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [, setIsPanning] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const drawingRef = useRef<DrawingState>({ type: 'none' });
  const lastFrameRef = useRef<number>(performance.now());
  const coauthorAnimRef = useRef<number | null>(null);

  useEffect(() => {
    saveElements(elements);
  }, [elements]);

  useEffect(() => {
    const addCoauthor = () => {
      setCoauthors((prev) => {
        if (prev.length >= 6) return prev;
        const count = 1 + Math.floor(Math.random() * 3);
        const newAuthors: CoauthorCursor[] = [];
        const existingNames = prev.map((c) => c.name);
        const w = window.innerWidth;
        const h = window.innerHeight;
        for (let i = 0; i < count; i++) {
          if (prev.length + newAuthors.length >= 6) break;
          const usedNames = [...existingNames, ...newAuthors.map((c) => c.name)];
          newAuthors.push(createCoauthor(w, h, usedNames));
        }
        return [...prev, ...newAuthors];
      });
    };

    addCoauthor();
    const intervalId = window.setInterval(addCoauthor, 2000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const animate = (now: number) => {
      const dt = Math.min(0.1, (now - lastFrameRef.current) / 1000);
      lastFrameRef.current = now;
      setCoauthors((prev) =>
        prev.map((c) => updateCoauthor(c, window.innerWidth, window.innerHeight, dt))
      );
      coauthorAnimRef.current = requestAnimationFrame(animate);
    };
    coauthorAnimRef.current = requestAnimationFrame(animate);
    return () => {
      if (coauthorAnimRef.current !== null) {
        cancelAnimationFrame(coauthorAnimRef.current);
      }
    };
  }, []);

  const handleDrawingStart = useCallback((worldPoint: Point) => {
    if (!selectedTool) return;
    const id = randomId();
    if (selectedTool === 'rect') {
      const el: RectElement = {
        id,
        type: 'rect',
        color: currentColor,
        x: worldPoint.x,
        y: worldPoint.y,
        width: 0,
        height: 0
      };
      drawingRef.current = { type: 'rect', start: worldPoint, current: el };
      setElements((prev) => [...prev, el]);
      setIsDrawing(true);
    } else if (selectedTool === 'circle') {
      const el: CircleElement = {
        id,
        type: 'circle',
        color: currentColor,
        cx: worldPoint.x,
        cy: worldPoint.y,
        r: 0
      };
      drawingRef.current = { type: 'circle', start: worldPoint, current: el };
      setElements((prev) => [...prev, el]);
      setIsDrawing(true);
    } else if (selectedTool === 'path') {
      const el: PathElement = {
        id,
        type: 'path',
        color: currentColor,
        points: [worldPoint],
        lineWidth: 3
      };
      drawingRef.current = { type: 'path', current: el, lastPoint: worldPoint };
      setElements((prev) => [...prev, el]);
      setIsDrawing(true);
    } else if (selectedTool === 'handwrite') {
      const el: PathElement = {
        id,
        type: 'path',
        color: '#000000',
        points: [worldPoint],
        lineWidth: 6,
        isHandwrite: true
      };
      drawingRef.current = { type: 'handwrite', current: el, lastPoint: worldPoint };
      setElements((prev) => [...prev, el]);
      setIsDrawing(true);
    }
  }, [selectedTool, currentColor]);

  const handleDrawingMove = useCallback((worldPoint: Point) => {
    const state = drawingRef.current;
    if (state.type === 'none') return;
    if (state.type === 'rect') {
      const x = Math.min(state.start.x, worldPoint.x);
      const y = Math.min(state.start.y, worldPoint.y);
      const width = Math.abs(worldPoint.x - state.start.x);
      const height = Math.abs(worldPoint.y - state.start.y);
      setElements((prev) =>
        prev.map((el) =>
          el.id === state.current.id
            ? { ...(el as RectElement), x, y, width, height }
            : el
        )
      );
    } else if (state.type === 'circle') {
      const dx = worldPoint.x - state.start.x;
      const dy = worldPoint.y - state.start.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      setElements((prev) =>
        prev.map((el) =>
          el.id === state.current.id
            ? { ...(el as CircleElement), cx: state.start.x, cy: state.start.y, r }
            : el
        )
      );
    } else if (state.type === 'path' || state.type === 'handwrite') {
      if (distance(state.lastPoint, worldPoint) >= PATH_MIN_DISTANCE) {
        const newPoints = [...state.current.points, worldPoint];
        drawingRef.current = { ...state, current: { ...state.current, points: newPoints }, lastPoint: worldPoint };
        setElements((prev) =>
          prev.map((el) =>
            el.id === state.current.id
              ? { ...(el as PathElement), points: newPoints }
              : el
          )
        );
      }
    }
  }, []);

  const handleDrawingEnd = useCallback(() => {
    const state = drawingRef.current;
    if (state.type === 'none') return;
    if (state.type === 'rect' || state.type === 'circle') {
      const el = state.current;
      if (state.type === 'rect' && (el as RectElement).width < 2 && (el as RectElement).height < 2) {
        setElements((prev) => prev.filter((e) => e.id !== el.id));
      } else if (state.type === 'circle' && (el as CircleElement).r < 2) {
        setElements((prev) => prev.filter((e) => e.id !== el.id));
      }
    } else if (state.type === 'path' || state.type === 'handwrite') {
      if (state.current.points.length < 2) {
        setElements((prev) => prev.filter((e) => e.id !== state.current.id));
      }
    }
    drawingRef.current = { type: 'none' };
    setIsDrawing(false);
  }, []);

  const handleStickyClick = useCallback((worldPoint: Point) => {
    const id = randomId();
    const sticky: StickyElement = {
      id,
      type: 'sticky',
      color: '#fef9c3',
      x: worldPoint.x - STICKY_WIDTH / 2,
      y: worldPoint.y - 20,
      width: STICKY_WIDTH,
      text: ''
    };
    setElements((prev) => [...prev, sticky]);
    setEditingStickyId(id);
  }, []);

  const handleStickyTextChange = useCallback((id: string, text: string) => {
    const limited = text.slice(0, 200);
    setElements((prev) =>
      prev.map((el) => (el.id === id && el.type === 'sticky' ? { ...el, text: limited } : el))
    );
  }, []);

  const handleStickyDelete = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setEditingStickyId(null);
  }, []);

  const viewport = canvasRef.current?.getViewport();
  const offsetX = viewport?.offsetX ?? 0;
  const offsetY = viewport?.offsetY ?? 0;
  const scale = viewport?.scale ?? 1;

  const stickyElements = elements.filter((el) => el.type === 'sticky') as StickyElement[];

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      <Canvas
        ref={canvasRef}
        elements={elements}
        selectedTool={selectedTool ?? 'rect'}
        color={currentColor}
        coauthors={coauthors}
        onDrawingStart={handleDrawingStart}
        onDrawingMove={handleDrawingMove}
        onDrawingEnd={handleDrawingEnd}
        onStickyClick={handleStickyClick}
        isDrawing={isDrawing}
        onIsPanningChange={setIsPanning}
      />
      {stickyElements.map((sticky) => {
        const h = getStickyHeight(sticky.text, sticky.width);
        const isEditing = editingStickyId === sticky.id;
        const screenX = sticky.x * scale + offsetX;
        const screenY = sticky.y * scale + offsetY;
        const screenW = sticky.width * scale;
        const screenH = h * scale;
        return (
          <div
            key={sticky.id}
            style={{
              position: 'fixed',
              left: `${screenX}px`,
              top: `${screenY}px`,
              width: `${screenW}px`,
              minHeight: `${screenH}px`,
              backgroundColor: '#fef9c3',
              border: '1px solid #e5e7eb',
              padding: `${10 * scale}px`,
              boxSizing: 'border-box',
              boxShadow: isEditing ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              zIndex: isEditing ? 90 : 50,
              transition: 'box-shadow 0.2s ease',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditing) setEditingStickyId(sticky.id);
            }}
          >
            {isEditing ? (
              <>
                <textarea
                  autoFocus
                  value={sticky.text}
                  onChange={(e) => handleStickyTextChange(sticky.id, e.target.value)}
                  maxLength={200}
                  style={{
                    width: '100%',
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    resize: 'none',
                    fontFamily: "'Comic Sans MS', cursive",
                    fontSize: `${14 * scale}px`,
                    lineHeight: `${20 * scale}px`,
                    color: '#1e293b',
                    padding: 0,
                    marginBottom: `${6 * scale}px`
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: `${10 * scale}px`, color: '#6b7280' }}>
                    {sticky.text.length}/200
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStickyDelete(sticky.id);
                    }}
                    style={{
                      border: 'none',
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: `${4 * scale}px`,
                      padding: `${2 * scale}px ${8 * scale}px`,
                      fontSize: `${11 * scale}px`,
                      cursor: 'pointer',
                      transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = '#ef4444';
                    }}
                  >
                    删除
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  fontFamily: "'Comic Sans MS', cursive",
                  fontSize: `${14 * scale}px`,
                  lineHeight: `${20 * scale}px`,
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {sticky.text || '点击编辑便签...'}
              </div>
            )}
          </div>
        );
      })}
      <Toolbar
        selectedTool={selectedTool}
        currentColor={currentColor}
        onSelectTool={setSelectedTool}
        onSelectColor={setCurrentColor}
      />
      {editingStickyId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 40
          }}
          onClick={() => setEditingStickyId(null)}
        />
      )}
    </div>
  );
};

export default App;

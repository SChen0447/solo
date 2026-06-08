import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import type {
  ToolType,
  Point,
  CanvasElement,
  PenElement,
  RectangleElement,
  CircleElement,
  TextElement,
  ServerToClientEvents,
  ClientToServerEvents
} from './types';

const MAX_HISTORY = 100;
const MAX_SEND_PER_FRAME = 5;

type HistoryAction =
  | { type: 'add'; element: CanvasElement }
  | { type: 'remove'; element: CanvasElement };

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [color, setColor] = useState('#60a5fa');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fontSize, setFontSize] = useState(24);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [textInputVisible, setTextInputVisible] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState<Point>({ x: 0, y: 0 });
  const [textInputValue, setTextInputValue] = useState('');

  const historyRef = useRef<HistoryAction[]>([]);
  const redoStackRef = useRef<HistoryAction[]>([]);
  const pendingSendsRef = useRef<CanvasElement[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const userIdRef = useRef<string>('');

  const colorOptions = ['#60a5fa', '#f472b6', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#ffffff'];

  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on('connect', () => {
      userIdRef.current = socket.id;
      console.log('Connected:', socket.id);
    });

    socket.on('sync', (syncedElements: CanvasElement[]) => {
      setElements(syncedElements);
    });

    socket.on('draw', (element: CanvasElement) => {
      setElements(prev => [...prev, element]);
    });

    socket.on('clear', () => {
      setElements([]);
      historyRef.current = [];
      redoStackRef.current = [];
    });

    socket.on('undo', (elementId: string) => {
      setElements(prev => prev.filter(el => el.id !== elementId));
    });

    socket.on('redo', (element: CanvasElement) => {
      setElements(prev => [...prev, element]);
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCanvasPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - panOffset.x) / zoom,
      y: (e.clientY - rect.top - panOffset.y) / zoom
    };
  }, [zoom, panOffset]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    elements.forEach(element => {
      ctx.strokeStyle = element.color;
      ctx.fillStyle = element.color;
      ctx.lineWidth = element.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (element.type === 'pen') {
        if (element.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);
        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y);
        }
        ctx.stroke();
      } else if (element.type === 'rectangle') {
        ctx.strokeRect(element.x, element.y, element.width, element.height);
      } else if (element.type === 'circle') {
        ctx.beginPath();
        ctx.ellipse(element.x, element.y, element.radiusX, element.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (element.type === 'text') {
        ctx.font = `${element.fontSize}px sans-serif`;
        ctx.fillText(element.text, element.x, element.y);
      }
    });

    if (isDrawing && currentElement) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentElement.type === 'pen') {
        const penEl = currentElement as PenElement;
        if (penEl.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(penEl.points[0].x, penEl.points[0].y);
          for (let i = 1; i < penEl.points.length; i++) {
            ctx.lineTo(penEl.points[i].x, penEl.points[i].y);
          }
          ctx.stroke();
        }
      } else if (currentElement.type === 'rectangle') {
        const rectEl = currentElement as RectangleElement;
        ctx.strokeRect(rectEl.x, rectEl.y, rectEl.width, rectEl.height);
      } else if (currentElement.type === 'circle') {
        const circleEl = currentElement as CircleElement;
        ctx.beginPath();
        ctx.ellipse(circleEl.x, circleEl.y, circleEl.radiusX, circleEl.radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [elements, currentElement, isDrawing, color, strokeWidth, zoom, panOffset]);

  useEffect(() => {
    const render = () => {
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(render);
    };
    animationFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

  const flushPendingSends = useCallback(() => {
    if (pendingSendsRef.current.length === 0) return;
    const socket = socketRef.current;
    if (!socket) return;

    const toSend = pendingSendsRef.current.splice(0, MAX_SEND_PER_FRAME);
    toSend.forEach(el => socket.emit('draw', el));
  }, []);

  useEffect(() => {
    const interval = setInterval(flushPendingSends, 16);
    return () => clearInterval(interval);
  }, [flushPendingSends]);

  const addToHistory = useCallback((action: HistoryAction) => {
    historyRef.current.push(action);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'text') {
      const point = getCanvasPoint(e);
      setTextInputPosition(point);
      setTextInputValue('');
      setTextInputVisible(true);
      return;
    }

    const point = getCanvasPoint(e);
    setIsDrawing(true);
    setStartPoint(point);
    setCurrentPoints([point]);

    const id = uuidv4();
    const userId = userIdRef.current;

    if (currentTool === 'pen') {
      setCurrentElement({
        id,
        type: 'pen',
        points: [point],
        color,
        strokeWidth,
        userId
      } as PenElement);
    } else if (currentTool === 'rectangle') {
      setCurrentElement({
        id,
        type: 'rectangle',
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
        color,
        strokeWidth,
        userId
      } as RectangleElement);
    } else if (currentTool === 'circle') {
      setCurrentElement({
        id,
        type: 'circle',
        x: point.x,
        y: point.y,
        radiusX: 0,
        radiusY: 0,
        color,
        strokeWidth,
        userId
      } as CircleElement);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentElement || !startPoint) return;

    const point = getCanvasPoint(e);

    if (currentTool === 'pen') {
      const newPoints = [...currentPoints, point];
      setCurrentPoints(newPoints);
      setCurrentElement(prev => prev ? { ...prev, points: newPoints } as PenElement : null);
    } else if (currentTool === 'rectangle') {
      const x = Math.min(startPoint.x, point.x);
      const y = Math.min(startPoint.y, point.y);
      const width = Math.abs(point.x - startPoint.x);
      const height = Math.abs(point.y - startPoint.y);
      setCurrentElement(prev => prev ? { ...prev, x, y, width, height } as RectangleElement : null);
    } else if (currentTool === 'circle') {
      const radiusX = Math.abs(point.x - startPoint.x);
      const radiusY = Math.abs(point.y - startPoint.y);
      setCurrentElement(prev => prev ? { ...prev, radiusX, radiusY } as CircleElement : null);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentElement) return;

    setIsDrawing(false);
    setElements(prev => [...prev, currentElement]);
    addToHistory({ type: 'add', element: currentElement });
    pendingSendsRef.current.push(currentElement);
    setCurrentElement(null);
    setCurrentPoints([]);
    setStartPoint(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));

    const newOffsetX = mouseX - (mouseX - panOffset.x) * (newZoom / zoom);
    const newOffsetY = mouseY - (mouseY - panOffset.y) * (newZoom / zoom);

    setZoom(newZoom);
    setPanOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleTextSubmit = () => {
    if (!textInputValue.trim()) {
      setTextInputVisible(false);
      return;
    }

    const id = uuidv4();
    const textElement: TextElement = {
      id,
      type: 'text',
      x: textInputPosition.x,
      y: textInputPosition.y,
      text: textInputValue,
      color,
      strokeWidth: 1,
      fontSize,
      userId: userIdRef.current
    };

    setElements(prev => [...prev, textElement]);
    addToHistory({ type: 'add', element: textElement });
    pendingSendsRef.current.push(textElement);
    setTextInputVisible(false);
    setTextInputValue('');
  };

  const handleUndo = () => {
    if (historyRef.current.length === 0) return;

    const lastAction = historyRef.current.pop()!;
    redoStackRef.current.push(lastAction);

    if (lastAction.type === 'add') {
      setElements(prev => prev.filter(el => el.id !== lastAction.element.id));
      socketRef.current?.emit('undo', lastAction.element.id);
    }
  };

  const handleRedo = () => {
    if (redoStackRef.current.length === 0) return;

    const action = redoStackRef.current.pop()!;
    historyRef.current.push(action);

    if (action.type === 'add') {
      setElements(prev => [...prev, action.element]);
      socketRef.current?.emit('redo', action.element);
    }
  };

  const handleClear = () => {
    if (elements.length === 0) return;
    setElements([]);
    historyRef.current = [];
    redoStackRef.current = [];
    socketRef.current?.emit('clear');
  };

  const handleExport = () => {
    if (elements.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(el => {
      if (el.type === 'pen') {
        el.points.forEach(p => {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        });
      } else if (el.type === 'rectangle') {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
      } else if (el.type === 'circle') {
        minX = Math.min(minX, el.x - el.radiusX);
        minY = Math.min(minY, el.y - el.radiusY);
        maxX = Math.max(maxX, el.x + el.radiusX);
        maxY = Math.max(maxY, el.y + el.radiusY);
      } else if (el.type === 'text') {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y - el.fontSize);
        maxX = Math.max(maxX, el.x + el.text.length * el.fontSize * 0.6);
        maxY = Math.max(maxY, el.y);
      }
    });

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const offsetX = -minX + padding;
    const offsetY = -minY + padding;

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
    svgContent += `<rect width="100%" height="100%" fill="#2d2d44"/>`;

    elements.forEach(el => {
      if (el.type === 'pen') {
        let pathData = `M ${el.points[0].x + offsetX} ${el.points[0].y + offsetY}`;
        for (let i = 1; i < el.points.length; i++) {
          pathData += ` L ${el.points[i].x + offsetX} ${el.points[i].y + offsetY}`;
        }
        svgContent += `<path d="${pathData}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
      } else if (el.type === 'rectangle') {
        svgContent += `<rect x="${el.x + offsetX}" y="${el.y + offsetY}" width="${el.width}" height="${el.height}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}"/>`;
      } else if (el.type === 'circle') {
        svgContent += `<ellipse cx="${el.x + offsetX}" cy="${el.y + offsetY}" rx="${el.radiusX}" ry="${el.radiusY}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}"/>`;
      } else if (el.type === 'text') {
        svgContent += `<text x="${el.x + offsetX}" y="${el.y + offsetY}" fill="${el.color}" font-size="${el.fontSize}" font-family="sans-serif">${el.text}</text>`;
      }
    });

    svgContent += '</svg>';

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToolSelect = (tool: ToolType) => {
    setCurrentTool(tool);
    if (tool !== 'text') {
      setTextInputVisible(false);
    }
  };

  const getCursorStyle = () => {
    if (currentTool === 'text') return 'text';
    return 'crosshair';
  };

  const hasElements = elements.length > 0;
  const canUndo = historyRef.current.length > 0;
  const canRedo = redoStackRef.current.length > 0;

  const tools = [
    { type: 'pen' as ToolType, icon: '✏️', label: '画笔' },
    { type: 'rectangle' as ToolType, icon: '⬜', label: '矩形' },
    { type: 'circle' as ToolType, icon: '⭕', label: '圆形' },
    { type: 'text' as ToolType, icon: 'T', label: '文字' }
  ];

  return (
    <div className="app">
      <div className="toolbar">
        <div className="toolbar-section">
          <div className="toolbar-title">工具</div>
          {tools.map(tool => (
            <button
              key={tool.type}
              className={`tool-btn ${currentTool === tool.type ? 'active' : ''}`}
              onClick={() => handleToolSelect(tool.type)}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="toolbar-section">
          <div className="toolbar-title">颜色</div>
          <div className="color-picker">
            {colorOptions.map(c => (
              <button
                key={c}
                className={`color-btn ${color === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {currentTool !== 'text' && (
          <div className="toolbar-section">
            <div className="toolbar-title">粗细</div>
            <input
              type="range"
              min="1"
              max="20"
              value={strokeWidth}
              onChange={e => setStrokeWidth(Number(e.target.value))}
              className="stroke-slider"
            />
            <div className="stroke-value">{strokeWidth}px</div>
          </div>
        )}

        {currentTool === 'text' && (
          <div className="toolbar-section">
            <div className="toolbar-title">字号</div>
            <input
              type="range"
              min="12"
              max="72"
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="stroke-slider"
            />
            <div className="stroke-value">{fontSize}px</div>
          </div>
        )}

        <div className="toolbar-section">
          <div className="toolbar-title">操作</div>
          <button
            className={`action-btn ${!canUndo ? 'disabled' : ''}`}
            onClick={handleUndo}
            disabled={!canUndo}
          >
            ↶ 撤销
          </button>
          <button
            className={`action-btn ${!canRedo ? 'disabled' : ''}`}
            onClick={handleRedo}
            disabled={!canRedo}
          >
            ↷ 重做
          </button>
          <button
            className={`action-btn ${!hasElements ? 'disabled' : ''}`}
            onClick={handleExport}
            disabled={!hasElements}
          >
            📥 导出
          </button>
          <button
            className={`action-btn danger ${!hasElements ? 'disabled' : ''}`}
            onClick={handleClear}
            disabled={!hasElements}
          >
            🗑️ 清空
          </button>
        </div>

        <div className="toolbar-section zoom-info">
          <div className="zoom-level">缩放: {Math.round(zoom * 100)}%</div>
        </div>
      </div>

      <div className="canvas-container" ref={containerRef}>
        <canvas
          ref={canvasRef}
          className="canvas"
          style={{ cursor: getCursorStyle() }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {textInputVisible && (
          <div
            className="text-input-overlay"
            style={{
              left: textInputPosition.x * zoom + panOffset.x,
              top: textInputPosition.y * zoom + panOffset.y
            }}
          >
            <input
              type="text"
              className="text-input"
              value={textInputValue}
              onChange={e => setTextInputValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTextSubmit();
                if (e.key === 'Escape') setTextInputVisible(false);
              }}
              autoFocus
              placeholder="输入文字..."
              style={{
                fontSize: `${fontSize}px`,
                color: color
              }}
            />
            <div className="text-input-actions">
              <button onClick={handleTextSubmit}>确定</button>
              <button onClick={() => setTextInputVisible(false)}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

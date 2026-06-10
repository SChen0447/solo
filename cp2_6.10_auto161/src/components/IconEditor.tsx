import React, { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import IconCanvas from './IconCanvas';
import { SVGElementData, Point, ElementType } from '../types';

interface IconEditorProps {
  elements: SVGElementData[];
  onElementsChange: (elements: SVGElementData[]) => void;
  selectedElementId: string | null;
  onSelectedElementChange: (id: string | null) => void;
}

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316',
  '#eab308', '#22c55e', '#10b981', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

type ToolType = 'select' | 'pen' | 'rect' | 'circle' | 'triangle';

const IconEditor: React.FC<IconEditorProps> = ({
  elements,
  onElementsChange,
  selectedElementId,
  onSelectedElementChange,
}) => {
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [scale, setScale] = useState(1);
  const drawingPointsRef = useRef<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const selectedElement = elements.find((e) => e.id === selectedElementId) || null;

  const defaultStyle: Partial<SVGElementData> = {
    fill: '#7c3aed',
    stroke: '#000000',
    strokeWidth: 2,
    opacity: 1,
  };

  const getCanvasCoordinates = useCallback((e: React.MouseEvent): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 400,
      y: ((e.clientY - rect.top) / rect.height) * 400,
    };
  }, []);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (currentTool === 'select') return;
      
      const point = getCanvasCoordinates(e);
      setIsDrawing(true);
      drawingPointsRef.current = [point];
    },
    [currentTool, getCanvasCoordinates]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing) return;
      const point = getCanvasCoordinates(e);
      drawingPointsRef.current = [...drawingPointsRef.current, point];
    },
    [isDrawing, getCanvasCoordinates]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const points = drawingPointsRef.current;
    if (points.length < 2) {
      drawingPointsRef.current = [];
      return;
    }

    let newElement: SVGElementData | null = null;
    const id = uuidv4();

    if (currentTool === 'pen') {
      newElement = {
        id,
        type: 'path',
        points: [...points],
        ...defaultStyle,
      } as SVGElementData;
    } else if (currentTool === 'rect') {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      const w = Math.max(...xs) - x;
      const h = Math.max(...ys) - y;
      if (w > 5 && h > 5) {
        newElement = {
          id,
          type: 'rect',
          x,
          y,
          width: w,
          height: h,
          ...defaultStyle,
        } as SVGElementData;
      }
    } else if (currentTool === 'circle') {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const r = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
      if (r > 5) {
        newElement = {
          id,
          type: 'circle',
          x: cx,
          y: cy,
          r,
          ...defaultStyle,
        } as SVGElementData;
      }
    } else if (currentTool === 'triangle') {
      const xs = points.map((p) => p.x);
      const ys = points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      const w = Math.max(...xs) - x;
      const h = Math.max(...ys) - y;
      if (w > 5 && h > 5) {
        newElement = {
          id,
          type: 'triangle',
          x,
          y,
          width: w,
          height: h,
          ...defaultStyle,
        } as SVGElementData;
      }
    }

    if (newElement) {
      onElementsChange([...elements, newElement]);
      onSelectedElementChange(id);
    }

    drawingPointsRef.current = [];
  }, [isDrawing, currentTool, elements, onElementsChange, onSelectedElementChange, defaultStyle]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.min(3, Math.max(0.5, prev + delta)));
    }
  }, []);

  const handleElementUpdate = useCallback(
    (id: string, updates: Partial<SVGElementData>) => {
      onElementsChange(
        elements.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    [elements, onElementsChange]
  );

  const updateSelectedStyle = (updates: Partial<SVGElementData>) => {
    if (!selectedElementId) return;
    handleElementUpdate(selectedElementId, updates);
  };

  const toolButtons: { tool: ToolType; label: string; icon: string }[] = [
    { tool: 'select', label: '选择', icon: '↖' },
    { tool: 'pen', label: '画笔', icon: '✏️' },
    { tool: 'rect', label: '矩形', icon: '▢' },
    { tool: 'circle', label: '圆形', icon: '○' },
    { tool: 'triangle', label: '三角形', icon: '△' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {toolButtons.map(({ tool, label, icon }) => (
          <button
            key={tool}
            onClick={() => setCurrentTool(tool)}
            style={{
              padding: '8px 16px',
              backgroundColor: currentTool === tool ? '#7c3aed' : '#2a2a4a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => {
              if (currentTool !== tool) {
                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            }}
            onMouseDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = currentTool === tool ? 'scale(1)' : 'scale(1.02)';
            }}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#a0a0c0' }}>
          <span>缩放:</span>
          <span style={{ color: '#7c3aed', fontWeight: 500 }}>{(scale * 100).toFixed(0)}%</span>
          <span style={{ fontSize: 11, color: '#6a6a8a' }}>(Ctrl+滚轮)</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          backgroundColor: '#1a1a2e',
          borderRadius: 12,
          minHeight: 480,
        }}
        onWheel={handleWheel}
      >
        <div
          ref={svgRef as any}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{ display: 'inline-block' }}
        >
          <IconCanvas
            elements={elements}
            selectedElementId={selectedElementId}
            onElementSelect={onSelectedElementChange}
            onElementUpdate={handleElementUpdate}
            scale={scale}
          />
        </div>
      </div>

      <div className="style-panel">
        <div className="style-section">
          <span className="style-label">填充颜色</span>
          <div className="color-preset-grid">
            {PRESET_COLORS.map((color) => (
              <div
                key={color}
                className={`color-swatch ${selectedElement?.fill === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => updateSelectedStyle({ fill: color })}
              />
            ))}
          </div>
        </div>

        <div className="style-section">
          <span className="style-label">描边颜色</span>
          <div className="color-preset-grid">
            {PRESET_COLORS.map((color) => (
              <div
                key={`stroke-${color}`}
                className={`color-swatch ${selectedElement?.stroke === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => updateSelectedStyle({ stroke: color })}
              />
            ))}
          </div>
        </div>

        <div className="style-section">
          <span className="style-label">描边宽度</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={selectedElement?.strokeWidth || 2}
              onChange={(e) => updateSelectedStyle({ strokeWidth: Number(e.target.value) })}
              className="slider"
              disabled={!selectedElementId}
            />
            <span className="slider-value">{selectedElement?.strokeWidth || 2}px</span>
          </div>
        </div>

        <div className="style-section">
          <span className="style-label">透明度</span>
          <div className="slider-wrapper">
            <input
              type="range"
              min={0.1}
              max={1.0}
              step={0.1}
              value={selectedElement?.opacity ?? 1}
              onChange={(e) => updateSelectedStyle({ opacity: Number(e.target.value) })}
              className="slider"
              disabled={!selectedElementId}
            />
            <span className="slider-value">{((selectedElement?.opacity ?? 1) * 100).toFixed(0)}%</span>
          </div>
        </div>

        <div className="style-section" style={{ marginLeft: 'auto' }}>
          <span className="style-label">操作</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => {
                if (selectedElementId) {
                  onElementsChange(elements.filter((e) => e.id !== selectedElementId));
                  onSelectedElementChange(null);
                }
              }}
              disabled={!selectedElementId}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedElementId ? '#ef4444' : '#2a2a4a',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: selectedElementId ? 'pointer' : 'not-allowed',
                fontSize: 13,
                opacity: selectedElementId ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              删除选中
            </button>
            <button
              onClick={() => {
                onElementsChange([]);
                onSelectedElementChange(null);
              }}
              disabled={elements.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: elements.length > 0 ? '#6b7280' : '#2a2a4a',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: elements.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: 13,
                opacity: elements.length > 0 ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              清空画布
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IconEditor;

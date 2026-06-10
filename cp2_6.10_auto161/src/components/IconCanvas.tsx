import React, { useMemo } from 'react';
import { SVGElementData, Point } from '../types';
import { pointsToPath } from '../utils/svgExport';

interface IconCanvasProps {
  elements: SVGElementData[];
  selectedElementId: string | null;
  onElementSelect: (id: string | null) => void;
  onElementUpdate: (id: string, updates: Partial<SVGElementData>) => void;
  width?: number;
  height?: number;
  scale?: number;
  showGrid?: boolean;
}

const IconCanvas: React.FC<IconCanvasProps> = ({
  elements,
  selectedElementId,
  onElementSelect,
  onElementUpdate,
  width = 400,
  height = 400,
  scale = 1,
  showGrid = true,
}) => {
  const gridLines = useMemo(() => {
    const lines: JSX.Element[] = [];
    const step = 20;
    
    for (let x = 0; x <= width; x += step) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }
    for (let y = 0; y <= height; y += step) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth={0.5}
        />
      );
    }
    return lines;
  }, [width, height]);

  const getElementBounds = (el: SVGElementData): { x: number; y: number; w: number; h: number } | null => {
    switch (el.type) {
      case 'rect':
      case 'triangle':
        return { x: el.x || 0, y: el.y || 0, w: el.width || 0, h: el.height || 0 };
      case 'circle':
        return {
          x: (el.x || 0) - (el.r || 0),
          y: (el.y || 0) - (el.r || 0),
          w: (el.r || 0) * 2,
          h: (el.r || 0) * 2,
        };
      case 'path': {
        if (!el.points || el.points.length === 0) return null;
        const xs = el.points.map((p) => p.x);
        const ys = el.points.map((p) => p.y);
        return {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
      }
      default:
        return null;
    }
  };

  const handleMouseDown = (e: React.MouseEvent, el: SVGElementData) => {
    e.stopPropagation();
    onElementSelect(el.id);
  };

  const handleCanvasClick = () => {
    onElementSelect(null);
  };

  const renderElement = (el: SVGElementData) => {
    const isSelected = el.id === selectedElementId;
    const commonProps = {
      fill: el.fill,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      opacity: el.opacity,
      onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, el),
      style: { cursor: 'pointer' },
    };

    switch (el.type) {
      case 'path': {
        const d = el.d || (el.points ? pointsToPath(el.points) : '');
        return <path key={el.id} d={d} {...commonProps} />;
      }
      case 'rect':
        return (
          <rect
            key={el.id}
            x={el.x}
            y={el.y}
            width={el.width}
            height={el.height}
            {...commonProps}
          />
        );
      case 'circle':
        return (
          <circle key={el.id} cx={el.x} cy={el.y} r={el.r} {...commonProps} />
        );
      case 'triangle': {
        const { x, y, width, height } = el;
        const pts = `${x! + width! / 2},${y!} ${x!},${y! + height!} ${x! + width!},${y! + height!}`;
        return <polygon key={el.id} points={pts} {...commonProps} />;
      }
      default:
        return null;
    }
  };

  const renderHandles = () => {
    const selected = elements.find((e) => e.id === selectedElementId);
    if (!selected) return null;
    const bounds = getElementBounds(selected);
    if (!bounds) return null;

    const handleSize = 8;
    const { x, y, w, h } = bounds;

    const handlePositions = [
      { x: x - handleSize / 2, y: y - handleSize / 2, cursor: 'nwse-resize', pos: 'nw' },
      { x: x + w - handleSize / 2, y: y - handleSize / 2, cursor: 'nesw-resize', pos: 'ne' },
      { x: x - handleSize / 2, y: y + h - handleSize / 2, cursor: 'nesw-resize', pos: 'sw' },
      { x: x + w - handleSize / 2, y: y + h - handleSize / 2, cursor: 'nwse-resize', pos: 'se' },
    ];

    return (
      <g>
        <rect
          x={x - 2}
          y={y - 2}
          width={w + 4}
          height={h + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
        {handlePositions.map((h) => (
          <rect
            key={h.pos}
            x={h.x}
            y={h.y}
            width={handleSize}
            height={handleSize}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={1}
            style={{ cursor: h.cursor }}
          />
        ))}
      </g>
    );
  };

  return (
    <svg
      width={width * scale}
      height={height * scale}
      viewBox={`0 0 ${width} ${height}`}
      onClick={handleCanvasClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      }}
    >
      {showGrid && <g>{gridLines}</g>}
      <g>{elements.map(renderElement)}</g>
      {renderHandles()}
    </svg>
  );
};

export default React.memo(IconCanvas);

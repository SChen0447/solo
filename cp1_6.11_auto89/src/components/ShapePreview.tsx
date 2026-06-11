import React, { useMemo, useId } from 'react';
import type { ColorStop, ShapeType } from '../types';
import { sortColorStops, normalizeColor } from '../utils/gradient';
import { generateGlowColor } from '../utils/color';

interface ShapePreviewProps {
  colorStops: ColorStop[];
  angle: number;
  shapeType: ShapeType;
  onShapeChange: (shape: ShapeType) => void;
}

const SHAPE_OPTIONS: Array<{ type: ShapeType; label: string }> = [
  { type: 'circle', label: '圆形' },
  { type: 'rect', label: '圆角矩形' },
  { type: 'hexagon', label: '六边形' }
];

const SHAPE_ICON: Record<ShapeType, JSX.Element> = {
  circle: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
  rect: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="5" width="18" height="14" rx="3" />
    </svg>
  ),
  hexagon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
    </svg>
  )
};

const CANVAS_SIZE = 300;
const SHAPE_SIZE = 180;

const ShapePreview: React.FC<ShapePreviewProps> = ({
  colorStops,
  angle,
  shapeType,
  onShapeChange
}) => {
  const reactId = useId();
  const gradId = `grad-${reactId.replace(/:/g, '')}`;

  const sorted = useMemo(() => sortColorStops(colorStops), [colorStops]);
  const glowColor = useMemo(() => generateGlowColor(sorted), [sorted]);

  const renderShape = () => {
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const fillUrl = `url(#${gradId})`;
    const commonProps = {
      fill: fillUrl,
      className: 'shape-preview__shape'
    };

    switch (shapeType) {
      case 'circle': {
        const r = SHAPE_SIZE / 2;
        return (
          <g className="shape-preview__shape-group">
            <circle
              {...commonProps}
              cx={cx}
              cy={cy}
              r={r}
              style={
                {
                  '--glow-color': glowColor,
                  transformOrigin: `${cx}px ${cy}px`
                } as React.CSSProperties
              }
            />
            <circle
              className="shape-preview__glow"
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={glowColor}
              strokeWidth="2"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          </g>
        );
      }
      case 'rect': {
        const w = SHAPE_SIZE * 1.2;
        const h = SHAPE_SIZE * 0.8;
        const x = cx - w / 2;
        const y = cy - h / 2;
        const rx = 16;
        return (
          <g className="shape-preview__shape-group">
            <rect
              {...commonProps}
              x={x}
              y={y}
              width={w}
              height={h}
              rx={rx}
              ry={rx}
              style={
                {
                  '--glow-color': glowColor,
                  transformOrigin: `${cx}px ${cy}px`
                } as React.CSSProperties
              }
            />
            <rect
              className="shape-preview__glow"
              x={x}
              y={y}
              width={w}
              height={h}
              rx={rx}
              ry={rx}
              fill="none"
              stroke={glowColor}
              strokeWidth="2"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          </g>
        );
      }
      case 'hexagon': {
        const r = SHAPE_SIZE / 2;
        const points = Array.from({ length: 6 }, (_, i) => {
          const rad = (Math.PI / 3) * i - Math.PI / 2;
          const px = cx + r * Math.cos(rad);
          const py = cy + r * Math.sin(rad);
          return `${px},${py}`;
        }).join(' ');
        return (
          <g className="shape-preview__shape-group">
            <polygon
              {...commonProps}
              points={points}
              style={
                {
                  '--glow-color': glowColor,
                  transformOrigin: `${cx}px ${cy}px`
                } as React.CSSProperties
              }
            />
            <polygon
              className="shape-preview__glow"
              points={points}
              fill="none"
              stroke={glowColor}
              strokeWidth="2"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
          </g>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="shape-preview">
      <div className="shape-preview__header">
        <h2 className="shape-preview__title">形状预览</h2>
        <div className="shape-preview__tabs" role="tablist">
          {SHAPE_OPTIONS.map((opt) => {
            const isActive = shapeType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`shape-preview__tab ${isActive ? 'is-active' : ''}`}
                onClick={() => onShapeChange(opt.type)}
              >
                {SHAPE_ICON[opt.type]}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="shape-preview__canvas-wrap">
        <svg
          className="shape-preview__canvas"
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        >
          <defs>
            <linearGradient
              id={gradId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
              gradientTransform={`rotate(${angle} ${CANVAS_SIZE / 2} ${CANVAS_SIZE / 2})`}
            >
              {sorted.map((s) => (
                <stop
                  key={s.id}
                  offset={`${s.position}%`}
                  stopColor={normalizeColor(s.color)}
                />
              ))}
            </linearGradient>
          </defs>
          {renderShape()}
        </svg>
      </div>
    </div>
  );
};

export default ShapePreview;

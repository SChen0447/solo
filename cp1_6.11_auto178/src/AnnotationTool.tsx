import { useRef, useEffect } from 'react';
import { Annotation, BrushColor, BrushThickness } from './types';
import './AnnotationTool.css';

interface AnnotationToolProps {
  brushColor: BrushColor;
  brushThickness: BrushThickness;
  onColorChange: (color: BrushColor) => void;
  onThicknessChange: (thickness: BrushThickness) => void;
  annotations: Annotation[];
  onDeleteAnnotation: (id: string) => void;
  onUndo: () => void;
  canUndo: boolean;
  onExport: () => void;
  currentPage: number;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
}

const COLORS: { color: BrushColor; name: string }[] = [
  { color: '#1a1a1a', name: '墨黑' },
  { color: '#c0392b', name: '朱砂红' },
  { color: '#2980b9', name: '石青' },
  { color: '#f39c12', name: '藤黄' },
  { color: '#8e44ad', name: '紫檀' },
];

const THICKNESSES: { thickness: BrushThickness; name: string }[] = [
  { thickness: 1, name: '细' },
  { thickness: 2, name: '中' },
  { thickness: 4, name: '粗' },
];

function AnnotationTool({
  brushColor,
  brushThickness,
  onColorChange,
  onThicknessChange,
  annotations,
  onDeleteAnnotation,
  onUndo,
  canUndo,
  onExport,
  currentPage,
  selectedAnnotationId,
  onSelectAnnotation,
}: AnnotationToolProps) {
  const thumbnailRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  useEffect(() => {
    annotations.forEach(annotation => {
      const canvas = thumbnailRefs.current.get(annotation.id);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (annotation.points.length < 2) return;
      
      const xs = annotation.points.map(p => p.x);
      const ys = annotation.points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      
      const padding = 10;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;
      
      const scaleX = canvas.width / contentWidth;
      const scaleY = canvas.height / contentHeight;
      const scale = Math.min(scaleX, scaleY, 1);
      
      const offsetX = (canvas.width - contentWidth * scale) / 2 - minX * scale + padding * scale;
      const offsetY = (canvas.height - contentHeight * scale) / 2 - minY * scale + padding * scale;
      
      ctx.strokeStyle = annotation.color;
      ctx.lineWidth = annotation.thickness * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = annotation.opacity;
      
      ctx.beginPath();
      ctx.moveTo(
        annotation.points[0].x * scale + offsetX,
        annotation.points[0].y * scale + offsetY
      );
      for (let i = 1; i < annotation.points.length; i++) {
        ctx.lineTo(
          annotation.points[i].x * scale + offsetX,
          annotation.points[i].y * scale + offsetY
        );
      }
      ctx.stroke();
    });
  }, [annotations]);

  const setThumbnailRef = (id: string) => (canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      thumbnailRefs.current.set(id, canvas);
    } else {
      thumbnailRefs.current.delete(id);
    }
  };

  return (
    <div className="annotation-toolbar">
      <div className="toolbar-section">
        <span className="section-label">墨色</span>
        <div className="color-palette">
          {COLORS.map(({ color, name }) => (
            <button
              key={color}
              className={`color-button ${brushColor === color ? 'active' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => onColorChange(color)}
              title={name}
            >
              {brushColor === color && <span className="color-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">笔触</span>
        <div className="thickness-palette">
          {THICKNESSES.map(({ thickness, name }) => (
            <button
              key={thickness}
              className={`thickness-button ${brushThickness === thickness ? 'active' : ''}`}
              onClick={() => onThicknessChange(thickness)}
              title={name}
            >
              <span
                className="thickness-dot"
                style={{ width: thickness * 4, height: thickness * 4 }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="section-label">操作</span>
        <div className="action-buttons">
          <button
            className="action-button undo-button"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销"
          >
            ↶ 撤销
          </button>
          <button
            className="action-button export-button"
            onClick={onExport}
            title="导出"
          >
            📥 导出
          </button>
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section annotations-section">
        <span className="section-label">
          批注 <span className="annotation-count">({annotations.length})</span>
        </span>
        <div className="annotations-list">
          {annotations.length === 0 ? (
            <span className="no-annotations">暂无批注</span>
          ) : (
            annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                className={`annotation-thumbnail ${
                  selectedAnnotationId === annotation.id ? 'selected' : ''
                }`}
                onClick={() => onSelectAnnotation(
                  selectedAnnotationId === annotation.id ? null : annotation.id
                )}
              >
                <canvas
                  ref={setThumbnailRef(annotation.id)}
                  width={60}
                  height={40}
                  className="thumbnail-canvas"
                />
                <span className="annotation-index">{index + 1}</span>
                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteAnnotation(annotation.id);
                  }}
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section page-info">
        <span className="page-label">第 {currentPage} 页</span>
      </div>
    </div>
  );
}

export default AnnotationTool;

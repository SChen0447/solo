import React, { useState, useRef, useCallback } from 'react';
import type { PaletteItem } from '../types';

interface PalettePanelProps {
  palette: PaletteItem[];
  onSelect: (item: PaletteItem) => void;
  onDelete: (id: string) => void;
}

const PalettePanel: React.FC<PalettePanelProps> = ({
  palette,
  onSelect,
  onDelete
}) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      setDragId(id);
    },
    []
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, item: PaletteItem) => {
      try {
        (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      if (dragId === item.id) {
        onSelect(item);
      }
      setDragId(null);
    },
    [dragId, onSelect]
  );

  return (
    <div className="palette-panel">
      <div className="palette-panel__header">
        <h2 className="palette-panel__title">收藏调色板</h2>
        <span className="palette-panel__count">{palette.length} 个方案</span>
      </div>

      {palette.length === 0 ? (
        <div className="palette-panel__empty">
          <div className="palette-panel__empty-icon">🎨</div>
          <p className="palette-panel__empty-text">
            暂无收藏方案，调整渐变后点击"收藏"按钮保存
          </p>
        </div>
      ) : (
        <div
          className="palette-panel__list"
          ref={scrollRef}
          style={{ willChange: 'transform' }}
        >
          {palette.map((item) => {
            const isHover = hoverId === item.id;
            const isDragging = dragId === item.id;
            return (
              <div
                key={item.id}
                className={`palette-panel__item ${isDragging ? 'is-dragging' : ''} ${isHover ? 'is-hover' : ''}`}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                onPointerUp={(e) => handlePointerUp(e, item)}
                onPointerCancel={() => setDragId(null)}
                onMouseEnter={() => setHoverId(item.id)}
                onMouseLeave={() => setHoverId(null)}
              >
                <div
                  className="palette-panel__thumb-wrap"
                  style={{ transform: 'translate3d(0,0,0)' }}
                >
                  <img
                    src={item.thumbnail}
                    alt="渐变缩略图"
                    className="palette-panel__thumb"
                    width={100}
                    height={60}
                    draggable={false}
                  />
                </div>
                <div className="palette-panel__info">
                  <div className="palette-panel__swatches">
                    {item.colorStops.slice(0, 4).map((s) => (
                      <span
                        key={s.id}
                        className="palette-panel__swatch"
                        style={{ background: s.color }}
                        title={s.color}
                      />
                    ))}
                    {item.colorStops.length > 4 && (
                      <span className="palette-panel__swatch-more">
                        +{item.colorStops.length - 4}
                      </span>
                    )}
                  </div>
                  <span className="palette-panel__angle">
                    {item.angle}° · {item.colorStops.length}色标
                  </span>
                </div>
                <button
                  type="button"
                  className="palette-panel__delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="删除方案"
                  title="删除方案"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PalettePanel;

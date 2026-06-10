import { useState, useRef, useEffect, Dispatch } from 'react';
import type { Flower, Scheme, SchemeElement, AppAction } from '../types';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type CanvasElement = Required<SchemeElement> & { id: string };

type DragState =
  | { type: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { type: 'scale'; id: string; startX: number; startY: number; origScale: number }
  | null;

export default function InspirationBoard({
  flowers,
  schemes,
  dispatch,
}: {
  flowers: Flower[];
  schemes: Scheme[];
  dispatch: Dispatch<AppAction>;
}) {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schemeName, setSchemeName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>(null);

  const handleFlowerDragStart = (e: React.DragEvent, flower: Flower) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ flowerId: flower.id, name: flower.name, emoji: flower.emoji })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  };

  const handleCanvasDragLeave = () => setDragOver(false);

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const data = e.dataTransfer.getData('application/json');
    if (!data || !canvasRef.current) return;
    try {
      const parsed = JSON.parse(data);
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - 40;
      const y = e.clientY - rect.top - 40;
      const newEl: CanvasElement = {
        id: uuidv4(),
        flowerId: parsed.flowerId,
        name: parsed.name,
        emoji: parsed.emoji,
        x: Math.max(0, x),
        y: Math.max(0, y),
        scale: 1,
        rotation: 0,
        label: parsed.name,
      };
      setElements((prev) => [...prev, newEl]);
    } catch (_err) {
      /* ignore */
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  };

  const handleCardMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    const el = elements.find((x) => x.id === id);
    if (!el || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    dragStateRef.current = {
      type: 'move',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  };

  const handleHandleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const el = elements.find((x) => x.id === id);
    if (!el) return;
    dragStateRef.current = {
      type: 'scale',
      id,
      startX: e.clientX,
      startY: e.clientY,
      origScale: el.scale,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ds = dragStateRef.current;
      if (!ds) return;
      if (ds.type === 'move') {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        setElements((prev) =>
          prev.map((el) =>
            el.id === ds.id
              ? { ...el, x: Math.max(0, ds.origX + dx), y: Math.max(0, ds.origY + dy) }
              : el
          )
        );
      } else if (ds.type === 'scale') {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        const delta = (dx + dy) / 100;
        const newScale = Math.max(0.5, Math.min(2.5, ds.origScale + delta));
        setElements((prev) =>
          prev.map((el) => (el.id === ds.id ? { ...el, scale: newScale } : el))
        );
      }
    };
    const handleMouseUp = () => {
      dragStateRef.current = null;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = e.currentTarget.querySelector('.canvas-card-label') as HTMLElement | null;
    if (target) {
      target.contentEditable = 'true';
      target.focus();
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      target.addEventListener(
        'blur',
        () => {
          target.contentEditable = 'false';
          const newLabel = target.textContent || '';
          setElements((prev) =>
            prev.map((el) => (el.id === id ? { ...el, label: newLabel } : el))
          );
        },
        { once: true }
      );
      target.addEventListener(
        'keydown',
        (ev: KeyboardEvent) => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            target.blur();
          }
        },
        { once: true }
      );
    }
  };

  const handleSaveScheme = async () => {
    if (elements.length === 0) return;
    const name = schemeName.trim() || `方案 ${format(new Date(), 'MM-dd HH:mm')}`;
    try {
      const res = await fetch('/api/schemes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, elements }),
      });
      const newScheme: Scheme = await res.json();
      dispatch({ type: 'ADD_SCHEME', payload: newScheme });
      setSchemeName('');
    } catch (err) {
      console.error('Failed to save scheme:', err);
    }
  };

  const handleLoadScheme = (scheme: Scheme) => {
    setElements(
      scheme.elements.map((e) => ({
        id: e.id || uuidv4(),
        flowerId: e.flowerId,
        name: e.name,
        emoji: e.emoji,
        x: e.x,
        y: e.y,
        scale: e.scale,
        rotation: e.rotation,
        label: e.label,
      }))
    );
    setSelectedId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedId) return;
    setElements((prev) => prev.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div className="inspiration-page">
      <aside className="inspiration-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-title">🌸 花材选择</div>
          <div className="flower-picker-grid">
            {flowers.map((f) => (
              <div
                key={f.id}
                className="flower-picker-item"
                draggable
                onDragStart={(e) => handleFlowerDragStart(e, f)}
              >
                <div className="flower-picker-emoji">{f.emoji}</div>
                <div className="flower-picker-name">{f.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-title">💡 已保存方案</div>
          {schemes.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--text-light)' }}>暂无方案</p>
          ) : (
            <div className="schemes-list">
              {schemes.map((s) => (
                <div
                  key={s.id}
                  className="scheme-item"
                  onClick={() => handleLoadScheme(s)}
                >
                  <div className="scheme-item-name">{s.name}</div>
                  <div className="scheme-item-date">
                    {format(new Date(s.date), 'MM-dd HH:mm')} · {s.elements.length}个元素
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <div className="inspiration-main">
        <div className="inspiration-toolbar">
          <input
            type="text"
            className="scheme-name-input"
            placeholder="给这个方案起个名字..."
            value={schemeName}
            onChange={(e) => setSchemeName(e.target.value)}
          />
          {selectedId && (
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                background: '#fee',
                color: '#e55',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🗑 删除
            </button>
          )}
          <button
            className="save-scheme-btn"
            onClick={handleSaveScheme}
            disabled={elements.length === 0}
            style={elements.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            💾 保存方案
          </button>
        </div>

        <div className="canvas-wrapper">
          <div
            ref={canvasRef}
            className={`canvas ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleCanvasDragOver}
            onDragLeave={handleCanvasDragLeave}
            onDrop={handleCanvasDrop}
            onClick={handleCanvasClick}
          >
            {elements.length === 0 && !dragOver && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-light)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: 64, marginBottom: 12 }}>🎨</div>
                <p style={{ fontSize: 16 }}>从左侧拖拽花材到画布开始创作</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>
                  点击卡片可选中，拖拽移动，双击编辑文字
                </p>
              </div>
            )}
            {elements.map((el) => {
              const isSelected = selectedId === el.id;
              return (
                <div
                  key={el.id}
                  className={`canvas-card ${isSelected ? 'selected' : ''}`}
                  style={{
                    left: el.x,
                    top: el.y,
                    transform: `scale(${el.scale}) rotate(${el.rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                  onMouseDown={(e) => handleCardMouseDown(e, el.id)}
                  onDoubleClick={(e) => handleDoubleClick(e, el.id)}
                >
                  <div
                    className="canvas-card-emoji"
                    style={{ fontSize: 36 * el.scale }}
                  >
                    {el.emoji}
                  </div>
                  <div className="canvas-card-label">{el.label}</div>
                  {isSelected && (
                    <div className="canvas-handles">
                      <div
                        className="handle tl"
                        onMouseDown={(e) => handleHandleMouseDown(e, el.id)}
                      />
                      <div
                        className="handle tr"
                        onMouseDown={(e) => handleHandleMouseDown(e, el.id)}
                      />
                      <div
                        className="handle bl"
                        onMouseDown={(e) => handleHandleMouseDown(e, el.id)}
                      />
                      <div
                        className="handle br"
                        onMouseDown={(e) => handleHandleMouseDown(e, el.id)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fragment,
  FragmentType,
  createFragment,
  addFragment,
  updateFragment,
  bringToFront,
  moveFragment,
  rotateFragment,
  resizeFragment,
  ResizeCorner,
  clampPosition,
} from '../utils/layerManager';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

interface CanvasAreaProps {
  fragments: Fragment[];
  selectedId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  exporting: boolean;
  onFragmentsChange: (fragments: Fragment[]) => void;
  onSelectedChange: (id: string | null) => void;
  onViewChange: (zoom: number, panX: number, panY: number) => void;
  onPlayDragSound: () => void;
  onRequestRemove: (id: string) => void;
  getCanvasRef: (ref: HTMLDivElement | null) => void;
}

interface DragState {
  type: 'move' | 'resize';
  fragmentId: string;
  startX: number;
  startY: number;
  startFragX: number;
  startFragY: number;
  startWidth: number;
  startHeight: number;
  corner?: ResizeCorner;
  moved: boolean;
}

interface PanState {
  startX: number;
  startY: number;
  startPanX: number;
  startPanY: number;
}

const renderFragmentContent: React.FC<{ fragment: Fragment }> = ({ fragment }) => {
  const { type, color, width, height } = fragment;

  switch (type) {
    case 'paper':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            border: '2px dashed #8b7355',
            borderRadius: '2px',
            boxSizing: 'border-box',
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 2px,
                rgba(139, 115, 85, 0.06) 2px,
                rgba(139, 115, 85, 0.06) 4px
              )
            `,
          }}
        />
      );
    case 'ink':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 35%, ${lightenColor(color, 25)} 0%, ${color} 45%, ${darkenColor(color, 20)} 100%)`,
            filter: 'blur(0.5px)',
            boxShadow: `inset -3px -3px 8px ${darkenColor(color, 25)}, inset 2px 2px 6px ${lightenColor(color, 15)}`,
          }}
        />
      );
    case 'strip':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.08)',
            backgroundImage: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 4px,
                rgba(0,0,0,0.04) 4px,
                rgba(0,0,0,0.04) 5px
              ),
              linear-gradient(180deg, ${lightenColor(color, 5)} 0%, ${color} 100%)
            `,
          }}
        />
      );
    case 'clipping': {
      const fontSize = Math.max(5, Math.min(10, Math.floor(width / 14));
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: color,
            padding: `${Math.floor(width * 0.08)}px ${Math.floor(width * 0.1)}px`,
            boxSizing: 'border-box',
            overflow: 'hidden',
            backgroundImage: `
              radial-gradient(circle at 20% 80%, ${darkenColor(color, 8)} 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, ${lightenColor(color, 5)} 0%, transparent 50%)
            `,
          }}
        >
          <div style={{ fontSize: `${fontSize * 1.6}px`, lineHeight: 1.2, color: '#4a3b2b', fontFamily: '"Times New Roman", Georgia, serif', fontWeight: 'bold', marginBottom: `${fontSize * 0.5}px`, textDecoration: 'underline' }}>
            DAILY
          </div>
          <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.3, color: '#3a2f24', fontFamily: 'Georgia, serif', opacity: 0.85 }}>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor ut labore.
          </div>
        </div>
      );
    }
    case 'foil':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: `linear-gradient(135deg, ${lightenColor(color, 40)} 0%, ${color} 30%, ${darkenColor(color, 18)} 50%, ${color} 72%, ${lightenColor(color, 35)} 100%)`,
            boxShadow: `0 2px 8px rgba(160,120,50,0.5), inset 1px 1px 4px ${lightenColor(color, 20)}`,
          }}
        />
      );
  }
};

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) + Math.round(255 * percent / 100));
  const g = Math.min(255, (((num >> 8) & 0x00FF + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  return lightenColor(hex, -percent);
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  fragments,
  selectedId,
  zoom,
  panX,
  panY,
  exporting,
  onFragmentsChange,
  onSelectedChange,
  onViewChange,
  onPlayDragSound,
  onRequestRemove,
  getCanvasRef,
}) => {
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const innerWrapRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const panState = useRef<PanState | null>(null);
  const [localZoom, setLocalZoom] = useState(zoom);
  const [localPanX, setLocalPanX] = useState(panX);
  const [localPanY, setLocalPanY] = useState(panY);
  const rotationAccumulator = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => { setLocalZoom(zoom); }, [zoom]);
  useEffect(() => { setLocalPanX(panX); }, [panX]);
  useEffect(() => { setLocalPanY(panY); }, [panY]);

  useEffect(() => {
    if (canvasWrapRef.current) {
      getCanvasRef(canvasWrapRef.current);
    }
    return () => getCanvasRef(null);
  }, [getCanvasRef]);

  useEffect(() => {
    return () => {
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const target = e.target as HTMLElement;
    const fragmentEl = target.closest('[data-fragment-id]') as HTMLElement | null;
    const fragId = fragmentEl?.dataset.fragmentId;

    if (fragId && selectedId === fragId) {
      rotationAccumulator.current += e.deltaY;

      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(() => {
          const steps = Math.round(rotationAccumulator.current / 15);
          if (steps !== 0) {
            const frag = fragments.find(f => f.id === fragId);
            if (frag) {
              const newAngle = frag.rotation + steps * 15;
              onFragmentsChange(rotateFragment(fragments, fragId, newAngle));
              rotationAccumulator.current = 0;
            }
          }
          rafId.current = null;
        });
      }
      return;
    }

    const newPanX = localPanX - e.deltaX;
    const newPanY = localPanY - e.deltaY;

    const scaledW = CANVAS_WIDTH * localZoom;
    const scaledH = CANVAS_HEIGHT * localZoom;
    const wrapRect = innerWrapRef.current?.getBoundingClientRect();
    const wrapW = wrapRect?.width ?? 0;
    const wrapH = wrapRect?.height ?? 0;

    const maxPanX = Math.max(0, (scaledW - wrapW) / 2);
    const maxPanY = Math.max(0, (scaledH - wrapH) / 2);
    const clampedPanX = Math.max(-maxPanX, Math.min(newPanX, maxPanX));
    const clampedPanY = Math.max(-maxPanY, Math.min(newPanY, maxPanY));

    setLocalPanX(clampedPanX);
    setLocalPanY(clampedPanY);
    onViewChange(localZoom, clampedPanX, clampedPanY);
  }, [fragments, selectedId, localZoom, localPanX, localPanY, onFragmentsChange, onViewChange]);

  const handleZoomChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setLocalZoom(newZoom);
    onViewChange(newZoom, localPanX, localPanY);
  }, [localPanX, localPanY, onViewChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('fragmentType') as FragmentType;
    if (!type) return;

    const wrapRect = innerWrapRef.current?.getBoundingClientRect();
    const canvasRect = canvasWrapRef.current?.getBoundingClientRect();
    if (!wrapRect || !canvasRect) return;

    const x = (e.clientX - canvasRect.left - localPanX) / localZoom;
    const y = (e.clientY - canvasRect.top - localPanY) / localZoom;

    const frag = createFragment({ type });
    const clamped = clampPosition(x - frag.width / 2, y - frag.height / 2, CANVAS_WIDTH, CANVAS_HEIGHT, frag.width, frag.height);
    const finalFrag = { ...frag, x: clamped.x, y: clamped.y };

    onFragmentsChange(addFragment(fragments, finalFrag));
    onSelectedChange(finalFrag.id);
    onPlayDragSound();
  }, [fragments, localZoom, localPanX, localPanY, onFragmentsChange, onSelectedChange, onPlayDragSound]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-fragment-id]') return;
    if (target.closest('[data-handle]')) return;

    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: localPanX,
      startPanY: localPanY,
    };
    onSelectedChange(null);
  }, [localPanX, localPanY, onSelectedChange]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.current?.type === 'move' && !dragState.current.moved) {
      }

      if (panState.current) {
        const dx = e.clientX - panState.current.startX;
        const dy = e.clientY - panState.current.startY;
        const newPanX = panState.current.startPanX + dx;
        const newPanY = panState.current.startPanY + dy;

        const scaledW = CANVAS_WIDTH * localZoom;
        const scaledH = CANVAS_HEIGHT * localZoom;
        const wrapRect = innerWrapRef.current?.getBoundingClientRect();
        const wrapW = wrapRect?.width ?? 0;
        const wrapH = wrapRect?.height ?? 0;

        const maxPanX = Math.max(0, (scaledW - wrapW) / 2);
        const maxPanY = Math.max(0, (scaledH - wrapH) / 2);
        const clampedPanX = Math.max(-maxPanX, Math.min(newPanX, maxPanX));
        const clampedPanY = Math.max(-maxPanY, Math.min(newPanY, maxPanY));

        setLocalPanX(clampedPanX);
        setLocalPanY(clampedPanY);
        onViewChange(localZoom, clampedPanX, clampedPanY);
        return;
      }

      if (!dragState.current) return;
      const ds = dragState.current;
      const frag = fragments.find(f => f.id === ds.fragmentId);
      if (!frag) return;

      const dx = (e.clientX - ds.startX) / localZoom;
      const dy = (e.clientY - ds.startY) / localZoom;

      if (ds.type === 'move') {
        if (frag.locked) return;
        if (!ds.moved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          ds.moved = true;
          onPlayDragSound();
          const brought = bringToFront(fragments, ds.fragmentId);
          onFragmentsChange(moveFragment(brought, ds.fragmentId, ds.startFragX + dx, ds.startFragY + dy));
        } else if (ds.moved) {
          onFragmentsChange(moveFragment(fragments, ds.fragmentId, ds.startFragX + dx, ds.startFragY + dy));
        }
      } else if (ds.type === 'resize' && ds.corner) {
        let newWidth = ds.startWidth;
        let newHeight = ds.startHeight;

        if (ds.corner === 'se') {
          newWidth = ds.startWidth + dx;
          newHeight = ds.startHeight + dy;
        } else if (ds.corner === 'sw') {
          newWidth = ds.startWidth - dx;
          newHeight = ds.startHeight + dy;
        } else if (ds.corner === 'ne') {
          newWidth = ds.startWidth + dx;
          newHeight = ds.startHeight - dy;
        } else if (ds.corner === 'nw') {
          newWidth = ds.startWidth - dx;
          newHeight = ds.startHeight - dy;
        }
        onFragmentsChange(resizeFragment(fragments, ds.fragmentId, newWidth, newHeight, ds.corner));
      }
    };

    const handleMouseUp = () => {
      dragState.current = null;
      panState.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fragments, localZoom, onFragmentsChange, onPlayDragSound, onViewChange]);

  const handleFragmentMouseDown = useCallback((e: React.MouseEvent, frag: Fragment) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (!frag.locked && selectedId !== frag.id) {
      onFragmentsChange(bringToFront(fragments, frag.id));
    }
    onSelectedChange(frag.id);

    dragState.current = {
      type: 'move',
      fragmentId: frag.id,
      startX: e.clientX,
      startY: e.clientY,
      startFragX: frag.x,
      startFragY: frag.y,
      startWidth: frag.width,
      startHeight: frag.height,
      moved: false,
    };
  }, [fragments, selectedId, onFragmentsChange, onSelectedChange]);

  const handleFragmentContextMenu = useCallback((e: React.MouseEvent, fragId: string) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFragmentDoubleClick = useCallback((e: React.MouseEvent, fragId: string) => {
    if (e.button === 2) {
      onRequestRemove(fragId);
    }
  }, [onRequestRemove]);

  const handleHandleMouseDown = useCallback((e: React.MouseEvent, frag: Fragment, corner: ResizeCorner) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectedChange(frag.id);

    dragState.current = {
      type: 'resize',
      fragmentId: frag.id,
      startX: e.clientX,
      startY: e.clientY,
      startFragX: frag.x,
      startFragY: frag.y,
      startWidth: frag.width,
      startHeight: frag.height,
      corner,
      moved: true,
    };
  }, [onSelectedChange]);

  const sortedFragments = [...fragments].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      ref={innerWrapRef}
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        onMouseDown={handleCanvasMouseDown}
        style={{
          position: 'relative',
          cursor: panState.current ? 'grabbing' : 'default',
        }}
      >
        <div
          ref={canvasWrapRef}
          data-canvas="true"
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
            transform: `translate(${localPanX}px, ${localPanY}px) scale(${localZoom})`,
            transformOrigin: 'center center',
            backgroundColor: '#f5f0e8',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2)',
            position: 'relative',
            overflow: 'hidden',
            borderRadius: '2px',
            willChange: 'transform',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                radial-gradient(circle at 20% 30%, rgba(200,180,150,0.08) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(180,150,120,0.06) 0%, transparent 50%),
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 1px,
                  rgba(180,160,130,0.02) 1px,
                  rgba(180,160,130,0.02) 2px
                )
              `,
              pointerEvents: 'none',
            }}
          />

          <AnimatePresence>
            {sortedFragments.map((frag) => {
            const isSelected = selectedId === frag.id && !exporting;

            return (
              <motion.div
                key={frag.id}
                data-fragment-id={frag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: frag.removing ? 0 : 1,
                  scale: frag.removing ? 0.9 : 1,
                  transition: { duration: 0.3, ease: 'easeOut' },
                  exit: { opacity: 0, scale: 0.8, transition: { duration: 0.3 } },
                onMouseDown={(e) => handleFragmentMouseDown(e, frag)}
                onContextMenu={(e) => handleFragmentContextMenu(e, frag.id)}
                onAuxClick={(e) => {
                  if (e.button === 2) handleFragmentDoubleClick(e, frag.id);
                }}
                style={{
                  position: 'absolute',
                  left: `${frag.x}px,
                  top: `${frag.y}px`,
                  width: `${frag.width}px,
                  height: `${frag.height}px`,
                  zIndex: frag.zIndex,
                  transform: `rotate(${frag.rotation}deg)`,
                  transformOrigin: 'center center',
                  mixBlendMode: frag.blendMode,
                  opacity: frag.opacity,
                  clipPath: frag.clipPath,
                  cursor: frag.locked ? 'not-allowed' : isSelected ? 'move' : 'pointer',
                  userSelect: 'none',
                  willChange: 'transform, left, top',
                  contain: 'layout paint',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    clipPath: frag.clipPath,
                    willChange: 'transform',
                  }}
                >
                  <renderFragmentContent fragment={frag} />
                </div>

                {isSelected && (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: '-2px',
                        left: '-2px',
                        right: '-2px',
                        bottom: '-2px',
                        border: '2px dashed #3a7bd5',
                        pointerEvents: 'none',
                        clipPath: frag.clipPath,
                      }}
                    />

                    <div
                      style={{
                        position: 'absolute',
                        top: '-22px',
                        left: '0',
                        padding: '2px 6px',
                        fontSize: '10px',
                        color: '#fff',
                        background: 'rgba(58, 123, 213, 0.9)',
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                      }}
                    >
                      {Math.round(frag.rotation)}°
                    </div>

                    {(['nw', 'ne', 'sw', 'se'] as ResizeCorner[].map((corner) => {
                      const posStyle: React.CSSProperties = {
                        nw: { top: '-5px', left: '-5px', cursor: 'nwse-resize' },
                        ne: { top: '-5px', right: '-5px', cursor: 'nesw-resize' },
                        sw: { bottom: '-5px', left: '-5px', cursor: 'nesw-resize' },
                        se: { bottom: '-5px', right: '-5px', cursor: 'nwse-resize' },
                      }[corner];

                      return (
                        <div
                          key={corner}
                          data-handle={corner}
                          onMouseDown={(e) => handleHandleMouseDown(e, frag, corner)}
                          style={{
                            position: 'absolute',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#3a7bd5',
                            border: '1px solid #fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            zIndex: 10,
                            ...posStyle,
                          }}
                        />
                      );
                    })}
                  </>
                )}
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 14px',
          background: 'rgba(44, 44, 44, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <span
          style={{
            color: '#d4c4a8',
            fontSize: '12px',
            fontFamily: 'monospace',
          }}
        >
          缩放
        </span>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={localZoom}
          onChange={handleZoomChange}
          style={{
            width: '120px',
            accentColor: '#b8956a',
            cursor: 'pointer',
          }}
        />
        <span
          style={{
            color: '#f5f0e8',
            fontSize: '12px',
            fontFamily: 'monospace',
            fontWeight: 600,
            width: '36px',
            textAlign: 'right',
          }}
        >
          {Math.round(localZoom * 100)}%
        </span>
      </div>
    </div>
  );
};

export default CanvasArea;

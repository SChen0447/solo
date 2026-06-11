import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PixelData, CLASSIC_8BIT_COLORS, CANVAS_SIZE } from '../types';
import { createEmptyPixelData } from '../utils/pixelData';
import { useWebAudio } from '../hooks/useWebAudio';

interface CanvasProps {
  onSubmit: (data: PixelData) => void;
  initialData?: PixelData | null;
  referenceData?: PixelData | null;
  onClearReference?: () => void;
}

const PIXEL_SIZE = 16;
const PIXEL_SIZE_MOBILE = 10;
const BRUSH_SIZES = [1, 2, 4];

export const PixelCanvas: React.FC<CanvasProps> = ({
  onSubmit,
  initialData,
  referenceData,
  onClearReference
}) => {
  const [selectedColor, setSelectedColor] = useState(CLASSIC_8BIT_COLORS[2]);
  const [brushSize, setBrushSize] = useState(1);
  const [pixelData, setPixelData] = useState<PixelData>(() =>
    initialData || createEmptyPixelData(CANVAS_SIZE)
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [animatingPixels, setAnimatingPixels] = useState<Set<string>>(new Set());
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const { playClick, playSubmit } = useWebAudio();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (initialData) {
      setPixelData(initialData);
    }
  }, [initialData]);

  const pixelSize = isMobile ? PIXEL_SIZE_MOBILE : PIXEL_SIZE;
  const animationDuration = isMobile ? 0.07 : 0.1;

  const paintPixel = useCallback((x: number, y: number) => {
    if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return;

    setPixelData(prev => {
      const newData = prev.map(row => [...row]);
      const half = Math.floor(brushSize / 2);
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < CANVAS_SIZE && ny >= 0 && ny < CANVAS_SIZE) {
            newData[ny][nx] = selectedColor;
          }
        }
      }
      return newData;
    });

    const key = `${x}-${y}`;
    setAnimatingPixels(prev => new Set(prev).add(key));
    setTimeout(() => {
      setAnimatingPixels(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, animationDuration * 1000);
  }, [selectedColor, brushSize, animationDuration]);

  const getGridPosition = (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    const x = Math.floor((clientX - rect.left) / pixelSize);
    const y = Math.floor((clientY - rect.top) / pixelSize);
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getGridPosition(e);
    if (pos) {
      paintPixel(pos.x, pos.y);
      playClick();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing) return;
    const pos = getGridPosition(e);
    if (pos) {
      paintPixel(pos.x, pos.y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getGridPosition(e);
    if (pos) {
      paintPixel(pos.x, pos.y);
      playClick();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getGridPosition(e);
    if (pos) {
      paintPixel(pos.x, pos.y);
    }
  };

  const handleTouchEnd = () => {
    setIsDrawing(false);
  };

  const handleSubmit = () => {
    setIsFadingOut(true);
    setShowFlash(true);
    playSubmit();

    setTimeout(() => {
      setShowFlash(false);
    }, isMobile ? 210 : 300);

    setTimeout(() => {
      onSubmit(pixelData);
      setPixelData(createEmptyPixelData(CANVAS_SIZE));
      setIsFadingOut(false);
    }, isMobile ? 350 : 500);
  };

  const canvasWidth = CANVAS_SIZE * pixelSize;
  const canvasHeight = CANVAS_SIZE * pixelSize;

  if (isMobile) {
    return (
      <div style={stylesMobile.container}>
        {showFlash && <div style={stylesMobile.flash} />}

        <div style={stylesMobile.canvasArea}>
          <button style={stylesMobile.submitButton} onClick={handleSubmit}>
            完成并提交
          </button>

          {referenceData && (
            <button
              style={stylesMobile.referenceButton}
              onClick={() => setShowReference(!showReference)}
            >
              🖼️ 参考
            </button>
          )}

          <div
            ref={gridRef}
            style={{
              ...stylesMobile.grid,
              width: canvasWidth,
              height: canvasHeight,
              opacity: isFadingOut ? 0 : 1,
              transition: `opacity ${isMobile ? 0.35 : 0.5}s ease`
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {pixelData.map((row, y) =>
              row.map((color, x) => (
                <div
                  key={`${x}-${y}`}
                  style={{
                    ...stylesMobile.pixel,
                    width: pixelSize,
                    height: pixelSize,
                    backgroundColor: color === 'transparent' ? 'transparent' : color,
                    transform: animatingPixels.has(`${x}-${y}`) ? 'scale(1.05)' : 'scale(1)',
                    transition: `transform ${animationDuration}s ease`
                  }}
                />
              ))
            )}
          </div>

          {showReference && referenceData && (
            <div style={stylesMobile.referencePopup}>
              <div style={{ ...stylesMobile.referenceGrid, width: 96, height: 96 }}>
                {referenceData.map((row, y) =>
                  row.map((color, x) => (
                    <div
                      key={`ref-${x}-${y}`}
                      style={{
                        width: 3,
                        height: 3,
                        backgroundColor: color === 'transparent' ? 'transparent' : color
                      }}
                    />
                  ))
                )}
              </div>
              <button style={stylesMobile.clearRefButton} onClick={onClearReference}>
                清除参考
              </button>
            </div>
          )}
        </div>

        <div style={stylesMobile.bottomToolbar}>
          <div style={stylesMobile.brushSizes}>
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                style={{
                  ...stylesMobile.brushButton,
                  backgroundColor: brushSize === size ? '#00cc88' : '#404060',
                  color: '#fff'
                }}
                onClick={() => setBrushSize(size)}
              >
                {size}px
              </button>
            ))}
          </div>

          <div style={stylesMobile.colorScroll}>
            <div style={stylesMobile.colorPalette}>
              {CLASSIC_8BIT_COLORS.map((color, index) => (
                <button
                  key={index}
                  style={{
                    ...stylesMobile.colorButton,
                    backgroundColor: color,
                    boxShadow: selectedColor === color
                      ? '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,255,255,0.4)'
                      : 'none',
                    border: selectedColor === color ? '2px solid #fff' : '2px solid transparent'
                  }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {showFlash && <div style={styles.flash} />}

      <div style={styles.toolbar}>
        <div style={styles.colorPalette}>
          {CLASSIC_8BIT_COLORS.map((color, index) => (
            <button
              key={index}
              style={{
                ...styles.colorButton,
                backgroundColor: color,
                boxShadow: selectedColor === color
                  ? '0 0 6px rgba(255,255,255,0.8), 0 0 12px rgba(255,255,255,0.4)'
                  : 'none',
                border: selectedColor === color ? '2px solid #fff' : '2px solid transparent'
              }}
              onClick={() => setSelectedColor(color)}
            />
          ))}
        </div>

        <div style={styles.brushSizes}>
          {BRUSH_SIZES.map(size => (
            <button
              key={size}
              style={{
                ...styles.brushButton,
                backgroundColor: brushSize === size ? '#00cc88' : '#404060',
                color: '#fff'
              }}
              onClick={() => setBrushSize(size)}
            >
              {size}px
            </button>
          ))}
        </div>

        {referenceData && (
          <button
            style={styles.referenceButton}
            onMouseEnter={() => setShowReference(true)}
            onMouseLeave={() => setShowReference(false)}
            onClick={onClearReference}
            title="点击清除参考 (悬停查看)"
          >
            🖼️ 原始参考
          </button>
        )}
      </div>

      <div style={styles.canvasWrapper}>
        <button style={styles.submitButton} onClick={handleSubmit}>
          完成并提交
        </button>

        <div
          ref={gridRef}
          style={{
            ...styles.grid,
            width: canvasWidth,
            height: canvasHeight,
            opacity: isFadingOut ? 0 : 1,
            transition: 'opacity 0.5s ease'
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {pixelData.map((row, y) =>
            row.map((color, x) => (
              <div
                key={`${x}-${y}`}
                style={{
                  ...styles.pixel,
                  width: PIXEL_SIZE,
                  height: PIXEL_SIZE,
                  backgroundColor: color === 'transparent' ? 'transparent' : color,
                  transform: animatingPixels.has(`${x}-${y}`) ? 'scale(1.05)' : 'scale(1)',
                  transition: 'transform 0.1s ease',
                  borderRight: x < CANVAS_SIZE - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                  borderBottom: y < CANVAS_SIZE - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none'
                }}
              />
            ))
          )}
        </div>

        {showReference && referenceData && (
          <div style={styles.referenceOverlay}>
            <div style={{ ...styles.referenceGrid, width: 64, height: 64 }}>
              {referenceData.map((row, y) =>
                row.map((color, x) => (
                  <div
                    key={`ref-${x}-${y}`}
                    style={{
                      width: 2,
                      height: 2,
                      backgroundColor: color === 'transparent' ? 'transparent' : color
                    }}
                  />
                ))
              )}
            </div>
            <div style={styles.referenceLabel}>原始参考</div>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 20,
    padding: 20,
    backgroundColor: '#2c2c2c',
    backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%)',
    backgroundSize: '2px 2px',
    borderRadius: 12,
    minHeight: '100%',
    boxSizing: 'border-box'
  },
  toolbar: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    minWidth: 80
  },
  colorPalette: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8,
    justifyItems: 'center'
  },
  colorButton: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    transition: 'box-shadow 0.2s ease, transform 0.2s ease'
  },
  brushSizes: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  brushButton: {
    padding: '6px 8px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    transition: 'background-color 0.2s ease'
  },
  referenceButton: {
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid #00cc88',
    backgroundColor: 'transparent',
    color: '#00cc88',
    cursor: 'pointer',
    fontSize: 11,
    transition: 'background-color 0.2s ease'
  },
  canvasWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  submitButton: {
    position: 'absolute',
    top: -10,
    right: -10,
    zIndex: 10,
    padding: '10px 20px',
    backgroundColor: '#00cc88',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease, box-shadow 0.2s ease'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`,
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    cursor: 'crosshair',
    userSelect: 'none',
    touchAction: 'none'
  },
  pixel: {
    boxSizing: 'border-box'
  },
  flash: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 0,
    height: 0,
    borderRadius: '50%',
    backgroundColor: 'white',
    pointerEvents: 'none',
    zIndex: 1000,
    animation: 'flashExpand 0.3s ease-out forwards'
  },
  referenceOverlay: {
    position: 'absolute',
    top: 60,
    right: -80,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 6,
    zIndex: 20
  },
  referenceGrid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`,
    border: '1px solid #fff'
  },
  referenceLabel: {
    color: '#999',
    fontSize: 10
  }
};

const stylesMobile: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: '#2c2c2c',
    backgroundImage: 'repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%)',
    backgroundSize: '2px 2px',
    boxSizing: 'border-box'
  },
  canvasArea: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 20
  },
  submitButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    padding: '8px 14px',
    backgroundColor: '#00cc88',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  referenceButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    zIndex: 10,
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#00cc88',
    border: '1px solid #00cc88',
    borderRadius: 8,
    fontSize: 12,
    cursor: 'pointer'
  },
  referencePopup: {
    position: 'absolute',
    top: 50,
    left: 12,
    zIndex: 15,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
    border: '1px solid #404060'
  },
  referenceGrid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`,
    border: '1px solid #fff'
  },
  clearRefButton: {
    padding: '4px 10px',
    backgroundColor: 'transparent',
    color: '#ff6666',
    border: '1px solid #ff6666',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${CANVAS_SIZE}, 1fr)`,
    border: '2px solid rgba(255,255,255,0.2)',
    borderRadius: 4,
    cursor: 'crosshair',
    userSelect: 'none',
    touchAction: 'none'
  },
  pixel: {
    boxSizing: 'border-box'
  },
  flash: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 0,
    height: 0,
    borderRadius: '50%',
    backgroundColor: 'white',
    pointerEvents: 'none',
    zIndex: 1000,
    animation: 'flashExpandMobile 0.21s ease-out forwards'
  },
  bottomToolbar: {
    height: 50,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderTop: '1px solid #404060',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    gap: 12
  },
  brushSizes: {
    display: 'flex',
    gap: 6,
    flexShrink: 0
  },
  brushButton: {
    padding: '6px 10px',
    borderRadius: 6,
    border: 'none',
    cursor: 'pointer',
    fontSize: 12,
    color: '#fff'
  },
  colorScroll: {
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none'
  },
  colorPalette: {
    display: 'flex',
    gap: 8,
    padding: '2px 0'
  },
  colorButton: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0
  }
};

export default PixelCanvas;

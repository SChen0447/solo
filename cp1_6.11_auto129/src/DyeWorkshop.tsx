import React, { useRef, useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import html2canvas from 'html2canvas';
import {
  BindingPoint,
  DyePhase,
  CANVAS_SIZE,
  BINDING_POINT_DRAW_RADIUS,
  LAYER_COLORS,
  computeDistanceField,
  computeDiffusionFrame,
  applyOxidation,
  applyWashing,
  compositeLayers,
  createEmptyImageData,
} from './DyeEngine';

interface HistoryEntry {
  id: string;
  thumbnail: string;
  timestamp: string;
  bindingPoints: BindingPoint[];
  layerCount: number;
  imageData: ImageData;
}

const TOOL_WIDTH = 150;
const HISTORY_WIDTH = 200;

export default function DyeWorkshop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  const [bindingPoints, setBindingPoints] = useState<BindingPoint[]>([]);
  const [phase, setPhase] = useState<DyePhase>('idle');
  const [currentLayer, setCurrentLayer] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [barrelVisible, setBarrelVisible] = useState(false);
  const [barrelHeight, setBarrelHeight] = useState(0);
  const [oxidationProgress, setOxidationProgress] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [canvasInVat, setCanvasInVat] = useState(false);

  const baseImageDataRef = useRef<ImageData>(createEmptyImageData(CANVAS_SIZE, CANVAS_SIZE));
  const currentLayerImageDataRef = useRef<ImageData | null>(null);
  const distFieldRef = useRef<Float32Array | null>(null);
  const diffusionRadiusRef = useRef(0);
  const oxidationStartRef = useRef(0);

  const completedLayersRef = useRef<ImageData[]>([]);

  const drawBindingPoints = useCallback(
    (ctx: CanvasRenderingContext2D, points: BindingPoint[]) => {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      if (phase === 'idle' || phase === 'binding') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }

      if (points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = '#d2b48c';
        ctx.lineWidth = 2;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
      }

      for (const pt of points) {
        ctx.beginPath();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#d2b48c';
        ctx.lineWidth = 1;
        ctx.arc(pt.x, pt.y, BINDING_POINT_DRAW_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = '#d2b48c';
        const innerR = 3;
        ctx.arc(pt.x, pt.y, innerR, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [phase]
  );

  const renderImageData = useCallback((imageData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);
  }, []);

  const getCompositeDisplay = useCallback((): ImageData => {
    let base = new ImageData(
      new Uint8ClampedArray(baseImageDataRef.current.data),
      CANVAS_SIZE,
      CANVAS_SIZE
    );
    if (currentLayerImageDataRef.current) {
      base = compositeLayers(base, currentLayerImageDataRef.current);
    }
    return base;
  }, []);

  const saveToHistory = useCallback(
    async (label: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const thumbnailCanvas = document.createElement('canvas');
      thumbnailCanvas.width = 80;
      thumbnailCanvas.height = 80;
      const tCtx = thumbnailCanvas.getContext('2d');
      if (!tCtx) return;
      tCtx.drawImage(canvas, 0, 0, 80, 80);

      const displayData = getCompositeDisplay();
      const entry: HistoryEntry = {
        id: uuidv4(),
        thumbnail: thumbnailCanvas.toDataURL(),
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        bindingPoints: [...bindingPoints],
        layerCount: currentLayer + 1,
        imageData: new ImageData(new Uint8ClampedArray(displayData.data), CANVAS_SIZE, CANVAS_SIZE),
      };
      setHistory((prev) => [...prev, entry]);
    },
    [bindingPoints, currentLayer, getCompositeDisplay]
  );

  const startDiffusion = useCallback(() => {
    if (bindingPoints.length === 0) return;

    setPhase('dyeing');
    setCanvasInVat(true);

    distFieldRef.current = computeDistanceField(CANVAS_SIZE, CANVAS_SIZE, bindingPoints);
    diffusionRadiusRef.current = BINDING_POINT_DRAW_RADIUS;

    const maxDist = Math.sqrt(2) * CANVAS_SIZE;

    const animate = () => {
      diffusionRadiusRef.current += 5;
      const radius = diffusionRadiusRef.current;

      if (!distFieldRef.current) return;

      const layerColor = LAYER_COLORS[currentLayer] || LAYER_COLORS[0];
      const frameData = computeDiffusionFrame(
        CANVAS_SIZE,
        CANVAS_SIZE,
        distFieldRef.current,
        radius,
        layerColor
      );

      currentLayerImageDataRef.current = frameData;
      const display = getCompositeDisplay();
      renderImageData(display);

      if (radius < maxDist) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('oxidizing');
        saveToHistory('dyeing');
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [bindingPoints, currentLayer, getCompositeDisplay, renderImageData, saveToHistory]);

  const startOxidation = useCallback(() => {
    if (!currentLayerImageDataRef.current) return;

    setPhase('oxidizing');
    oxidationStartRef.current = performance.now();
    setOxidationProgress(0);

    const duration = 3000;

    const originalData = new ImageData(
      new Uint8ClampedArray(currentLayerImageDataRef.current.data),
      CANVAS_SIZE,
      CANVAS_SIZE
    );

    const animate = (now: number) => {
      const elapsed = now - oxidationStartRef.current;
      const progress = Math.min(1, elapsed / duration);
      setOxidationProgress(progress);

      const oxidized = applyOxidation(originalData, progress);
      currentLayerImageDataRef.current = oxidized;
      const display = getCompositeDisplay();
      renderImageData(display);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setPhase('washing');
        saveToHistory('oxidation');
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [getCompositeDisplay, renderImageData, saveToHistory]);

  const startWashing = useCallback(() => {
    if (!currentLayerImageDataRef.current || !distFieldRef.current) return;

    setPhase('washing');

    const washed = applyWashing(
      currentLayerImageDataRef.current,
      distFieldRef.current,
      bindingPoints
    );
    currentLayerImageDataRef.current = washed;

    const newBase = compositeLayers(baseImageDataRef.current, washed);
    baseImageDataRef.current = newBase;
    completedLayersRef.current.push(new ImageData(
      new Uint8ClampedArray(washed.data),
      CANVAS_SIZE,
      CANVAS_SIZE
    ));

    currentLayerImageDataRef.current = null;

    const display = getCompositeDisplay();
    renderImageData(display);

    setCanvasInVat(false);

    if (currentLayer < 3) {
      setCurrentLayer((prev) => prev + 1);
      setPhase('idle');
    } else {
      setPhase('complete');
    }

    saveToHistory('washing');
  }, [bindingPoints, currentLayer, getCompositeDisplay, renderImageData, saveToHistory]);

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (phase !== 'idle' && phase !== 'binding') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return;

      const tooClose = bindingPoints.some((pt) => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return Math.sqrt(dx * dx + dy * dy) < BINDING_POINT_DRAW_RADIUS * 2;
      });

      if (!tooClose) {
        setBindingPoints((prev) => [...prev, { x, y, id: uuidv4() }]);
      }

      setIsDrawing(true);
      setPhase('binding');
    },
    [phase, bindingPoints]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || (phase !== 'idle' && phase !== 'binding')) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return;

      const tooClose = bindingPoints.some((pt) => {
        const dx = pt.x - x;
        const dy = pt.y - y;
        return Math.sqrt(dx * dx + dy * dy) < BINDING_POINT_DRAW_RADIUS * 3;
      });

      if (!tooClose) {
        setBindingPoints((prev) => [...prev, { x, y, id: uuidv4() }]);
      }
    },
    [isDrawing, phase, bindingPoints]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const restoreFromHistory = useCallback(
    (entry: HistoryEntry) => {
      cancelAnimationFrame(animFrameRef.current);

      baseImageDataRef.current = new ImageData(
        new Uint8ClampedArray(entry.imageData.data),
        CANVAS_SIZE,
        CANVAS_SIZE
      );
      currentLayerImageDataRef.current = null;
      setBindingPoints(entry.bindingPoints);
      setCurrentLayer(entry.layerCount);
      setPhase('idle');
      setCanvasInVat(false);
      setBarrelVisible(false);
      setOxidationProgress(0);

      renderImageData(baseImageDataRef.current);
    },
    [renderImageData]
  );

  const resetWorkshop = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);

    setBindingPoints([]);
    setPhase('idle');
    setCurrentLayer(0);
    setCanvasInVat(false);
    setBarrelVisible(false);
    setOxidationProgress(0);

    baseImageDataRef.current = createEmptyImageData(CANVAS_SIZE, CANVAS_SIZE);
    currentLayerImageDataRef.current = null;
    distFieldRef.current = null;
    completedLayersRef.current = [];

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      }
    }
  }, []);

  useEffect(() => {
    if (phase === 'idle' || phase === 'binding') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawBindingPoints(ctx, bindingPoints);
    }
  }, [bindingPoints, phase, drawBindingPoints]);

  useEffect(() => {
    if (phase === 'dyeing' && canvasInVat) {
      setBarrelVisible(true);
      const start = performance.now();
      const duration = 800;
      const animateBarrel = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        setBarrelHeight(progress * 50);
        if (progress < 1) {
          requestAnimationFrame(animateBarrel);
        }
      };
      requestAnimationFrame(animateBarrel);
    } else {
      setBarrelVisible(false);
      setBarrelHeight(0);
    }
  }, [phase, canvasInVat]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  const canDye = (phase === 'idle' || phase === 'binding') && bindingPoints.length > 0 && currentLayer < 4;
  const canOxidize = phase === 'oxidizing';
  const canWash = phase === 'washing';

  const styles: Record<string, React.CSSProperties> = {
    container: {
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#1a237e',
      backgroundImage: 'linear-gradient(135deg, #1a237e 0%, #0d1b5e 50%, #1a237e 100%)',
      color: '#e8dcc8',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      overflow: 'hidden',
    },
    toolPanel: {
      width: TOOL_WIDTH,
      minWidth: TOOL_WIDTH,
      backgroundColor: 'rgba(62, 39, 35, 0.85)',
      borderRight: '2px solid #b87333',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      overflowY: 'auto',
    },
    workspace: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
    },
    historyPanel: {
      width: HISTORY_WIDTH,
      minWidth: HISTORY_WIDTH,
      backgroundColor: 'rgba(62, 39, 35, 0.85)',
      borderLeft: '2px solid #b87333',
      padding: '12px',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
    },
    vatContainer: {
      width: '120px',
      height: '100px',
      borderRadius: '0 0 20px 20px',
      background: 'radial-gradient(ellipse at center, #283593 0%, #1a237e 70%, #0d1b5e 100%)',
      position: 'relative',
      overflow: 'hidden',
      border: '3px solid #5d4037',
      borderTop: '4px solid #8d6e63',
      cursor: 'pointer',
      alignSelf: 'center',
      transition: 'transform 0.2s ease',
    },
    vatRipple: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `repeating-linear-gradient(
        0deg,
        rgba(255,255,255,0.08) 0px,
        rgba(255,255,255,0.02) 4px,
        rgba(255,255,255,0.08) 8px
      )`,
      animation: 'vatRipple 2s ease-in-out infinite',
    },
    canvasWrapper: {
      position: 'relative',
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
    },
    canvas: {
      backgroundColor: '#ffffff',
      cursor: phase === 'idle' || phase === 'binding' ? 'crosshair' : 'default',
      imageRendering: 'pixelated',
    },
    barrel: {
      position: 'absolute',
      bottom: 0,
      left: -10,
      right: -10,
      height: `${barrelHeight}px`,
      backgroundColor: '#5d4037',
      opacity: 0.6,
      transition: 'height 0.3s ease-out',
      borderTop: '3px solid #8d6e63',
      pointerEvents: 'none',
      borderRadius: '4px 4px 0 0',
    },
    button: {
      padding: '8px 12px',
      borderRadius: '6px',
      border: '1px solid #b87333',
      backgroundColor: 'rgba(184, 115, 51, 0.2)',
      color: '#e8dcc8',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.2s ease',
      fontWeight: 500,
      width: '100%',
      textAlign: 'center' as const,
    },
    buttonDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    layerIndicator: {
      display: 'flex',
      gap: '6px',
      justifyContent: 'center',
      flexWrap: 'wrap' as const,
    },
    layerDot: {
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      border: '2px solid #b87333',
      transition: 'all 0.2s ease',
    },
    historyItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      borderBottom: '1px solid rgba(200, 230, 201, 0.1)',
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: '#b87333',
      marginBottom: '8px',
      borderBottom: '1px solid #b87333',
      paddingBottom: '4px',
      letterSpacing: '1px',
    },
    statusText: {
      fontSize: '12px',
      color: '#c8e6c9',
      textAlign: 'center' as const,
      marginTop: '8px',
      opacity: 0.8,
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes vatRipple {
          0%, 100% { transform: translateY(0) scaleY(1); opacity: 0.6; }
          50% { transform: translateY(3px) scaleY(1.05); opacity: 1; }
        }
        .tool-btn:hover:not(:disabled) {
          background-color: rgba(184, 115, 51, 0.5) !important;
          transform: scale(1.05);
        }
        .history-item:hover {
          background-color: rgba(184, 115, 51, 0.3) !important;
        }
        .history-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .history-scroll::-webkit-scrollbar-track {
          background: rgba(62, 39, 35, 0.5);
        }
        .history-scroll::-webkit-scrollbar-thumb {
          background: #b87333;
          border-radius: 3px;
        }
        .vat-hover:hover {
          transform: scale(1.05);
        }
        @media (max-width: 800px) {
          .workshop-layout {
            flex-direction: column !important;
          }
          .tool-panel, .history-panel {
            width: 100% !important;
            min-width: unset !important;
            border-right: none !important;
            border-left: none !important;
            border-bottom: 2px solid #b87333;
            flex-direction: row !important;
            flex-wrap: wrap;
            padding: 8px !important;
          }
          .history-panel {
            border-top: 2px solid #b87333;
            border-bottom: none !important;
          }
        }
      `}</style>

      <div className="workshop-layout" style={styles.container}>
        {/* Left Tool Panel */}
        <div className="tool-panel" style={styles.toolPanel}>
          <div style={styles.sectionTitle}>染料缸</div>
          <div
            className="vat-hover"
            style={styles.vatContainer}
            onClick={() => {
              if (canDye) startDiffusion();
            }}
          >
            <div style={styles.vatRipple} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: '12px',
              textAlign: 'center',
              pointerEvents: 'none',
            }}>
              {canDye ? '点击浸染' : ''}
            </div>
          </div>

          <div style={styles.sectionTitle}>操作</div>
          <button
            className="tool-btn"
            style={{
              ...styles.button,
              ...(canDye ? {} : styles.buttonDisabled),
            }}
            disabled={!canDye}
            onClick={startDiffusion}
          >
            浸染
          </button>
          <button
            className="tool-btn"
            style={{
              ...styles.button,
              ...(canOxidize ? {} : styles.buttonDisabled),
            }}
            disabled={!canOxidize}
            onClick={startOxidation}
          >
            氧化
          </button>
          <button
            className="tool-btn"
            style={{
              ...styles.button,
              ...(canWash ? {} : styles.buttonDisabled),
            }}
            disabled={!canWash}
            onClick={startWashing}
          >
            清洗
          </button>
          <button
            className="tool-btn"
            style={styles.button}
            onClick={resetWorkshop}
          >
            重置
          </button>

          <div style={styles.sectionTitle}>层数</div>
          <div style={styles.layerIndicator}>
            {LAYER_COLORS.map((color, i) => (
              <div
                key={i}
                style={{
                  ...styles.layerDot,
                  backgroundColor: i < currentLayer ? color : 'transparent',
                  borderColor: i === currentLayer ? '#fff' : '#b87333',
                  boxShadow: i === currentLayer ? `0 0 8px ${color}` : 'none',
                }}
              >
                {i >= currentLayer && (
                  <span style={{ fontSize: '10px', color: '#b87333', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    {i + 1}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div style={styles.sectionTitle}>当前颜色</div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '6px',
            backgroundColor: LAYER_COLORS[currentLayer] || LAYER_COLORS[0],
            border: '2px solid #b87333',
            alignSelf: 'center',
          }} />

          <div style={styles.statusText}>
            {phase === 'idle' && '点击帆布添加绑扎点'}
            {phase === 'binding' && `绑扎点: ${bindingPoints.length}`}
            {phase === 'dyeing' && '浸染中...'}
            {phase === 'oxidizing' && `氧化中 ${Math.round(oxidationProgress * 100)}%`}
            {phase === 'washing' && '清洗中...'}
            {phase === 'complete' && '染色完成！'}
          </div>
        </div>

        {/* Center Workspace */}
        <div style={styles.workspace} ref={workspaceRef}>
          <div style={{
            background: `
              repeating-linear-gradient(
                0deg,
                #e8dcc8 0px, #e8dcc8 2px,
                #d4c4a8 2px, #d4c4a8 4px
              ),
              repeating-linear-gradient(
                90deg,
                rgba(212, 196, 168, 0.5) 0px, rgba(212, 196, 168, 0.5) 2px,
                rgba(232, 220, 200, 0.5) 2px, rgba(232, 220, 200, 0.5) 4px
              )
            `,
            padding: '24px',
            borderRadius: '8px',
            boxShadow: 'inset 0 0 30px rgba(0,0,0,0.1)',
          }}>
            <div style={styles.canvasWrapper}>
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={styles.canvas}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              />
              {barrelVisible && <div style={styles.barrel} />}
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(232, 220, 200, 0.7)' }}>
              第 {currentLayer + 1} / 4 层
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(232, 220, 200, 0.5)' }}>|</span>
            <span style={{ fontSize: '12px', color: 'rgba(232, 220, 200, 0.7)' }}>
              绑扎点: {bindingPoints.length}
            </span>
          </div>
        </div>

        {/* Right History Panel */}
        <div className="history-panel history-scroll" style={styles.historyPanel}>
          <div style={styles.sectionTitle}>历史记录</div>
          {history.length === 0 && (
            <div style={{ fontSize: '12px', color: '#c8e6c9', opacity: 0.5, textAlign: 'center', padding: '20px 0' }}>
              尚无记录
            </div>
          )}
          {history.map((entry) => (
            <div
              key={entry.id}
              className="history-item"
              style={styles.historyItem}
              onClick={() => restoreFromHistory(entry)}
            >
              <img
                src={entry.thumbnail}
                alt="历史缩略图"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  border: '1px solid #b87333',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '11px', color: '#c8e6c9' }}>{entry.timestamp}</span>
                <span style={{ fontSize: '10px', color: '#c8e6c9', opacity: 0.6 }}>
                  第{entry.layerCount}层
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

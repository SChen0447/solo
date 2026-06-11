import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CanvasRenderer } from './CanvasRenderer';
import ToolPanel from './ToolPanel';
import { Pigment, RestorationParams, BrushStroke, PIGMENTS, DEFAULT_PARAMS } from './types';

interface GoldParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const [selectedPigment, setSelectedPigment] = useState<Pigment>(PIGMENTS[0]);
  const [params, setParams] = useState<RestorationParams>(DEFAULT_PARAMS);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [beforeImage, setBeforeImage] = useState('');
  const [afterImage, setAfterImage] = useState('');
  const [goldParticles, setGoldParticles] = useState<GoldParticle[]>([]);

  const isPaintingRef = useRef(false);
  const lastPaintPos = useRef<{ x: number; y: number } | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval>>();
  const completionTriggered = useRef(false);

  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new CanvasRenderer(canvasRef.current, params);
    }
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.updateParams(params);
  }, [params]);

  useEffect(() => {
    progressTimerRef.current = setInterval(() => {
      if (rendererRef.current) {
        const p = rendererRef.current.calculateProgress();
        setProgress(p);
        if (p >= 95 && !completionTriggered.current) {
          completionTriggered.current = true;
          setIsComplete(true);
          triggerGoldParticles();
          setTimeout(() => {
            if (rendererRef.current) {
              setBeforeImage(rendererRef.current.getBeforeImage());
              setAfterImage(rendererRef.current.getAfterImage());
              setShowComparison(true);
            }
          }, 2000);
        }
      }
    }, 500);
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const triggerGoldParticles = useCallback(() => {
    const particles: GoldParticle[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 20,
      size: 2 + Math.random() * 2,
      delay: Math.random() * 0.5,
    }));
    setGoldParticles(particles);
    setTimeout(() => setGoldParticles([]), 2500);
  }, []);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const paintAt = useCallback(
    (x: number, y: number) => {
      if (!rendererRef.current || !selectedPigment) return;
      const humidityFactor = params.humidity / 100;
      const pressure = 0.3 + humidityFactor * 0.4 + Math.random() * 0.2;

      const stroke: BrushStroke = {
        pigment: selectedPigment,
        x,
        y,
        size: params.brushSize,
        pressure: Math.min(0.9, Math.max(0.3, pressure)),
        timestamp: Date.now(),
      };
      rendererRef.current.applyBrushStroke(stroke);
    },
    [selectedPigment, params]
  );

  const interpolateAndPaint = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(2, params.brushSize / 4);
      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        paintAt(from.x + dx * t, from.y + dy * t);
      }
    },
    [paintAt, params.brushSize]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const coords = getCanvasCoords(e);
      if (!coords) return;
      isPaintingRef.current = true;
      setIsPainting(true);
      lastPaintPos.current = coords;
      rendererRef.current?.startPaintSession();
      paintAt(coords.x, coords.y);
    },
    [getCanvasCoords, paintAt]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getCanvasCoords(e);
      if (coords) {
        setCursorPos({ x: e.clientX, y: e.clientY });
      }
      if (!isPaintingRef.current || !coords) return;
      if (lastPaintPos.current) {
        interpolateAndPaint(lastPaintPos.current, coords);
      } else {
        paintAt(coords.x, coords.y);
      }
      lastPaintPos.current = coords;
    },
    [getCanvasCoords, paintAt, interpolateAndPaint]
  );

  const handleMouseUp = useCallback(() => {
    isPaintingRef.current = false;
    setIsPainting(false);
    lastPaintPos.current = null;
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);
    isPaintingRef.current = false;
    setIsPainting(false);
    lastPaintPos.current = null;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -3 : 3;
      setParams((prev) => ({
        ...prev,
        brushSize: Math.max(20, Math.min(60, prev.brushSize + delta)),
      }));
    },
    []
  );

  const handleParamsChange = useCallback((partial: Partial<RestorationParams>) => {
    setParams((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleDownload = useCallback(
    (dataUrl: string, suffix: string) => {
      const link = document.createElement('a');
      link.download = `mural-restoration-${suffix}.png`;
      link.href = dataUrl;

      const img = new Image();
      img.onload = () => {
        const exportCanvas = document.createElement('canvas');
        const dpi = 150;
        const inchW = 800 / 96;
        const inchH = 600 / 96;
        exportCanvas.width = Math.round(inchW * dpi);
        exportCanvas.height = Math.round(inchH * dpi);
        const exportCtx = exportCanvas.getContext('2d')!;
        exportCtx.drawImage(img, 0, 0, exportCanvas.width, exportCanvas.height);
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
      };
      img.src = dataUrl;
    },
    []
  );

  const handleDownloadComparison = useCallback(() => {
    const compCanvas = document.createElement('canvas');
    compCanvas.width = 1600;
    compCanvas.height = 600;
    const compCtx = compCanvas.getContext('2d')!;

    const beforeImg = new Image();
    beforeImg.onload = () => {
      compCtx.drawImage(beforeImg, 0, 0, 800, 600);
      const afterImg = new Image();
      afterImg.onload = () => {
        compCtx.drawImage(afterImg, 800, 0, 800, 600);
        compCtx.strokeStyle = '#ffd54f';
        compCtx.lineWidth = 2;
        compCtx.beginPath();
        compCtx.moveTo(800, 0);
        compCtx.lineTo(800, 600);
        compCtx.stroke();

        compCtx.fillStyle = 'rgba(62,39,35,0.7)';
        compCtx.font = '16px serif';
        compCtx.fillText('修复前', 350, 580);
        compCtx.fillText('修复后', 1170, 580);

        const link = document.createElement('a');
        link.download = 'mural-comparison.png';
        link.href = compCanvas.toDataURL('image/png');
        link.click();
      };
      afterImg.src = afterImage;
    };
    beforeImg.src = beforeImage;
  }, [beforeImage, afterImage]);

  return (
    <div style={styles.root}>
      <div style={styles.backgroundOverlay} />

      <AnimatePresence>
        {goldParticles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0.6, y: p.y, x: p.x }}
            animate={{ opacity: 0, y: p.y - 400 - Math.random() * 200, x: p.x + (Math.random() - 0.5) * 100 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, delay: p.delay, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: '#ffd54f',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        ))}
      </AnimatePresence>

      <div style={styles.mainContainer}>
        <div style={styles.canvasWrapper}>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.title}
          >
            虚拟壁画褪色模拟与矿物颜料修复
          </motion.h1>

          <div style={styles.canvasContainer}>
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
            />
            {cursorPos && selectedPigment && (
              <div
                style={{
                  ...styles.cursorPreview,
                  left: cursorPos.x - params.brushSize / 2,
                  top: cursorPos.y - params.brushSize / 2,
                  width: params.brushSize,
                  height: params.brushSize,
                  borderColor: selectedPigment.hex,
                }}
              />
            )}
          </div>

          <div style={styles.progressOverlay}>
            <span style={styles.progressLabel}>修复进度</span>
            <div style={styles.miniProgressTrack}>
              <motion.div
                style={styles.miniProgressFill}
                animate={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <span style={styles.progressValue}>{progress.toFixed(1)}%</span>
          </div>
        </div>

        <ToolPanel
          selectedPigment={selectedPigment}
          onPigmentSelect={setSelectedPigment}
          params={params}
          onParamsChange={handleParamsChange}
          progress={progress}
          isComplete={isComplete}
        />
      </div>

      <AnimatePresence>
        {showComparison && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={styles.modalOverlay}
            onClick={() => setShowComparison(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              style={styles.modal}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalTitle}>修复对比图谱</div>
              <div style={styles.comparisonContainer}>
                <div style={styles.comparisonHalf}>
                  <img src={beforeImage} style={styles.comparisonImg} alt="修复前" />
                  <div style={styles.comparisonLabel}>修复前</div>
                </div>
                <div style={styles.comparisonDivider} />
                <div style={styles.comparisonHalf}>
                  <img src={afterImage} style={styles.comparisonImg} alt="修复后" />
                  <div style={styles.comparisonLabel}>修复后</div>
                </div>
              </div>
              <div style={styles.modalButtons}>
                <button style={styles.modalBtn} onClick={handleDownloadComparison}>
                  下载对比图
                </button>
                <button
                  style={{ ...styles.modalBtn, background: '#6d4c41' }}
                  onClick={() => handleDownload(afterImage, 'restored')}
                >
                  下载修复图
                </button>
                <button
                  style={{ ...styles.modalBtn, background: '#8d6e63' }}
                  onClick={() => setShowComparison(false)}
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #d4c5a9 0%, #c4a882 30%, #a0522d 100%)',
    position: 'relative',
    fontFamily: '"SimSun", "STSong", serif',
  },
  backgroundOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `repeating-linear-gradient(
      90deg,
      transparent,
      transparent 3px,
      rgba(62,39,35,0.03) 3px,
      rgba(62,39,35,0.03) 4px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 6px,
      rgba(62,39,35,0.02) 6px,
      rgba(62,39,35,0.02) 7px
    )`,
    pointerEvents: 'none',
  },
  mainContainer: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 16,
    maxWidth: '95vw',
    maxHeight: '95vh',
    zIndex: 1,
    padding: 16,
  },
  canvasWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    maxWidth: 'calc(65vw)',
  },
  title: {
    color: '#3e2723',
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 4,
    textShadow: '0 1px 2px rgba(255,255,255,0.3)',
    margin: 0,
  },
  canvasContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 6px 20px rgba(0,0,0,0.4), 0 0 40px rgba(160,82,45,0.2)',
    border: '3px solid #5d4037',
    background: '#3e2723',
    maxWidth: '100%',
  },
  canvas: {
    display: 'block',
    maxWidth: '100%',
    height: 'auto',
    cursor: 'none',
  },
  cursorPreview: {
    position: 'fixed',
    borderRadius: '50%',
    border: '2px solid',
    pointerEvents: 'none',
    zIndex: 100,
    transition: 'width 0.1s, height 0.1s',
    mixBlendMode: 'difference',
  },
  progressOverlay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(62,39,35,0.7)',
    padding: '6px 14px',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  progressLabel: {
    color: '#f5e6d3',
    fontSize: 12,
    fontWeight: 600,
  },
  miniProgressTrack: {
    width: 120,
    height: 6,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #ffd54f, #ffb300)',
    borderRadius: 3,
  },
  progressValue: {
    color: '#ffd54f',
    fontSize: 12,
    fontWeight: 700,
    minWidth: 42,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#f5e6d3',
    borderRadius: 12,
    padding: 24,
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#3e2723',
    marginBottom: 16,
    letterSpacing: 3,
  },
  comparisonContainer: {
    display: 'flex',
    gap: 0,
    borderRadius: 8,
    overflow: 'hidden',
    border: '2px solid #5d4037',
  },
  comparisonHalf: {
    flex: 1,
    position: 'relative',
  },
  comparisonImg: {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
  comparisonLabel: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(62,39,35,0.8)',
    color: '#f5e6d3',
    padding: '4px 12px',
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
  },
  comparisonDivider: {
    width: 2,
    background: '#ffd54f',
  },
  modalButtons: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    marginTop: 16,
  },
  modalBtn: {
    padding: '8px 20px',
    border: 'none',
    borderRadius: 6,
    background: '#a1887f',
    color: '#f5e6d3',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
};

export default App;

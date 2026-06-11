import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import 修复Panel from './修复Panel';
import type { AnalyzeResult, Wormhole, RestorationRecord } from './types';

const App: React.FC = () => {
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectedWormhole, setSelectedWormhole] = useState<Wormhole | null>(null);
  const [completedRestorations, setCompletedRestorations] = useState<Set<string>>(new Set());
  const [records, setRecords] = useState<RestorationRecord[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string>('');
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadRecords = useCallback(async () => {
    try {
      const res = await fetch('/api/records');
      const data = await res.json();
      if (data.success) setRecords(data.records);
    } catch (e) {
      console.error('加载记录失败', e);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const updateSize = () => {
      const maxWidth = Math.min(800, window.innerWidth - 40);
      const ratio = 4 / 3;
      const width = maxWidth;
      const height = Math.min(600, width / ratio);
      setCanvasSize({ width, height });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const drawWormholes = useCallback(() => {
    if (!overlayCanvasRef.current || !analyzeResult) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgW = analyzeResult.width;
    const imgH = analyzeResult.height;
    const displayW = canvas.width;
    const displayH = canvas.height;
    const sx = displayW / imgW;
    const sy = displayH / imgH;

    ctx.clearRect(0, 0, displayW, displayH);

    analyzeResult.wormholes.forEach((w) => {
      const isSelected = selectedWormhole?.id === w.id;
      const isCompleted = completedRestorations.has(w.id);

      ctx.beginPath();
      w.contour.forEach(([px, py], idx) => {
        const x = px * sx;
        const y = py * sy;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      if (isCompleted) {
        ctx.fillStyle = 'rgba(212, 163, 115, 0.35)';
        ctx.strokeStyle = 'rgba(212, 163, 115, 0.9)';
      } else if (isSelected) {
        ctx.fillStyle = 'rgba(200, 50, 50, 0.45)';
        ctx.strokeStyle = 'rgba(220, 80, 80, 1)';
      } else {
        ctx.fillStyle = 'rgba(200, 50, 50, 0.3)';
        ctx.strokeStyle = 'rgba(200, 50, 50, 0.7)';
      }
      ctx.fill();
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();

      if (isSelected || isCompleted) {
        const [cx, cy] = w.center;
        ctx.beginPath();
        ctx.arc(cx * sx, cy * sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = isCompleted ? '#d4a373' : '#c83232';
        ctx.fill();

        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = isCompleted ? '#8b5a2b' : '#991b1b';
        const label = isCompleted ? '✓已修复' : `#${analyzeResult.wormholes.indexOf(w) + 1}`;
        ctx.fillText(label, cx * sx + 8, cy * sy - 8);
      }
    });
  }, [analyzeResult, selectedWormhole, completedRestorations]);

  useEffect(() => {
    if (analyzeResult && overlayCanvasRef.current) {
      const canvas = overlayCanvasRef.current;
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (imageCanvasRef.current) {
          const imgCtx = imageCanvasRef.current.getContext('2d');
          if (imgCtx) {
            imageCanvasRef.current!.width = canvasSize.width;
            imageCanvasRef.current!.height = canvasSize.height;
            imgCtx.drawImage(img, 0, 0, canvasSize.width, canvasSize.height);
            const scaleX = canvasSize.width / analyzeResult.width;
            const scaleY = canvasSize.height / analyzeResult.height;
            setScale(Math.min(scaleX, scaleY));
          }
        }
        drawWormholes();
      };
      img.src = analyzeResult.imageUrl;
    }
  }, [analyzeResult, canvasSize, drawWormholes]);

  useEffect(() => {
    drawWormholes();
  }, [drawWormholes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setError('');
    setSelectedWormhole(null);
    setCompletedRestorations(new Set());

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAnalyzeResult(data);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (err) {
      setError('网络错误，请检查后端服务是否启动');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!analyzeResult || !overlayCanvasRef.current) return;
    const canvas = overlayCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const imgW = analyzeResult.width;
    const imgH = analyzeResult.height;
    const sx = imgW / canvas.width;
    const sy = imgH / canvas.height;
    const imgX = clickX * sx;
    const imgY = clickY * sy;

    let found: Wormhole | null = null;
    let minDist = Infinity;

    analyzeResult.wormholes.forEach((w) => {
      const [cx, cy] = w.center;
      const dist = Math.hypot(cx - imgX, cy - imgY);
      if (dist < w.radius * 1.2 && dist < minDist) {
        minDist = dist;
        found = w;
      }
    });

    if (found) {
      setSelectedWormhole(found);
    } else {
      setSelectedWormhole(null);
    }
  };

  const handleRestorationComplete = useCallback((wormholeId: string) => {
    setCompletedRestorations((prev) => new Set([...prev, wormholeId]));
    setSelectedWormhole(null);
    loadRecords();
  }, [loadRecords]);

  return (
    <div className="app-root">
      <header className="app-header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="header-content"
        >
          <h1 className="app-title">
            <span className="title-icon">📜</span>
            古籍虫洞修复与纸纤维再生系统
            <span className="title-icon">🔬</span>
          </h1>
          <p className="app-subtitle">数字化馆藏 · 智能虫洞识别 · 虚拟纤维修复</p>
        </motion.div>
      </header>

      <main className="app-main">
        <div className="workspace" ref={containerRef}>
          <motion.div
            layout
            className={`display-section ${!analyzeResult ? 'center-single' : ''}`}
          >
            <div className="upload-area">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileUpload}
                className="hidden-file"
              />
              {!analyzeResult ? (
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="upload-placeholder wood-frame"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📖</div>
                  <h2>上传古籍扫描件</h2>
                  <p className="upload-hint">点击选择 JPG / PNG 图片（最大 5MB）</p>
                  <p className="upload-subhint">系统将自动识别虫蚀孔洞并标注</p>
                  {isAnalyzing && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                      className="spinner"
                    >
                      ⚙️ 分析中...
                    </motion.div>
                  )}
                  {error && <div className="error-msg">{error}</div>}
                </motion.div>
              ) : (
                <div className="scan-display wood-frame">
                  <div className="canvas-container" style={{ width: canvasSize.width, height: canvasSize.height }}>
                    <canvas
                      ref={imageCanvasRef}
                      className="scan-canvas base-canvas"
                      width={canvasSize.width}
                      height={canvasSize.height}
                    />
                    <canvas
                      ref={overlayCanvasRef}
                      className="scan-canvas overlay-canvas"
                      width={canvasSize.width}
                      height={canvasSize.height}
                      onClick={handleCanvasClick}
                      style={{ cursor: 'pointer' }}
                    />
                  </div>
                  <div className="scan-info">
                    <div className="info-item">
                      <span className="info-label">📄 文件名</span>
                      <span className="info-value">{analyzeResult.filename}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">📐 尺寸</span>
                      <span className="info-value">{analyzeResult.width} × {analyzeResult.height}px</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">🔴 虫洞数</span>
                      <span className="info-value highlight-red">{analyzeResult.wormholes.length}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">✅ 已修复</span>
                      <span className="info-value highlight-green">{completedRestorations.size}</span>
                    </div>
                    <button
                      className="reupload-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      🔄 重新上传
                    </button>
                  </div>
                  {selectedWormhole && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="wormhole-tooltip"
                    >
                      <strong>选中虫洞 #{analyzeResult.wormholes.indexOf(selectedWormhole) + 1}</strong>
                      <span> 面积: {selectedWormhole.area}px² | 半径: {selectedWormhole.radius}px</span>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          <AnimatePresence mode="wait">
            {analyzeResult && (
              <motion.div
                key="panel"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="panel-section"
              >
                <修复Panel
                  analyzeResult={analyzeResult}
                  selectedWormhole={selectedWormhole}
                  onSelectWormhole={setSelectedWormhole}
                  onRestorationComplete={handleRestorationComplete}
                  records={records}
                  canvasSize={canvasSize}
                  scale={scale}
                  imageCanvasRef={imageCanvasRef}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="app-footer">
        <p>🏛️ 文物数字化保护实验室 · 虚拟古籍修复工作站</p>
      </footer>
    </div>
  );
};

export default App;

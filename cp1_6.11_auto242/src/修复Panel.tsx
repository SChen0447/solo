import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnalyzeResult, Wormhole, PulpResult, Fiber, RestorationRecord } from './types';

interface PanelProps {
  analyzeResult: AnalyzeResult;
  selectedWormhole: Wormhole | null;
  onSelectWormhole: (w: Wormhole | null) => void;
  onRestorationComplete: (wormholeId: string) => void;
  records: RestorationRecord[];
  canvasSize: { width: number; height: number };
  scale: number;
  imageCanvasRef: React.RefObject<HTMLCanvasElement>;
}

const FIBER_COLOR = '#d4a373';

const 修复Panel: React.FC<PanelProps> = ({
  analyzeResult,
  selectedWormhole,
  onSelectWormhole,
  onRestorationComplete,
  records,
  canvasSize,
  scale: _scale,
  imageCanvasRef,
}) => {
  const [activeTab, setActiveTab] = useState<'restore' | 'history'>('restore');
  const [pulpData, setPulpData] = useState<PulpResult | null>(null);
  const [isGeneratingPulp, setIsGeneratingPulp] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [fibersRendered, setFibersRendered] = useState(0);
  const [annotation, setAnnotation] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fiberCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const renderedIndicesRef = useRef<Set<number>>(new Set());

  const currentRecords = records.filter((r) => r.imageFilename === analyzeResult.filename);

  const clearFiberCanvas = useCallback(() => {
    if (!fiberCanvasRef.current) return;
    const ctx = fiberCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, fiberCanvasRef.current.width, fiberCanvasRef.current.height);
    }
  }, []);

  const drawFiber = useCallback((ctx: CanvasRenderingContext2D, fiber: Fiber, timeOffset: number, t: number) => {
    const [sx, sy] = fiber.start;
    const [ex, ey] = fiber.end;
    const fiberT = Math.max(0, Math.min(1, (t - fiber.delay) / fiber.duration));
    if (fiberT <= 0) return false;

    const jitterX = Math.sin(timeOffset * 0.01 + fiber.delay) * 0.5;
    const jitterY = Math.cos(timeOffset * 0.008 + fiber.delay) * 0.5;

    const currentEndX = sx + (ex - sx) * fiberT + jitterX;
    const currentEndY = sy + (ey - sy) * fiberT + jitterY;

    ctx.beginPath();
    ctx.moveTo(sx + jitterX * 0.3, sy + jitterY * 0.3);
    ctx.lineTo(currentEndX, currentEndY);

    const grad = ctx.createLinearGradient(sx, sy, currentEndX, currentEndY);
    grad.addColorStop(0, `rgba(212, 163, 115, ${fiber.opacity * 0.9})`);
    grad.addColorStop(1, `rgba(212, 163, 115, ${fiber.opacity * fiberT})`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1 + Math.random() * 0.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    return true;
  }, []);

  const startAnimation = useCallback(() => {
    if (!pulpData || !fiberCanvasRef.current) return;

    const canvas = fiberCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    clearFiberCanvas();
    renderedIndicesRef.current.clear();
    setIsAnimating(true);
    setAnimationProgress(0);
    setFibersRendered(0);
    startTimeRef.current = performance.now();

    const imgW = analyzeResult.width;
    const imgH = analyzeResult.height;
    const sx = canvasSize.width / imgW;
    const sy = canvasSize.height / imgH;

    const scaledFibers = pulpData.fibers.map((f) => ({
      ...f,
      start: [f.start[0] * sx, f.start[1] * sy] as [number, number],
      end: [f.end[0] * sx, f.end[1] * sy] as [number, number],
    }));

    const totalDuration = pulpData.pulpConfig.estimatedDuration;

    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(1, elapsed / totalDuration);
      setAnimationProgress(progress);

      ctx.fillStyle = 'rgba(212, 163, 115, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let count = 0;
      scaledFibers.forEach((fiber, idx) => {
        if (elapsed >= fiber.delay) {
          if (!renderedIndicesRef.current.has(idx)) {
            renderedIndicesRef.current.add(idx);
          }
          drawFiber(ctx, fiber, elapsed, elapsed);
          count++;
        }
      });
      setFibersRendered(count);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        const [cx, cy] = selectedWormhole!.center;
        ctx.beginPath();
        ctx.arc(cx * sx, cy * sy, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139, 90, 43, 0.8)';
        ctx.fill();
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [pulpData, analyzeResult, canvasSize, clearFiberCanvas, drawFiber, selectedWormhole]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    if (pulpData && selectedWormhole && pulpData.wormholeId === selectedWormhole.id) {
      startAnimation();
    }
  }, [pulpData, selectedWormhole, startAnimation]);

  useEffect(() => {
    if (fiberCanvasRef.current) {
      fiberCanvasRef.current.width = canvasSize.width;
      fiberCanvasRef.current.height = canvasSize.height;
    }
  }, [canvasSize]);

  const handleGeneratePulp = async () => {
    if (!selectedWormhole) return;
    setIsGeneratingPulp(true);
    setPulpData(null);
    clearFiberCanvas();
    setAnnotation('');
    setRating(0);

    try {
      const res = await fetch('/api/pulp-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wormhole: selectedWormhole }),
      });
      const data = await res.json();
      if (data.success) {
        setPulpData(data);
      }
    } catch (e) {
      console.error('生成纸浆失败', e);
    } finally {
      setIsGeneratingPulp(false);
    }
  };

  const generateThumbnail = (): string => {
    if (!selectedWormhole || !imageCanvasRef.current) return '';
    try {
      const offCanvas = document.createElement('canvas');
      const w = 120;
      const h = 90;
      offCanvas.width = w;
      offCanvas.height = h;
      const ctx = offCanvas.getContext('2d');
      if (!ctx) return '';

      const srcCanvas = imageCanvasRef.current;
      const [cx, cy] = selectedWormhole.center;
      const srcW = selectedWormhole.boundingBox.w * 2;
      const srcH = selectedWormhole.boundingBox.h * 2;
      const srcX = cx - srcW / 2;
      const srcY = cy - srcH / 2;
      const imgW = analyzeResult.width;
      const imgH = analyzeResult.height;
      const sx = srcCanvas.width / imgW;
      const sy = srcCanvas.height / imgH;

      ctx.drawImage(
        srcCanvas,
        Math.max(0, srcX * sx),
        Math.max(0, srcY * sy),
        srcW * sx,
        srcH * sy,
        0, 0, w, h
      );
      return offCanvas.toDataURL('image/jpeg', 0.7);
    } catch {
      return '';
    }
  };

  const handleSave = async () => {
    if (!selectedWormhole || rating === 0) return;
    setIsSaving(true);

    try {
      const thumbnail = generateThumbnail();
      const res = await fetch('/api/save-restoration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageFilename: analyzeResult.filename,
          wormholeId: selectedWormhole.id,
          annotation,
          rating,
          thumbnail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        onRestorationComplete(selectedWormhole.id);
        setPulpData(null);
        clearFiberCanvas();
      }
    } catch (e) {
      console.error('保存失败', e);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const renderStars = (value: number, interactive: boolean = false, size: string = '20px') => {
    const current = hoverRating > 0 && interactive ? hoverRating : value;
    return (
      <div className="stars-row" style={{ gap: '4px' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star-btn ${n <= current ? 'filled' : ''} ${interactive ? 'clickable' : ''}`}
            style={{ fontSize: size, cursor: interactive ? 'pointer' : 'default' }}
            onClick={() => interactive && setRating(n)}
            onMouseEnter={() => interactive && setHoverRating(n)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            disabled={!interactive}
          >
            {n <= current ? '★' : '☆'}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="scroll-panel">
      <div className="scroll-top-ornament">❧ ❧ ❧</div>

      <div className="scroll-tabs">
        <button
          className={`scroll-tab ${activeTab === 'restore' ? 'active' : ''}`}
          onClick={() => setActiveTab('restore')}
        >
          🔨 修复工作台
        </button>
        <button
          className={`scroll-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📖 修复日记 ({currentRecords.length})
        </button>
      </div>

      <div className="scroll-content">
        <AnimatePresence mode="wait">
          {activeTab === 'restore' ? (
            <motion.div
              key="restore"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="tab-content"
            >
              <div className="section">
                <h3 className="section-title">📍 虫洞列表</h3>
                <div className="wormhole-list">
                  {analyzeResult.wormholes.map((w, idx) => (
                    <motion.div
                      key={w.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`wormhole-item ${selectedWormhole?.id === w.id ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectWormhole(w);
                        setPulpData(null);
                        clearFiberCanvas();
                      }}
                    >
                      <div className="wormhole-index">#{idx + 1}</div>
                      <div className="wormhole-meta">
                        <div>面积 {w.area}px²</div>
                        <div className="wormhole-sub">半径 {w.radius}px</div>
                      </div>
                      {currentRecords.some((r) => r.wormholeId === w.id) && (
                        <span className="restored-badge">✓</span>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="section">
                <h3 className="section-title">🧪 纸浆生成与纤维填充</h3>
                {!selectedWormhole ? (
                  <div className="hint-box">
                    <p>👆 请在左侧扫描件上点击虫洞标记，或从上方列表选择一个虫洞</p>
                  </div>
                ) : (
                  <div className="restore-workspace">
                    <div className="wormhole-detail-card">
                      <div className="detail-row">
                        <span>目标虫洞</span>
                        <strong>
                          #{analyzeResult.wormholes.indexOf(selectedWormhole) + 1}
                          {' '}(中心 {selectedWormhole.center[0]}, {selectedWormhole.center[1]})
                        </strong>
                      </div>
                      <div className="detail-row">
                        <span>预计纤维数</span>
                        <strong>{Math.max(200, Math.floor(selectedWormhole.area / 3))} 根</strong>
                      </div>
                      <div className="detail-row">
                        <span>纤维规格</span>
                        <strong style={{ color: FIBER_COLOR }}>■ 2-5px / {FIBER_COLOR}</strong>
                      </div>
                    </div>

                    <button
                      className="action-btn primary"
                      onClick={handleGeneratePulp}
                      disabled={isGeneratingPulp || isAnimating || isSaving}
                    >
                      {isGeneratingPulp ? (
                        <>
                          <span className="spin">⚙️</span> 调配修复纸浆中...
                        </>
                      ) : isAnimating ? (
                        <>🪡 纤维生长中 {Math.floor(animationProgress * 100)}%</>
                      ) : (
                        <>🪢 生成纸浆并开始修复</>
                      )}
                    </button>

                    {pulpData && (
                      <div className="fibers-preview">
                        <div className="fibers-info">
                          <div>
                            已生成 <strong>{pulpData.pulpConfig.totalFibers}</strong> 根纤维
                          </div>
                          <div>
                            已渲染 <strong>{fibersRendered}</strong> / {pulpData.pulpConfig.totalFibers}
                          </div>
                        </div>
                        <div className="fibers-progress">
                          <motion.div
                            className="fibers-progress-bar"
                            animate={{ width: `${animationProgress * 100}%` }}
                            transition={{ ease: 'linear' }}
                          />
                        </div>
                        <div
                          className="fibers-canvas-wrap"
                          style={{ width: canvasSize.width, height: canvasSize.height, maxWidth: '100%' }}
                        >
                          <canvas
                            ref={fiberCanvasRef}
                            width={canvasSize.width}
                            height={canvasSize.height}
                            className="fibers-canvas"
                          />
                        </div>
                      </div>
                    )}

                    <AnimatePresence>
                      {!isAnimating && pulpData && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          className="save-section"
                        >
                          <h4 className="save-title">✒️ 修复品鉴</h4>
                          <label className="field-label">文字批注</label>
                          <textarea
                            className="annotation-input"
                            placeholder="例如：明代竹纸，纤维长度均匀，纸浆浓度适中..."
                            value={annotation}
                            onChange={(e) => setAnnotation(e.target.value)}
                            rows={3}
                          />
                          <label className="field-label">修复评分</label>
                          <div className="rating-wrap">
                            {renderStars(rating, true, '28px')}
                            {rating > 0 && (
                              <span className="rating-text">
                                {['', '勉强', '一般', '良好', '优秀', '完美'][rating]}
                              </span>
                            )}
                          </div>
                          <button
                            className="action-btn success"
                            onClick={handleSave}
                            disabled={isSaving || rating === 0}
                          >
                            {isSaving ? (
                              <>
                                <span className="spin">💾</span> 保存中...
                              </>
                            ) : (
                              <>📝 存入修复档案</>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="tab-content"
            >
              <div className="section">
                <h3 className="section-title">📚 修复历史档案</h3>
                {currentRecords.length === 0 ? (
                  <div className="hint-box">
                    <p>暂无修复记录</p>
                    <p className="hint-sub">完成修复后，记录将显示于此</p>
                  </div>
                ) : (
                  <div className="records-list">
                    {currentRecords.map((r) => (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="record-card"
                      >
                        {r.thumbnail && (
                          <img src={r.thumbnail} alt="缩略图" className="record-thumb" />
                        )}
                        <div className="record-body">
                          <div className="record-date">{formatDate(r.createdAt)}</div>
                          {renderStars(r.rating, false, '16px')}
                          {r.annotation && (
                            <p className="record-annotation">「{r.annotation}」</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="scroll-bottom-ornament">❧ ❧ ❧</div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="success-toast"
          >
            ✅ 修复档案已保存！
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default 修复Panel;

import { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BambooSlip, { BambooSlipHandle } from './BambooSlip';
import Carbonization from './Carbonization';
import ResultPanel from './ResultPanel';
import { useAppStore, DatingResult } from './store';

export default function App() {
  const {
    imageBase64,
    temperature,
    duration,
    isAnalyzing,
    datingResult,
    isCarbonizing,
    carbonizationProgress,
    error,
    setImageBase64,
    setDatingResult,
    setIsAnalyzing,
    setError,
    setIsCarbonizing,
    setCarbonizationProgress,
  } = useAppStore();

  const slipCanvasRef = useRef<BambooSlipHandle>(null);

  const handleImageData = useCallback((data: string) => {
    setImageBase64(data);
  }, [setImageBase64]);

  const handleCarbonizeStart = useCallback(() => {
    setIsCarbonizing(true);
    setCarbonizationProgress(0);
    setDatingResult(null);

    const startTime = performance.now();
    const totalDuration = duration * 50;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);
      setCarbonizationProgress(progress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsCarbonizing(false);
      }
    };
    requestAnimationFrame(animate);
  }, [duration, setIsCarbonizing, setCarbonizationProgress, setDatingResult]);

  const handleAnalyze = useCallback(async () => {
    if (!imageBase64) {
      setError('请先在竹简上刻写文字');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/carbon-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          temperature,
          duration,
        }),
      });

      const data = (await response.json()) as DatingResult;

      if (!response.ok || !data.success) {
        throw new Error((data as any).error || '断代分析失败');
      }

      setDatingResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '断代分析失败，请检查后端服务');
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageBase64, temperature, duration, setIsAnalyzing, setError, setDatingResult]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          <span className="title-icon">📜</span>
          虚拟竹简刻写与碳化断代系统
        </h1>
        <p className="app-subtitle">体验古代史官竹简制作 · 火烤碳化 · 科学断代</p>
      </header>

      <main className="app-main">
        <section className="canvas-section">
          <BambooSlip
            ref={slipCanvasRef}
            onImageData={handleImageData}
            carbonizationProgress={carbonizationProgress}
            isCarbonizing={isCarbonizing}
            temperature={temperature}
          />
        </section>

        <aside className="panel-section">
          <Carbonization
            onCarbonize={handleCarbonizeStart}
            onAnalyze={handleAnalyze}
            disabled={isAnalyzing}
          />
        </aside>
      </main>

      <AnimatePresence>
        {error && (
          <motion.div
            className="error-toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {datingResult && (
          <motion.section
            className="result-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <ResultPanel result={datingResult} />
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAnalyzing && (
          <motion.div
            className="loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <p className="loading-text">正在进行碳十四断代分析...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="app-footer">
        <p>© 古籍数字化实验室 · 虚拟竹简断代模拟器</p>
      </footer>
    </div>
  );
}

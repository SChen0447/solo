import React, { useState, useEffect, useRef, useCallback } from 'react';
import CurveGrid from './components/CurveGrid';
import ControlPanel from './components/ControlPanel';
import { EasingConfig, PRESET_EASINGS, COLOR_PALETTE, CustomBezier } from './types';

const ANIMATION_DURATION = 2000;
const TRAVEL_DISTANCE = 500;

const App: React.FC = () => {
  const [selectedEasings, setSelectedEasings] = useState<EasingConfig[]>([]);
  const [customBezier, setCustomBezier] = useState<CustomBezier>({
    p1x: 0.25,
    p1y: 0.1,
    p2x: 0.25,
    p2y: 1,
  });
  const [showCustomCurve, setShowCustomCurve] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeEasingId, setActiveEasingId] = useState('');
  const [gridSize, setGridSize] = useState({ width: 600, height: 400 });

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initialEasings = PRESET_EASINGS.slice(0, 3).map((preset, index) => ({
      id: `preset-${index}`,
      color: COLOR_PALETTE[index % COLOR_PALETTE.length],
      ...preset,
    }));
    setSelectedEasings(initialEasings);
    if (initialEasings.length > 0) {
      setActiveEasingId(initialEasings[0].id);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (leftPanelRef.current) {
        const width = Math.min(leftPanelRef.current.offsetWidth - 40, 700);
        const height = Math.min(width * 0.65, 400);
        setGridSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTogglePreset = (presetName: string) => {
    setSelectedEasings((prev) => {
      const exists = prev.find((e) => e.name === presetName);
      if (exists) {
        const newEasings = prev.filter((e) => e.name !== presetName);
        if (activeEasingId === exists.id && newEasings.length > 0) {
          setActiveEasingId(newEasings[0].id);
        }
        return newEasings;
      } else {
        if (prev.length >= 4) return prev;
        const preset = PRESET_EASINGS.find((p) => p.name === presetName);
        if (!preset) return prev;
        const newEasing: EasingConfig = {
          id: `preset-${Date.now()}`,
          color: COLOR_PALETTE[prev.length % COLOR_PALETTE.length],
          ...preset,
        };
        return [...prev, newEasing];
      }
    });
  };

  const handleToggleCustomCurve = () => {
    if (!showCustomCurve) {
      if (selectedEasings.length >= 4) return;
      const customEasing: EasingConfig = {
        id: 'custom-bezier',
        name: 'custom',
        type: 'cubic-bezier',
        p1x: customBezier.p1x,
        p1y: customBezier.p1y,
        p2x: customBezier.p2x,
        p2y: customBezier.p2y,
        color: COLOR_PALETTE[selectedEasings.length % COLOR_PALETTE.length],
      };
      setSelectedEasings((prev) => [...prev, customEasing]);
      setShowCustomCurve(true);
    } else {
      setSelectedEasings((prev) => {
        const newEasings = prev.filter((e) => e.id !== 'custom-bezier');
        if (activeEasingId === 'custom-bezier' && newEasings.length > 0) {
          setActiveEasingId(newEasings[0].id);
        }
        return newEasings;
      });
      setShowCustomCurve(false);
    }
  };

  const handleCustomBezierChange = (bezier: CustomBezier) => {
    setCustomBezier(bezier);
    if (showCustomCurve) {
      setSelectedEasings((prev) =>
        prev.map((e) =>
          e.id === 'custom-bezier'
            ? { ...e, p1x: bezier.p1x, p1y: bezier.p1y, p2x: bezier.p2x, p2y: bezier.p2y }
            : e
        )
      );
    }
  };

  const animate = useCallback((timestamp: number) => {
    if (startTimeRef.current === null) {
      startTimeRef.current = timestamp;
    }

    const elapsed = timestamp - startTimeRef.current;
    const newProgress = Math.min(elapsed / ANIMATION_DURATION, 1);

    setProgress(newProgress);

    if (newProgress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      startTimeRef.current = null;
    }
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsPlaying(false);
      startTimeRef.current = null;
    } else {
      setProgress(0);
      startTimeRef.current = null;
      setIsPlaying(true);
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const handleToggleCompareMode = () => {
    setCompareMode((prev) => !prev);
    setProgress(0);
    setIsPlaying(false);
    startTimeRef.current = null;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const allEasings = selectedEasings;

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Easing Function Visualizer</h1>
        <p style={styles.headerSubtitle}>可视化对比与调试 CSS 缓动函数</p>
      </div>

      <div style={styles.container}>
        <div ref={leftPanelRef} style={styles.leftPanel}>
          <div style={styles.gridSection}>
            <CurveGrid
              easings={allEasings}
              progress={progress}
              activeEasingId={compareMode ? undefined : activeEasingId}
              width={gridSize.width}
              height={gridSize.height}
            />
          </div>

          <div style={styles.previewSection}>
            <h3 style={styles.previewTitle}>
              {compareMode ? '对比动画预览' : '动画预览'}
            </h3>

            {compareMode ? (
              <div style={styles.compareContainer}>
                {allEasings.map((easing) => (
                  <div key={easing.id} style={styles.compareRow}>
                    <div style={{ ...styles.easingLabel, color: easing.color }}>
                      {easing.name}
                    </div>
                    <div style={styles.track}>
                      <div
                        style={{
                          ...styles.movingBox,
                          background: `linear-gradient(135deg, ${easing.color}, ${easing.color}aa)`,
                          transform: `translateX(${progress * TRAVEL_DISTANCE}px)`,
                          transition: isPlaying ? 'none' : 'all 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.singlePreviewContainer}>
                <div style={styles.track}>
                  <div
                    style={{
                      ...styles.movingBox,
                      width: 200,
                      height: 200,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, #667eea, #764ba2)',
                      transform: `translateX(${progress * TRAVEL_DISTANCE}px)`,
                      transition: isPlaying ? 'none' : 'all 0.3s ease',
                    }}
                  />
                </div>
                <div style={styles.progressInfo}>
                  <span style={styles.progressLabel}>进度:</span>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${progress * 100}%`,
                      }}
                    />
                  </div>
                  <span style={styles.progressValue}>
                    {(progress * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <ControlPanel
            selectedEasings={selectedEasings}
            onTogglePreset={handleTogglePreset}
            customBezier={customBezier}
            onCustomBezierChange={handleCustomBezierChange}
            showCustomCurve={showCustomCurve}
            onToggleCustomCurve={handleToggleCustomCurve}
            compareMode={compareMode}
            onToggleCompareMode={handleToggleCompareMode}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            activeEasingId={activeEasingId}
            onActiveEasingChange={setActiveEasingId}
          />
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    transition: 'all 0.3s ease',
  },
  header: {
    textAlign: 'center',
    padding: '30px 20px 20px',
    background: 'linear-gradient(180deg, #16213e, #1a1a2e)',
  },
  headerTitle: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #e94560, #4ECDC4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  headerSubtitle: {
    margin: '8px 0 0 0',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  container: {
    display: 'flex',
    gap: '20px',
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
    transition: 'all 0.3s ease',
  },
  leftPanel: {
    width: '60%',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    transition: 'all 0.3s ease',
  },
  rightPanel: {
    width: '40%',
    minWidth: '300px',
    transition: 'all 0.3s ease',
  },
  gridSection: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  },
  previewSection: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.3s ease',
  },
  previewTitle: {
    margin: '0 0 16px 0',
    fontSize: '16px',
    color: '#e94560',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  singlePreviewContainer: {
    padding: '20px 0',
  },
  track: {
    position: 'relative',
    height: '200px',
    marginBottom: '20px',
    background: 'rgba(255, 255, 255, 0.03)',
    borderRadius: '8px',
    overflow: 'visible',
  },
  movingBox: {
    position: 'absolute',
    top: '50%',
    left: 0,
    transform: 'translateY(-50%)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
    willChange: 'transform',
  },
  compareContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    padding: '20px 0',
  },
  compareRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  easingLabel: {
    width: '100px',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  progressLabel: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: '#1a1a2e',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #e94560, #4ECDC4)',
    borderRadius: '4px',
    transition: 'width 0.05s linear',
  },
  progressValue: {
    fontSize: '13px',
    color: '#4ECDC4',
    fontFamily: 'monospace',
    width: '45px',
    textAlign: 'right',
  },
};

export default App;

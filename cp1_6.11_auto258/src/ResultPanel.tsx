import { useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Howl } from 'howler';
import { DatingResult } from './store';

interface ResultPanelProps {
  result: DatingResult;
}

const MIN_YEAR = -500;
const MAX_YEAR = 500;
const TIMELINE_WIDTH = 300;

export default function ResultPanel({ result }: ResultPanelProps) {
  const pointerControls = useAnimation();
  const glowControls = useAnimation();
  const soundPlayedRef = useRef(false);

  const { dating, patternImage, params } = result;

  const yearToPosition = (year: number) => {
    const clamped = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
    const ratio = (clamped - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
    return ratio * TIMELINE_WIDTH;
  };

  const formatYear = (year: number) => {
    if (year < 0) return `前${Math.abs(year)}年`;
    if (year === 0) return `元年`;
    return `${year}年`;
  };

  useEffect(() => {
    if (soundPlayedRef.current) return;
    soundPlayedRef.current = true;

    const chimeSound = new Howl({
      src: [
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQcAQNHWpXYRAPv/+/sA',
      ],
      volume: 0.6,
      onloaderror: () => {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playBell = (freq: number, delay: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
          gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + delay + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + duration);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        };
        playBell(523.25, 0, 1.2);
        playBell(659.25, 0.15, 1.0);
        playBell(783.99, 0.3, 0.8);
      },
    });

    chimeSound.play();

    return () => {
      chimeSound.unload();
    };
  }, []);

  useEffect(() => {
    const sequence = async () => {
      await pointerControls.start({
        x: [0, yearToPosition(dating.midYear)],
        transition: { duration: 1.5, ease: 'easeOut' },
      });
      glowControls.start({
        opacity: [0, 1, 0, 1, 0, 1],
        scale: [1, 1.3, 1, 1.3, 1, 1.3],
        transition: { duration: 2, ease: 'easeInOut' },
      });
    };
    sequence();
  }, [dating.midYear, pointerControls, glowControls]);

  const startPos = yearToPosition(dating.startYear);
  const endPos = yearToPosition(dating.endYear);
  const midPos = yearToPosition(dating.midYear);
  const rangeWidth = Math.max(10, endPos - startPos);

  const ticks = [];
  for (let y = MIN_YEAR; y <= MAX_YEAR; y += 100) {
    ticks.push({ year: y, pos: yearToPosition(y) });
  }

  return (
    <div className="result-panel">
      <h2 className="result-title">
        <span className="title-icon">🏛️</span>
        碳十四断代分析报告
      </h2>

      <div className="result-content">
        <div className="pattern-section">
          <h3 className="section-title">碳化纹路分析图</h3>
          <div className="pattern-image-wrapper">
            <motion.img
              src={patternImage}
              alt="碳化纹路"
              className="pattern-image"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
            />
            <div className="pattern-overlay">
              <div className="pattern-info">
                <span>温度: {params.temperature}°C</span>
                <span>时长: {params.duration}s</span>
                <span>碳化度: {params.carbonizationLevel}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dating-section">
          <h3 className="section-title">年代估算结果</h3>

          <div className="year-display">
            <motion.div
              className="year-range"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="year-label">约</span>
              <span className="year-value start">{dating.startYearLabel}</span>
              <span className="year-separator">—</span>
              <span className="year-value end">{dating.endYearLabel}</span>
            </motion.div>
            <motion.div
              className="mid-year"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              中位年份：<strong>{dating.midYearLabel}</strong>
            </motion.div>
          </div>

          <div className="timeline-wrapper">
            <div className="timeline" style={{ width: TIMELINE_WIDTH }}>
              <div className="timeline-track" />

              <div
                className="timeline-range"
                style={{
                  left: startPos,
                  width: rangeWidth,
                }}
              />

              {ticks.map((t) => (
                <div
                  key={t.year}
                  className="timeline-tick"
                  style={{ left: t.pos }}
                >
                  <div className="tick-mark" />
                  <span className="tick-label">{formatYear(t.year)}</span>
                </div>
              ))}

              <motion.div
                className="timeline-pointer-wrapper"
                style={{ left: 0 }}
                animate={pointerControls}
              >
                <motion.div
                  className="timeline-glow"
                  animate={glowControls}
                />
                <div className="timeline-pointer">
                  <svg viewBox="0 0 24 30" width="20" height="25">
                    <path
                      d="M12 0 L20 10 L20 20 L12 30 L4 20 L4 10 Z"
                      fill="url(#pointerGrad)"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                    <defs>
                      <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9800" />
                        <stop offset="100%" stopColor="#e65100" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </motion.div>
            </div>
          </div>

          <motion.div
            className="confidence-bar"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <div className="confidence-label">
              <span>分析置信度</span>
              <span className="confidence-value">{dating.confidence}%</span>
            </div>
            <div className="confidence-track">
              <motion.div
                className="confidence-fill"
                initial={{ width: 0 }}
                animate={{ width: `${dating.confidence}%` }}
                transition={{ delay: 1, duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </motion.div>

          <motion.p
            className="dating-description"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            📜 {dating.description}
          </motion.p>
        </div>
      </div>

      <div className="result-footer">
        <span className="request-id">分析编号: {result.requestId}</span>
      </div>
    </div>
  );
}

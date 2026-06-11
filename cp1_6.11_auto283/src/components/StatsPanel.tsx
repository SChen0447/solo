import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateStats } from '../utils/quantumLogic';
import type { MeasurementRecord, CHSHOptions } from '../utils/quantumLogic';

interface StatsPanelProps {
  records: MeasurementRecord[];
  chshOptions: CHSHOptions;
}

function AnimatedNumber({ value, duration = 0.5 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + (endValue - startValue) * easeProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{Math.round(displayValue)}</span>;
}

export default function StatsPanel({ records, chshOptions }: StatsPanelProps) {
  const stats = calculateStats(records, chshOptions);
  const isViolated = stats.sValue > 2;

  return (
    <motion.div
      className="stats-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <h3 className="stats-title">实验统计</h3>

      <div className="stats-section">
        <div className="stat-row">
          <span className="stat-label">总实验次数</span>
          <motion.span
            className="stat-value"
            key={stats.total}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <AnimatedNumber value={stats.total} />
          </motion.span>
        </div>
      </div>

      <div className="stats-section">
        <h4 className="stats-subtitle">Alice 测量结果</h4>
        <div className="stat-row">
          <span className="stat-label">
            <span className="spin-up-icon">+</span> 自旋向上
          </span>
          <span className="stat-value spin-up">
            <AnimatedNumber value={stats.aliceUp} />
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">
            <span className="spin-down-icon">−</span> 自旋向下
          </span>
          <span className="stat-value spin-down">
            <AnimatedNumber value={stats.aliceDown} />
          </span>
        </div>
      </div>

      <div className="stats-section">
        <h4 className="stats-subtitle">Bob 测量结果</h4>
        <div className="stat-row">
          <span className="stat-label">
            <span className="spin-up-icon">+</span> 自旋向上
          </span>
          <span className="stat-value spin-up">
            <AnimatedNumber value={stats.bobUp} />
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">
            <span className="spin-down-icon">−</span> 自旋向下
          </span>
          <span className="stat-value spin-down">
            <AnimatedNumber value={stats.bobDown} />
          </span>
        </div>
      </div>

      <div className="stats-section">
        <h4 className="stats-subtitle">结果相关性</h4>
        <div className="stat-row">
          <span className="stat-label">一致</span>
          <span className="stat-value same">
            <AnimatedNumber value={stats.same} />
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">不一致</span>
          <span className="stat-value different">
            <AnimatedNumber value={stats.different} />
          </span>
        </div>
      </div>

      <div className="stats-section chsh-section">
        <h4 className="stats-subtitle">CHSH 不等式</h4>
        <div className="chsh-formula">
          <span className="formula-text">
            S = |E(ab) − E(ab')| + |E(a'b) + E(a'b')|
          </span>
        </div>

        <div className="chsh-values">
          <div className="chsh-value-row">
            <span className="chsh-label">E(ab)</span>
            <span className="chsh-val">{stats.eValues.ab.toFixed(3)}</span>
          </div>
          <div className="chsh-value-row">
            <span className="chsh-label">E(ab')</span>
            <span className="chsh-val">{stats.eValues.abPrime.toFixed(3)}</span>
          </div>
          <div className="chsh-value-row">
            <span className="chsh-label">E(a'b)</span>
            <span className="chsh-val">{stats.eValues.aPrimeB.toFixed(3)}</span>
          </div>
          <div className="chsh-value-row">
            <span className="chsh-label">E(a'b')</span>
            <span className="chsh-val">{stats.eValues.aPrimeBPrime.toFixed(3)}</span>
          </div>
        </div>

        <motion.div
          className={`s-value ${isViolated ? 'violated' : ''}`}
          animate={{
            scale: isViolated ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 0.5,
            repeat: isViolated ? Infinity : 0,
            repeatType: 'reverse',
          }}
        >
          <span className="s-label">S =</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={stats.sValue.toFixed(3)}
              className="s-number"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
            >
              {stats.sValue.toFixed(3)}
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {isViolated && (
            <motion.div
              className="violation-message"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              ⚡ 违反局域实在论！ ⚡
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

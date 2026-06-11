import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  colorFrom: string;
  colorTo: string;
}

function Gauge({ value, min, max, label, unit, colorFrom, colorTo }: GaugeProps) {
  const springValue = useSpring(min, { stiffness: 60, damping: 20 });
  const percentage = useTransform(springValue, [min, max], [0, 100]);

  useEffect(() => {
    springValue.set(Math.max(min, Math.min(max, value)));
  }, [value, min, max, springValue]);

  const strokeDasharray = 188.5;
  const circumference = strokeDasharray;

  return (
    <div className="gauge-container">
      <div className="gauge-label">{label}</div>
      <div className="gauge-svg-wrap">
        <svg viewBox="0 0 120 70" className="gauge-svg">
          <defs>
            <linearGradient id={`grad-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={colorFrom} />
              <stop offset="100%" stopColor={colorTo} />
            </linearGradient>
          </defs>
          <path
            d="M 15 65 A 45 45 0 0 1 105 65"
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <motion.path
            d="M 15 65 A 45 45 0 0 1 105 65"
            fill="none"
            stroke={`url(#grad-${label})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset: useTransform(
                percentage,
                (p) => circumference * (1 - p / 100)
              ),
            }}
          />
        </svg>
        <div className="gauge-value">
          <motion.span className="gauge-number">
            {useTransform(springValue, (v) => Math.round(v * 10) / 10)}
          </motion.span>
          <span className="gauge-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

interface DashboardProps {
  concentration: number;
  efficiency: number;
}

export function Dashboard({ concentration, efficiency }: DashboardProps) {
  return (
    <motion.div
      className="dashboard-panel"
      initial={{ x: 340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <h2 className="panel-title">实时监测</h2>
        <p className="panel-subtitle">街区空气质量数据</p>
      </div>

      <Gauge
        value={concentration}
        min={50}
        max={200}
        label="PM2.5 浓度"
        unit="μg/m³"
        colorFrom="#43a047"
        colorTo="#e53935"
      />

      <Gauge
        value={efficiency}
        min={0}
        max={60}
        label="绿化拦截效率"
        unit="%"
        colorFrom="#e53935"
        colorTo="#43a047"
      />

      <div className="dashboard-divider" />

      <div className="dashboard-stats">
        <div className="stat-row">
          <span className="stat-label">平均风速</span>
          <span className="stat-value">12 m/s</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">湍流强度</span>
          <span className="stat-value">中等</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">模拟区域</span>
          <span className="stat-value">200×200m</span>
        </div>
      </div>
    </motion.div>
  );
}

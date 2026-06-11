import { motion } from 'framer-motion';
import { useSimStore } from '@/store/useSimStore';
import type { ArrangementType } from '@/types';

const arrangementOptions: { value: ArrangementType; label: string; icon: string }[] = [
  { value: 'array', label: '阵列排列', icon: '▦' },
  { value: 'staggered', label: '交错排列', icon: '▤' },
  { value: 'cluster', label: '簇状排列', icon: '◉' },
];

export function ControlPanel() {
  const { config, setConfig, resetConfig, isPlaying, togglePlay } = useSimStore();

  return (
    <motion.div
      className="control-panel"
      initial={{ x: -340, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="panel-header">
        <h2 className="panel-title">绿化参数控制</h2>
        <p className="panel-subtitle">调整参数观察PM2.5拦截效果</p>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>绿地面积</span>
          <span className="control-value">{config.greenArea} m²</span>
        </div>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={config.greenArea}
          onChange={(e) => setConfig({ greenArea: Number(e.target.value) })}
          className="slider"
        />
        <div className="slider-labels">
          <span>50</span>
          <span>500</span>
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>树木高度</span>
          <span className="control-value">{config.treeHeight} m</span>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={config.treeHeight}
          onChange={(e) => setConfig({ treeHeight: Number(e.target.value) })}
          className="slider"
        />
        <div className="slider-labels">
          <span>5m</span>
          <span>30m</span>
        </div>
      </div>

      <div className="control-group">
        <div className="control-label">
          <span>排列方式</span>
        </div>
        <div className="arrangement-options">
          {arrangementOptions.map((opt) => (
            <motion.button
              key={opt.value}
              className={`arrangement-btn ${config.arrangement === opt.value ? 'active' : ''}`}
              onClick={() => setConfig({ arrangement: opt.value })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <span className="arrangement-icon">{opt.icon}</span>
              <span className="arrangement-label">{opt.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="control-actions">
        <motion.button
          className="btn btn-primary"
          onClick={togglePlay}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isPlaying ? '⏸ 暂停模拟' : '▶ 开始模拟'}
        </motion.button>
        <motion.button
          className="btn btn-secondary"
          onClick={resetConfig}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          ↺ 重置参数
        </motion.button>
      </div>

      <div className="panel-info">
        <div className="info-item">
          <span className="info-dot" style={{ background: '#ffffff' }} />
          <span>正常粒子</span>
        </div>
        <div className="info-item">
          <span className="info-dot" style={{ background: '#ff8c00' }} />
          <span>被拦截粒子</span>
        </div>
      </div>
    </motion.div>
  );
}

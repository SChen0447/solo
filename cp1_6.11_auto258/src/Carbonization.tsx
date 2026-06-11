import { motion } from 'framer-motion';
import { useAppStore } from './store';

interface CarbonizationProps {
  onCarbonize: () => void;
  onAnalyze: () => void;
  disabled: boolean;
}

export default function Carbonization({ onCarbonize, onAnalyze, disabled }: CarbonizationProps) {
  const {
    temperature,
    duration,
    knifeSize,
    isCarbonizing,
    isAnalyzing,
    setTemperature,
    setDuration,
    setKnifeSize,
  } = useAppStore();

  const getTemperatureColor = (t: number) => {
    if (t < 200) return '#8d6e63';
    if (t < 400) return '#d84315';
    if (t < 600) return '#e65100';
    return '#b71c1c';
  };

  const knifeOptions = [
    { value: 2, label: '细刀' },
    { value: 3, label: '中刀' },
    { value: 5, label: '粗刀' },
  ];

  return (
    <div className="control-panel">
      <h2 className="panel-title">⚒️ 刻写与火烤工具</h2>

      <div className="panel-section">
        <label className="panel-label">
          <span className="label-text">刻刀大小</span>
        </label>
        <div className="knife-selector">
          {knifeOptions.map((opt) => (
            <button
              key={opt.value}
              className={`knife-btn ${knifeSize === opt.value ? 'active' : ''}`}
              onClick={() => setKnifeSize(opt.value)}
              disabled={isCarbonizing || isAnalyzing}
            >
              <span
                className="knife-preview"
                style={{
                  width: opt.value * 2,
                  height: opt.value * 2,
                  backgroundColor: '#2b1a0a',
                  borderRadius: '50%',
                  display: 'inline-block',
                }}
              />
              <span className="knife-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <span className="label-text">刻刀颜色</span>
          <span className="color-preview" style={{ backgroundColor: '#2b1a0a' }} />
          <span className="color-label">焦墨（单色）</span>
        </label>
      </div>

      <div className="divider" />

      <div className="panel-section">
        <label className="panel-label">
          <span className="label-icon">🌡️</span>
          <span className="label-text">火烤温度</span>
          <span
            className="label-value"
            style={{ color: getTemperatureColor(temperature), fontWeight: 600 }}
          >
            {temperature}°C
          </span>
        </label>
        <input
          type="range"
          className="slider temp-slider"
          min={0}
          max={800}
          step={10}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          disabled={isCarbonizing || isAnalyzing}
          style={{
            background: `linear-gradient(to right, #ffcc80 0%, #ff6f00 ${temperature / 8}%, #5d4037 ${temperature / 8}%, #5d4037 100%)`,
          }}
        />
        <div className="slider-labels">
          <span>0°C</span>
          <span>400°C</span>
          <span>800°C</span>
        </div>
      </div>

      <div className="panel-section">
        <label className="panel-label">
          <span className="label-icon">⏱️</span>
          <span className="label-text">火烤时长</span>
          <span className="label-value">{duration}秒</span>
        </label>
        <input
          type="range"
          className="slider duration-slider"
          min={0}
          max={60}
          step={1}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          disabled={isCarbonizing || isAnalyzing}
        />
        <div className="slider-labels">
          <span>0s</span>
          <span>30s</span>
          <span>60s</span>
        </div>
      </div>

      <div className="divider" />

      <div className="button-group">
        <motion.button
          className="action-btn carbonize-btn"
          onClick={onCarbonize}
          disabled={isCarbonizing || isAnalyzing || disabled}
          whileHover={!isCarbonizing && !isAnalyzing ? { scale: 1.03, y: -2 } : {}}
          whileTap={!isCarbonizing && !isAnalyzing ? { scale: 0.98 } : {}}
        >
          <span className="btn-icon">🔥</span>
          <span className="btn-text">
            {isCarbonizing ? '碳化中...' : '开始碳化'}
          </span>
        </motion.button>

        <motion.button
          className="action-btn analyze-btn"
          onClick={onAnalyze}
          disabled={isCarbonizing || isAnalyzing || disabled}
          whileHover={!isCarbonizing && !isAnalyzing ? { scale: 1.03, y: -2 } : {}}
          whileTap={!isCarbonizing && !isAnalyzing ? { scale: 0.98 } : {}}
        >
          <span className="btn-icon">🔬</span>
          <span className="btn-text">
            {isAnalyzing ? '断代中...' : '开始断代'}
          </span>
        </motion.button>
      </div>

      <div className="tips-box">
        <p className="tips-title">📖 使用指南</p>
        <ol className="tips-list">
          <li>在竹简画布上刻写文字</li>
          <li>调节温度与时长</li>
          <li>点击"开始碳化"模拟火烤</li>
          <li>点击"开始断代"获取分析结果</li>
        </ol>
      </div>
    </div>
  );
}

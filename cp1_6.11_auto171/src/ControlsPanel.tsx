import { type ShapeType, type ColorTheme } from './KaleidoscopeCanvas'

interface ControlsPanelProps {
  angle: number
  shape: ShapeType
  theme: ColorTheme
  onAngleChange: (angle: number) => void
  onShapeChange: (shape: ShapeType) => void
  onThemeChange: (theme: ColorTheme) => void
  onExport: () => void
}

const shapeOptions: { value: ShapeType; label: string }[] = [
  { value: 'triangle', label: '三角形' },
  { value: 'hexagon', label: '六边形' },
  { value: 'snowflake', label: '雪花形' }
]

const themeOptions: { value: ColorTheme; label: string; colors: string[] }[] = [
  { value: 'aurora', label: '极光渐变', colors: ['#00ff87', '#60efff', '#7b2ffc', '#d946ef'] },
  { value: 'warm', label: '暖色调', colors: ['#ff6b35', '#f7c59f', '#c1121f', '#780000'] },
  { value: 'cool', label: '冷色调', colors: ['#023e8a', '#0096c7', '#480ca8', '#4cc9f0'] },
  { value: 'rainbow', label: '彩虹', colors: ['#ff0000', '#ff8800', '#ffff00', '#ff00ff'] }
]

export default function ControlsPanel({
  angle,
  shape,
  theme,
  onAngleChange,
  onShapeChange,
  onThemeChange,
  onExport
}: ControlsPanelProps) {
  return (
    <div className="controls-panel">
      <h2 className="panel-title">万花筒控制台</h2>

      <div className="control-group">
        <label className="control-label">
          镜筒角度
          <span className="angle-value">{Math.round(angle)}°</span>
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={angle}
          onChange={(e) => onAngleChange(Number(e.target.value))}
          className="angle-slider"
        />
        <div className="slider-track" />
      </div>

      <div className="control-group">
        <label className="control-label">碎片形状</label>
        <div className="shape-select-wrapper">
          <select
            value={shape}
            onChange={(e) => onShapeChange(e.target.value as ShapeType)}
            className="shape-select"
          >
            {shapeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="select-arrow">▼</div>
        </div>
      </div>

      <div className="control-group">
        <label className="control-label">色彩主题</label>
        <div className="theme-options">
          {themeOptions.map((opt) => (
            <label key={opt.value} className={`theme-option ${theme === opt.value ? 'active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={opt.value}
                checked={theme === opt.value}
                onChange={(e) => onThemeChange(e.target.value as ColorTheme)}
                className="theme-radio"
              />
              <div className="theme-preview">
                {opt.colors.map((color, i) => (
                  <div
                    key={i}
                    className="theme-color"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="theme-label">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="control-group">
        <button onClick={onExport} className="export-button">
          <span className="export-icon">⬇</span>
          导出 PNG
        </button>
      </div>

      <div className="control-info">
        <p>💡 提示：拖动滑块可实时旋转图案</p>
      </div>
    </div>
  )
}

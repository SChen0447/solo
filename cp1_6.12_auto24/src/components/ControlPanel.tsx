import type { PosterConfig, GradientType, FontOption } from '../types';

interface ControlPanelProps {
  config: PosterConfig;
  onConfigChange: (config: PosterConfig) => void;
  onExport: () => void;
  isExporting: boolean;
}

const fontOptions: FontOption[] = [
  { name: 'Arial', value: 'Arial', label: 'Arial' },
  { name: 'Georgia', value: 'Georgia', label: 'Georgia' },
  { name: '微软雅黑', value: 'Microsoft YaHei', label: '微软雅黑' },
  { name: '思源黑体', value: 'Noto Sans SC', label: '思源黑体' },
  { name: '手写风格体', value: 'Comic Sans MS', label: '手写风格体' },
];

const gradientOptions: { value: GradientType; label: string }[] = [
  { value: 'solid', label: '纯色' },
  { value: 'horizontal', label: '水平渐变' },
  { value: 'diagonal', label: '对角线渐变' },
  { value: 'radial', label: '径向渐变' },
];

const MAX_TEXT_LENGTH = 30;

function ControlPanel({ config, onConfigChange, onExport, isExporting }: ControlPanelProps) {
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_TEXT_LENGTH);
    onConfigChange({ ...config, text: value });
  };

  const handleFontChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({ ...config, font: e.target.value });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, fontSize: Number(e.target.value) });
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({ ...config, textColor: e.target.value });
  };

  const handleBgTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onConfigChange({
      ...config,
      background: { ...config.background, type: e.target.value as GradientType },
    });
  };

  const handleBgColor1Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      background: { ...config.background, color1: e.target.value },
    });
  };

  const handleBgColor2Change = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      background: { ...config.background, color2: e.target.value },
    });
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}></div>
      <div style={styles.content}>
        <div style={styles.card}>
          <label style={styles.label}>文字内容</label>
          <textarea
            value={config.text}
            onChange={handleTextChange}
            maxLength={MAX_TEXT_LENGTH}
            placeholder="请输入文字（最多30字）"
            style={styles.textarea}
          />
          <div style={styles.charCount}>
            {config.text.length}/{MAX_TEXT_LENGTH}
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>字体</label>
          <select value={config.font} onChange={handleFontChange} style={styles.select}>
            {fontOptions.map((font) => (
              <option key={font.value} value={font.value}>
                {font.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.card}>
          <div style={styles.sliderHeader}>
            <label style={styles.label}>字号</label>
            <span style={styles.fontSizeValue}>{config.fontSize}px</span>
          </div>
          <input
            type="range"
            min="20"
            max="120"
            value={config.fontSize}
            onChange={handleFontSizeChange}
            style={styles.slider}
          />
        </div>

        <div style={styles.card}>
          <label style={styles.label}>文字颜色</label>
          <div style={styles.colorRow}>
            <input
              type="color"
              value={config.textColor}
              onChange={handleTextColorChange}
              style={styles.colorInput}
            />
            <span style={styles.colorText}>{config.textColor}</span>
          </div>
        </div>

        <div style={styles.card}>
          <label style={styles.label}>背景模式</label>
          <select
            value={config.background.type}
            onChange={handleBgTypeChange}
            style={styles.select}
          >
            {gradientOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div style={styles.colorRow}>
            <div style={styles.colorItem}>
              <label style={styles.smallLabel}>颜色1</label>
              <input
                type="color"
                value={config.background.color1}
                onChange={handleBgColor1Change}
                style={styles.colorInput}
              />
            </div>
            {config.background.type !== 'solid' && (
              <div style={styles.colorItem}>
                <label style={styles.smallLabel}>颜色2</label>
                <input
                  type="color"
                  value={config.background.color2}
                  onChange={handleBgColor2Change}
                  style={styles.colorInput}
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={isExporting}
          style={{
            ...styles.exportButton,
            ...(isExporting ? styles.exportButtonDisabled : {}),
          }}
          onMouseEnter={(e) => {
            if (!isExporting) {
              e.currentTarget.style.backgroundColor = '#5a67d8';
            }
          }}
          onMouseLeave={(e) => {
            if (!isExporting) {
              e.currentTarget.style.backgroundColor = '#667eea';
            }
          }}
          onMouseDown={(e) => {
            if (!isExporting) {
              e.currentTarget.style.transform = 'scale(0.95)';
            }
          }}
          onMouseUp={(e) => {
            if (!isExporting) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
          onMouseOut={(e) => {
            if (!isExporting) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          {isExporting ? '导出中...' : '导出高清海报'}
        </button>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    width: '320px',
    height: '100%',
    backgroundColor: '#f5f5f5',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  header: {
    height: '8px',
    background: 'linear-gradient(to right, #667eea, #764ba2)',
  },
  content: {
    padding: '20px 16px',
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
  },
  smallLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '6px',
    display: 'block',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    textAlign: 'right',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    outline: 'none',
    boxSizing: 'border-box',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fontSizeValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#667eea',
  },
  slider: {
    width: '100%',
    height: '6px',
    cursor: 'pointer',
    accentColor: '#667eea',
  },
  colorRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
  },
  colorItem: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  colorInput: {
    width: '100%',
    height: '40px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '2px',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
  },
  colorText: {
    fontSize: '12px',
    color: '#666',
    marginLeft: '8px',
    fontFamily: 'monospace',
  },
  exportButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#667eea',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s, transform 0.1s',
    marginTop: '8px',
  },
  exportButtonDisabled: {
    backgroundColor: '#a0aec0',
    cursor: 'not-allowed',
  },
};

export default ControlPanel;

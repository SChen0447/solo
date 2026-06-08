import React from 'react';
import { EasingConfig, PRESET_EASINGS, CustomBezier } from '../types';

interface ControlPanelProps {
  selectedEasings: EasingConfig[];
  onTogglePreset: (presetName: string) => void;
  customBezier: CustomBezier;
  onCustomBezierChange: (bezier: CustomBezier) => void;
  showCustomCurve: boolean;
  onToggleCustomCurve: () => void;
  compareMode: boolean;
  onToggleCompareMode: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  activeEasingId: string;
  onActiveEasingChange: (id: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedEasings,
  onTogglePreset,
  customBezier,
  onCustomBezierChange,
  showCustomCurve,
  onToggleCustomCurve,
  compareMode,
  onToggleCompareMode,
  isPlaying,
  onTogglePlay,
  activeEasingId,
  onActiveEasingChange,
}) => {
  const cssCode = `cubic-bezier(${customBezier.p1x.toFixed(2)}, ${customBezier.p1y.toFixed(2)}, ${customBezier.p2x.toFixed(2)}, ${customBezier.p2y.toFixed(2)})`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cssCode);
  };

  const isPresetSelected = (name: string) => {
    return selectedEasings.some((e) => e.name === name);
  };

  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>控制面板</h2>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>预设缓动函数</h3>
        <p style={styles.hint}>选择 2-4 个进行对比</p>
        <div style={styles.presetGrid}>
          {PRESET_EASINGS.map((preset) => {
            const selected = isPresetSelected(preset.name);
            const selectedEasing = selectedEasings.find((e) => e.name === preset.name);
            return (
              <button
                key={preset.name}
                onClick={() => onTogglePreset(preset.name)}
                style={{
                  ...styles.presetButton,
                  ...(selected ? {
                    background: `linear-gradient(135deg, ${selectedEasing?.color || '#0f3460'}, #16213e)`,
                    borderColor: selectedEasing?.color || '#0f3460',
                    color: '#fff',
                  } : {}),
                }}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>自定义贝塞尔曲线</h3>
          <button
            onClick={onToggleCustomCurve}
            style={{
              ...styles.toggleButton,
              ...(showCustomCurve ? styles.toggleButtonActive : {}),
            }}
          >
            {showCustomCurve ? '显示中' : '添加'}
          </button>
        </div>

        {showCustomCurve && (
          <div style={styles.sliderContainer}>
            {(['p1x', 'p1y', 'p2x', 'p2y'] as const).map((key) => (
              <div key={key} style={styles.sliderRow}>
                <label style={styles.sliderLabel}>
                  {key.toUpperCase().replace('1', '₁').replace('2', '₂')}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={customBezier[key]}
                  onChange={(e) => onCustomBezierChange({
                    ...customBezier,
                    [key]: parseFloat(e.target.value),
                  })}
                  style={styles.slider}
                />
                <span style={styles.sliderValue}>
                  {customBezier[key].toFixed(2)}
                </span>
              </div>
            ))}

            <div style={styles.codeContainer}>
              <div style={styles.codeHeader}>
                <span style={styles.codeLabel}>CSS 代码</span>
                <button onClick={copyToClipboard} style={styles.copyButton}>
                  复制
                </button>
              </div>
              <pre style={styles.codeBlock}>{cssCode}</pre>
            </div>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>预览控制</h3>
        <div style={styles.buttonRow}>
          <button
            onClick={onToggleCompareMode}
            style={{
              ...styles.actionButton,
              ...(compareMode ? styles.actionButtonActive : {}),
            }}
          >
            {compareMode ? '对比模式 ✓' : '对比模式'}
          </button>
          <button
            onClick={onTogglePlay}
            style={{
              ...styles.playButton,
              ...(isPlaying ? styles.playButtonActive : {}),
            }}
          >
            {isPlaying ? '暂停' : '播放'}
          </button>
        </div>

        {!compareMode && selectedEasings.length > 0 && (
          <div style={styles.selectContainer}>
            <label style={styles.selectLabel}>当前预览曲线：</label>
            <select
              value={activeEasingId}
              onChange={(e) => onActiveEasingChange(e.target.value)}
              style={styles.select}
            >
              {selectedEasings.map((easing) => (
                <option key={easing.id} value={easing.id}>
                  {easing.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '24px',
    height: '100%',
    overflowY: 'auto',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  },
  title: {
    color: '#fff',
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 20px 0',
    borderBottom: '2px solid #0f3460',
    paddingBottom: '12px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    color: '#e94560',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 8px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  hint: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '12px',
    margin: '0 0 12px 0',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  presetButton: {
    padding: '10px 12px',
    borderRadius: '6px',
    border: '2px solid #0f3460',
    backgroundColor: '#1a1a2e',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  toggleButton: {
    padding: '4px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#1a1a2e',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  toggleButtonActive: {
    backgroundColor: '#0f3460',
    color: '#fff',
  },
  sliderContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    padding: '16px',
  },
  sliderRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sliderLabel: {
    color: '#fff',
    fontSize: '13px',
    width: '40px',
    fontWeight: 500,
  },
  slider: {
    flex: 1,
    margin: '0 12px',
    height: '6px',
    borderRadius: '3px',
    backgroundColor: '#0f3460',
    outline: 'none',
    WebkitAppearance: 'none',
    cursor: 'pointer',
  },
  sliderValue: {
    color: '#4ECDC4',
    fontSize: '12px',
    width: '40px',
    textAlign: 'right',
    fontFamily: 'monospace',
  },
  codeContainer: {
    marginTop: '16px',
    backgroundColor: '#0f3460',
    borderRadius: '6px',
    overflow: 'hidden',
  },
  codeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  codeLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '11px',
  },
  copyButton: {
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: '#e94560',
    color: '#fff',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  codeBlock: {
    margin: 0,
    padding: '12px',
    color: '#4ECDC4',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflowX: 'auto',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
  },
  actionButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #0f3460',
    backgroundColor: '#1a1a2e',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
  actionButtonActive: {
    backgroundColor: '#0f3460',
    borderColor: '#e94560',
    color: '#fff',
  },
  playButton: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c73659)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 15px rgba(233, 69, 96, 0.4)',
    fontFamily: 'inherit',
  },
  playButtonActive: {
    background: 'linear-gradient(135deg, #4ECDC4, #44a08d)',
    boxShadow: '0 4px 15px rgba(78, 205, 196, 0.4)',
  },
  selectContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  selectLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '13px',
  },
  select: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '2px solid #0f3460',
    backgroundColor: '#1a1a2e',
    color: '#fff',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
  },
};

export default ControlPanel;

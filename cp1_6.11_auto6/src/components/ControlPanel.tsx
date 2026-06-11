import { useState, useCallback, useEffect, useRef } from 'react';
import type { PlantState, OperationType, EnvironmentParams, OperationLog } from '../utils/plantSimulator';
import { getStageName, getOperationName, getOperationColor } from '../utils/plantSimulator';

interface ControlPanelProps {
  plantState: PlantState;
  environment: EnvironmentParams;
  onOperation: (type: OperationType) => void;
  onEnvironmentChange: (env: Partial<EnvironmentParams>) => void;
  onReplay: () => void;
  onPauseReplay: () => void;
  onResumeReplay: () => void;
  isReplaying: boolean;
  isReplayPaused: boolean;
  isMobile: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

const ControlPanel = ({
  plantState,
  environment,
  onOperation,
  onEnvironmentChange,
  onReplay,
  onPauseReplay,
  onResumeReplay,
  isReplaying,
  isReplayPaused,
  isMobile,
}: ControlPanelProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bouncingKeys, setBouncingKeys] = useState<Set<string>>(new Set());
  const [ripples, setRipples] = useState<Record<string, Ripple[]>>({});
  const rippleIdRef = useRef(0);

  const triggerBounce = useCallback((key: string) => {
    setBouncingKeys((prev) => new Set(prev).add(key));
    setTimeout(() => {
      setBouncingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 400);
  }, []);

  useEffect(() => {
    triggerBounce('health');
    triggerBounce('day');
    triggerBounce('leafCount');
  }, [plantState.health, plantState.day, plantState.leafCount, triggerBounce]);

  const createRipple = useCallback((buttonId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = rippleIdRef.current++;

    setRipples((prev) => ({
      ...prev,
      [buttonId]: [...(prev[buttonId] || []), { id, x, y }],
    }));

    setTimeout(() => {
      setRipples((prev) => ({
        ...prev,
        [buttonId]: (prev[buttonId] || []).filter((r) => r.id !== id),
      }));
    }, 600);
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const healthColor = plantState.health >= 60 ? '#4CAF50' : plantState.health >= 20 ? '#FF9800' : '#F44336';

  const operationButtons: { type: OperationType; label: string; icon: string; bgColor: string }[] = [
    { type: 'water', label: '浇水', icon: '💧', bgColor: 'linear-gradient(135deg, #4FC3F7, #29B6F6)' },
    { type: 'fertilize', label: '施肥', icon: '🌱', bgColor: 'linear-gradient(135deg, #FFB74D, #FFA726)' },
    { type: 'sunlight', label: '日照', icon: '☀️', bgColor: 'linear-gradient(135deg, #FFD54F, #FFCA28)' },
  ];

  const sliders = [
    { key: 'temperature', label: '温度', unit: '°C', min: 10, max: 40, value: environment.temperature, color: '#FF7043' },
    { key: 'humidity', label: '湿度', unit: '%', min: 20, max: 80, value: environment.humidity, color: '#4FC3F7' },
    { key: 'lightIntensity', label: '光照强度', unit: '', min: 1, max: 10, value: environment.lightIntensity, color: '#FFD54F' },
  ];

  const maxDay = Math.max(plantState.day, 25);

  if (isMobile && isCollapsed) {
    return (
      <div style={styles.mobileHeader}>
        <div style={styles.mobileTitle}>🌿 植物生长模拟器</div>
        <button style={styles.mobileToggle} onClick={() => setIsCollapsed(false)}>
          ☰ 展开
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...styles.panel, ...(isMobile ? styles.panelMobile : {}) }}>
      {isMobile && (
        <div style={styles.mobileHeader}>
          <div style={styles.mobileTitle}>🌿 植物生长模拟器</div>
          <button style={styles.mobileToggle} onClick={() => setIsCollapsed(true)}>
            ✕ 收起
          </button>
        </div>
      )}

      <div style={styles.scrollContainer}>
        <h2 style={styles.title}>🌿 植物生长模拟器</h2>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>操作按钮</h3>
          <div style={styles.buttonGrid}>
            {operationButtons.map((btn) => (
              <button
                key={btn.type}
                style={{
                  ...styles.operationButton,
                  background: btn.bgColor,
                }}
                onClick={(e) => {
                  createRipple(btn.type, e);
                  onOperation(btn.type);
                }}
                disabled={isReplaying}
              >
                <span style={styles.buttonIcon}>{btn.icon}</span>
                <span style={styles.buttonLabel}>{btn.label}</span>
                {ripples[btn.type]?.map((ripple) => (
                  <span
                    key={ripple.id}
                    style={{
                      ...styles.ripple,
                      left: ripple.x,
                      top: ripple.y,
                    }}
                  />
                ))}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>实时数据</h3>
          <div style={styles.dataPanel}>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>生长天数</span>
              <span
                style={{
                  ...styles.dataValue,
                  ...(bouncingKeys.has('day') ? styles.bounce : {}),
                }}
              >
                {plantState.day.toFixed(1)} 天
              </span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>生长阶段</span>
              <span style={{ ...styles.dataValue, color: '#8BC34A' }}>
                {getStageName(plantState.stage)}
              </span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>健康度</span>
              <div style={styles.healthContainer}>
                <div style={styles.healthBarBg}>
                  <div
                    style={{
                      ...styles.healthBarFill,
                      width: `${plantState.health}%`,
                      backgroundColor: healthColor,
                    }}
                  />
                </div>
                <span
                  style={{
                    ...styles.dataValue,
                    color: healthColor,
                    ...(bouncingKeys.has('health') ? styles.bounce : {}),
                  }}
                >
                  {plantState.health.toFixed(0)}%
                </span>
              </div>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>叶片数量</span>
              <span
                style={{
                  ...styles.dataValue,
                  ...(bouncingKeys.has('leafCount') ? styles.bounce : {}),
                }}
              >
                {plantState.leafCount} 片
              </span>
            </div>
            <div style={styles.dataRow}>
              <span style={styles.dataLabel}>开花程度</span>
              <div style={styles.healthContainer}>
                <div style={styles.healthBarBg}>
                  <div
                    style={{
                      ...styles.healthBarFill,
                      width: `${plantState.flowerProgress * 100}%`,
                      backgroundColor: '#E91E63',
                    }}
                  />
                </div>
                <span style={{ ...styles.dataValue, color: '#E91E63' }}>
                  {(plantState.flowerProgress * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            {plantState.lastOperation && (
              <div style={{ ...styles.dataRow, ...styles.lastOperation }}>
                <span style={styles.dataLabel}>最近操作</span>
                <div style={styles.operationLog}>
                  <span
                    style={{
                      ...styles.operationDot,
                      backgroundColor: getOperationColor(plantState.lastOperation.type),
                    }}
                  />
                  <span style={styles.operationText}>
                    {formatTime(plantState.lastOperation.timestamp)} · {getOperationName(plantState.lastOperation.type)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>生长回放</h3>
          <div style={styles.replayControls}>
            {!isReplaying ? (
              <button
                style={styles.replayButton}
                onClick={onReplay}
                disabled={plantState.operations.length === 0}
              >
                ▶ 重播 ({plantState.operations.length} 次操作)
              </button>
            ) : (
              <button
                style={{
                  ...styles.replayButton,
                  background: isReplayPaused
                    ? 'linear-gradient(135deg, #66BB6A, #43A047)'
                    : 'linear-gradient(135deg, #FFB74D, #FF9800)',
                }}
                onClick={isReplayPaused ? onResumeReplay : onPauseReplay}
              >
                {isReplayPaused ? '▶ 继续' : '⏸ 暂停'}
              </button>
            )}
          </div>
          <div style={styles.timeline}>
            <div style={styles.timelineTrack} />
            <div
              style={{
                ...styles.timelineProgress,
                width: isReplaying
                  ? `${(plantState.day / maxDay) * 100}%`
                  : `${(plantState.day / maxDay) * 100}%`,
              }}
            />
            {plantState.operations.map((op: OperationLog, idx: number) => (
              <div
                key={idx}
                style={{
                  ...styles.timelineDot,
                  left: `${(op.day / maxDay) * 100}%`,
                  backgroundColor: getOperationColor(op.type),
                }}
                title={`${formatTime(op.timestamp)} - ${getOperationName(op.type)}`}
              />
            ))}
            <div style={{ ...styles.timelineLabel, left: 0 }}>0天</div>
            <div style={{ ...styles.timelineLabel, right: 0 }}>{maxDay}天</div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>环境调节</h3>
          <div style={styles.slidersContainer}>
            {sliders.map((slider) => (
              <div key={slider.key} style={styles.sliderItem}>
                <div style={styles.sliderHeader}>
                  <span style={styles.sliderLabel}>{slider.label}</span>
                  <span style={{ ...styles.sliderValue, color: slider.color }}>
                    {slider.value}{slider.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={slider.min}
                  max={slider.max}
                  value={slider.value}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    requestAnimationFrame(() => {
                      onEnvironmentChange({ [slider.key]: value });
                    });
                  }}
                  style={{
                    ...styles.slider,
                    background: `linear-gradient(to right, ${slider.color} 0%, ${slider.color} ${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%, rgba(255,255,255,0.1) ${((slider.value - slider.min) / (slider.max - slider.min)) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />
                <div style={styles.sliderRange}>
                  <span>{slider.min}{slider.unit}</span>
                  <span>{slider.max}{slider.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 350,
    height: '100%',
    background: 'rgba(46, 125, 50, 0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRight: '1px solid rgba(139, 195, 74, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
    zIndex: 10,
  },
  panelMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 'auto',
    maxHeight: '100%',
    borderRight: 'none',
    borderBottom: '1px solid rgba(139, 195, 74, 0.2)',
    zIndex: 100,
  },
  mobileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(46, 125, 50, 0.3)',
    borderBottom: '1px solid rgba(139, 195, 74, 0.2)',
  },
  mobileTitle: {
    color: '#FFF8E1',
    fontSize: 16,
    fontWeight: 600,
  },
  mobileToggle: {
    background: 'rgba(139, 195, 74, 0.3)',
    border: '1px solid rgba(139, 195, 74, 0.5)',
    color: '#FFF8E1',
    padding: '6px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    transition: 'all 0.3s ease',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 16px',
    scrollbarWidth: 'thin',
    scrollbarColor: 'rgba(139, 195, 74, 0.5) transparent',
  },
  title: {
    color: '#FFF8E1',
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 24,
    textAlign: 'center',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#8BC34A',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
  },
  operationButton: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 8px',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  buttonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  buttonLabel: {
    color: '#FFF8E1',
    fontSize: 12,
    fontWeight: 500,
  },
  ripple: {
    position: 'absolute',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.6)',
    transform: 'scale(0)',
    animation: 'ripple 0.6s ease-out',
    pointerEvents: 'none',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
  },
  dataPanel: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 12,
    padding: 16,
  },
  dataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  lastOperation: {
    borderBottom: 'none',
    paddingBottom: 0,
  },
  dataLabel: {
    color: 'rgba(255, 248, 225, 0.7)',
    fontSize: 13,
  },
  dataValue: {
    color: '#FFF8E1',
    fontSize: 15,
    fontWeight: 600,
    transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  bounce: {
    animation: 'bounce-in 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  healthContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  healthBarBg: {
    width: 80,
    height: 6,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s ease',
  },
  operationLog: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  operationDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  operationText: {
    color: '#FFF8E1',
    fontSize: 12,
  },
  replayControls: {
    marginBottom: 12,
  },
  replayButton: {
    width: '100%',
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #8BC34A, #689F38)',
    border: 'none',
    borderRadius: 12,
    color: '#FFF8E1',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  timeline: {
    position: 'relative',
    height: 40,
    marginTop: 8,
  },
  timelineTrack: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    height: 2,
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
  },
  timelineProgress: {
    position: 'absolute',
    top: 15,
    left: 0,
    height: 2,
    background: 'linear-gradient(90deg, #8BC34A, #4CAF50)',
    borderRadius: 1,
    transition: 'width 0.1s linear',
  },
  timelineDot: {
    position: 'absolute',
    top: 10,
    width: 12,
    height: 12,
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease',
    zIndex: 1,
  },
  timelineLabel: {
    position: 'absolute',
    top: 24,
    color: 'rgba(255, 248, 225, 0.5)',
    fontSize: 10,
  },
  slidersContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sliderItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    color: 'rgba(255, 248, 225, 0.8)',
    fontSize: 13,
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: 600,
  },
  slider: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    appearance: 'none',
    WebkitAppearance: 'none',
    outline: 'none',
    cursor: 'pointer',
  },
  sliderRange: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'rgba(255, 248, 225, 0.4)',
    fontSize: 10,
  },
};

export default ControlPanel;

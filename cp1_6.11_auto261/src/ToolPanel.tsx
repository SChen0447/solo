import React, { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pigment, RestorationParams, PIGMENTS } from './types';

interface ToolPanelProps {
  selectedPigment: Pigment | null;
  onPigmentSelect: (pigment: Pigment) => void;
  params: RestorationParams;
  onParamsChange: (params: Partial<RestorationParams>) => void;
  progress: number;
  isComplete: boolean;
}

const ToolPanel: React.FC<ToolPanelProps> = ({
  selectedPigment,
  onPigmentSelect,
  params,
  onParamsChange,
  progress,
  isComplete,
}) => {
  const handleSliderChange = useCallback(
    (key: keyof RestorationParams, value: number) => {
      onParamsChange({ [key]: value });
    },
    [onParamsChange]
  );

  return (
    <div style={styles.panel}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>矿物颜料</div>
        <div style={styles.pigmentGrid}>
          {PIGMENTS.map((pigment) => (
            <motion.div
              key={pigment.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                ...styles.pigmentBlock,
                backgroundColor: pigment.hex,
                border:
                  selectedPigment?.id === pigment.id
                    ? '3px solid #ffd54f'
                    : '3px solid transparent',
                boxShadow:
                  selectedPigment?.id === pigment.id
                    ? '0 0 8px rgba(255,213,79,0.6)'
                    : '0 1px 3px rgba(0,0,0,0.3)',
              }}
              onClick={() => onPigmentSelect(pigment)}
              title={pigment.name}
            />
          ))}
        </div>
        {selectedPigment && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            style={styles.selectedInfo}
          >
            当前颜料：<span style={{ color: selectedPigment.hex, fontWeight: 700 }}>{selectedPigment.name}</span>
          </motion.div>
        )}
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionTitle}>环境湿度</div>
        <div style={styles.sliderRow}>
          <SliderControl
            value={params.humidity}
            min={0}
            max={100}
            onChange={(v) => handleSliderChange('humidity', v)}
            label={`${params.humidity}%`}
          />
        </div>
        <div style={styles.sliderHint}>
          {params.humidity < 30 ? '低湿度：颜料干得快，笔触生硬' : params.humidity > 70 ? '高湿度：颜料流动性强，不易固定' : '适中湿度：颜料附着均匀'}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionTitle}>紫外光照强度</div>
        <div style={styles.sliderRow}>
          <SliderControl
            value={params.uvIntensity}
            min={0}
            max={100}
            onChange={(v) => handleSliderChange('uvIntensity', v)}
            label={`${params.uvIntensity}%`}
          />
        </div>
        <div style={styles.sliderHint}>
          {params.uvIntensity > 60 ? '强紫外光：壁画褪色加剧，出现光老化斑' : params.uvIntensity < 20 ? '弱紫外光：壁画色彩保持稳定' : '中等紫外光：轻微褪色影响'}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionTitle}>笔刷大小</div>
        <div style={styles.sliderRow}>
          <SliderControl
            value={params.brushSize}
            min={20}
            max={60}
            onChange={(v) => handleSliderChange('brushSize', v)}
            label={`${params.brushSize}px`}
          />
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <div style={styles.sectionTitle}>修复进度</div>
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <motion.div
              style={styles.progressFill}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span style={styles.progressText}>{progress.toFixed(1)}%</span>
        </div>
        <AnimatePresence>
          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={styles.completeBadge}
            >
              ✦ 修复完成 ✦
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface SliderControlProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

const SliderControl: React.FC<SliderControlProps> = ({ value, min, max, onChange, label }) => {
  const [rippling, setRippling] = React.useState(false);
  const rippleTimer = React.useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
    setRippling(true);
    if (rippleTimer.current) clearTimeout(rippleTimer.current);
    rippleTimer.current = setTimeout(() => setRippling(false), 300);
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div style={styles.sliderWrapper}>
      <div style={styles.sliderLabel}>{label}</div>
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          style={{
            ...styles.slider,
            background: `linear-gradient(to right, #6d4c41 0%, #6d4c41 ${percent}%, #d7ccc8 ${percent}%, #d7ccc8 100%)`,
          }}
        />
        {rippling && (
          <motion.div
            initial={{ opacity: 0.6, scale: 1 }}
            animate={{ opacity: 0, scale: 2.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              ...styles.ripple,
              left: `calc(${percent}% - 9px)`,
            }}
          />
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    minWidth: 240,
    padding: 16,
    background: 'rgba(255,235,200,0.9)',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    overflowY: 'auto',
    maxHeight: '100%',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#3e2723',
    letterSpacing: 1,
  },
  pigmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8,
    justifyItems: 'center',
  },
  pigmentBlock: {
    width: 35,
    height: 35,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  selectedInfo: {
    fontSize: 12,
    color: '#5d4037',
    textAlign: 'center',
    padding: '4px 0',
  },
  divider: {
    height: 1,
    background: 'rgba(109,76,65,0.2)',
    margin: '10px 0',
  },
  sliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sliderHint: {
    fontSize: 10,
    color: '#8d6e63',
    fontStyle: 'italic',
  },
  sliderWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
  },
  sliderLabel: {
    fontSize: 12,
    color: '#5d4037',
    textAlign: 'right',
    fontWeight: 600,
  },
  slider: {
    WebkitAppearance: 'none' as const,
    appearance: 'none' as const,
    width: '100%',
    height: 6,
    borderRadius: 3,
    outline: 'none',
    cursor: 'pointer',
  },
  ripple: {
    position: 'absolute',
    top: -6,
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid #6d4c41',
    pointerEvents: 'none',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    background: '#d7ccc8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6d4c41, #a1887f)',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontWeight: 700,
    color: '#3e2723',
    minWidth: 48,
    textAlign: 'right',
  },
  completeBadge: {
    textAlign: 'center',
    padding: '8px',
    background: 'linear-gradient(135deg, #ffd54f, #ffb300)',
    borderRadius: 6,
    color: '#3e2723',
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 2,
  },
};

export default ToolPanel;

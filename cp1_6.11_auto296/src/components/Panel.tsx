import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MixFormula, TestResult } from '../types';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  disabled?: boolean;
}

function Slider({ label, value, min, max, step, unit, onChange, disabled }: SliderProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-group">
      <div className="slider-label">
        <span>{label}</span>
        <span className="slider-value">
          {value.toFixed(step < 1 ? 2 : 0)}{unit}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          onMouseDown={() => setShowTooltip(true)}
          onMouseUp={() => setShowTooltip(false)}
          onMouseLeave={() => setShowTooltip(false)}
          disabled={disabled}
          className="slider"
          style={{
            background: `linear-gradient(90deg, #bf9b50 0%, #bf9b50 ${percentage}%, rgba(93, 64, 55, 0.3) ${percentage}%, rgba(93, 64, 55, 0.3) 100%)`,
          }}
        />
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="slider-tooltip"
              style={{ left: `${percentage}%` }}
            >
              {value.toFixed(step < 1 ? 2 : 0)}{unit}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ControlPanelProps {
  formula: MixFormula;
  onFormulaChange: (formula: MixFormula) => void;
  onMix: () => void;
  onLoad: () => void;
  isMixing: boolean;
  isLoading: boolean;
  result: TestResult | null;
}

export default function ControlPanel({
  formula,
  onFormulaChange,
  onMix,
  onLoad,
  isMixing,
  isLoading,
  result,
}: ControlPanelProps) {
  const handleAshChange = useCallback(
    (value: number) => {
      onFormulaChange({ ...formula, volcanicAshRatio: value });
    },
    [formula, onFormulaChange]
  );

  const handleAggregateChange = useCallback(
    (value: number) => {
      onFormulaChange({ ...formula, aggregateDiameter: value });
    },
    [formula, onFormulaChange]
  );

  const handleWaterChange = useCallback(
    (value: number) => {
      onFormulaChange({ ...formula, waterCementRatio: value });
    },
    [formula, onFormulaChange]
  );

  return (
    <>
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="control-panel"
      >
        <h2 className="panel-title">配方控制台</h2>

        <Slider
          label="火山灰比例"
          value={formula.volcanicAshRatio}
          min={10}
          max={60}
          step={1}
          unit="%"
          onChange={handleAshChange}
          disabled={isMixing || isLoading}
        />

        <Slider
          label="粗骨料直径"
          value={formula.aggregateDiameter}
          min={3}
          max={20}
          step={1}
          unit="mm"
          onChange={handleAggregateChange}
          disabled={isMixing || isLoading}
        />

        <Slider
          label="水灰比"
          value={formula.waterCementRatio}
          min={0.3}
          max={0.6}
          step={0.01}
          unit=""
          onChange={handleWaterChange}
          disabled={isMixing || isLoading}
        />

        <div className="button-group">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMix}
            disabled={isMixing || isLoading}
            className="roman-button"
          >
            {isMixing ? '搅拌中...' : '搅拌'}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoad}
            disabled={isMixing || isLoading || !result}
            className="roman-button secondary"
          >
            {isLoading ? '加载中...' : '加载'}
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.1 }}
        className="performance-panel"
      >
        <h2 className="performance-title">性能指标</h2>

        <div className="performance-item">
          <span className="performance-label">抗压强度</span>
          <motion.span
            key={result?.compressiveStrength}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`performance-value ${result && result.compressiveStrength > 40 ? 'highlight' : ''}`}
          >
            {result ? result.compressiveStrength.toFixed(1) : '--'} MPa
          </motion.span>
        </div>

        <div className="performance-item">
          <span className="performance-label">弹性模量</span>
          <motion.span
            key={result?.elasticModulus}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="performance-value"
          >
            {result ? result.elasticModulus.toFixed(1) : '--'} GPa
          </motion.span>
        </div>

        <div className="performance-item">
          <span className="performance-label">孔隙率</span>
          <motion.span
            key={result?.porosity}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="performance-value"
          >
            {result ? result.porosity.toFixed(1) : '--'}%
          </motion.span>
        </div>

        <div className="performance-item">
          <span className="performance-label">裂缝总长度</span>
          <motion.span
            key={result?.crackTotalLength}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="performance-value"
          >
            {result ? result.crackTotalLength.toFixed(0) : '--'} px
          </motion.span>
        </div>

        <div className="performance-item">
          <span className="performance-label">脆性指数</span>
          <motion.span
            key={result?.brittlenessIndex}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className="performance-value"
          >
            {result ? result.brittlenessIndex.toFixed(2) : '--'}
          </motion.span>
        </div>
      </motion.div>
    </>
  );
}

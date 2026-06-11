import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import type { AromaBase, BlendItem, BlendResult, BlendProgress } from '@/types';
import { startBlendWithSocket } from '@/utils/api';
import { mixColors, hexToRgb } from '@/utils/helpers';

interface BlendControlProps {
  selectedBases: AromaBase[];
  blendRatios: Record<string, number>;
  onRatioChange: (baseId: string, ratio: number) => void;
  onRemoveBase: (baseId: string) => void;
  onBlendComplete: (result: BlendResult) => void;
}

interface Ripple {
  id: number;
  baseId: string;
  color: string;
}

export default function BlendControl({
  selectedBases,
  blendRatios,
  onRatioChange,
  onRemoveBase,
  onBlendComplete,
}: BlendControlProps) {
  const [progress, setProgress] = useState(0);
  const [blendStatus, setBlendStatus] = useState<BlendProgress>('idle');
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const rippleIdRef = useRef(0);
  const lastSliderValue = useRef<Record<string, number>>({});

  const dominantColor = selectedBases.length > 0
    ? mixColors(selectedBases.map(b => ({ color: b.color, ratio: blendRatios[b.id] || 50 })))
    : '#b87333';

  const triggerRipple = useCallback((baseId: string, color: string) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, baseId, color }]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 500);
  }, []);

  const handleRatioChange = useCallback(
    (baseId: string, value: number, color: string) => {
      const lastValue = lastSliderValue.current[baseId] || 0;
      if (Math.abs(value - lastValue) >= 5) {
        triggerRipple(baseId, color);
        lastSliderValue.current[baseId] = value;
      }
      onRatioChange(baseId, value);
    },
    [onRatioChange, triggerRipple]
  );

  const handleBlend = useCallback(() => {
    if (selectedBases.length === 0 || blendStatus !== 'idle') return;

    const bases: BlendItem[] = selectedBases.map((b) => ({
      baseId: b.id,
      ratio: blendRatios[b.id] || 50,
    }));

    setBlendStatus('mixing');
    setProgress(0);

    const { onProgress, onComplete, onError } = startBlendWithSocket(bases);

    onProgress((p) => {
      setProgress(p);
    });

    onComplete((result) => {
      setProgress(100);
      setBlendStatus('done');
      onBlendComplete(result);

      setTimeout(() => {
        setBlendStatus('idle');
        setProgress(0);
      }, 1000);
    });

    onError((err) => {
      console.error('Blend error:', err);
      setBlendStatus('idle');
    });
  }, [selectedBases, blendRatios, blendStatus, onBlendComplete]);

  const progressRingRadius = 90;
  const progressRingCircumference = 2 * Math.PI * progressRingRadius;
  const progressOffset = progressRingCircumference - (progress / 100) * progressRingCircumference;

  return (
    <div className="blend-station">
      <div className="blend-station-content">
        <h2 className="section-title" style={{ justifyContent: 'center' }}>
          调香台
        </h2>

        {selectedBases.length === 0 ? (
          <div className="empty-state" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="empty-state-icon">🧪</div>
            <p>从左侧香精柜选择香基开始调香</p>
            <p style={{ fontSize: '0.8rem', marginTop: '8px', color: 'var(--text-muted)' }}>
              最多可选择 5 种香基进行混合
            </p>
          </div>
        ) : (
          <>
            <div className="selected-bases-area">
              {selectedBases.map((base) => (
                <motion.div
                  key={base.id}
                  className="selected-base-item"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  layout
                >
                  <div className="ripple-container" style={{ position: 'relative' }}>
                    <AnimatePresence>
                      {ripples
                        .filter((r) => r.baseId === base.id)
                        .map((ripple) => (
                          <motion.div
                            key={ripple.id}
                            className="ripple"
                            style={{ color: ripple.color }}
                            initial={{ width: 20, height: 20, opacity: 0.8 }}
                            animate={{ width: 80, height: 80, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                        ))}
                    </AnimatePresence>

                    <div
                      style={{
                        width: 50,
                        height: 70,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        background: `linear-gradient(180deg, transparent 0%, ${base.color}33 100%)`,
                        borderRadius: '8px 8px 4px 4px',
                        border: `1px solid ${base.color}66`,
                      }}
                    >
                      {base.iconSvg}
                    </div>

                    <button
                      className="remove-btn"
                      onClick={() => onRemoveBase(base.id)}
                      title="移除"
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ fontSize: '0.8rem', textAlign: 'center', marginTop: '8px' }}>
                    {base.name}
                  </div>

                  <div className="ratio-slider" style={{ width: '100px' }}>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={blendRatios[base.id] || 50}
                      onChange={(e) =>
                        handleRatioChange(base.id, parseInt(e.target.value), base.color)
                      }
                      disabled={blendStatus === 'mixing'}
                    />
                    <div className="ratio-value">{blendRatios[base.id] || 50}%</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="blend-center">
              {blendStatus === 'mixing' && (
                <motion.div
                  className="progress-ring"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <svg width="200" height="200">
                    <circle
                      className="progress-ring-circle progress-ring-bg"
                      cx="100"
                      cy="100"
                      r={progressRingRadius}
                    />
                    <circle
                      className="progress-ring-circle progress-ring-fill"
                      cx="100"
                      cy="100"
                      r={progressRingRadius}
                      style={{ strokeDashoffset: progressOffset }}
                    />
                  </svg>
                  <div className="progress-text">{progress}%</div>

                  <motion.div
                    className="fluid-animation"
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: 120,
                      height: 120,
                      '--fluid-color': dominantColor,
                      opacity: progress / 100 * 0.6,
                    } as React.CSSProperties}
                  />
                </motion.div>
              )}

              {blendStatus === 'idle' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: 'center' }}
                >
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${dominantColor}44 0%, transparent 70%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 20,
                    }}
                  >
                    <span style={{ fontSize: '2.5rem' }}>✨</span>
                  </div>
                </motion.div>
              )}
            </div>

            <div style={{ textAlign: 'center' }}>
              <motion.button
                className={`blend-button ${blendStatus === 'mixing' ? 'mixing' : ''}`}
                onClick={handleBlend}
                disabled={blendStatus !== 'idle' || selectedBases.length === 0}
                whileHover={blendStatus === 'idle' ? { scale: 1.05 } : {}}
                whileTap={blendStatus === 'idle' ? { scale: 0.98 } : {}}
              >
                {blendStatus === 'mixing' ? `${progress}% 混合中...` : '◈ 混合 BLEND ◈'}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

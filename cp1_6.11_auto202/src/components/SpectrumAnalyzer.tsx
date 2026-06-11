import { useState, CSSProperties, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GameStage, FormulaParams, PigmentType } from '../App';

interface Props {
  stage: GameStage;
  params: FormulaParams;
  onParamsChange: (p: FormulaParams) => void;
  onAnalyzed: (p: FormulaParams) => void;
}

const PIGMENTS: { id: PigmentType; label: string; color: string }[] = [
  { id: 'carbon', label: '碳黑 Carbon', color: '#1a1a1a' },
  { id: 'indigo', label: '靛青 Indigo', color: '#2a4a7a' },
  { id: 'ochre', label: '赭石 Ochre', color: '#b87333' },
  { id: 'alizarin', label: '茜素 Alizarin', color: '#8a2a3a' },
];

const metalBtn: CSSProperties = {
  background:
    'linear-gradient(180deg, #c9a96e 0%, #a07f48 30%, #8a6838 55%, #6b4e28 100%)',
  border: '1px solid #5a3e1e',
  color: '#2a1a08',
  fontFamily: "'Cormorant Garamond', serif",
  fontWeight: 600,
  padding: '10px 28px',
  fontSize: '17px',
  letterSpacing: '2px',
  borderRadius: '2px',
  cursor: 'pointer',
  boxShadow:
    'inset 0 1px 0 rgba(255,240,200,0.5), inset 0 -2px 8px rgba(0,0,0,0.3), 0 3px 8px rgba(0,0,0,0.4)',
  transition: 'all 0.25s ease',
  textTransform: 'uppercase' as const,
};

export default function SpectrumAnalyzer({
  stage,
  params,
  onParamsChange,
  onAnalyzed,
}: Props) {
  const [inkDropped, setInkDropped] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const canAcceptDrop = stage === 'bottle_opened';
  const hasInk = inkDropped || stage === 'ink_in_analyzer' || stage === 'analyzed' || stage === 'puzzle_done' || stage === 'card_shown';
  const analyzed = stage === 'analyzed' || stage === 'puzzle_done' || stage === 'card_shown';

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (canAcceptDrop) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (canAcceptDrop) {
      e.preventDefault();
      const data = e.dataTransfer.getData('text/plain');
      if (data === 'ink-block') {
        setInkDropped(true);
        window.dispatchEvent(new CustomEvent('ink-placed-in-analyzer'));
      }
    }
  };

  const handleAnalyze = () => {
    if (!hasInk || scanning || analyzed) return;
    setScanning(true);
    setScanProgress(0);
    const start = performance.now();
    const DUR = 2000;
    const tick = () => {
      const t = Math.min((performance.now() - start) / DUR, 1);
      setScanProgress(t);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        setScanning(false);
        const randomized: FormulaParams = {
          pigment: (['indigo', 'carbon', 'ochre', 'alizarin'] as PigmentType[])[Math.floor(Math.random() * 4)],
          binderRatio: 25 + Math.floor(Math.random() * 55),
          ph: Math.round((2 + Math.random() * 10) * 10) / 10,
        };
        onParamsChange(randomized);
        onAnalyzed(randomized);
      }
    };
    requestAnimationFrame(tick);
  };

  const container: CSSProperties = {
    position: 'relative',
    background:
      'linear-gradient(180deg, rgba(27,42,26,0.6) 0%, rgba(90,62,43,0.55) 100%)',
    border: '2px solid #c9a96e',
    borderRadius: '6px',
    padding: '20px',
    minHeight: '520px',
    boxShadow:
      '0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,169,110,0.15)',
  };

  const header: CSSProperties = {
    textAlign: 'center',
    fontFamily: "'Dancing Script', cursive",
    fontSize: '26px',
    color: '#f5e8c8',
    borderBottom: '1px solid #c9a96e',
    paddingBottom: '8px',
    marginBottom: '20px',
    letterSpacing: '1px',
  };

  const brassBody: CSSProperties = {
    position: 'relative',
    margin: '0 auto',
    width: '220px',
    height: '180px',
    borderRadius: '100px 100px 20px 20px',
    background:
      'linear-gradient(90deg, #6b4e20 0%, #b08848 25%, #d4af6e 50%, #b08848 75%, #6b4e20 100%)',
    boxShadow:
      'inset 0 6px 20px rgba(255,230,170,0.4), inset 0 -10px 24px rgba(50,30,10,0.6), 0 8px 20px rgba(0,0,0,0.5)',
    border: '1px solid #5a3e1e',
    overflow: 'hidden',
  };

  const scanChamber: CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '40px',
    transform: 'translateX(-50%)',
    width: '150px',
    height: '90px',
    borderRadius: '75px 75px 8px 8px',
    background:
      'linear-gradient(180deg, #0a1215 0%, #152025 50%, #0a1215 100%)',
    border: '2px solid #3a5860',
    boxShadow:
      'inset 0 0 24px rgba(0,0,0,0.9), inset 0 0 4px rgba(100,220,220,0.15)',
    overflow: 'hidden',
  };

  const analyzerSlotStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const inkInAnalyzer: CSSProperties = {
    width: '60px',
    height: '44px',
    borderRadius: '3px 3px 8px 8px',
    background:
      'linear-gradient(180deg, #1a1410 0%, #2a1f17 50%, #0e0a07 100%)',
    boxShadow:
      '0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(120,80,60,0.25)',
    border: '1px solid #3a2a1e',
    position: 'relative',
    zIndex: 2,
  };

  const scanBeam: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '4px',
    background:
      'linear-gradient(90deg, transparent 0%, rgba(100,240,240,0.3) 30%, rgba(180,255,255,0.95) 50%, rgba(100,240,240,0.3) 70%, transparent 100%)',
    boxShadow:
      '0 0 20px rgba(120,240,240,0.8), 0 0 40px rgba(120,240,240,0.5)',
    transform: `translateY(${scanProgress * 90}px)`,
    opacity: scanning ? 1 : 0,
    transition: scanning ? 'opacity 0.2s ease' : 'opacity 0.2s ease 0.1s',
    zIndex: 3,
    pointerEvents: 'none',
  };

  const scanGlow: CSSProperties = {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    height: `${scanProgress * 110 + 10}px`,
    background:
      'linear-gradient(180deg, rgba(100,240,240,0.0) 0%, rgba(100,240,240,0.08) 100%)',
    opacity: scanning ? 1 : 0,
    pointerEvents: 'none',
    zIndex: 1,
  };

  const tripod: CSSProperties = {
    position: 'relative',
    margin: '0 auto',
    width: '180px',
    height: '50px',
  };

  const paramsPanel: CSSProperties = {
    marginTop: '24px',
    padding: '16px',
    border: '1px solid #c9a96e',
    borderRadius: '3px',
    background: 'rgba(10,20,12,0.5)',
  };

  const paramRow: CSSProperties = {
    marginBottom: '16px',
  };

  const paramLabel: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '16px',
    color: '#f5e8c8',
    marginBottom: '8px',
  };

  const paramValue: CSSProperties = {
    marginLeft: 'auto',
    fontFamily: "'Courier Prime', monospace",
    fontSize: '14px',
    color: '#c9a96e',
  };

  const sliderTrack: CSSProperties = {
    position: 'relative',
    height: '8px',
    borderRadius: '4px',
    background:
      'linear-gradient(180deg, #5a4025 0%, #3a2810 100%)',
    border: '1px solid #8a6838',
    overflow: 'hidden',
  };

  return (
    <div style={container}>
      <div style={header}>光谱分析仪</div>

      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          position: 'relative',
          borderRadius: canAcceptDrop ? '12px' : '0',
          outline: canAcceptDrop ? '2px dashed rgba(120,240,240,0.35)' : 'none',
          outlineOffset: '8px',
          transition: 'all 0.3s ease',
          padding: canAcceptDrop ? '6px 0' : '0',
        }}
      >
        <div style={brassBody}>
          {/* 黄铜高光 */}
          <div
            style={{
              position: 'absolute',
              left: '30%',
              top: 0,
              width: '20px',
              height: '100%',
              background:
                'linear-gradient(90deg, transparent, rgba(255,240,200,0.45), transparent)',
              transform: 'skewX(-8deg)',
              pointerEvents: 'none',
            }}
          />
          {/* 刻度环 */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '15px',
              right: '15px',
              height: '6px',
              borderBottom: '1px dashed rgba(90,60,30,0.6)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '18px',
              left: '15px',
              right: '15px',
              height: '6px',
              borderBottom: '1px dashed rgba(90,60,30,0.6)',
              pointerEvents: 'none',
            }}
          />

          <div style={scanChamber}>
            <div style={analyzerSlotStyle}>
              {hasInk && !scanning && <div style={inkInAnalyzer} />}
            </div>
            <div style={scanGlow} />
            <div style={scanBeam} />
            {!hasInk && canAcceptDrop && (
              <motion.div
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.6, repeat: Infinity }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(120,240,240,0.85)',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontStyle: 'italic',
                  fontSize: '13px',
                  letterSpacing: '1px',
                  zIndex: 4,
                }}
              >
                · 放入墨块 ·
              </motion.div>
            )}
          </div>

          {/* 侧边旋钮 */}
          <div
            style={{
              position: 'absolute',
              right: '-8px',
              top: '70px',
              width: '16px',
              height: '36px',
              borderRadius: '4px',
              background:
                'linear-gradient(90deg, #6b4e20, #d4af6e 50%, #6b4e20)',
              border: '1px solid #4a3218',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '-8px',
              top: '70px',
              width: '16px',
              height: '36px',
              borderRadius: '4px',
              background:
                'linear-gradient(90deg, #6b4e20, #d4af6e 50%, #6b4e20)',
              border: '1px solid #4a3218',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }}
          />
        </div>

        {/* 三足支架 */}
        <div style={tripod}>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              transform: 'translateX(-50%)',
              width: '20px',
              height: '30px',
              background:
                'linear-gradient(90deg, #4a3218, #8a6838 50%, #4a3218)',
              borderRadius: '2px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '180px',
              height: '14px',
              borderRadius: '0 0 12px 12px',
              background:
                'linear-gradient(180deg, #8a6838 0%, #5a3e1e 100%)',
              border: '1px solid #3a2810',
              boxShadow: '0 6px 10px rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              left: '10px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#2a1a08',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '10px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#2a1a08',
            }}
          />
        </div>
      </div>

      {/* 分析按钮 */}
      <div style={{ textAlign: 'center', marginTop: '18px' }}>
        <motion.button
          onClick={handleAnalyze}
          disabled={!hasInk || scanning || analyzed}
          whileHover={hasInk && !scanning && !analyzed ? { scale: 1.04, boxShadow: 'inset 0 1px 0 rgba(255,240,200,0.5), inset 0 -2px 8px rgba(0,0,0,0.3), 0 0 0 1px #5b7a5b, 0 3px 12px rgba(0,0,0,0.4)' } : {}}
          whileTap={hasInk && !scanning && !analyzed ? { scale: 0.98 } : {}}
          style={{
            ...metalBtn,
            opacity: !hasInk || scanning || analyzed ? 0.5 : 1,
            cursor: !hasInk || scanning || analyzed ? 'not-allowed' : 'pointer',
          }}
        >
          {scanning
            ? `扫描中 ${Math.floor(scanProgress * 100)}%`
            : analyzed
              ? '分析完成'
              : hasInk
                ? '▶ 分 析'
                : '待放入墨块'}
        </motion.button>
      </div>

      {/* 参数面板 */}
      <AnimatePresence>
        {analyzed && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div style={paramsPanel}>
              {/* 颜料类型 */}
              <div style={paramRow}>
                <div style={paramLabel}>
                  <span style={{ fontSize: '18px' }}>🎨</span>
                  <span>颜料类型</span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  {PIGMENTS.map((p) => {
                    const active = params.pigment === p.id;
                    return (
                      <motion.button
                        key={p.id}
                        onClick={() =>
                          onParamsChange({ ...params, pigment: p.id })
                        }
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '2px',
                          border: active
                            ? '1px solid #5b7a5b'
                            : '1px solid #8a6838',
                          background: active
                            ? 'rgba(91,122,91,0.3)'
                            : 'rgba(90,62,43,0.4)',
                          color: '#f5e8c8',
                          fontFamily: "'Cormorant Garamond', serif",
                          fontSize: '14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: active
                            ? '0 0 0 1px rgba(91,122,91,0.4)'
                            : 'none',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: p.color,
                            border: '1px solid rgba(255,255,255,0.2)',
                          }}
                        />
                        {p.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* 胶质比例 */}
              <div style={paramRow}>
                <div style={paramLabel}>
                  <span style={{ fontSize: '18px' }}>⚗️</span>
                  <span>胶质比例 Binder</span>
                  <span style={paramValue}>{params.binderRatio}%</span>
                </div>
                <div style={sliderTrack}>
                  <div
                    style={{
                      width: `${params.binderRatio}%`,
                      height: '100%',
                      background:
                        'linear-gradient(90deg, #8a6838 0%, #d4af6e 100%)',
                      transition: 'width 0.15s ease-out',
                      boxShadow: '0 0 8px rgba(212,175,110,0.4)',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={params.binderRatio}
                  onChange={(e) =>
                    onParamsChange({
                      ...params,
                      binderRatio: parseInt(e.target.value),
                    })
                  }
                  style={{
                    width: '100%',
                    marginTop: '-12px',
                    appearance: 'none' as const,
                    WebkitAppearance: 'none' as const,
                    background: 'transparent',
                    cursor: 'pointer',
                    height: '8px',
                  }}
                />
                <style>{`
                  input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px; height: 18px; border-radius: 50%;
                    background: linear-gradient(135deg, #e8d49a 0%, #c9a96e 50%, #8a6838 100%);
                    border: 1px solid #5a3e1e;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,240,200,0.6);
                    cursor: grab;
                  }
                  input[type=range]::-moz-range-thumb {
                    width: 18px; height: 18px; border-radius: 50%;
                    background: linear-gradient(135deg, #e8d49a 0%, #c9a96e 50%, #8a6838 100%);
                    border: 1px solid #5a3e1e;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                  }
                `}</style>
              </div>

              {/* pH值 */}
              <div style={{ ...paramRow, marginBottom: 0 }}>
                <div style={paramLabel}>
                  <span style={{ fontSize: '18px' }}>🧪</span>
                  <span>pH 值</span>
                  <span style={paramValue}>{params.ph.toFixed(1)}</span>
                </div>
                <div style={sliderTrack}>
                  <div
                    style={{
                      width: `${(params.ph / 14) * 100}%`,
                      height: '100%',
                      background:
                        'linear-gradient(90deg, #d14a3a 0%, #e8c14a 35%, #8ab85a 60%, #3a8ad1 100%)',
                      transition: 'width 0.15s ease-out',
                      boxShadow: '0 0 8px rgba(255,200,100,0.3)',
                    }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={14}
                  step={0.1}
                  value={params.ph}
                  onChange={(e) =>
                    onParamsChange({
                      ...params,
                      ph: parseFloat(parseFloat(e.target.value).toFixed(1)),
                    })
                  }
                  style={{
                    width: '100%',
                    marginTop: '-12px',
                    appearance: 'none' as const,
                    WebkitAppearance: 'none' as const,
                    background: 'transparent',
                    cursor: 'pointer',
                    height: '8px',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '6px',
                    fontFamily: "'Courier Prime', monospace",
                    fontSize: '11px',
                    color: '#8a6838',
                  }}
                >
                  <span>0 酸</span>
                  <span>7 中</span>
                  <span>14 碱</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

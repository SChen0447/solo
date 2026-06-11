import { useState, useMemo, CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Workbench from './components/Workbench';
import SpectrumAnalyzer from './components/SpectrumAnalyzer';
import ColorPuzzle from './components/ColorPuzzle';
import FormulaCard from './components/FormulaCard';

export type PigmentType = 'carbon' | 'indigo' | 'ochre' | 'alizarin';

export type InkColor = {
  name: '普鲁士蓝' | '中国墨' | '赛别尔紫';
  year: string;
  hex: string;
  pigment: PigmentType;
  binderRatio: number;
  ph: number;
};

export type GameStage =
  | 'idle'
  | 'bottle_opened'
  | 'ink_in_analyzer'
  | 'analyzed'
  | 'puzzle_done'
  | 'card_shown';

export type FormulaParams = {
  pigment: PigmentType;
  binderRatio: number;
  ph: number;
};

const BG_DEFAULT = 'linear-gradient(135deg, #1b2a1a 0%, #5a3e2b 100%)';

function mixHexWithBlack(hex: string, ratio: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const nr = Math.round(r * (1 - ratio));
  const ng = Math.round(g * (1 - ratio));
  const nb = Math.round(b * (1 - ratio));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export default function App() {
  const [stage, setStage] = useState<GameStage>('idle');
  const [params, setParams] = useState<FormulaParams>({
    pigment: 'indigo',
    binderRatio: 45,
    ph: 7,
  });
  const [finalInk, setFinalInk] = useState<InkColor | null>(null);
  const [bgStyle, setBgStyle] = useState<string>(BG_DEFAULT);

  const handleBottleOpened = () => {
    setStage('bottle_opened');
  };

  const handleInkPlaced = () => {
    setStage('ink_in_analyzer');
  };

  const handleAnalyzed = (newParams: FormulaParams) => {
    setParams(newParams);
    setStage('analyzed');
  };

  const handleParamsChange = (newParams: FormulaParams) => {
    setParams(newParams);
  };

  const handlePuzzleComplete = (ink: InkColor) => {
    setFinalInk(ink);
    const darkened = mixHexWithBlack(ink.hex, 0.45);
    setBgStyle(`linear-gradient(135deg, ${darkened} 0%, ${ink.hex} 100%)`);
    setStage('puzzle_done');
    setTimeout(() => setStage('card_shown'), 900);
  };

  const appStyle: CSSProperties = useMemo(
    () => ({
      width: '100vw',
      minHeight: '100vh',
      background: bgStyle,
      transition: 'background 2s ease',
      position: 'relative',
      overflowX: 'hidden',
      fontFamily: "'Cormorant Garamond', serif",
      color: '#f5e8c8',
    }),
    [bgStyle]
  );

  const noiseStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0.08,
    zIndex: 1,
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
  };

  const vignetteStyle: CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 2,
    background:
      'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
  };

  const headerStyle: CSSProperties = {
    position: 'relative',
    zIndex: 5,
    padding: '24px 48px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const titleStyle: CSSProperties = {
    fontFamily: "'Dancing Script', cursive",
    fontSize: '34px',
    color: '#f5e8c8',
    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
    letterSpacing: '1px',
  };

  const subtitleStyle: CSSProperties = {
    fontSize: '15px',
    color: '#c9a96e',
    opacity: 0.9,
    letterSpacing: '3px',
    textTransform: 'uppercase' as const,
  };

  const mainStyle: CSSProperties = {
    position: 'relative',
    zIndex: 5,
    padding: '0 48px 48px',
    display: 'grid',
    gridTemplateColumns: '320px 1fr 360px',
    gridTemplateRows: 'auto auto',
    gap: '32px',
    alignItems: 'start',
  };

  return (
    <div style={appStyle}>
      <div style={noiseStyle} />
      <div style={vignetteStyle} />

      <header style={headerStyle}>
        <div>
          <div style={titleStyle}>墨水配方复原实验室</div>
          <div style={subtitleStyle}>Ink Formula Restoration · Est. 1847</div>
        </div>
        <div
          style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: '13px',
            color: '#c9a96e',
            padding: '6px 14px',
            border: '1px solid #c9a96e',
            borderRadius: '2px',
            background: 'rgba(90,62,43,0.35)',
          }}
        >
          阶段 · {(() => {
            switch (stage) {
              case 'idle':
                return '等待开瓶';
              case 'bottle_opened':
                return '墨块待分析';
              case 'ink_in_analyzer':
                return '准备扫描';
              case 'analyzed':
                return '色谱拼图中';
              case 'puzzle_done':
                return '颜色融合';
              case 'card_shown':
                return '复原完成';
              default:
                return '';
            }
          })()}
        </div>
      </header>

      <main style={mainStyle}>
        <div style={{ position: 'relative', minHeight: '520px' }}>
          <AnimatePresence>
            {finalInk && stage === 'card_shown' && (
              <motion.div
                key="formula-card"
                initial={{ opacity: 0, x: -80, rotateY: -25 }}
                animate={{ opacity: 1, x: 0, rotateY: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ perspective: '1000px' }}
              >
                <FormulaCard ink={finalInk} />
              </motion.div>
            )}
          </AnimatePresence>
          {(!finalInk || stage !== 'card_shown') && (
            <div
              style={{
                padding: '24px',
                border: '1px solid #c9a96e',
                borderRadius: '4px',
                background: 'rgba(27,42,26,0.45)',
                height: '100%',
                minHeight: '520px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#c9a96e',
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: 'italic',
                fontSize: '18px',
                opacity: 0.85,
                textAlign: 'center' as const,
                lineHeight: 1.8,
              }}
            >
              此处将显现古方配方
              <br />
              <span style={{ fontSize: '14px', opacity: 0.7 }}>
                — 完成色谱拼图以解锁 —
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <Workbench
            stage={stage}
            onBottleOpened={handleBottleOpened}
            onInkPlaced={handleInkPlaced}
          />
          {stage === 'analyzed' || stage === 'puzzle_done' || stage === 'card_shown' ? (
            <ColorPuzzle
              params={params}
              onParamsChange={handleParamsChange}
              onComplete={handlePuzzleComplete}
              completed={stage === 'puzzle_done' || stage === 'card_shown'}
            />
          ) : null}
        </div>

        <div>
          <SpectrumAnalyzer
            stage={stage}
            params={params}
            onParamsChange={handleParamsChange}
            onAnalyzed={handleAnalyzed}
          />
        </div>
      </main>
    </div>
  );
}

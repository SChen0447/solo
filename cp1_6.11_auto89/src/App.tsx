import React, { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GradientEditor from './components/GradientEditor';
import PalettePanel from './components/PalettePanel';
import ShapePreview from './components/ShapePreview';
import type { ColorStop, PaletteItem, ShapeType, GradientData } from './types';
import { sortColorStops, stopsToCssLinearGradient } from './utils/gradient';
import { createPaletteItem } from './utils/thumbnail';

const createDefaultStops = (): ColorStop[] =>
  sortColorStops([
    { id: uuidv4(), color: '#7C4DFF', position: 0 },
    { id: uuidv4(), color: '#4FC3F7', position: 50 },
    { id: uuidv4(), color: '#00E676', position: 100 }
  ]);

const DEFAULT_ANGLE = 135;

const App: React.FC = () => {
  const [colorStops, setColorStops] = useState<ColorStop[]>(createDefaultStops);
  const [angle, setAngle] = useState<number>(DEFAULT_ANGLE);
  const [palette, setPalette] = useState<PaletteItem[]>([]);
  const [shapeType, setShapeType] = useState<ShapeType>('circle');

  const handleGradientChange = useCallback((data: GradientData) => {
    setColorStops(data.colorStops);
    setAngle(data.angle);
  }, []);

  const handleSaveToPalette = useCallback(() => {
    const item = createPaletteItem(colorStops, angle);
    setPalette((prev) => [item, ...prev]);
  }, [colorStops, angle]);

  const handlePaletteSelect = useCallback((item: PaletteItem) => {
    setColorStops(sortColorStops(item.colorStops));
    setAngle(item.angle);
  }, []);

  const handlePaletteDelete = useCallback((id: string) => {
    setPalette((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleShapeChange = useCallback((shape: ShapeType) => {
    setShapeType(shape);
  }, []);

  const cssCode = useMemo(
    () => `background: ${stopsToCssLinearGradient(colorStops, angle)};`,
    [colorStops, angle]
  );

  const [copied, setCopied] = useState(false);
  const handleCopyCss = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }, [cssCode]);

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <div className="app__logo" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 32 32">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4fc3f7" />
                  <stop offset="100%" stopColor="#7c4dff" />
                </linearGradient>
              </defs>
              <rect width="32" height="32" rx="8" fill="url(#logoGrad)" />
            </svg>
          </div>
          <div>
            <h1 className="app__title">Gradient Palette Studio</h1>
            <p className="app__subtitle">渐变色合成与预览调色板</p>
          </div>
        </div>
        <div className="app__actions">
          <button
            type="button"
            className="app__copy-btn"
            onClick={handleCopyCss}
            title="复制 CSS 代码"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            <span>{copied ? '已复制!' : '复制 CSS'}</span>
          </button>
          <button
            type="button"
            className="app__save-btn"
            onClick={handleSaveToPalette}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>收藏方案</span>
          </button>
        </div>
      </header>

      <div className="app__css-bar">
        <code className="app__css-code">{cssCode}</code>
      </div>

      <main className="app__layout">
        <div className="app__left">
          <GradientEditor
            colorStops={colorStops}
            angle={angle}
            onChange={handleGradientChange}
          />
          <PalettePanel
            palette={palette}
            onSelect={handlePaletteSelect}
            onDelete={handlePaletteDelete}
          />
        </div>
        <div className="app__right">
          <ShapePreview
            colorStops={colorStops}
            angle={angle}
            shapeType={shapeType}
            onShapeChange={handleShapeChange}
          />
        </div>
      </main>

      <footer className="app__footer">
        <p>提示：拖拽色标调整位置 · 点击色标圆点选取颜色 · 转动表盘调整渐变方向</p>
      </footer>
    </div>
  );
};

export default App;

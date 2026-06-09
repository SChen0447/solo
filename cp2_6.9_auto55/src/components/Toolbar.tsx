import { COLOR_PALETTE } from '../types';
import type { ToolType, StrokeWidth } from '../types';

interface ToolbarProps {
  tool: ToolType;
  color: string;
  strokeWidth: StrokeWidth;
  fontSize: number;
  canUndo: boolean;
  canRedo: boolean;
  mobileOpen: boolean;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onStrokeWidthChange: (width: StrokeWidth) => void;
  onFontSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleMobile: () => void;
}

export function Toolbar({
  tool,
  color,
  strokeWidth,
  fontSize,
  canUndo,
  canRedo,
  mobileOpen,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
  onFontSizeChange,
  onUndo,
  onRedo,
  onClear,
  onToggleMobile,
}: ToolbarProps) {
  const strokeWidths: StrokeWidth[] = [2, 6, 12];
  const fontSizes = [16, 20, 24, 28, 32];

  return (
    <>
      <button
        className="mobile-toolbar-toggle"
        onClick={onToggleMobile}
        aria-label="切换工具栏"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <aside className={`toolbar ${mobileOpen ? 'toolbar-mobile-open' : ''}`}>
        <div className="toolbar-indicator">
          <div
            className="toolbar-color-preview"
            style={{ backgroundColor: color }}
          />
          <div className="toolbar-stroke-preview">
            <div
              className="toolbar-stroke-dot"
              style={{
                width: strokeWidth,
                height: strokeWidth,
                backgroundColor: color,
              }}
            />
          </div>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${tool === 'pen' ? 'toolbar-btn-active' : ''}`}
            onClick={() => onToolChange('pen')}
            title="画笔"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
          </button>
          <button
            className={`toolbar-btn ${tool === 'text' ? 'toolbar-btn-active' : ''}`}
            onClick={() => onToolChange('text')}
            title="文字"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          </button>
          <button
            className={`toolbar-btn ${tool === 'stickyNote' ? 'toolbar-btn-active' : ''}`}
            onClick={() => onToolChange('stickyNote')}
            title="便签"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" />
              <polyline points="16 3 16 8 21 8" />
              <line x1="8" y1="13" x2="14" y2="13" />
              <line x1="8" y1="17" x2="12" y2="17" />
            </svg>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${!canUndo ? 'toolbar-btn-disabled' : ''}`}
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
          <button
            className={`toolbar-btn ${!canRedo ? 'toolbar-btn-disabled' : ''}`}
            onClick={onRedo}
            disabled={!canRedo}
            title="重做"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-colors">
          {COLOR_PALETTE.map((c) => (
            <button
              key={c}
              className={`toolbar-color ${color === c ? 'toolbar-color-active' : ''}`}
              style={{ backgroundColor: c }}
              onClick={() => onColorChange(c)}
              title={c}
            />
          ))}
        </div>

        <div className="toolbar-divider" />

        {tool === 'pen' && (
          <div className="toolbar-section toolbar-strokes">
            {strokeWidths.map((w) => (
              <button
                key={w}
                className={`toolbar-stroke-btn ${strokeWidth === w ? 'toolbar-stroke-btn-active' : ''}`}
                onClick={() => onStrokeWidthChange(w)}
                title={`${w}px`}
              >
                <div
                  className="toolbar-stroke-line"
                  style={{ height: w, backgroundColor: color }}
                />
              </button>
            ))}
          </div>
        )}

        {tool === 'text' && (
          <div className="toolbar-section toolbar-fonts">
            {fontSizes.map((s) => (
              <button
                key={s}
                className={`toolbar-font-btn ${fontSize === s ? 'toolbar-font-btn-active' : ''}`}
                onClick={() => onFontSizeChange(s)}
                title={`${s}px`}
              >
                <span style={{ fontSize: s * 0.7 }}>A</span>
              </button>
            ))}
          </div>
        )}

        <div className="toolbar-spacer" />

        <div className="toolbar-divider" />

        <button
          className="toolbar-btn toolbar-btn-clear"
          onClick={onClear}
          title="清空白板"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </aside>
    </>
  );
}

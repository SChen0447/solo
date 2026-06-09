import React, { useState, useMemo } from 'react';
import { PalettePanel } from './components/PalettePanel';
import { ScenePreview } from './components/ScenePreview';
import { HistoryPanel } from './components/HistoryPanel';
import { useColorState } from './hooks/useColorState';
import { THEMES } from './utils/constants';

export const App: React.FC = () => {
  const { colors, history, currentThemeId, setColor, restoreFromHistory, clearHistory, setTheme } = useColorState();
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);

  const currentTheme = useMemo(() => {
    return THEMES.find(t => t.id === currentThemeId) || THEMES[0];
  }, [currentThemeId]);

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const theme = THEMES.find(t => t.id === e.target.value);
    if (theme && theme.id !== currentThemeId) {
      setIsThemeTransitioning(true);
      setTheme(theme);
      setTimeout(() => {
        setIsThemeTransitioning(false);
      }, 500);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: '#f5f5f7',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          height: '56px',
          backgroundColor: currentTheme.panelBg,
          color: currentTheme.panelText,
          borderBottom: `1px solid ${currentTheme.panelText}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          flexShrink: 0,
          transition: 'background-color 0.5s ease, color 0.5s ease',
        }}
      >
        <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
          🎨 配色方案调试面板
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '14px', opacity: 0.7 }}>主题：</span>
          <select
            value={currentThemeId}
            onChange={handleThemeChange}
            style={{
              padding: '6px 12px',
              fontSize: '14px',
              borderRadius: '6px',
              border: `1px solid ${currentTheme.panelText}25`,
              backgroundColor: currentTheme.panelBg,
              color: currentTheme.panelText,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {THEMES.map(theme => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          transition: 'opacity 0.5s ease',
          opacity: isThemeTransitioning ? 0.6 : 1,
        }}
      >
        <div style={{ flex: 3, borderRight: `1px solid ${currentTheme.panelText}15`, minWidth: 0, transition: 'border-color 0.5s ease' }}>
          <ScenePreview
            colors={colors}
            onColorChange={setColor}
            panelBg={currentTheme.panelBg}
            panelText={currentTheme.panelText}
            isTransitioning={isThemeTransitioning}
          />
        </div>

        <div style={{ flex: 4, borderRight: `1px solid ${currentTheme.panelText}15`, minWidth: 0, transition: 'border-color 0.5s ease' }}>
          <PalettePanel
            palette={currentTheme.palette}
            panelBg={currentTheme.panelBg}
            panelText={currentTheme.panelText}
          />
        </div>

        <div style={{ flex: 3, minWidth: 0 }}>
          <HistoryPanel
            history={history}
            onRestore={restoreFromHistory}
            onClear={clearHistory}
            panelBg={currentTheme.panelBg}
            panelText={currentTheme.panelText}
          />
        </div>
      </div>
    </div>
  );
};

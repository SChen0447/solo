import React from 'react';
import { themes } from './themes';
import type { Action, ThemeName } from './types';

interface ThemeSwitchProps {
  currentTheme: ThemeName;
  dispatch: (action: Action) => void;
}

const themeOptions: { key: ThemeName; label: string; preview: string }[] = [
  { key: 'minimal', label: '极简白', preview: '#f8f9fa' },
  { key: 'cyber', label: '赛博蓝', preview: '#0a1628' },
  { key: 'green', label: '护眼绿', preview: '#1a2e1a' },
];

function ThemeSwitch({ currentTheme, dispatch }: ThemeSwitchProps) {
  const t = themes[currentTheme];

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {themeOptions.map((opt) => {
        const isActive = currentTheme === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => dispatch({ type: 'SET_THEME', payload: { theme: opt.key } })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 6,
              border: isActive ? `1px solid ${t.accent}` : `1px solid ${t.panelBorder}`,
              background: isActive ? t.hoverBg : 'transparent',
              color: isActive ? t.accent : t.cardText,
              fontSize: 11,
              cursor: 'pointer',
              transition: 'border-color 0.2s ease, background 0.2s ease, color 0.5s ease',
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: opt.preview,
                border: '1px solid rgba(128,128,128,0.3)',
              }}
            />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitch;

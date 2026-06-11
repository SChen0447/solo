import type { ThemeColors, ThemeName } from './types';

export const themes: Record<ThemeName, ThemeColors> = {
  minimal: {
    bg: '#f8f9fa',
    panelBg: 'rgba(255, 255, 255, 0.78)',
    panelBorder: 'rgba(0, 0, 0, 0.08)',
    cardBg: 'rgba(255, 255, 255, 0.92)',
    cardBorder: 'rgba(0, 0, 0, 0.12)',
    cardText: '#1a1a2e',
    lineColor: '#94a3b8',
    gridColor: 'rgba(0, 0, 0, 0.06)',
    accent: '#3b82f6',
    accentText: '#ffffff',
    selectedBorder: '#3b82f6',
    hoverBg: 'rgba(59, 130, 246, 0.08)',
    treeItemActive: 'rgba(59, 130, 246, 0.12)',
    inputBg: 'rgba(255, 255, 255, 0.9)',
    inputBorder: 'rgba(0, 0, 0, 0.15)',
    inputText: '#1a1a2e',
    buttonBg: '#3b82f6',
    buttonText: '#ffffff',
    shadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  cyber: {
    bg: '#0a1628',
    panelBg: 'rgba(15, 23, 42, 0.85)',
    panelBorder: 'rgba(0, 212, 255, 0.15)',
    cardBg: 'rgba(15, 30, 60, 0.88)',
    cardBorder: 'rgba(0, 212, 255, 0.25)',
    cardText: '#e0f2fe',
    lineColor: '#00d4ff',
    gridColor: 'rgba(0, 212, 255, 0.05)',
    accent: '#00d4ff',
    accentText: '#0a1628',
    selectedBorder: '#00d4ff',
    hoverBg: 'rgba(0, 212, 255, 0.1)',
    treeItemActive: 'rgba(0, 212, 255, 0.15)',
    inputBg: 'rgba(10, 22, 40, 0.9)',
    inputBorder: 'rgba(0, 212, 255, 0.3)',
    inputText: '#e0f2fe',
    buttonBg: '#00d4ff',
    buttonText: '#0a1628',
    shadow: '0 2px 12px rgba(0, 212, 255, 0.15)',
  },
  green: {
    bg: '#1a2e1a',
    panelBg: 'rgba(20, 40, 20, 0.85)',
    panelBorder: 'rgba(74, 222, 128, 0.15)',
    cardBg: 'rgba(30, 50, 30, 0.88)',
    cardBorder: 'rgba(74, 222, 128, 0.25)',
    cardText: '#dcfce7',
    lineColor: '#4ade80',
    gridColor: 'rgba(74, 222, 128, 0.05)',
    accent: '#4ade80',
    accentText: '#1a2e1a',
    selectedBorder: '#4ade80',
    hoverBg: 'rgba(74, 222, 128, 0.1)',
    treeItemActive: 'rgba(74, 222, 128, 0.15)',
    inputBg: 'rgba(20, 40, 20, 0.9)',
    inputBorder: 'rgba(74, 222, 128, 0.3)',
    inputText: '#dcfce7',
    buttonBg: '#4ade80',
    buttonText: '#1a2e1a',
    shadow: '0 2px 12px rgba(74, 222, 128, 0.12)',
  },
};

export const userColors = [
  '#f472b6', '#fb923c', '#facc15', '#4ade80',
  '#22d3ee', '#818cf8', '#c084fc', '#f87171',
  '#a78bfa', '#34d399', '#fbbf24', '#60a5fa',
];

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return userColors[Math.abs(hash) % userColors.length];
}

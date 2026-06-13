import type { Theme, GradientColor } from '../types';

export const themes: Theme[] = [
  {
    id: 'midnight',
    name: '暗夜深蓝',
    background: '#1a1a2e',
    primary: '#e94560',
    secondary: '#0f3460',
    text: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.6)',
    cardBg: 'rgba(255,255,255,0.06)',
    cardBorder: 'rgba(255,255,255,0.1)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    gridColor: 'rgba(255,255,255,0.05)',
  },
  {
    id: 'amber',
    name: '暖阳琥珀',
    background: '#2d2418',
    primary: '#f59e0b',
    secondary: '#78350f',
    text: '#fef3c7',
    textSecondary: 'rgba(254,243,199,0.6)',
    cardBg: 'rgba(251,191,36,0.08)',
    cardBorder: 'rgba(251,191,36,0.15)',
    shadow: '0 8px 32px rgba(180,83,9,0.3)',
    fontFamily: "'Playfair Display', Georgia, serif",
    gridColor: 'rgba(251,191,36,0.06)',
  },
  {
    id: 'cyber',
    name: '赛博霓虹',
    background: '#0a0a0f',
    primary: '#00f5ff',
    secondary: '#ff00ff',
    text: '#ffffff',
    textSecondary: 'rgba(0,245,255,0.6)',
    cardBg: 'rgba(0,245,255,0.05)',
    cardBorder: 'rgba(0,245,255,0.2)',
    shadow: '0 0 40px rgba(0,245,255,0.2), 0 0 80px rgba(255,0,255,0.1)',
    fontFamily: "'Orbitron', 'Courier New', monospace",
    gridColor: 'rgba(0,245,255,0.08)',
  },
];

export const gradientColors: GradientColor[] = [
  { id: 'g1', name: '霓虹粉紫', value: 'linear-gradient(135deg, #ff00ff, #00f5ff)' },
  { id: 'g2', name: '日落橙红', value: 'linear-gradient(135deg, #ff6b35, #f7c59f)' },
  { id: 'g3', name: '海洋蓝绿', value: 'linear-gradient(135deg, #0077b6, #00b4d8)' },
  { id: 'g4', name: '森林翠绿', value: 'linear-gradient(135deg, #2d6a4f, #52b788)' },
  { id: 'g5', name: '烈焰红金', value: 'linear-gradient(135deg, #d00000, #ffba08)' },
  { id: 'g6', name: '梦幻紫蓝', value: 'linear-gradient(135deg, #7209b7, #3a0ca3)' },
  { id: 'g7', name: '暗夜黑金', value: 'linear-gradient(135deg, #1a1a2e, #e94560)' },
  { id: 'g8', name: '薄荷清新', value: 'linear-gradient(135deg, #06d6a0, #118ab2)' },
];

export const defaultTheme = themes[0];

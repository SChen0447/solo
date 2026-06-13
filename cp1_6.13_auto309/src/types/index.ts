export interface User {
  id: string;
  username: string;
  email: string;
}

export interface CapsuleData {
  id: string;
  userId: string;
  title: string;
  content: string;
  imageUrl?: string;
  musicUrl?: string;
  unlockDate: string;
  themeColor: string;
  createdAt: string;
  isOpened: boolean;
}

export interface ThemeColor {
  name: string;
  from: string;
  to: string;
  value: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { name: '樱花粉', from: '#ff9ff3', to: '#f368e0', value: 'sakura' },
  { name: '琥珀金', from: '#ffd700', to: '#ff8c00', value: 'amber' },
  { name: '海洋蓝', from: '#54a0ff', to: '#2e86de', value: 'ocean' },
  { name: '翡翠绿', from: '#5f27cd', to: '#341f97', value: 'jade' },
  { name: '落日橙', from: '#ff6b6b', to: '#ee5a24', value: 'sunset' },
  { name: '薄荷青', from: '#00d2d3', to: '#01a3a4', value: 'mint' },
  { name: '玫瑰红', from: '#ee5253', to: '#b33939', value: 'rose' },
  { name: '薰衣草', from: '#a29bfe', to: '#6c5ce7', value: 'lavender' },
  { name: '柠檬黄', from: '#feca57', to: '#ff9f43', value: 'lemon' },
  { name: '天空蓝', from: '#48dbfb', to: '#0abde3', value: 'sky' },
  { name: '森林绿', from: '#1dd1a1', to: '#10ac84', value: 'forest' },
  { name: '深邃紫', from: '#8e44ad', to: '#6c3483', value: 'deep' }
];

export const getThemeGradient = (value: string): { from: string; to: string } => {
  const color = THEME_COLORS.find(c => c.value === value);
  return color ? { from: color.from, to: color.to } : { from: '#ff9ff3', to: '#f368e0' };
};

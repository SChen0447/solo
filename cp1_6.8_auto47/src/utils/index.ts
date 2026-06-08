import { Template, ParticleConfig, WaveformType, FilterType } from '../types';

export const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3);
};

export const easeOutSine = (t: number): number => {
  return Math.sin((t * Math.PI) / 2);
};

export const linearInterpolation = (start: number, end: number, t: number): number => {
  return start + (end - start) * t;
};

export const lerpColor = (color1: string, color2: string, t: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return color1;

  const r = Math.round(linearInterpolation(c1.r, c2.r, t));
  const g = Math.round(linearInterpolation(c1.g, c2.g, t));
  const b = Math.round(linearInterpolation(c1.b, c2.b, t));

  return `rgb(${r}, ${g}, ${b})`;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

export const formatTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
};

export const frequencyToColor = (frequency: number, minFreq: number, maxFreq: number): string => {
  const normalized = (frequency - minFreq) / (maxFreq - minFreq);

  if (normalized < 0.33) {
    return '#9b59b6';
  } else if (normalized < 0.66) {
    return '#00ffaa';
  } else {
    return '#ffd700';
  }
};

export const getGradientColors = (value: number): { start: string; end: string } => {
  if (value < 0.33) {
    return { start: '#9b59b6', end: '#8e44ad' };
  } else if (value < 0.66) {
    return { start: '#00ffaa', end: '#00cc88' };
  } else {
    return { start: '#ffd700', end: '#ffaa00' };
  }
};

export const defaultParticleConfig: ParticleConfig = {
  count: 50,
  size: 3,
  speed: 2,
};

export const templates: Template[] = [
  {
    id: 'concert',
    name: '音乐会',
    waveformType: 'bar',
    filterType: 'neon',
    particleConfig: { count: 100, size: 4, speed: 3 },
    description: '震撼的舞台效果',
  },
  {
    id: 'nightclub',
    name: '夜店',
    waveformType: 'circular',
    filterType: 'neon',
    particleConfig: { count: 150, size: 2, speed: 5 },
    description: '迷幻的夜店氛围',
  },
  {
    id: 'meditation',
    name: '冥想',
    waveformType: 'curve',
    filterType: 'watercolor',
    particleConfig: { count: 30, size: 5, speed: 1 },
    description: '宁静的冥想体验',
  },
  {
    id: 'tech',
    name: '科技感',
    waveformType: 'bar',
    filterType: 'pixel',
    particleConfig: { count: 80, size: 2, speed: 4 },
    description: '未来科技风格',
  },
  {
    id: 'retro',
    name: '复古风',
    waveformType: 'curve',
    filterType: 'vintage',
    particleConfig: { count: 40, size: 3, speed: 2 },
    description: '怀旧复古风格',
  },
];

export const waveformTypes: { type: WaveformType; label: string; icon: string }[] = [
  { type: 'bar', label: '条形频谱', icon: '▮▯▮' },
  { type: 'curve', label: '平滑曲线', icon: '〰' },
  { type: 'circular', label: '圆形放射', icon: '◎' },
];

export const filterTypes: { type: FilterType; label: string }[] = [
  { type: 'none', label: '无滤镜' },
  { type: 'neon', label: '霓虹辉光' },
  { type: 'vintage', label: '老电影颗粒' },
  { type: 'watercolor', label: '水彩扩散' },
  { type: 'liquid', label: '液态金属' },
  { type: 'pixel', label: '像素抖动' },
];

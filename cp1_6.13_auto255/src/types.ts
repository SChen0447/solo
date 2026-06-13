import * as THREE from 'three';

export interface WordData {
  id: number;
  text: string;
  mesh: THREE.Mesh;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  baseSize: number;
  rotationSpeed: number;
  rotationAxis: THREE.Vector3;
  spiralAngle: number;
  spiralRadius: number;
  spiralHeight: number;
  spiralSpeed: number;
  isAbsorbed: boolean;
  absorbedIndex: number;
  blinkTimer: number;
  blinkPeriod: number;
  isBlinking: boolean;
  mixedColor: THREE.Color | null;
  mixedColorTimer: number;
  originalPosition: THREE.Vector3;
  originalRotation: THREE.Euler;
}

export interface StarPoint {
  mesh: THREE.Mesh;
  pulseTimer: number;
  pulsePeriod: number;
  baseOpacity: number;
}

export interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

export interface LightBeam {
  line: THREE.Line;
  progress: number;
  targetColor: THREE.Color;
  active: boolean;
}

export const COLORS = [
  '#ff6b6b',
  '#48dbfb',
  '#feca57',
  '#ff9ff3',
  '#54a0ff',
  '#a29bfe'
];

export const CHINESE_CHARS = [
  '梦', '星', '海', '光', '云', '风', '雨', '雪', '花', '月',
  '山', '水', '天', '地', '人', '心', '思', '念', '情', '意',
  '诗', '书', '画', '琴', '棋', '剑', '茶', '酒', '歌', '舞',
  '春', '夏', '秋', '冬', '晨', '昏', '昼', '夜', '明', '暗',
  '生', '灭', '起', '落', '开', '合', '聚', '散', '来', '去',
  '空', '幻', '真', '假', '虚', '实', '动', '静', '急', '缓',
  '清', '浊', '深', '浅', '高', '低', '远', '近', '前', '后',
  '智', '慧', '仁', '义', '礼', '信', '道', '德', '法', '术',
  '龙', '凤', '虎', '豹', '鹤', '鹰', '蝶', '蜂', '鱼', '雁',
  '金', '木', '水', '火', '土', '风', '雷', '电', '冰', '霜'
];

export const ENGLISH_WORDS = [
  'dream', 'star', 'ocean', 'light', 'cloud',
  'wind', 'rain', 'snow', 'flower', 'moon',
  'mountain', 'river', 'sky', 'earth', 'soul',
  'heart', 'mind', 'thought', 'memory', 'time',
  'space', 'infinity', 'eternity', 'silence', 'sound',
  'poetry', 'wisdom', 'truth', 'beauty', 'grace',
  'harmony', 'balance', 'peace', 'joy', 'sorrow',
  'hope', 'faith', 'courage', 'freedom', 'destiny',
  'cosmos', 'galaxy', 'nebula', 'quantum', 'spirit',
  'mystery', 'wonder', 'magic', 'illusion', 'reality'
];

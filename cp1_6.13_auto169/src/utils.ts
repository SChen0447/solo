export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
};

export const rgbToHex = (rgb: RGB): string => {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
};

export const lerpColor = (colorA: string, colorB: string, t: number): string => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  return rgbToHex({
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t)
  });
};

export const easeOutElastic = (t: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
};

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const normalizeAngle = (angle: number): number => {
  let result = angle % 360;
  if (result < 0) result += 360;
  return result;
};

export const shortestAngleDiff = (from: number, to: number): number => {
  let diff = to - from;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return diff;
};

export const springAnimation = (
  current: number,
  target: number,
  velocity: number,
  stiffness: number,
  damping: number
): { position: number; velocity: number } => {
  const force = -stiffness * (current - target);
  const dampingForce = -damping * velocity;
  const acceleration = force + dampingForce;
  const newVelocity = velocity + acceleration;
  const newPosition = current + newVelocity;
  return { position: newPosition, velocity: newVelocity };
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

export const getAngleFromCenter = (
  cx: number,
  cy: number,
  x: number,
  y: number
): number => {
  const angle = radToDeg(Math.atan2(y - cy, x - cx));
  return normalizeAngle(angle);
};

export const randomRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export interface RuneData {
  name: string;
  symbol: string;
  color: string;
  constellation: string;
  myth: string;
}

export const RUNES: RuneData[] = [
  { name: 'Fehu', symbol: 'ᚠ', color: '#ff8c42', constellation: '金羊座', myth: '财富与丰饶之符，象征初升的朝阳与新生的希望。' },
  { name: 'Uruz', symbol: 'ᚢ', color: '#8b4513', constellation: '野牛座', myth: '力量与勇气之符，代表原始的生命力与坚韧的意志。' },
  { name: 'Thurisaz', symbol: 'ᚦ', color: '#4a4a8a', constellation: '雷神座', myth: '巨人与雷神之符，蕴含破坏与重生的双重力量。' },
  { name: 'Ansuz', symbol: 'ᚨ', color: '#4169e1', constellation: '信使座', myth: '智慧与沟通之符，承载着众神的启示与古老的智慧。' },
  { name: 'Raido', symbol: 'ᚱ', color: '#8b0000', constellation: '旅者座', myth: '旅途与前行之符，指引迷途者找到正确的道路。' },
  { name: 'Kaunan', symbol: 'ᚲ', color: '#ff4500', constellation: '火炬座', myth: '火焰与光明之符，在黑暗中点燃希望的火种。' },
  { name: 'Gebo', symbol: 'ᚷ', color: '#9932cc', constellation: '双生座', myth: '礼物与交换之符，象征给予与接受的神圣平衡。' },
  { name: 'Wunjo', symbol: 'ᚹ', color: '#ffd700', constellation: '喜乐座', myth: '喜悦与和谐之符，带来心灵的宁静与无上的幸福。' },
  { name: 'Hagalaz', symbol: 'ᚺ', color: '#87ceeb', constellation: '冰雹座', myth: '破坏与转变之符，如冰雹般击碎旧有的束缚。' },
  { name: 'Nauthiz', symbol: 'ᚾ', color: '#556b2f', constellation: '桎梏座', myth: '需求与忍耐之符，在困境中锻造真正的力量。' },
  { name: 'Isa', symbol: 'ᛁ', color: '#e0ffff', constellation: '寒冰座', myth: '静止与冰封之符，时间在其面前也会凝固停滞。' },
  { name: 'Tiwaz', symbol: 'ᛏ', color: '#ff4d4d', constellation: '战神座', myth: '正义与胜利之符，指引战士走向荣耀的战场。' }
];

export const noteFrequency = (semitone: number): number => {
  const baseFreq = 261.63;
  return baseFreq * Math.pow(2, semitone / 12);
};

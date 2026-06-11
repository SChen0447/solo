export interface StarPoint {
  x: number;
  y: number;
}

export interface ConstellationData {
  id: number;
  latin: string;
  chinese: string;
  abbr: string;
  targetAngle: number;
  stars: StarPoint[];
  connections: [number, number][];
}

const constellations: ConstellationData[] = [
  {
    id: 0,
    latin: 'Aries',
    chinese: '白羊座',
    abbr: 'ARI',
    targetAngle: 0,
    stars: [
      { x: 0.35, y: 0.25 },
      { x: 0.40, y: 0.35 },
      { x: 0.45, y: 0.30 },
      { x: 0.50, y: 0.40 },
      { x: 0.48, y: 0.50 },
      { x: 0.42, y: 0.45 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]],
  },
  {
    id: 1,
    latin: 'Taurus',
    chinese: '金牛座',
    abbr: 'TAU',
    targetAngle: 30,
    stars: [
      { x: 0.30, y: 0.30 },
      { x: 0.38, y: 0.35 },
      { x: 0.50, y: 0.32 },
      { x: 0.55, y: 0.42 },
      { x: 0.48, y: 0.50 },
      { x: 0.40, y: 0.48 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]],
  },
  {
    id: 2,
    latin: 'Gemini',
    chinese: '双子座',
    abbr: 'GEM',
    targetAngle: 60,
    stars: [
      { x: 0.35, y: 0.20 },
      { x: 0.55, y: 0.22 },
      { x: 0.38, y: 0.38 },
      { x: 0.52, y: 0.40 },
      { x: 0.42, y: 0.52 },
      { x: 0.50, y: 0.54 },
    ],
    connections: [[0, 2], [2, 4], [1, 3], [3, 5], [0, 1], [4, 5]],
  },
  {
    id: 3,
    latin: 'Cancer',
    chinese: '巨蟹座',
    abbr: 'CAN',
    targetAngle: 90,
    stars: [
      { x: 0.42, y: 0.25 },
      { x: 0.50, y: 0.30 },
      { x: 0.55, y: 0.38 },
      { x: 0.48, y: 0.45 },
      { x: 0.40, y: 0.50 },
      { x: 0.45, y: 0.55 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 4,
    latin: 'Leo',
    chinese: '狮子座',
    abbr: 'LEO',
    targetAngle: 120,
    stars: [
      { x: 0.32, y: 0.28 },
      { x: 0.40, y: 0.22 },
      { x: 0.48, y: 0.28 },
      { x: 0.52, y: 0.40 },
      { x: 0.45, y: 0.50 },
      { x: 0.35, y: 0.42 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 5,
    latin: 'Virgo',
    chinese: '处女座',
    abbr: 'VIR',
    targetAngle: 150,
    stars: [
      { x: 0.38, y: 0.20 },
      { x: 0.45, y: 0.32 },
      { x: 0.52, y: 0.28 },
      { x: 0.48, y: 0.42 },
      { x: 0.42, y: 0.52 },
      { x: 0.36, y: 0.45 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]],
  },
  {
    id: 6,
    latin: 'Libra',
    chinese: '天秤座',
    abbr: 'LIB',
    targetAngle: 180,
    stars: [
      { x: 0.35, y: 0.30 },
      { x: 0.50, y: 0.25 },
      { x: 0.55, y: 0.38 },
      { x: 0.50, y: 0.50 },
      { x: 0.40, y: 0.50 },
      { x: 0.35, y: 0.40 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 7,
    latin: 'Scorpio',
    chinese: '天蝎座',
    abbr: 'SCO',
    targetAngle: 210,
    stars: [
      { x: 0.30, y: 0.35 },
      { x: 0.38, y: 0.28 },
      { x: 0.46, y: 0.32 },
      { x: 0.52, y: 0.40 },
      { x: 0.55, y: 0.50 },
      { x: 0.48, y: 0.55 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 8,
    latin: 'Sagittarius',
    chinese: '射手座',
    abbr: 'SGR',
    targetAngle: 240,
    stars: [
      { x: 0.40, y: 0.22 },
      { x: 0.50, y: 0.28 },
      { x: 0.45, y: 0.38 },
      { x: 0.52, y: 0.48 },
      { x: 0.42, y: 0.52 },
      { x: 0.35, y: 0.42 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]],
  },
  {
    id: 9,
    latin: 'Capricorn',
    chinese: '摩羯座',
    abbr: 'CAP',
    targetAngle: 270,
    stars: [
      { x: 0.32, y: 0.32 },
      { x: 0.42, y: 0.25 },
      { x: 0.52, y: 0.30 },
      { x: 0.55, y: 0.42 },
      { x: 0.48, y: 0.52 },
      { x: 0.38, y: 0.48 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 10,
    latin: 'Aquarius',
    chinese: '水瓶座',
    abbr: 'AQR',
    targetAngle: 300,
    stars: [
      { x: 0.38, y: 0.25 },
      { x: 0.48, y: 0.22 },
      { x: 0.52, y: 0.35 },
      { x: 0.45, y: 0.45 },
      { x: 0.38, y: 0.52 },
      { x: 0.32, y: 0.42 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 11,
    latin: 'Pisces',
    chinese: '双鱼座',
    abbr: 'PSC',
    targetAngle: 330,
    stars: [
      { x: 0.30, y: 0.38 },
      { x: 0.38, y: 0.28 },
      { x: 0.48, y: 0.30 },
      { x: 0.55, y: 0.38 },
      { x: 0.50, y: 0.50 },
      { x: 0.40, y: 0.52 },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
];

export default constellations;

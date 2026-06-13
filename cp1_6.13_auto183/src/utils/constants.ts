export const STAR_COLORS = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcbff',
  '#a66cff',
  '#ff9f43',
  '#48dbfb',
  '#ff9ff3',
  '#54a0ff',
  '#5f27cd',
  '#00d2d3',
  '#ff6b81',
  '#7bed9f',
  '#70a1ff',
  '#eccc68',
  '#ff7f50',
  '#a29bfe',
  '#fd79a8',
  '#81ecec',
  '#fab1a0',
  '#81c784',
  '#ba68c8',
  '#4fc3f7',
  '#ffb74d',
  '#ef5350',
];

export const getRandomColor = (): string => {
  return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
};

export const getRandomSize = (): number => {
  return 30 + Math.random() * 20;
};

export const getRandomTwinklePeriod = (): number => {
  return 1.5 + Math.random() * 1.5;
};

export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

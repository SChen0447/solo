export interface ConstellationType {
  id: string;
  name: string;
  symbol: string;
  color: string;
  glowColor: string;
  unlockAt: number;
}

export const CONSTELLATION_TYPES: ConstellationType[] = [
  { id: 'aries', name: '白羊座', symbol: '♈', color: '#ff6b6b', glowColor: '#ff6b6b', unlockAt: 5 },
  { id: 'taurus', name: '金牛座', symbol: '♉', color: '#feca57', glowColor: '#feca57', unlockAt: 10 },
  { id: 'gemini', name: '双子座', symbol: '♊', color: '#48dbfb', glowColor: '#48dbfb', unlockAt: 15 },
  { id: 'cancer', name: '巨蟹座', symbol: '♋', color: '#a29bfe', glowColor: '#a29bfe', unlockAt: 20 },
  { id: 'leo', name: '狮子座', symbol: '♌', color: '#ff9ff3', glowColor: '#ff9ff3', unlockAt: 25 },
  { id: 'virgo', name: '处女座', symbol: '♍', color: '#1dd1a1', glowColor: '#1dd1a1', unlockAt: 30 },
  { id: 'libra', name: '天秤座', symbol: '♎', color: '#54a0ff', glowColor: '#54a0ff', unlockAt: 35 },
  { id: 'scorpio', name: '天蝎座', symbol: '♏', color: '#ee5a24', glowColor: '#ee5a24', unlockAt: 40 },
];

export const WISH_TEXTS = [
  '愿星辰指引你的道路，照亮前行的每一步。',
  '在这浩瀚星海中，你的愿望已被听见。',
  '星光不负赶路人，时光不负有心人。',
  '每一颗流星都是天空落下的祝福。',
  '愿你所念皆星河，所愿皆成真。',
  '星座的光芒，将守护你心中最柔软的地方。',
  '许下的愿望，会在繁星闪烁处悄悄发芽。',
  '夜空中最亮的星，正在回应你的祈祷。',
  '把心愿交给流星，让它带向遥远的星系。',
  '星光漫过指尖，愿望在今夜绽放。',
  '银河万里，不及你心中的光芒万丈。',
  '当流星划过天际，幸运已悄然降临。',
];

export function getUnlockedConstellations(collectCount: number): ConstellationType[] {
  return CONSTELLATION_TYPES.filter(c => collectCount >= c.unlockAt);
}

export function getConstellationColors(collectCount: number): string[] {
  const unlocked = getUnlockedConstellations(collectCount);
  if (unlocked.length === 0) {
    return ['#88aaff', '#aaccff'];
  }
  return unlocked.map(c => c.color);
}

export function generateWishText(collectCount: number): string {
  const unlocked = getUnlockedConstellations(collectCount);
  const baseIndex = Math.floor(Math.random() * WISH_TEXTS.length);
  let wish = WISH_TEXTS[baseIndex];
  
  if (unlocked.length > 0) {
    const randomConstellation = unlocked[Math.floor(Math.random() * unlocked.length)];
    wish = `【${randomConstellation.name}的祝福】${wish}`;
  }
  
  return wish;
}

export function getBottleGlowIntensity(collectCount: number, maxCount: number): number {
  const ratio = Math.min(collectCount / maxCount, 1);
  return 0.3 + ratio * 0.7;
}

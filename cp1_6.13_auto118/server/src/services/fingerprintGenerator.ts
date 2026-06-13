import { v4 as uuidv4 } from 'uuid';
import { Fingerprint, ColorScheme, FingerprintThumbnail } from '../types';

const warmColors: ColorScheme[] = [
  { primary: '#FF6B35', secondary: '#F7931E', isWarm: true },
  { primary: '#FF4081', secondary: '#E91E63', isWarm: true },
  { primary: '#FFAB40', secondary: '#FF9100', isWarm: true },
  { primary: '#FF5252', secondary: '#FF1744', isWarm: true },
  { primary: '#FFD740', secondary: '#FFAB00', isWarm: true },
];

const coolColors: ColorScheme[] = [
  { primary: '#00E5FF', secondary: '#00B8D4', isWarm: false },
  { primary: '#D500F9', secondary: '#AA00FF', isWarm: false },
  { primary: '#69F0AE', secondary: '#00E676', isWarm: false },
  { primary: '#448AFF', secondary: '#2979FF', isWarm: false },
  { primary: '#B388FF', secondary: '#7C4DFF', isWarm: false },
];

const shapeTypes: Array<'polygon' | 'spiral' | 'circle' | 'wave'> = ['polygon', 'spiral', 'circle', 'wave'];

const poems = [
  '风过无痕，声留印记',
  '月光倾泻，心语成诗',
  '山河入梦，余音绕梁',
  '星辰闪烁，低语如潮',
  '落花流水，情深似海',
  '云卷云舒，往事如烟',
  '青山不语，流水长歌',
  '灯火阑珊，思念如织',
];

const randomTexts = [
  '这是我深夜的独白。',
  '希望有人能听懂我的声音。',
  '记录此刻的心情，留给未来。',
  '一段秘密，等你来发现。',
  '声音是灵魂的指纹。',
  '愿我们在声音的世界里相遇。',
];

const sampleVoiceTexts = [
  '床前明月光，疑是地上霜',
  '春眠不觉晓，处处闻啼鸟',
  '白日依山尽，黄河入海流',
  '红豆生南国，春来发几枝',
  '海内存知己，天涯若比邻',
  '但愿人长久，千里共婵娟',
];

const fakeOptions = [
  '举头望明月，低头思故乡',
  '夜来风雨声，花落知多少',
  '欲穷千里目，更上一层楼',
  '劝君更尽一杯酒，西出阳关无故人',
  '桃花潭水深千尺，不及汪伦送我情',
  '人生若只如初见，何事秋风悲画扇',
];

const fingerprintStore = new Map<string, Fingerprint>();
const userUploadedIds: string[] = [];
const userLikedIds: string[] = [];

function generateShapePoints(shapeType: string, seed: number): number[] {
  const points: number[] = [];
  const count = shapeType === 'polygon' ? 6 + (seed % 3) : shapeType === 'spiral' ? 12 : shapeType === 'wave' ? 8 : 20;
  for (let i = 0; i < count; i++) {
    const base = 0.6 + ((seed * (i + 1) * 7) % 100) / 300;
    const variance = ((seed * (i + 2) * 13) % 100) / 500;
    points.push(Math.min(1.2, Math.max(0.3, base + variance - 0.1)));
  }
  return points;
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

export function generateFingerprint(audioBuffer?: Buffer, customText?: string): Fingerprint {
  const seed = Math.floor(Math.random() * 10000);
  const id = uuidv4();
  const shapeType = pickRandom(shapeTypes, seed);
  const isWarm = seed % 2 === 0;
  const colorScheme = isWarm ? pickRandom(warmColors, seed) : pickRandom(coolColors, seed);
  const pulseSpeed = 0.5 + (seed % 150) / 100;
  const originalText = customText || pickRandom(sampleVoiceTexts, seed);
  const poemText = pickRandom(poems, seed + 3);
  const anonymousText = pickRandom(randomTexts, seed + 7);

  const allOptions = [...fakeOptions];
  const correctIndex = seed % 3;
  const guessOptions: string[] = [];
  for (let i = 0; i < 3; i++) {
    if (i === correctIndex) {
      guessOptions.push(originalText);
    } else {
      const fakeIdx = (seed + i * 11) % allOptions.length;
      guessOptions.push(allOptions[fakeIdx]);
    }
  }

  const fingerprint: Fingerprint = {
    id,
    shapeType,
    shapePoints: generateShapePoints(shapeType, seed),
    colorScheme,
    pulseSpeed,
    poemText,
    anonymousText,
    audioPath: `/api/audio/${id}`,
    likes: 0,
    createdAt: Date.now(),
    originalText,
    guessOptions,
  };

  fingerprintStore.set(id, fingerprint);
  userUploadedIds.unshift(id);
  return fingerprint;
}

export function getFingerprint(id: string): Fingerprint | undefined {
  return fingerprintStore.get(id);
}

export function getAllFingerprintThumbnails(): FingerprintThumbnail[] {
  return Array.from(fingerprintStore.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((fp) => ({
      id: fp.id,
      shapeType: fp.shapeType,
      primaryColor: fp.colorScheme.primary,
      shapePoints: fp.shapePoints,
      likes: fp.likes,
    }));
}

export function checkGuess(fingerprintId: string, selectedOption: string): { correct: boolean; fingerprint?: Fingerprint } {
  const fp = fingerprintStore.get(fingerprintId);
  if (!fp) return { correct: false };
  if (fp.originalText === selectedOption) {
    return { correct: true, fingerprint: fp };
  }
  return { correct: false };
}

export function likeFingerprint(id: string): boolean {
  const fp = fingerprintStore.get(id);
  if (!fp) return false;
  fp.likes += 1;
  if (!userLikedIds.includes(id)) {
    userLikedIds.unshift(id);
  }
  return true;
}

export function getProfileData() {
  const uploaded = userUploadedIds.map((id) => fingerprintStore.get(id)).filter(Boolean) as Fingerprint[];
  const liked = userLikedIds.map((id) => fingerprintStore.get(id)).filter(Boolean) as Fingerprint[];
  return { uploaded, liked };
}

export function seedInitialData() {
  for (let i = 0; i < 8; i++) {
    generateFingerprint();
  }
}

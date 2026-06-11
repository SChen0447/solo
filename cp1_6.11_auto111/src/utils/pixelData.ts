import { v4 as uuidv4 } from 'uuid';
import { PixelData, PixelCard, CLASSIC_8BIT_COLORS, CANVAS_SIZE } from '../types';

export function createEmptyPixelData(size: number = CANVAS_SIZE): PixelData {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'transparent')
  );
}

export function serializePixelData(data: PixelData): string {
  return JSON.stringify(data);
}

export function deserializePixelData(str: string): PixelData {
  try {
    return JSON.parse(str);
  } catch {
    return createEmptyPixelData();
  }
}

export function getRandomColor(): string {
  return CLASSIC_8BIT_COLORS[Math.floor(Math.random() * CLASSIC_8BIT_COLORS.length)];
}

export function generateCardId(): string {
  return uuidv4();
}

export function generateUserId(): string {
  return uuidv4();
}

const randomNames = [
  '像素小猫', '方块达人', '点阵精灵', '色彩法师', '涂鸦客',
  '像素旅人', '彩虹画匠', '迷幻绘师', '马赛克君', '像素骑士',
  '星点画师', '梦境像素', '光速涂鸦', '影格刺客', '幻彩笔客'
];

export function generateRandomName(): string {
  return randomNames[Math.floor(Math.random() * randomNames.length)] +
    Math.floor(Math.random() * 1000);
}

export function randomGridPosition(): { x: number; y: number } {
  const range = 20;
  return {
    x: Math.floor(Math.random() * range * 2) - range,
    y: Math.floor(Math.random() * range * 2) - range
  };
}

export function createPixelCard(
  pixelData: PixelData,
  authorId: string,
  authorName: string
): PixelCard {
  const pos = randomGridPosition();
  return {
    id: generateCardId(),
    authorId,
    authorName,
    pixelData,
    likes: 0,
    createdAt: Date.now(),
    gridX: pos.x,
    gridY: pos.y
  };
}

export function generateMockCards(count: number, userId: string, userName: string): PixelCard[] {
  const cards: PixelCard[] = [];
  for (let i = 0; i < count; i++) {
    const data = createEmptyPixelData();
    for (let y = 0; y < CANVAS_SIZE; y++) {
      for (let x = 0; x < CANVAS_SIZE; x++) {
        if (Math.random() > 0.7) {
          data[y][x] = getRandomColor();
        }
      }
    }
    const card = createPixelCard(data, userId, userName);
    card.likes = Math.floor(Math.random() * 50);
    cards.push(card);
  }
  return cards;
}

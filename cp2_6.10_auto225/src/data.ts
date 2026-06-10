import type { Sticker, User, ExchangeRequest, AppState } from './types';
import { v4 as uuidv4 } from 'uuid';

const stickerNames = [
  '樱花飘落', '星月夜', '午后猫咪', '复古邮票', '小雏菊',
  '云朵城堡', '海洋贝壳', '森林小鹿', '彩虹桥', '糖果屋',
  '蝴蝶花园', '月光兔子', '热气球之旅', '柠檬汽水', '薄荷叶子',
  '咖啡馆', '极光之夜', '仙人掌', '水晶球', '棉花糖',
  '风车小镇', '薰衣草田', '企鹅家族', '星空之梦', '草莓蛋糕',
  '独角兽', '向日葵', '樱花寿司', '雨中漫步', '萤火虫',
  '巧克力工厂', '太空探险', '海底世界', '南瓜马车', '魔法书',
  '樱花树下', '小熊维尼', '冬日雪景', '夏日海滩', '秋叶飘零',
  '水晶鞋', '精灵之翼', '糖果手杖', '梦幻花园', '星空许愿',
  '蛋糕工坊', '彩虹独角兽', '月光森林', '樱花日记', '幸运四叶草'
];

const imageColors = [
  '#f8bbd0', '#c5cae9', '#b3e5fc', '#ffe0b2', '#c8e6c9',
  '#e1bee7', '#b2ebf2', '#dcedc8', '#ffecb3', '#f0f4c3',
  '#f48fb1', '#9fa8da', '#81d4fa', '#ffcc80', '#a5d6a7',
  '#ce93d8', '#80deea', '#ffd54f', '#e6ee9c', '#90caf9',
  '#ffab91', '#b0bec5', '#80cbc4', '#ff8a65', '#a1887f'
];

export const stickers: Sticker[] = stickerNames.map((name, index) => {
  let rarity: 'common' | 'rare' | 'legendary';
  if (index % 10 < 6) rarity = 'common';
  else if (index % 10 < 9) rarity = 'rare';
  else rarity = 'legendary';

  return {
    id: `sticker-${index + 1}`,
    name,
    rarity,
    description: `${name}贴纸，精美印刷，限量收藏。`,
    imageColor: imageColors[index % imageColors.length]
  };
});

export const users: User[] = [
  { id: 'user-1', name: '我', avatar: '👩' },
  { id: 'user-2', name: '小樱', avatar: '🌸' },
  { id: 'user-3', name: '阿星', avatar: '⭐' },
  { id: 'user-4', name: '喵喵', avatar: '🐱' },
  { id: 'user-5', name: '糖糖', avatar: '🍬' }
];

export const currentUser: User = users[0];

const now = new Date();

export const initialCollectedIds: string[] = [
  'sticker-1', 'sticker-3', 'sticker-5', 'sticker-7', 'sticker-10',
  'sticker-12', 'sticker-15', 'sticker-17', 'sticker-20', 'sticker-22',
  'sticker-25', 'sticker-27', 'sticker-30', 'sticker-33', 'sticker-35',
  'sticker-37', 'sticker-40', 'sticker-42', 'sticker-45', 'sticker-47',
  'sticker-50'
];

export const initialExchangeRequests: ExchangeRequest[] = [
  {
    id: uuidv4(),
    fromUserId: 'user-2',
    toUserId: 'user-1',
    offeredStickerId: 'sticker-2',
    requestedStickerId: 'sticker-1',
    status: 'pending',
    logistics: [],
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: uuidv4(),
    fromUserId: 'user-1',
    toUserId: 'user-3',
    offeredStickerId: 'sticker-10',
    requestedStickerId: 'sticker-8',
    status: 'shipping',
    logistics: [
      {
        stage: 'sent',
        time: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        note: '已寄出，快递单号：SF1234567890'
      }
    ],
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString()
  },
  {
    id: uuidv4(),
    fromUserId: 'user-1',
    toUserId: 'user-4',
    offeredStickerId: 'sticker-22',
    requestedStickerId: 'sticker-19',
    status: 'completed',
    logistics: [
      {
        stage: 'sent',
        time: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
        note: '已寄出'
      },
      {
        stage: 'in_transit',
        time: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        note: '运输中，已到达中转站'
      },
      {
        stage: 'delivered',
        time: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        note: '已签收，交换成功！'
      }
    ],
    createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 80).toISOString()
  }
];

export const initialAppState: AppState = {
  currentUser,
  stickers,
  collectedStickerIds: initialCollectedIds,
  exchangeRequests: initialExchangeRequests,
  users
};

export type Rarity = 'common' | 'rare' | 'legendary';

export type ExchangeStatus = 'pending' | 'shipping' | 'completed' | 'rejected';

export type LogisticsStage = 'sent' | 'in_transit' | 'delivered';

export interface Sticker {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  imageColor: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
}

export interface LogisticsRecord {
  stage: LogisticsStage;
  time: string;
  note: string;
}

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  offeredStickerId: string;
  requestedStickerId: string;
  status: ExchangeStatus;
  logistics: LogisticsRecord[];
  createdAt: string;
}

export interface AppState {
  currentUser: User;
  stickers: Sticker[];
  collectedStickerIds: string[];
  exchangeRequests: ExchangeRequest[];
  users: User[];
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#8bc34a',
  rare: '#ff9800',
  legendary: '#e91e63'
};

export const RARITY_LABELS: Record<Rarity, string> = {
  common: '常见',
  rare: '稀有',
  legendary: '传说'
};

export const EXCHANGE_STATUS_COLORS: Record<ExchangeStatus, string> = {
  pending: '#ffa726',
  shipping: '#42a5f5',
  completed: '#66bb6a',
  rejected: '#ef5350'
};

export const EXCHANGE_STATUS_LABELS: Record<ExchangeStatus, string> = {
  pending: '待确认',
  shipping: '运输中',
  completed: '已完成',
  rejected: '已拒绝'
};

export const LOGISTICS_STAGE_LABELS: Record<LogisticsStage, string> = {
  sent: '已寄出',
  in_transit: '运输中',
  delivered: '已签收'
};

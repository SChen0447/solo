export type CardColor = '#FFB3BA' | '#BAE1FF' | '#BAFFC9' | '#FFE49A';

export const CARD_COLORS: CardColor[] = ['#FFB3BA', '#BAE1FF', '#BAFFC9', '#FFE49A'];

export interface Card {
  id: string;
  x: number;
  y: number;
  content: string;
  color: CardColor;
  width: number;
  height: number;
  editingBy?: string;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
}

export interface User {
  id: string;
  color: string;
  name: string;
  cursorX?: number;
  cursorY?: number;
  editingCardId?: string;
}

export type WSMessageType =
  | 'card:create'
  | 'card:update'
  | 'card:delete'
  | 'card:position'
  | 'connection:create'
  | 'connection:delete'
  | 'user:join'
  | 'user:leave'
  | 'user:cursor'
  | 'card:edit-start'
  | 'card:edit-end'
  | 'state:init';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  senderId: string;
  timestamp: number;
  data: T;
}

export interface ConflictMessageData {
  cardId: string;
  conflict: boolean;
  message: string;
}

export interface InitStateData {
  cards: Card[];
  connections: Connection[];
  users: User[];
  currentUserId: string;
}

export const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

export const getRandomColor = (): CardColor => {
  return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)];
};

export const getRandomUserColor = (): string => {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
};

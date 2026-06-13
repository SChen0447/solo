export type Genre = '爵士' | '电子' | '民谣' | '古典' | '摇滚';

export const GENRES: Genre[] = ['爵士', '电子', '民谣', '古典', '摇滚'];

export interface AlbumListItem {
  id: string;
  coverUrl: string;
  coverColors: [string, string, string];
  genre: Genre;
}

export interface AlbumDetail {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  coverColors: [string, string, string];
  audioUrl: string;
  audioDuration: number;
  options: Genre[];
  correctGenre: Genre;
  year: number;
  description: string;
}

export interface Sticker {
  id: string;
  albumId: string;
  albumTitle: string;
  genre: Genre;
  unlockedAt: number;
  colors: [string, string];
}

export interface User {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  unlockedStickers: Sticker[];
  tradePackages: TradePackage[];
}

export interface TradePackage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  stickers: Sticker[];
  createdAt: number;
  status: 'open' | 'trading' | 'completed';
  selectedBy?: string;
}

export interface LeaderboardEntry {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  rank: number;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface StickerResult {
  score: number;
  scoreChange: number;
  correct: boolean;
  correctGenre: Genre;
  sticker: Sticker | null;
}

export interface TradeResult {
  success: boolean;
  newScore: number;
  receivedStickers: Sticker[];
  fromUser: {
    id: string;
    name: string;
    avatar: string;
  };
}

export type PageKey = 'home' | 'profile' | 'market' | 'leaderboard';

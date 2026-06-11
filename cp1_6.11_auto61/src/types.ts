export interface Stock {
  id: string;
  code: string;
  name: string;
  price: number;
  prevClose: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
}

export interface KLineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PortfolioItem {
  stockId: string;
  stockCode: string;
  stockName: string;
  quantity: number;
  avgCost: number;
  currentPrice: number;
}

export interface User {
  id: string;
  roomId: string;
  nickname: string;
  balance: number;
  initialBalance: number;
  portfolio: PortfolioItem[];
  totalAssets: number;
  returnRate: number;
  prevRank?: number;
}

export interface RankingItem {
  userId: string;
  nickname: string;
  totalAssets: number;
  returnRate: number;
  rank: number;
  prevRank?: number;
}

export interface Transaction {
  id: string;
  userId: string;
  roomId: string;
  stockId: string;
  stockCode: string;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  amount: number;
  timestamp: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

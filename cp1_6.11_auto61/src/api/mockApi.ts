import axios from 'axios';
import type { Stock, User, Transaction, RankingItem, KLineData, PortfolioItem } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateId = () => Math.random().toString(36).substring(2, 15);

let stocksCache: Stock[] = [];
let klineCache: Record<string, KLineData[]> = {};

export const mockApi = {
  async getStocks(): Promise<Stock[]> {
    await delay(200);
    if (stocksCache.length > 0) return stocksCache;
    const { data } = await api.get<Stock[]>('/stocks');
    stocksCache = data;
    return data;
  },

  async getStock(id: string): Promise<Stock | undefined> {
    await delay(200);
    const stocks = await this.getStocks();
    return stocks.find(s => s.id === id);
  },

  async getKline(stockId: string): Promise<KLineData[]> {
    await delay(100);
    if (klineCache[stockId]) return klineCache[stockId];
    const { data } = await api.get<Record<string, KLineData[]>>('/kline');
    const kline = (data as any)[stockId] || generateInitialKline(stockId);
    klineCache[stockId] = kline;
    return kline;
  },

  async getRanking(roomId: string): Promise<RankingItem[]> {
    await delay(200);
    const { data } = await api.get<User[]>(`/users?roomId=${roomId}`);
    const sorted = [...data].sort((a, b) => b.returnRate - a.returnRate);
    return sorted.map((user, index) => ({
      userId: user.id,
      nickname: user.nickname,
      totalAssets: user.totalAssets,
      returnRate: user.returnRate,
      rank: index + 1,
      prevRank: user.prevRank,
    }));
  },

  async getUser(userId: string): Promise<User> {
    await delay(200);
    const { data } = await api.get<User>(`/users/${userId}`);
    return data;
  },

  async createUser(roomId: string, nickname: string): Promise<User> {
    await delay(200);
    const newUser: User = {
      id: generateId(),
      roomId,
      nickname,
      balance: 100000,
      initialBalance: 100000,
      portfolio: [],
      totalAssets: 100000,
      returnRate: 0,
    };
    const { data } = await api.post<User>('/users', newUser);
    return data;
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    await delay(200);
    const { data } = await api.patch<User>(`/users/${userId}`, updates);
    return data;
  },

  async createTransaction(
    userId: string,
    roomId: string,
    stockId: string,
    stockCode: string,
    type: 'BUY' | 'SELL',
    price: number,
    quantity: number
  ): Promise<Transaction> {
    await delay(200);
    const transaction: Transaction = {
      id: generateId(),
      userId,
      roomId,
      stockId,
      stockCode,
      type,
      price,
      quantity,
      amount: price * quantity,
      timestamp: Date.now(),
    };
    await api.post('/transactions', transaction);
    return transaction;
  },

  async buyStock(
    userId: string,
    roomId: string,
    stock: Stock,
    quantity: number
  ): Promise<{ user: User; transaction: Transaction }> {
    await delay(200);
    const user = await this.getUser(userId);
    const totalCost = stock.price * quantity;

    if (totalCost > user.balance) {
      throw new Error('余额不足');
    }

    let newPortfolio: PortfolioItem[];
    const existingIdx = user.portfolio.findIndex(p => p.stockId === stock.id);

    if (existingIdx >= 0) {
      const existing = user.portfolio[existingIdx];
      const newQuantity = existing.quantity + quantity;
      const newAvgCost = (existing.avgCost * existing.quantity + totalCost) / newQuantity;
      newPortfolio = [...user.portfolio];
      newPortfolio[existingIdx] = {
        ...existing,
        quantity: newQuantity,
        avgCost: newAvgCost,
        currentPrice: stock.price,
      };
    } else {
      newPortfolio = [
        ...user.portfolio,
        {
          stockId: stock.id,
          stockCode: stock.code,
          stockName: stock.name,
          quantity,
          avgCost: stock.price,
          currentPrice: stock.price,
        },
      ];
    }

    const newBalance = user.balance - totalCost;
    const portfolioValue = newPortfolio.reduce(
      (sum, p) => sum + p.currentPrice * p.quantity,
      0
    );
    const totalAssets = newBalance + portfolioValue;
    const returnRate = ((totalAssets - user.initialBalance) / user.initialBalance) * 100;

    const updatedUser: User = {
      ...user,
      balance: newBalance,
      portfolio: newPortfolio,
      totalAssets,
      returnRate,
    };

    await this.updateUser(userId, {
      balance: newBalance,
      portfolio: newPortfolio,
      totalAssets,
      returnRate,
    });

    const transaction = await this.createTransaction(
      userId,
      roomId,
      stock.id,
      stock.code,
      'BUY',
      stock.price,
      quantity
    );

    return { user: updatedUser, transaction };
  },

  async sellStock(
    userId: string,
    roomId: string,
    stock: Stock,
    quantity: number
  ): Promise<{ user: User; transaction: Transaction }> {
    await delay(200);
    const user = await this.getUser(userId);
    const holding = user.portfolio.find(p => p.stockId === stock.id);

    if (!holding || holding.quantity < quantity) {
      throw new Error('持仓不足');
    }

    const totalValue = stock.price * quantity;
    let newPortfolio: PortfolioItem[];

    if (holding.quantity === quantity) {
      newPortfolio = user.portfolio.filter(p => p.stockId !== stock.id);
    } else {
      newPortfolio = user.portfolio.map(p =>
        p.stockId === stock.id
          ? { ...p, quantity: p.quantity - quantity, currentPrice: stock.price }
          : p
      );
    }

    const newBalance = user.balance + totalValue;
    const portfolioValue = newPortfolio.reduce(
      (sum, p) => sum + p.currentPrice * p.quantity,
      0
    );
    const totalAssets = newBalance + portfolioValue;
    const returnRate = ((totalAssets - user.initialBalance) / user.initialBalance) * 100;

    await this.updateUser(userId, {
      balance: newBalance,
      portfolio: newPortfolio,
      totalAssets,
      returnRate,
    });

    const transaction = await this.createTransaction(
      userId,
      roomId,
      stock.id,
      stock.code,
      'SELL',
      stock.price,
      quantity
    );

    return {
      user: {
        ...user,
        balance: newBalance,
        portfolio: newPortfolio,
        totalAssets,
        returnRate,
      },
      transaction,
    };
  },

  startPriceUpdate(
    onUpdate: (stocks: Stock[]) => void,
    onKlineUpdate: (stockId: string, kline: KLineData[]) => void
  ) {
    const updateInterval = 5000;
    const klineInterval = 60000;

    const updatePrices = async () => {
      try {
        const stocks = await this.getStocks();
        const updated = stocks.map(stock => {
          const changePercent = (Math.random() - 0.5) * 2 * 0.03;
          const newPrice = Math.max(0.01, stock.price * (1 + changePercent));
          const change = newPrice - stock.prevClose;
          return {
            ...stock,
            price: Number(newPrice.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(((change / stock.prevClose) * 100).toFixed(2)),
            high: Number(Math.max(stock.high, newPrice).toFixed(2)),
            low: Number(Math.min(stock.low, newPrice).toFixed(2)),
            volume: stock.volume + Math.floor(Math.random() * 1000000),
          };
        });
        stocksCache = updated;
        onUpdate(updated);
      } catch (e) {
        console.error('Price update failed', e);
      }
    };

    const updateKlines = async () => {
      const stocks = await this.getStocks();
      const now = Date.now();
      for (const stock of stocks) {
        const existingKline = await this.getKline(stock.id);
        const lastKline = existingKline[existingKline.length - 1];
        const newKlineItem: KLineData = {
          time: now,
          open: lastKline?.close || stock.price,
          high: stock.high,
          low: stock.low,
          close: stock.price,
          volume: stock.volume,
        };
        const newKline = [...existingKline.slice(-49), newKlineItem];
        klineCache[stock.id] = newKline;
        onKlineUpdate(stock.id, newKline);
      }
    };

    const priceTimer = setInterval(updatePrices, updateInterval);
    const klineTimer = setInterval(updateKlines, klineInterval);

    return () => {
      clearInterval(priceTimer);
      clearInterval(klineTimer);
    };
  },
};

function generateInitialKline(stockId: string): KLineData[] {
  const basePrices: Record<string, number> = {
    '1': 185, '2': 140, '3': 375, '4': 176, '5': 254, '6': 498, '7': 862, '8': 158,
    '9': 200, '10': 36, '11': 448, '12': 91, '13': 167, '14': 381, '15': 283, '16': 97,
    '17': 155, '18': 28, '19': 518, '20': 111, '21': 117, '22': 154, '23': 39, '24': 71, '25': 30,
  };
  const base = basePrices[stockId] || 100;
  const kline: KLineData[] = [];
  let price = base;
  const now = Date.now();

  for (let i = 49; i >= 0; i--) {
    const open = price;
    const volatility = base * 0.02;
    const close = open + (Math.random() - 0.5) * volatility * 2;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    kline.push({
      time: now - i * 60000,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(Math.max(0.01, low).toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 10000000) + 1000000,
    });
    price = close;
  }
  return kline;
}

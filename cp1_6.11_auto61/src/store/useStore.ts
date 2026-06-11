import { create } from 'zustand';
import type { User, Stock, Toast, RankingItem } from '../types';
import { mockApi } from '../api/mockApi';

interface StoreState {
  stocks: Stock[];
  user: User | null;
  ranking: RankingItem[];
  toasts: Toast[];
  selectedStockId: string | null;
  loading: boolean;
  error: string | null;

  setStocks: (stocks: Stock[]) => void;
  setUser: (user: User | null) => void;
  setRanking: (ranking: RankingItem[]) => void;
  setSelectedStockId: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  joinRoom: (roomId: string, nickname: string) => Promise<void>;
  buyStock: (stock: Stock, quantity: number) => Promise<boolean>;
  sellStock: (stock: Stock, quantity: number) => Promise<boolean>;
  loadInitialData: (roomId?: string) => Promise<void>;
  refreshRanking: (roomId: string) => Promise<void>;
  updateStockPrice: (stockId: string, price: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export const useStore = create<StoreState>((set, get) => ({
  stocks: [],
  user: null,
  ranking: [],
  toasts: [],
  selectedStockId: null,
  loading: false,
  error: null,

  setStocks: (stocks) => set({ stocks }),
  setUser: (user) => set({ user }),
  setRanking: (ranking) => set({ ranking }),
  setSelectedStockId: (id) => set({ selectedStockId: id }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  addToast: (toast) => {
    const id = generateId();
    const fullToast = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, fullToast] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, toast.duration || 2500);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  joinRoom: async (roomId, nickname) => {
    try {
      set({ loading: true, error: null });
      const user = await mockApi.createUser(roomId, nickname);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('roomId', roomId);
      set({ user });
      await get().refreshRanking(roomId);
      get().addToast({
        type: 'success',
        message: `欢迎 ${nickname}! 已加入房间 ${roomId}`,
      });
    } catch (e: any) {
      set({ error: e.message });
      get().addToast({
        type: 'error',
        message: e.message || '加入房间失败',
      });
    } finally {
      set({ loading: false });
    }
  },

  buyStock: async (stock, quantity) => {
    const { user } = get();
    if (!user) return false;
    try {
      set({ loading: true });
      const { user: updatedUser } = await mockApi.buyStock(
        user.id,
        user.roomId,
        stock,
        quantity
      );
      set({ user: updatedUser });
      get().addToast({
        type: 'success',
        message: `成功买入 ${stock.code} ${quantity} 股`,
      });
      await get().refreshRanking(user.roomId);
      return true;
    } catch (e: any) {
      get().addToast({
        type: 'error',
        message: e.message || '买入失败',
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  sellStock: async (stock, quantity) => {
    const { user } = get();
    if (!user) return false;
    try {
      set({ loading: true });
      const { user: updatedUser } = await mockApi.sellStock(
        user.id,
        user.roomId,
        stock,
        quantity
      );
      set({ user: updatedUser });
      get().addToast({
        type: 'success',
        message: `成功卖出 ${stock.code} ${quantity} 股`,
      });
      await get().refreshRanking(user.roomId);
      return true;
    } catch (e: any) {
      get().addToast({
        type: 'error',
        message: e.message || '卖出失败',
      });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadInitialData: async (roomId = 'DEMO') => {
    try {
      set({ loading: true });
      const [stocks, ranking] = await Promise.all([
        mockApi.getStocks(),
        mockApi.getRanking(roomId),
      ]);
      set({ stocks, ranking });

      const savedUserId = localStorage.getItem('userId');
      const savedRoomId = localStorage.getItem('roomId');
      if (savedUserId && savedRoomId === roomId) {
        const user = await mockApi.getUser(savedUserId);
        set({ user });
      }
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  refreshRanking: async (roomId) => {
    try {
      const ranking = await mockApi.getRanking(roomId);
      set({ ranking });
    } catch (e: any) {
      console.error('Refresh ranking failed', e);
    }
  },

  updateStockPrice: (stockId, price) => {
    set((state) => {
      const user = state.user;
      if (!user) return {};

      let portfolioUpdated = false;
      const newPortfolio = user.portfolio.map((p) => {
        if (p.stockId === stockId) {
          portfolioUpdated = true;
          return { ...p, currentPrice: price };
        }
        return p;
      });

      if (!portfolioUpdated) return {};

      const portfolioValue = newPortfolio.reduce(
        (sum, p) => sum + p.currentPrice * p.quantity,
        0
      );
      const totalAssets = user.balance + portfolioValue;
      const returnRate =
        ((totalAssets - user.initialBalance) / user.initialBalance) * 100;

      return {
        user: {
          ...user,
          portfolio: newPortfolio,
          totalAssets,
          returnRate,
        },
      };
    });
  },
}));

export type Rarity = 'hidden' | 'normal' | 'participation';

export interface Prize {
  id: string;
  name: string;
  rarity: Rarity;
  ratio: number;
  total: number;
  remaining: number;
  isPhysical: boolean;
}

export interface Batch {
  id: string;
  name: string;
  inviteCode: string;
  totalQuantity: number;
  prizes: Prize[];
  startTime: number;
  endTime?: number;
  maxDrawsPerUser: number;
  participantCount: number;
  createdAt: number;
}

export interface DrawRecord {
  id: string;
  batchId: string;
  userId: string;
  prizeId: string | null;
  prizeName: string;
  rarity: Rarity;
  isWin: boolean;
  redeemCode?: string;
  redeemed: boolean;
  redeemedAt?: number;
  redeemExpireAt?: number;
  createdAt: number;
}

export interface AppState {
  batches: Batch[];
  drawRecords: DrawRecord[];
  currentTab: 'user' | 'admin';
  currentUserId: string;
  selectedBatchId: string | null;
}

export type AppAction =
  | { type: 'SET_TAB'; payload: 'user' | 'admin' }
  | { type: 'ADD_BATCH'; payload: Batch }
  | { type: 'UPDATE_BATCH'; payload: Batch }
  | { type: 'SET_SELECTED_BATCH'; payload: string | null }
  | { type: 'ADD_DRAW_RECORD'; payload: DrawRecord }
  | { type: 'UPDATE_DRAW_RECORD'; payload: DrawRecord }
  | { type: 'SET_STATE'; payload: AppState };

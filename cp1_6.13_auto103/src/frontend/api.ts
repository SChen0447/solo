import axios from 'axios';
import type {
  AlbumDetail,
  AlbumListItem,
  ApiResponse,
  Genre,
  LeaderboardEntry,
  StickerResult,
  TradePackage,
  TradeResult,
  User,
} from './types';

const client = axios.create({
  baseURL: '/api',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const CURRENT_USER_ID = 'user-001';

export async function checkHealth(): Promise<boolean> {
  try {
    await client.get('/health');
    return true;
  } catch {
    return false;
  }
}

export async function fetchAlbums(): Promise<AlbumListItem[]> {
  const { data } = await client.get<ApiResponse<AlbumListItem[]>>('/albums');
  return data.data;
}

export async function fetchAlbum(id: string): Promise<AlbumDetail> {
  const { data } = await client.get<ApiResponse<AlbumDetail>>(`/album/${id}`);
  return data.data;
}

export async function fetchUser(id: string): Promise<User> {
  const { data } = await client.get<ApiResponse<User>>(`/user/${id}`);
  return data.data;
}

export async function submitGuess(
  userId: string,
  albumId: string,
  genre: Genre,
  correct: boolean
): Promise<StickerResult> {
  const { data } = await client.post<ApiResponse<StickerResult>>(
    `/user/${userId}/sticker`,
    { albumId, genre, correct }
  );
  return data.data;
}

export async function fetchLeaderboard(): Promise<{
  entries: LeaderboardEntry[];
  currentUserId: string;
}> {
  const { data } = await client.get<
    ApiResponse<LeaderboardEntry[]> & { currentUserId: string }
  >('/leaderboard');
  return { entries: data.data, currentUserId: data.currentUserId };
}

export async function fetchMarket(): Promise<TradePackage[]> {
  const { data } = await client.get<ApiResponse<TradePackage[]>>('/market');
  return data.data;
}

export async function createTradePackage(
  userId: string,
  stickerIds: string[]
): Promise<{ packageId: string; stickers: unknown[] }> {
  const { data } = await client.post<
    ApiResponse<{ packageId: string; stickers: unknown[] }>
  >('/trade/create', { userId, stickerIds });
  return data.data;
}

export async function executeTrade(
  requesterId: string,
  targetPackageId: string,
  requesterPackageId: string
): Promise<TradeResult> {
  const { data } = await client.post<ApiResponse<TradeResult>>(
    '/trade/execute',
    { requesterId, targetPackageId, requesterPackageId }
  );
  return data.data;
}

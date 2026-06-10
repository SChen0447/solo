import type { PoemLine, CoupletPair } from './poemDB';

export interface FavoritePoem extends PoemLine {
  id: string;
  createdAt: number;
}

export interface FavoriteCouplet extends CoupletPair {
  id: string;
  createdAt: number;
}

export interface AppStorage {
  searchHistory: string[];
  favoritePoems: FavoritePoem[];
  favoriteCouplets: FavoriteCouplet[];
  recentCouplets: (CoupletPair & { id: string; createdAt: number })[];
}

const STORAGE_KEY = 'poem_couplet_studio_v1';
const HISTORY_LIMIT = 20;

function getDefaultStorage(): AppStorage {
  return {
    searchHistory: [],
    favoritePoems: [],
    favoriteCouplets: [],
    recentCouplets: []
  };
}

export function loadStorage(): AppStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStorage();
    const parsed = JSON.parse(raw) as AppStorage;
    return {
      searchHistory: Array.isArray(parsed.searchHistory) ? parsed.searchHistory : [],
      favoritePoems: Array.isArray(parsed.favoritePoems) ? parsed.favoritePoems : [],
      favoriteCouplets: Array.isArray(parsed.favoriteCouplets) ? parsed.favoriteCouplets : [],
      recentCouplets: Array.isArray(parsed.recentCouplets) ? parsed.recentCouplets : []
    };
  } catch {
    return getDefaultStorage();
  }
}

export function saveStorage(data: AppStorage): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addSearchHistory(keyword: string): string[] {
  const data = loadStorage();
  const kw = keyword.trim();
  if (!kw) return data.searchHistory;
  const filtered = data.searchHistory.filter((k) => k !== kw);
  filtered.unshift(kw);
  data.searchHistory = filtered.slice(0, HISTORY_LIMIT);
  saveStorage(data);
  return data.searchHistory;
}

export function clearSearchHistory(): void {
  const data = loadStorage();
  data.searchHistory = [];
  saveStorage(data);
}

export function addFavoritePoem(poem: PoemLine): FavoritePoem {
  const data = loadStorage();
  const exists = data.favoritePoems.find(
    (p) => p.text === poem.text && p.author === poem.author
  );
  if (exists) return exists;
  const fav: FavoritePoem = {
    ...poem,
    id: generateId(),
    createdAt: Date.now()
  };
  data.favoritePoems.unshift(fav);
  saveStorage(data);
  return fav;
}

export function removeFavoritePoem(id: string): void {
  const data = loadStorage();
  data.favoritePoems = data.favoritePoems.filter((p) => p.id !== id);
  saveStorage(data);
}

export function isPoemFavorited(text: string, author: string): boolean {
  const data = loadStorage();
  return data.favoritePoems.some((p) => p.text === text && p.author === author);
}

export function addFavoriteCouplet(couplet: CoupletPair): FavoriteCouplet {
  const data = loadStorage();
  const exists = data.favoriteCouplets.find(
    (c) => c.upper === couplet.upper && c.lower === couplet.lower
  );
  if (exists) return exists;
  const fav: FavoriteCouplet = {
    ...couplet,
    id: generateId(),
    createdAt: Date.now()
  };
  data.favoriteCouplets.unshift(fav);
  saveStorage(data);
  return fav;
}

export function removeFavoriteCouplet(id: string): void {
  const data = loadStorage();
  data.favoriteCouplets = data.favoriteCouplets.filter((c) => c.id !== id);
  saveStorage(data);
}

export function isCoupletFavorited(upper: string, lower: string): boolean {
  const data = loadStorage();
  return data.favoriteCouplets.some((c) => c.upper === upper && c.lower === lower);
}

export function addRecentCouplet(couplet: CoupletPair): void {
  const data = loadStorage();
  const entry = {
    ...couplet,
    id: generateId(),
    createdAt: Date.now()
  };
  data.recentCouplets.unshift(entry);
  data.recentCouplets = data.recentCouplets.slice(0, 10);
  saveStorage(data);
}

export function sortFavoritesByTime(ascending = false): void {
  const data = loadStorage();
  data.favoritePoems.sort((a, b) =>
    ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
  );
  data.favoriteCouplets.sort((a, b) =>
    ascending ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
  );
  saveStorage(data);
}

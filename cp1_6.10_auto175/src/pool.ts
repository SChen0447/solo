import { Star } from './star';

interface CollectedWish {
  wishText: string;
  color: string;
  timestamp: number;
}

interface TodayWishes {
  date: string;
  count: number;
}

interface StorageData {
  collectedWishes: CollectedWish[];
  todayWishes: TodayWishes;
}

const STORAGE_KEY = 'starry_wish_data_v1';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function defaultStorage(): StorageData {
  return {
    collectedWishes: [],
    todayWishes: { date: todayKey(), count: 0 },
  };
}

export class StarPool {
  stars: Star[];
  targetCount: number;
  private storage: StorageData;

  constructor(initialTarget: number) {
    this.stars = [];
    this.targetCount = initialTarget;
    this.storage = this.loadStorage();
  }

  private loadStorage(): StorageData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultStorage();
      const parsed = JSON.parse(raw) as StorageData;
      if (!parsed.collectedWishes) parsed.collectedWishes = [];
      if (!parsed.todayWishes) parsed.todayWishes = { date: todayKey(), count: 0 };
      if (parsed.todayWishes.date !== todayKey()) {
        parsed.todayWishes = { date: todayKey(), count: 0 };
      }
      return parsed;
    } catch {
      return defaultStorage();
    }
  }

  private saveStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
    } catch {
      // ignore quota errors
    }
  }

  addStar(star: Star): void {
    this.stars.push(star);
  }

  removeStar(index: number): void {
    if (index >= 0 && index < this.stars.length) {
      this.stars.splice(index, 1);
    }
  }

  getStarAtPosition(x: number, y: number): Star | null {
    for (let i = this.stars.length - 1; i >= 0; i--) {
      const s = this.stars[i];
      if (s.containsPoint(x, y)) {
        return s;
      }
    }
    return null;
  }

  isWishCollected(wishText: string): boolean {
    return this.storage.collectedWishes.some((w) => w.wishText === wishText);
  }

  toggleCollection(star: Star): void {
    const idx = this.storage.collectedWishes.findIndex(
      (w) => w.wishText === star.wishText,
    );
    if (idx >= 0) {
      this.storage.collectedWishes.splice(idx, 1);
      star.isCollected = false;
    } else {
      this.storage.collectedWishes.push({
        wishText: star.wishText,
        color: star.color,
        timestamp: Date.now(),
      });
      star.isCollected = true;
    }
    this.saveStorage();
  }

  syncCollectionState(): void {
    for (const s of this.stars) {
      s.isCollected = this.isWishCollected(s.wishText);
    }
  }

  incrementTodayWishes(): void {
    if (this.storage.todayWishes.date !== todayKey()) {
      this.storage.todayWishes = { date: todayKey(), count: 0 };
    }
    this.storage.todayWishes.count += 1;
    this.saveStorage();
  }

  getStats(): { total: number; collected: number; todayNew: number } {
    if (this.storage.todayWishes.date !== todayKey()) {
      this.storage.todayWishes = { date: todayKey(), count: 0 };
    }
    const collected = this.stars.filter((s) => s.isCollected).length;
    return {
      total: this.stars.length,
      collected,
      todayNew: this.storage.todayWishes.count,
    };
  }

  adjustTargetCount(delta: number): void {
    this.targetCount = Math.max(50, Math.min(300, this.targetCount + delta));
  }
}

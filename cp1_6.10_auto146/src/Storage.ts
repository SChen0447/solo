export interface CardData {
  id: string;
  x: number;
  y: number;
  content: string;
}

export interface ConnectionData {
  fromId: string;
  toId: string;
}

export interface StorageData {
  cards: CardData[];
  connections: ConnectionData[];
}

const STORAGE_KEY = 'mindmap_cards_data';

export class Storage {
  static save(data: StorageData): void {
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (e) {
      console.error('Failed to save data to localStorage:', e);
    }
  }

  static load(): StorageData | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;
      const data = JSON.parse(json) as StorageData;
      if (!data.cards || !Array.isArray(data.cards)) return null;
      return data;
    } catch (e) {
      console.error('Failed to load data from localStorage:', e);
      return null;
    }
  }

  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  }

  static hasData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}

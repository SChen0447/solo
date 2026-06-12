export interface EmojiItem {
  id: number;
  x: number;
  y: number;
  char: string;
  scale: number;
  rotation: number;
  enterProgress: number;
  exitProgress: number;
  isExiting: boolean;
}

interface HistoryAction {
  type: 'add' | 'remove' | 'update' | 'batchAdd';
  items: EmojiItem[];
  previousItems?: EmojiItem[];
}

const MAX_HISTORY = 30;
const BASE_SCALE = 40;

export class EmojiManager {
  private emojis: EmojiItem[] = [];
  private history: HistoryAction[] = [];
  private historyIndex = -1;
  private nextId = 1;

  getEmojis(): EmojiItem[] {
    return this.emojis;
  }

  getEmojiById(id: number): EmojiItem | undefined {
    return this.emojis.find(e => e.id === id);
  }

  getCount(): number {
    return this.emojis.filter(e => !e.isExiting).length;
  }

  getBaseScale(): number {
    return BASE_SCALE;
  }

  addEmoji(x: number, y: number, char: string, scale: number = 1, rotation: number = 0): EmojiItem {
    const emoji: EmojiItem = {
      id: this.nextId++,
      x,
      y,
      char,
      scale,
      rotation,
      enterProgress: 0,
      exitProgress: 0,
      isExiting: false
    };

    this.emojis.push(emoji);

    this.pushHistory({
      type: 'add',
      items: [{ ...emoji }]
    });

    return emoji;
  }

  addEmojisBatch(items: Array<{ x: number; y: number; char: string; scale?: number; rotation?: number }>): EmojiItem[] {
    const newEmojis: EmojiItem[] = items.map(item => ({
      id: this.nextId++,
      x: item.x,
      y: item.y,
      char: item.char,
      scale: item.scale ?? 1,
      rotation: item.rotation ?? 0,
      enterProgress: 0,
      exitProgress: 0,
      isExiting: false
    }));

    this.emojis.push(...newEmojis);

    this.pushHistory({
      type: 'batchAdd',
      items: newEmojis.map(e => ({ ...e }))
    });

    return newEmojis;
  }

  removeEmoji(id: number): boolean {
    const index = this.emojis.findIndex(e => e.id === id);
    if (index === -1) return false;

    const emoji = this.emojis[index];
    emoji.isExiting = true;

    this.pushHistory({
      type: 'remove',
      items: [{ ...emoji }]
    });

    return true;
  }

  updateEmoji(id: number, updates: Partial<Pick<EmojiItem, 'x' | 'y' | 'scale' | 'rotation'>>): boolean {
    const emoji = this.emojis.find(e => e.id === id);
    if (!emoji) return false;

    const previous = { ...emoji };

    if (updates.x !== undefined) emoji.x = updates.x;
    if (updates.y !== undefined) emoji.y = updates.y;
    if (updates.scale !== undefined) emoji.scale = updates.scale;
    if (updates.rotation !== undefined) emoji.rotation = updates.rotation;

    this.pushHistory({
      type: 'update',
      items: [{ ...emoji }],
      previousItems: [previous]
    });

    return true;
  }

  startUpdate(id: number): () => void {
    const emoji = this.emojis.find(e => e.id === id);
    if (!emoji) return () => {};

    const previous = { ...emoji };

    return () => {
      const current = this.emojis.find(e => e.id === id);
      if (!current) return;

      const hasChanged =
        current.x !== previous.x ||
        current.y !== previous.y ||
        current.scale !== previous.scale ||
        current.rotation !== previous.rotation;

      if (hasChanged) {
        this.pushHistory({
          type: 'update',
          items: [{ ...current }],
          previousItems: [previous]
        });
      }
    };
  }

  clearAll(): void {
    if (this.emojis.length === 0) return;

    const allItems = this.emojis.map(e => ({ ...e }));

    for (const emoji of this.emojis) {
      emoji.isExiting = true;
    }

    this.pushHistory({
      type: 'remove',
      items: allItems
    });
  }

  undo(): boolean {
    if (this.historyIndex < 0) return false;

    const action = this.history[this.historyIndex];
    this.historyIndex--;

    switch (action.type) {
      case 'add':
      case 'batchAdd':
        for (const item of action.items) {
          const emoji = this.emojis.find(e => e.id === item.id);
          if (emoji) {
            emoji.isExiting = true;
          }
        }
        break;
      case 'remove':
        for (const item of action.items) {
          const existing = this.emojis.find(e => e.id === item.id);
          if (existing) {
            existing.isExiting = false;
            existing.exitProgress = 0;
          } else {
            this.emojis.push({
              ...item,
              isExiting: false,
              enterProgress: 1,
              exitProgress: 0
            });
          }
        }
        break;
      case 'update':
        if (action.previousItems) {
          for (const prev of action.previousItems) {
            const emoji = this.emojis.find(e => e.id === prev.id);
            if (emoji) {
              emoji.x = prev.x;
              emoji.y = prev.y;
              emoji.scale = prev.scale;
              emoji.rotation = prev.rotation;
            }
          }
        }
        break;
    }

    return true;
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  private pushHistory(action: HistoryAction): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(action);

    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  updateAnimations(deltaTime: number): void {
    const enterSpeed = 5;
    const exitSpeed = 6.67;

    for (let i = this.emojis.length - 1; i >= 0; i--) {
      const emoji = this.emojis[i];

      if (emoji.isExiting) {
        emoji.exitProgress = Math.min(1, emoji.exitProgress + deltaTime * exitSpeed);
        if (emoji.exitProgress >= 1) {
          this.emojis.splice(i, 1);
        }
      } else if (emoji.enterProgress < 1) {
        emoji.enterProgress = Math.min(1, emoji.enterProgress + deltaTime * enterSpeed);
      }
    }
  }
}

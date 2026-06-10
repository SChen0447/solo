import type { Particle } from './starField';

const TARGET_WORDS = [
  '星空', '涟漪', '织梦', '星河', '月华', '云影',
  '清风', '落花', '流水', '晨雾', '暮色', '星辰',
  '银河', '流星', '月影', '花语', '烟波', '翠烟',
  '画屏', '诗笺', '锦瑟', '琼楼', '玉宇', '蓬莱',
  '仙境', '苍穹', '碧落', '凡尘', '清梦', '醉月',
];

export interface SlotChar {
  particleId: number;
  char: string;
}

type SuccessCallback = (word: string) => void;

export class PuzzleManager {
  private slotChars: SlotChar[] = [];
  private completedWords: Set<string> = new Set();
  private charPool: string[] = [];
  private slotElement: HTMLElement;
  private completedWordsElement: HTMLElement;
  private counterElement: HTMLElement;
  private onWordSuccess?: SuccessCallback;
  private onCharReturn?: (particleId: number) => void;
  private placeholder: HTMLElement | null = null;

  constructor(
    slotElement: HTMLElement,
    completedWordsElement: HTMLElement,
    counterElement: HTMLElement,
  ) {
    this.slotElement = slotElement;
    this.completedWordsElement = completedWordsElement;
    this.counterElement = counterElement;
    this.buildCharPool();
    this.savePlaceholder();
  }

  setCallbacks(callbacks: {
    onWordSuccess?: SuccessCallback;
    onCharReturn?: (particleId: number) => void;
  }): void {
    this.onWordSuccess = callbacks.onWordSuccess;
    this.onCharReturn = callbacks.onCharReturn;
  }

  private buildCharPool(): void {
    const uniqueChars = new Set<string>();
    for (const word of TARGET_WORDS) {
      for (const ch of word) {
        uniqueChars.add(ch);
      }
    }
    this.charPool = Array.from(uniqueChars);
    const extraChars = ['光', '幻', '静', '远', '深', '幽', '灵', '韵', '柔', '婉',
      '霜', '雪', '烟', '霞', '虹', '雾', '露', '云', '风', '雨'];
    for (const ch of extraChars) {
      if (!uniqueChars.has(ch)) {
        this.charPool.push(ch);
      }
    }
  }

  getCharPool(): string[] {
    return this.charPool;
  }

  getTargetWords(): string[] {
    return TARGET_WORDS;
  }

  private savePlaceholder(): void {
    const el = this.slotElement.querySelector('.puzzle-slot-placeholder');
    this.placeholder = el as HTMLElement | null;
  }

  private updatePlaceholderVisibility(): void {
    if (this.placeholder) {
      this.placeholder.style.display = this.slotChars.length === 0 ? '' : 'none';
    }
  }

  isPointInSlot(x: number, y: number): boolean {
    const rect = this.slotElement.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  addParticleToSlot(particle: Particle): boolean {
    if (this.slotChars.some(sc => sc.particleId === particle.id)) {
      return false;
    }

    const slotChar: SlotChar = {
      particleId: particle.id,
      char: particle.char,
    };
    this.slotChars.push(slotChar);
    this.renderSlot();
    this.checkWordMatch();
    return true;
  }

  removeCharFromSlot(particleId: number): void {
    const idx = this.slotChars.findIndex(sc => sc.particleId === particleId);
    if (idx !== -1) {
      this.slotChars.splice(idx, 1);
      this.renderSlot();
    }
  }

  private renderSlot(): void {
    const children = Array.from(this.slotElement.children);
    for (const child of children) {
      if (child.classList.contains('slot-char')) {
        child.remove();
      }
    }

    for (const sc of this.slotChars) {
      const el = document.createElement('div');
      el.className = 'slot-char';
      el.textContent = sc.char;
      el.dataset.particleId = String(sc.particleId);
      el.title = '点击移回星云';
      el.addEventListener('click', () => {
        this.removeCharFromSlot(sc.particleId);
        if (this.onCharReturn) {
          this.onCharReturn(sc.particleId);
        }
      });
      this.slotElement.appendChild(el);
    }

    this.updatePlaceholderVisibility();
  }

  private checkWordMatch(): void {
    const currentStr = this.slotChars.map(sc => sc.char).join('');

    for (let len = Math.min(currentStr.length, 4); len >= 2; len--) {
      for (let start = 0; start + len <= currentStr.length; start++) {
        const candidate = currentStr.substring(start, start + len);
        if (TARGET_WORDS.includes(candidate) && !this.completedWords.has(candidate)) {
          this.handleWordSuccess(candidate, start, start + len);
          return;
        }
      }
    }
  }

  private handleWordSuccess(word: string, startIdx: number, endIdx: number): void {
    this.completedWords.add(word);

    const removed = this.slotChars.splice(startIdx, endIdx - startIdx);
    for (const sc of removed) {
      if (this.onCharReturn) {
        this.onCharReturn(sc.particleId);
      }
    }

    this.renderSlot();
    this.updateCounter();
    this.renderCompletedWord(word);

    if (this.onWordSuccess) {
      this.onWordSuccess(word);
    }
  }

  private updateCounter(): void {
    this.counterElement.textContent = String(this.completedWords.size);
  }

  private renderCompletedWord(word: string): void {
    const el = document.createElement('div');
    el.className = 'completed-word';
    el.textContent = word;
    this.completedWordsElement.appendChild(el);
  }

  setSlotDragOver(isOver: boolean): void {
    if (isOver) {
      this.slotElement.classList.add('drag-over');
    } else {
      this.slotElement.classList.remove('drag-over');
    }
  }

  reset(): void {
    for (const sc of this.slotChars) {
      if (this.onCharReturn) {
        this.onCharReturn(sc.particleId);
      }
    }
    this.slotChars = [];
    this.completedWords.clear();
    this.completedWordsElement.innerHTML = '';
    this.renderSlot();
    this.updateCounter();
  }

  getSlotChars(): SlotChar[] {
    return [...this.slotChars];
  }

  getCompletedWords(): string[] {
    return Array.from(this.completedWords);
  }
}

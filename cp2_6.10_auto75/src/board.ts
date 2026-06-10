export type EntryType = 'text' | 'image' | 'color';

export interface TextEntry {
  id: string;
  type: 'text';
  content: string;
  color: string;
}

export interface ImageEntry {
  id: string;
  type: 'image';
  url: string;
}

export interface ColorEntry {
  id: string;
  type: 'color';
  hex: string;
}

export type BoardEntry = TextEntry | ImageEntry | ColorEntry;

const SOFT_COLORS: readonly string[] = [
  '#ffd3b6', '#ffaaa5', '#ff8b94', '#dcedc1', '#a8e6cf',
  '#b5ead7', '#c7ceea', '#ffdac1', '#e2f0cb', '#fdcfe8',
  '#b5deff', '#caffbf', '#bdb2ff', '#ffc6ff', '#a0c4ff',
  '#fde2e4', '#fad2e1', '#e2ece9', '#bee1e6', '#cddafd'
];

let idCounter = 0;
function genId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

export class BoardManager {
  private textEntries: TextEntry[] = [];
  private imageEntries: ImageEntry[] = [];
  private colorEntries: ColorEntry[] = [];

  private textGrid: HTMLElement;
  private imageGrid: HTMLElement;
  private colorGrid: HTMLElement;

  constructor(
    textGridId: string,
    imageGridId: string,
    colorGridId: string
  ) {
    const tg = document.getElementById(textGridId);
    const ig = document.getElementById(imageGridId);
    const cg = document.getElementById(colorGridId);
    if (!tg || !ig || !cg) {
      throw new Error('Board grid containers not found');
    }
    this.textGrid = tg;
    this.imageGrid = ig;
    this.colorGrid = cg;

    this.seedDefaults();
    this.renderAll();
  }

  private seedDefaults(): void {
    const defaultTexts = ['梦境', '复古', '自然', '极简', '未来感', '温柔'];
    const defaultColors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140'];
    const defaultImages = [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&q=60',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=300&q=60',
      'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=300&q=60'
    ];

    defaultTexts.forEach((t) => this.addText(t));
    defaultColors.forEach((c) => this.addColor(c));
    defaultImages.forEach((u) => this.addImage(u));
  }

  addText(content: string): TextEntry | null {
    const trimmed = content.trim();
    if (!trimmed) return null;
    if (this.textEntries.some((e) => e.content === trimmed)) return null;
    const entry: TextEntry = {
      id: genId('txt'),
      type: 'text',
      content: trimmed,
      color: SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)]
    };
    this.textEntries.push(entry);
    this.appendTextElement(entry);
    return entry;
  }

  addImage(url: string): ImageEntry | null {
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (this.imageEntries.some((e) => e.url === trimmed)) return null;
    const entry: ImageEntry = {
      id: genId('img'),
      type: 'image',
      url: trimmed
    };
    this.imageEntries.push(entry);
    this.appendImageElement(entry);
    return entry;
  }

  addColor(hex: string): ColorEntry | null {
    const trimmed = hex.trim().toUpperCase();
    if (!/^#[0-9A-F]{6}$/.test(trimmed)) return null;
    if (this.colorEntries.some((e) => e.hex === trimmed)) return null;
    const entry: ColorEntry = {
      id: genId('clr'),
      type: 'color',
      hex: trimmed
    };
    this.colorEntries.push(entry);
    this.appendColorElement(entry);
    return entry;
  }

  removeEntry(id: string): void {
    const tIdx = this.textEntries.findIndex((e) => e.id === id);
    if (tIdx !== -1) {
      this.textEntries.splice(tIdx, 1);
      const el = this.textGrid.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
      return;
    }
    const iIdx = this.imageEntries.findIndex((e) => e.id === id);
    if (iIdx !== -1) {
      this.imageEntries.splice(iIdx, 1);
      const el = this.imageGrid.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
      return;
    }
    const cIdx = this.colorEntries.findIndex((e) => e.id === id);
    if (cIdx !== -1) {
      this.colorEntries.splice(cIdx, 1);
      const el = this.colorGrid.querySelector(`[data-id="${id}"]`);
      if (el) el.remove();
      return;
    }
  }

  getRandomTexts(n: number, excludeIds: Set<string> = new Set()): TextEntry[] {
    const pool = this.textEntries.filter((e) => !excludeIds.has(e.id));
    return this.shuffle(pool).slice(0, n);
  }

  getRandomImages(n: number, excludeIds: Set<string> = new Set()): ImageEntry[] {
    const pool = this.imageEntries.filter((e) => !excludeIds.has(e.id));
    return this.shuffle(pool).slice(0, n);
  }

  getRandomColors(n: number, excludeIds: Set<string> = new Set()): ColorEntry[] {
    const pool = this.colorEntries.filter((e) => !excludeIds.has(e.id));
    return this.shuffle(pool).slice(0, n);
  }

  getOneRandomText(excludeIds: Set<string> = new Set()): TextEntry | null {
    const results = this.getRandomTexts(1, excludeIds);
    return results.length > 0 ? results[0] : null;
  }

  getOneRandomImage(excludeIds: Set<string> = new Set()): ImageEntry | null {
    const results = this.getRandomImages(1, excludeIds);
    return results.length > 0 ? results[0] : null;
  }

  getOneRandomColor(excludeIds: Set<string> = new Set()): ColorEntry | null {
    const results = this.getRandomColors(1, excludeIds);
    return results.length > 0 ? results[0] : null;
  }

  private shuffle<T>(arr: readonly T[]): T[] {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private renderAll(): void {
    this.textGrid.innerHTML = '';
    this.imageGrid.innerHTML = '';
    this.colorGrid.innerHTML = '';
    this.textEntries.forEach((e) => this.appendTextElement(e));
    this.imageEntries.forEach((e) => this.appendImageElement(e));
    this.colorEntries.forEach((e) => this.appendColorElement(e));
  }

  private appendTextElement(entry: TextEntry): void {
    const el = document.createElement('div');
    el.className = 'text-bubble';
    el.dataset.id = entry.id;
    el.dataset.type = 'text';
    el.style.backgroundColor = entry.color;
    el.textContent = entry.content;
    el.title = entry.content;

    const removeIcon = document.createElement('span');
    removeIcon.className = 'remove-icon';
    removeIcon.innerHTML = '&times;';
    removeIcon.title = '删除';
    removeIcon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeEntry(entry.id);
    });
    el.appendChild(removeIcon);

    this.textGrid.appendChild(el);
  }

  private appendImageElement(entry: ImageEntry): void {
    const el = document.createElement('div');
    el.className = 'image-thumb';
    el.dataset.id = entry.id;
    el.dataset.type = 'image';
    el.title = entry.url;

    const img = document.createElement('img');
    img.src = entry.url;
    img.alt = '灵感图片';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.remove();
      el.appendChild(this.createImagePlaceholder());
    });
    el.appendChild(img);

    const removeIcon = document.createElement('span');
    removeIcon.className = 'remove-icon';
    removeIcon.innerHTML = '&times;';
    removeIcon.title = '删除';
    removeIcon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeEntry(entry.id);
    });
    el.appendChild(removeIcon);

    this.imageGrid.appendChild(el);
  }

  private appendColorElement(entry: ColorEntry): void {
    const el = document.createElement('div');
    el.className = 'color-swatch';
    el.dataset.id = entry.id;
    el.dataset.type = 'color';
    el.title = entry.hex;

    const preview = document.createElement('div');
    preview.className = 'color-preview';
    preview.style.backgroundColor = entry.hex;

    const code = document.createElement('div');
    code.className = 'color-code';
    code.textContent = entry.hex;

    el.appendChild(preview);
    el.appendChild(code);

    const removeIcon = document.createElement('span');
    removeIcon.className = 'remove-icon';
    removeIcon.innerHTML = '&times;';
    removeIcon.title = '删除';
    removeIcon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.removeEntry(entry.id);
    });
    el.appendChild(removeIcon);

    this.colorGrid.appendChild(el);
  }

  private createImagePlaceholder(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'placeholder';
    wrap.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>`;
    return wrap;
  }
}

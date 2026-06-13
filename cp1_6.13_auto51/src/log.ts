import { DICE_COLORS } from './tower';

export interface LogEntry {
  id: string;
  timestamp: number;
  point: number;
  symbolName: string;
  meaning: string;
}

const TAROT_INFO: Record<number, { name: string; meaning: string }> = {
  1: { name: '太阳', meaning: '成功与活力，光明照耀前路' },
  2: { name: '女祭司', meaning: '直觉与智慧，静观其变' },
  3: { name: '皇后', meaning: '丰饶与创造，母性的力量' },
  4: { name: '皇帝', meaning: '权威与秩序，稳固的根基' },
  5: { name: '教皇', meaning: '信仰与传承，精神的指引' },
  6: { name: '恋人', meaning: '和谐与选择，爱的联结' }
};

export class DivinationLog {
  private entries: LogEntry[] = [];
  private panel: HTMLElement;
  private toggleBtn: HTMLElement;
  private content: HTMLElement;
  private sortBtn: HTMLElement;
  private clearBtn: HTMLElement;
  private isOpen: boolean = false;
  private sortDesc: boolean = true;

  constructor() {
    this.panel = document.getElementById('log-panel')!;
    this.toggleBtn = document.getElementById('log-toggle')!;
    this.content = document.getElementById('log-content')!;
    this.sortBtn = document.getElementById('sort-btn')!;
    this.clearBtn = document.getElementById('clear-btn')!;

    this.loadFromStorage();
    this.bindEvents();
    this.render();
  }

  private bindEvents() {
    this.toggleBtn.addEventListener('click', () => this.toggle());
    this.sortBtn.addEventListener('click', () => this.toggleSort());
    this.clearBtn.addEventListener('click', () => this.clear());
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem('crystal-dice-log');
      if (stored) {
        this.entries = JSON.parse(stored);
      }
    } catch (e) {
      this.entries = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('crystal-dice-log', JSON.stringify(this.entries));
    } catch (e) {
    }
  }

  public addEntry(point: number): LogEntry {
    const info = TAROT_INFO[point] || { name: '未知', meaning: '神秘的启示' };

    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
      timestamp: Date.now(),
      point,
      symbolName: info.name,
      meaning: info.meaning
    };

    this.entries.push(entry);
    this.saveToStorage();
    this.render();

    return entry;
  }

  public toggle() {
    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      this.panel.classList.add('open');
      this.toggleBtn.classList.add('open');
    } else {
      this.panel.classList.remove('open');
      this.toggleBtn.classList.remove('open');
    }
  }

  private toggleSort() {
    this.sortDesc = !this.sortDesc;
    this.sortBtn.textContent = this.sortDesc ? '按日期↓' : '按日期↑';
    this.render();
  }

  private clear() {
    if (this.entries.length === 0) return;

    if (confirm('确定要清空所有占卜记录吗？')) {
      this.entries = [];
      this.saveToStorage();
      this.render();
    }
  }

  private render() {
    if (this.entries.length === 0) {
      this.content.innerHTML = '<div class="empty-log">尚无占卜记录</div>';
      return;
    }

    const sorted = [...this.entries].sort((a, b) => {
      return this.sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
    });

    this.content.innerHTML = '';

    sorted.forEach((entry) => {
      const item = this.createLogItem(entry);
      this.content.appendChild(item);
    });
  }

  private createLogItem(entry: LogEntry): HTMLElement {
    const item = document.createElement('div');
    item.className = 'log-item';

    const cardCanvas = this.drawTarotCard(entry.point, entry.symbolName);
    cardCanvas.className = 'log-card';
    cardCanvas.style.width = '50px';
    cardCanvas.style.height = '75px';

    const info = document.createElement('div');
    info.className = 'log-info';

    const time = document.createElement('div');
    time.className = 'log-time';
    time.textContent = this.formatTime(entry.timestamp);

    const number = document.createElement('div');
    number.className = 'log-number';
    number.textContent = `${entry.point} 点 · ${entry.symbolName}`;

    const meaning = document.createElement('div');
    meaning.className = 'log-meaning';
    meaning.textContent = entry.meaning;

    info.appendChild(time);
    info.appendChild(number);
    info.appendChild(meaning);

    item.appendChild(cardCanvas);
    item.appendChild(info);

    return item;
  }

  private drawTarotCard(point: number, symbolName: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 150;
    const ctx = canvas.getContext('2d')!;

    const colorHex = '#' + DICE_COLORS[point].toString(16).padStart(6, '0');

    const gradient = ctx.createLinearGradient(0, 0, 100, 150);
    gradient.addColorStop(0, this.lightenColor(colorHex, 20));
    gradient.addColorStop(0.5, colorHex);
    gradient.addColorStop(1, this.darkenColor(colorHex, 20));

    ctx.fillStyle = gradient;
    this.roundRect(ctx, 2, 2, 96, 146, 8);
    ctx.fill();

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 2, 2, 96, 146, 8);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 6, 6, 88, 138, 6);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
    ctx.font = 'bold 28px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(point.toString(), 50, 50);

    ctx.fillStyle = 'rgba(255, 240, 200, 0.95)';
    ctx.font = '14px "Ma Shan Zheng", cursive';
    ctx.textAlign = 'center';
    ctx.fillText(symbolName, 50, 100);

    ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
    this.drawStar(ctx, 50, 130, 5, 8, 4);

    return canvas;
  }

  private drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  }

  public getEntries(): LogEntry[] {
    return [...this.entries];
  }
}

import './note-item.js';
import type { ColorPair } from './note-item.js';
import { getRandomColorPair } from './note-item.js';

const MAX_NOTES = 20;
const STAR_COUNT = 150;
const NOTE_WIDTH = 140;
const NOTE_HEIGHT = 160;

interface NoteData {
  id: string;
  text: string;
  colorPair: ColorPair;
  textColor: string;
  x: number;
  y: number;
  rotation: number;
  floatingOffset: number;
  createdAt: number;
}

interface Star {
  x: number;
  y: number;
  baseSize: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  driftSpeedX: number;
  driftSpeedY: number;
}

function generateId(): string {
  return 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

class NoteWall extends HTMLElement {
  private shadow!: ShadowRoot;
  private hostEl!: HTMLDivElement;
  private starsCanvas!: HTMLCanvasElement;
  private notesLayer!: HTMLDivElement;
  private modalEl!: HTMLDivElement;
  private modalOverlay!: HTMLDivElement;

  private notes: NoteData[] = [];
  private noteEls: Map<string, HTMLElement> = new Map();
  private stars: Star[] = [];
  private animId = 0;
  private draggedId: string | null = null;
  private zCounter = 100;
  private activeModalNoteId: string | null = null;

  connectedCallback() {
    if (this.shadow) return;
    this.shadow = this.attachShadow({ mode: 'open' });
    this.render();
    this.initStars();
    this.bindEvents();
    this.startAnimationLoop();
  }

  disconnectedCallback() {
    this.stopAnimationLoop();
  }

  private render() {
    const style = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
      }
      .wall {
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse at top left, #120a2a 0%, #0a1630 100%);
      }
      canvas.stars {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: block;
        pointer-events: none;
      }
      .notes-layer {
        position: absolute;
        inset: 0;
      }
      .hint {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255, 255, 255, 0.35);
        font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
        font-size: 13px;
        letter-spacing: 2px;
        pointer-events: none;
        user-select: none;
        text-shadow: 0 0 10px rgba(136, 200, 255, 0.3);
      }
      .modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(6px);
      }
      .modal-overlay.visible {
        display: flex;
        animation: fadeIn 0.25s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      .modal {
        width: 380px;
        max-width: 90vw;
        background: linear-gradient(145deg, #1a1230, #0f1a38);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 18px;
        padding: 26px 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(136,170,255,0.15);
        color: #eee;
        font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
      }
      .modal h3 {
        margin: 0 0 8px;
        font-size: 17px;
        font-weight: 500;
        color: #fff;
        letter-spacing: 1px;
      }
      .modal .created {
        margin: 0 0 18px;
        font-size: 12px;
        color: rgba(255,255,255,0.45);
      }
      .modal textarea {
        width: 100%;
        min-height: 110px;
        background: rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 12px 14px;
        color: #eee;
        font-size: 14px;
        line-height: 1.6;
        font-family: inherit;
        resize: vertical;
        outline: none;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
      }
      .modal textarea:focus {
        border-color: rgba(136,170,255,0.5);
      }
      .modal .field {
        margin-top: 16px;
      }
      .modal .field label {
        display: block;
        margin-bottom: 6px;
        font-size: 12px;
        color: rgba(255,255,255,0.55);
      }
      .modal .row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .modal .color-swatch {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      .modal .color-swatch:hover {
        transform: scale(1.08);
      }
      .modal .color-swatch.active {
        border-color: #fff;
      }
      .modal .color-swatch.text-swatch {
        border-radius: 50%;
      }
      .modal .actions {
        margin-top: 24px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .modal button {
        padding: 9px 20px;
        border-radius: 8px;
        border: none;
        font-size: 13px;
        cursor: pointer;
        font-family: inherit;
        transition: all 0.2s ease;
      }
      .modal .btn-cancel {
        background: rgba(255,255,255,0.08);
        color: #ccc;
      }
      .modal .btn-cancel:hover {
        background: rgba(255,255,255,0.14);
      }
      .modal .btn-save {
        background: linear-gradient(135deg, #6688ff, #aa66ff);
        color: #fff;
        box-shadow: 0 4px 14px rgba(102, 136, 255, 0.35);
      }
      .modal .btn-save:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(102, 136, 255, 0.5);
      }
    `;

    this.shadow.innerHTML = `
      <style>${style}</style>
      <div class="wall">
        <canvas class="stars"></canvas>
        <div class="notes-layer"></div>
        <div class="hint">点击任意位置创建便签 · Ctrl+Z 撤销 · Ctrl+S 导出</div>
        <div class="modal-overlay">
          <div class="modal">
            <h3>便签详情</h3>
            <p class="created"></p>
            <textarea placeholder="在这里写下你的星语..."></textarea>
            <div class="field">
              <label>边框光晕颜色</label>
              <div class="row" data-field="border"></div>
            </div>
            <div class="field">
              <label>文字颜色</label>
              <div class="row" data-field="text"></div>
            </div>
            <div class="actions">
              <button class="btn-cancel">取消</button>
              <button class="btn-save">保存</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.hostEl = this.shadow.querySelector('.wall') as HTMLDivElement;
    this.starsCanvas = this.shadow.querySelector('canvas.stars') as HTMLCanvasElement;
    this.notesLayer = this.shadow.querySelector('.notes-layer') as HTMLDivElement;
    this.modalOverlay = this.shadow.querySelector('.modal-overlay') as HTMLDivElement;
    this.modalEl = this.shadow.querySelector('.modal') as HTMLDivElement;
  }

  private initStars() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.resizeCanvas();
    this.stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const size = 1 + Math.random();
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        baseSize: size,
        size: size,
        alpha: 0.3 + Math.random() * 0.6,
        twinkleSpeed: 1 / (500 + Math.random() * 1500),
        twinklePhase: Math.random() * Math.PI * 2,
        driftSpeedX: (w / 2 - (Math.random() * w)) * 0.00003,
        driftSpeedY: (h / 2 - (Math.random() * h)) * 0.00003,
      });
    }
  }

  private resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.starsCanvas.width = window.innerWidth * dpr;
    this.starsCanvas.height = window.innerHeight * dpr;
    this.starsCanvas.style.width = window.innerWidth + 'px';
    this.starsCanvas.style.height = window.innerHeight + 'px';
    const ctx = this.starsCanvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private bindEvents() {
    this.hostEl.addEventListener('click', (e) => {
      if (this.draggedId) return;
      if ((e.target as HTMLElement).closest('.modal')) return;
      if ((e.target as HTMLElement).closest('x-note-item')) return;
      this.createNote(e.clientX, e.clientY);
    });

    this.hostEl.addEventListener('note-click', (e: Event) => {
      const ev = e as CustomEvent<{ id: string; clientX: number; clientY: number }>;
      this.openModal(ev.detail.id);
    });

    this.hostEl.addEventListener('note-drag-start', (e: Event) => {
      const ev = e as CustomEvent<{ id: string }>;
      this.draggedId = ev.detail.id;
      this.bringToFront(ev.detail.id);
    });

    this.hostEl.addEventListener('note-drag-move', (e: Event) => {
      const ev = e as CustomEvent<{ id: string; x: number; y: number }>;
      this.moveNote(ev.detail.id, ev.detail.x, ev.detail.y);
    });

    this.hostEl.addEventListener('note-drag-end', (e: Event) => {
      const ev = e as CustomEvent<{ id: string }>;
      this.draggedId = null;
      ev.detail;
    });

    this.hostEl.addEventListener('note-delete', (e: Event) => {
      const ev = e as CustomEvent<{ id: string }>;
      this.removeNoteFromDOM(ev.detail.id);
    });

    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.undoLastNote();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.exportNotes();
      }
      if (e.key === 'Escape' && this.modalOverlay.classList.contains('visible')) {
        this.closeModal(false);
      }
    });

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    const cancelBtn = this.modalEl.querySelector('.btn-cancel') as HTMLButtonElement;
    const saveBtn = this.modalEl.querySelector('.btn-save') as HTMLButtonElement;
    cancelBtn.addEventListener('click', () => this.closeModal(false));
    saveBtn.addEventListener('click', () => this.closeModal(true));
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal(false);
    });
  }

  private startAnimationLoop() {
    const tick = () => {
      this.animId = requestAnimationFrame(tick);
      this.renderStars();
    };
    this.animId = requestAnimationFrame(tick);
  }

  private stopAnimationLoop() {
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = 0;
    }
  }

  private renderStars() {
    const ctx = this.starsCanvas.getContext('2d');
    if (!ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    const centerX = w / 2;
    const centerY = h / 2;
    const now = performance.now();
    for (const star of this.stars) {
      const dx = centerX - star.x;
      const dy = centerY - star.y;
      star.x += dx * 0.00003 * 60 / 60;
      star.y += dy * 0.00003 * 60 / 60;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) {
        star.x = Math.random() * w;
        star.y = Math.random() * h;
      }
      const twinkle = 0.5 + 0.5 * Math.sin(now * star.twinkleSpeed + star.twinklePhase);
      star.alpha = 0.2 + twinkle * 0.6;
      star.size = star.baseSize * (0.8 + twinkle * 0.4);
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      if (star.size > 1.5) {
        ctx.globalAlpha = star.alpha * 0.3;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private createNote(x: number, y: number) {
    if (this.notes.length >= MAX_NOTES) {
      const oldest = this.notes[0];
      this.deleteNote(oldest.id, true);
    }
    const id = generateId();
    const data: NoteData = {
      id,
      text: '',
      colorPair: getRandomColorPair(),
      textColor: '#eee',
      x: x - NOTE_WIDTH / 2,
      y: y - NOTE_HEIGHT / 2,
      rotation: (Math.random() - 0.5) * 6,
      floatingOffset: Math.random() * Math.PI * 2,
      createdAt: Date.now(),
    };
    this.notes.push(data);
    const el = document.createElement('x-note-item') as HTMLElement;
    el.setAttribute('data-id', data.id);
    el.setAttribute('data-text', data.text);
    el.setAttribute('data-color-from', data.colorPair.from);
    el.setAttribute('data-color-to', data.colorPair.to);
    el.setAttribute('data-text-color', data.textColor);
    el.setAttribute('data-rotation', String(data.rotation));
    el.setAttribute('data-floating-offset', String(data.floatingOffset));
    el.style.left = data.x + 'px';
    el.style.top = data.y + 'px';
    el.style.zIndex = String(++this.zCounter);
    this.noteEls.set(id, el);
    this.notesLayer.appendChild(el);
    this.bringToFront(id);
  }

  private moveNote(id: string, x: number, y: number) {
    const data = this.notes.find(n => n.id === id);
    const el = this.noteEls.get(id);
    if (!data || !el) return;
    data.x = x;
    data.y = y;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  }

  private bringToFront(id: string) {
    const el = this.noteEls.get(id);
    if (el) el.style.zIndex = String(++this.zCounter);
  }

  private deleteNote(id: string, animate: boolean) {
    const data = this.notes.find(n => n.id === id);
    const el = this.noteEls.get(id);
    if (!data || !el) return;
    if (animate) {
      const noteItem = el as unknown as { triggerDissolve(): void };
      noteItem.triggerDissolve();
    } else {
      this.notes = this.notes.filter(n => n.id !== id);
      this.noteEls.delete(id);
      el.remove();
    }
  }

  private removeNoteFromDOM(id: string) {
    this.notes = this.notes.filter(n => n.id !== id);
    const el = this.noteEls.get(id);
    if (el) el.remove();
    this.noteEls.delete(id);
  }

  private undoLastNote() {
    if (this.notes.length === 0) return;
    const last = this.notes[this.notes.length - 1];
    this.deleteNote(last.id, true);
  }

  private exportNotes() {
    const data = this.notes.map(n => ({
      id: n.id,
      text: n.text,
      colorPair: n.colorPair,
      textColor: n.textColor,
      position: { x: n.x, y: n.y },
      rotation: n.rotation,
      createdAt: n.createdAt,
      createdAtFormatted: formatDate(n.createdAt),
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `liuguang-xingyu-notes-${formatDate(Date.now()).replace(/[:\s]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private openModal(id: string) {
    const data = this.notes.find(n => n.id === id);
    if (!data) return;
    this.activeModalNoteId = id;
    const createdEl = this.modalEl.querySelector('.created') as HTMLParagraphElement;
    const textarea = this.modalEl.querySelector('textarea') as HTMLTextAreaElement;
    const borderRow = this.modalEl.querySelector('[data-field="border"]') as HTMLDivElement;
    const textRow = this.modalEl.querySelector('[data-field="text"]') as HTMLDivElement;
    createdEl.textContent = `创建于 ${formatDate(data.createdAt)}`;
    textarea.value = data.text;

    const borderColors: ColorPair[] = [
      { from: '#ff8844', to: '#ffdd88' },
      { from: '#44aaff', to: '#88ddff' },
      { from: '#cc66ff', to: '#ff88dd' },
      { from: '#44dd88', to: '#88ffbb' },
      { from: '#ff4466', to: '#ffaacc' },
    ];
    borderRow.innerHTML = '';
    borderColors.forEach(cp => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch';
      sw.style.background = `linear-gradient(135deg, ${cp.from}, ${cp.to})`;
      if (cp.from === data.colorPair.from && cp.to === data.colorPair.to) {
        sw.classList.add('active');
      }
      sw.addEventListener('click', () => {
        borderRow.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        (sw as any)._cp = cp;
      });
      (sw as any)._cp = cp;
      borderRow.appendChild(sw);
    });

    const textColors = ['#eee', '#ffdd88', '#88ddff', '#ff88dd', '#88ffbb', '#ffaacc'];
    textRow.innerHTML = '';
    textColors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'color-swatch text-swatch';
      sw.style.background = c;
      if (c.toLowerCase() === data.textColor.toLowerCase()) {
        sw.classList.add('active');
      }
      sw.addEventListener('click', () => {
        textRow.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
      });
      (sw as any)._color = c;
      textRow.appendChild(sw);
    });

    this.modalOverlay.classList.add('visible');
  }

  private closeModal(save: boolean) {
    if (!this.activeModalNoteId) {
      this.modalOverlay.classList.remove('visible');
      return;
    }
    const id = this.activeModalNoteId;
    const data = this.notes.find(n => n.id === id);
    const el = this.noteEls.get(id);
    if (save && data && el) {
      const textarea = this.modalEl.querySelector('textarea') as HTMLTextAreaElement;
      const activeBorder = this.modalEl.querySelector('[data-field="border"] .color-swatch.active') as HTMLElement | null;
      const activeText = this.modalEl.querySelector('[data-field="text"] .color-swatch.active') as HTMLElement | null;
      const newText = textarea.value;
      const newBorder = activeBorder ? (activeBorder as any)._cp as ColorPair : data.colorPair;
      const newTextColor = activeText ? (activeText as any)._color as string : data.textColor;
      data.text = newText;
      data.colorPair = newBorder;
      data.textColor = newTextColor;
      el.setAttribute('data-text', newText);
      el.setAttribute('data-text-color', newTextColor);
      const noteItem = el as unknown as { setColorPair(cp: ColorPair): void };
      noteItem.setColorPair(newBorder);
    }
    this.activeModalNoteId = null;
    this.modalOverlay.classList.remove('visible');
  }
}

customElements.define('x-note-wall', NoteWall);

function bootstrap() {
  const app = document.getElementById('app');
  if (!app) return;
  const wall = document.createElement('x-note-wall');
  app.appendChild(wall);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

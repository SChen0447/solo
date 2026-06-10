import { NoteBlock, NoteBlockState } from './noteBlock';
import { MusicEngine } from './musicEngine';
import { UIController, UndoAction, GlobalParams } from './uiController';
import './style.css';

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private blocks: NoteBlock[] = [];
  private musicEngine: MusicEngine;
  private uiController: UIController;
  private params: GlobalParams;

  private isMouseDown = false;
  private isDraggingBlock = false;
  private draggedBlock: NoteBlock | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private movedBlocks: Map<string, { x: number; y: number }> = new Map();
  private batchSpawnedStates: NoteBlockState[] = [];
  private lastSpawnTime = 0;
  private readonly SPAWN_INTERVAL = 80;

  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private dpr = 1;
  private statusUpdateTimer = 0;
  private lastNoteCount = -1;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.musicEngine = new MusicEngine();
    this.uiController = new UIController(
      {
        onClear: () => this.clearCanvas(),
        onSave: () => this.uiController.downloadBlocksJSON(this.blocks),
        onRandom: () => this.randomGenerate(),
        onUndo: (action) => this.handleUndo(action),
        onParamsChange: (params) => {
          this.params = { ...params };
        },
      },
      this.musicEngine
    );

    this.params = this.uiController.getParams();
    this.resize();
    this.bindEvents();
    this.startRenderLoop();
    this.uiController.updateStatusBar(this.blocks.length);
  }

  private resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(this.dpr, this.dpr);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
  }

  private getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private findBlockAt(x: number, y: number): NoteBlock | null {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      if (this.blocks[i].hitTest(x, y)) {
        return this.blocks[i];
      }
    }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    this.musicEngine.resume();
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerDown(pos.x, pos.y);
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerMove(pos.x, pos.y);
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPos(e.clientX, e.clientY);
    this.handlePointerUp(pos.x, pos.y);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    this.musicEngine.resume();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const pos = this.getCanvasPos(t.clientX, t.clientY);
      this.handlePointerDown(pos.x, pos.y);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const pos = this.getCanvasPos(t.clientX, t.clientY);
      this.handlePointerMove(pos.x, pos.y);
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const pos = this.getCanvasPos(t.clientX, t.clientY);
      this.handlePointerUp(pos.x, pos.y);
    }
  }

  private handlePointerDown(x: number, y: number): void {
    this.isMouseDown = true;
    this.movedBlocks.clear();
    this.batchSpawnedStates = [];

    const block = this.findBlockAt(x, y);
    if (block) {
      this.isDraggingBlock = true;
      this.draggedBlock = block;
      this.dragOffsetX = x - block.x;
      this.dragOffsetY = y - block.y;
      this.dragStartX = block.x;
      this.dragStartY = block.y;
      block.setDragging(true);
      this.movedBlocks.set(block.id, { x: block.x, y: block.y });
      const idx = this.blocks.indexOf(block);
      if (idx >= 0) {
        this.blocks.splice(idx, 1);
        this.blocks.push(block);
      }
    }
  }

  private handlePointerMove(x: number, y: number): void {
    if (!this.isMouseDown) return;

    if (this.isDraggingBlock && this.draggedBlock) {
      this.draggedBlock.x = x - this.dragOffsetX;
      this.draggedBlock.y = y - this.dragOffsetY;
    } else {
      const now = performance.now();
      if (now - this.lastSpawnTime >= this.SPAWN_INTERVAL) {
        const block = this.spawnNoteBlock(x, y);
        this.batchSpawnedStates.push(block.getState());
        this.lastSpawnTime = now;
      }
    }
  }

  private handlePointerUp(x: number, y: number): void {
    if (!this.isMouseDown) return;

    if (this.isDraggingBlock && this.draggedBlock) {
      this.draggedBlock.setDragging(false);
      const moved = this.draggedBlock.x !== this.dragStartX || this.draggedBlock.y !== this.dragStartY;
      if (moved) {
        this.musicEngine.playClick();
        const before = Array.from(this.movedBlocks.entries()).map(([id, pos]) => ({ id, ...pos }));
        const after = this.blocks
          .filter((b) => this.movedBlocks.has(b.id))
          .map((b) => ({ id: b.id, x: b.x, y: b.y }));
        this.uiController.pushUndo({ type: 'move', before, after });
      }
    } else {
      if (!this.isDraggingBlock) {
        const block = this.spawnNoteBlock(x, y);
        this.batchSpawnedStates.push(block.getState());
      }
      if (this.batchSpawnedStates.length > 0) {
        this.uiController.pushUndo({ type: 'remove', blocks: this.batchSpawnedStates });
      }
    }

    this.isMouseDown = false;
    this.isDraggingBlock = false;
    this.draggedBlock = null;
    this.movedBlocks.clear();
    this.batchSpawnedStates = [];
  }

  private spawnNoteBlock(x: number, y: number, autoPlay = true): NoteBlock {
    const block = new NoteBlock(x, y);
    block.startSpawnAnimation();
    if (autoPlay) {
      block.startGlowPulse();
      this.musicEngine.playNote(block.pitch);
    }
    this.blocks.push(block);
    this.uiController.updateStatusBar(this.blocks.length);
    return block;
  }

  private clearCanvas(): void {
    if (this.blocks.length === 0) return;

    const states = this.blocks.map((b) => b.getState());
    this.uiController.pushUndo({ type: 'add', blocks: states });

    this.blocks.forEach((block, idx) => {
      block.startRemoveAnimation(idx * 50);
    });

    setTimeout(() => {
      this.blocks = [];
      this.uiController.updateStatusBar(0);
    }, this.blocks.length * 50 + 600);
  }

  private randomGenerate(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const count = 20 + Math.floor(Math.random() * 11);
    const centerX = w / 2;
    const centerY = h / 2;

    const newBlocks: NoteBlockState[] = [];

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(w, h) * 0.4;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const block = this.spawnNoteBlock(x, y, true);
        newBlocks.push(block.getState());
      }, i * 100);
    }

    setTimeout(() => {
      this.uiController.pushUndo({ type: 'remove', blocks: newBlocks });
    }, count * 100 + 100);
  }

  private handleUndo(action: UndoAction): void {
    switch (action.type) {
      case 'add': {
        action.blocks.forEach((state) => {
          const block = NoteBlock.fromState(state);
          block.startSpawnAnimation();
          this.blocks.push(block);
        });
        this.uiController.updateStatusBar(this.blocks.length);
        break;
      }
      case 'remove': {
        const idsToRemove = new Set(action.blocks.map((s) => s.id));
        this.blocks = this.blocks.filter((b) => !idsToRemove.has(b.id));
        this.uiController.updateStatusBar(this.blocks.length);
        break;
      }
      case 'move': {
        action.before.forEach((pos) => {
          const block = this.blocks.find((b) => b.id === pos.id);
          if (block) {
            block.x = pos.x;
            block.y = pos.y;
          }
        });
        break;
      }
    }
  }

  private startRenderLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      const deltaTime = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.render(deltaTime);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render(deltaTime: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const brightness = this.params.backgroundBrightness / 100;
    const gradient = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) / 1.2);
    gradient.addColorStop(0, this.lerpColor('#302b63', '#50478a', brightness));
    gradient.addColorStop(1, this.lerpColor('#0f0c29', '#201c50', brightness));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    this.drawStars(w, h, brightness);

    const blocksToRemove: number[] = [];
    for (let i = 0; i < this.blocks.length; i++) {
      const alive = this.blocks[i].update(deltaTime);
      if (!alive) {
        blocksToRemove.push(i);
      } else {
        this.blocks[i].render(this.ctx, this.params.glowRadius);
      }
    }

    for (let i = blocksToRemove.length - 1; i >= 0; i--) {
      this.blocks.splice(blocksToRemove[i], 1);
    }

    if (blocksToRemove.length > 0 || this.blocks.length !== this.lastNoteCount) {
      this.lastNoteCount = this.blocks.length;
      this.uiController.updateStatusBar(this.blocks.length);
    }

    this.ctx.restore();
  }

  private drawStars(w: number, h: number, brightness: number): void {
    this.ctx.save();
    for (let i = 0; i < 60; i++) {
      const x = (i * 137.5) % w;
      const y = (i * 97.3) % h;
      const size = 0.5 + (i % 3) * 0.5;
      const alpha = (0.15 + (i % 5) * 0.08) * brightness;
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16),
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

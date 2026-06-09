import { StormSystem } from './storm';
import type { WaveVertex, FoamParticle } from './storm';
import { MessageSystem } from './message';
import type { Bottle } from './message';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SHORE_WIDTH = 50;
const PIXEL_COLORS = {
  sky: '#87CEEB',
  oceanDeep: '#1E90FF',
  oceanShallow: '#87CEEB',
  foam: '#FFFFFF',
  shoreLight: '#F4D03F',
  shoreDark: '#E59866',
  bottleBody: '#DEB887',
  bottleCork: '#8B4513',
  bottleGlass: 'rgba(222, 184, 135, 0.7)',
  bottleHighlight: 'rgba(255, 255, 255, 0.5)',
  statusBg: 'rgba(255, 255, 255, 0.8)',
  goldBorder: '#FFD700',
  text: '#2C3E50'
};

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private storm: StormSystem;
  private messages: MessageSystem;
  private lastTime: number = 0;
  private animationId: number = 0;
  private statusFlashTimer: number = 0;
  private currentSalvageInfo: Bottle | null = null;
  private salvageInfoTimer: number = 0;

  private statusCurrentEl: HTMLElement;
  private statusFloatingEl: HTMLElement;
  private statusSalvagedEl: HTMLElement;
  private statusBarEl: HTMLElement;
  private salvageInfoEl: HTMLElement;
  private throwBtnEl: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.storm = new StormSystem();
    this.messages = new MessageSystem();

    this.statusCurrentEl = document.getElementById('status-current')!;
    this.statusFloatingEl = document.getElementById('status-floating')!;
    this.statusSalvagedEl = document.getElementById('status-salvaged')!;
    this.statusBarEl = document.getElementById('status-bar')!;
    this.salvageInfoEl = document.getElementById('salvage-info')!;
    this.throwBtnEl = document.getElementById('throw-btn')!;

    this.setupEventListeners();
    this.setupSalvageCallback();
  }

  private setupEventListeners(): void {
    this.throwBtnEl.addEventListener('click', () => {
      this.messages.throwBottle();
      this.updateStatusUI();
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      if (x > SHORE_WIDTH) {
        const bottle = this.messages.trySalvage(x, y);
        if (bottle) {
          this.triggerStatusFlash();
        }
      }
    });

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private setupSalvageCallback(): void {
    this.messages.onSalvage((bottle: Bottle) => {
      this.currentSalvageInfo = bottle;
      this.salvageInfoTimer = 5;
      this.updateSalvageInfo(bottle);
      this.updateStatusUI();
    });
  }

  private handleResize(): void {
    const container = this.canvas.parentElement!;
    const maxWidth = Math.min(window.innerWidth, CANVAS_WIDTH);
    
    if (window.innerWidth < 600) {
      const displayWidth = window.innerWidth - 20;
      const displayHeight = (displayWidth * 9) / 16;
      this.canvas.style.width = displayWidth + 'px';
      this.canvas.style.height = displayHeight + 'px';
    } else {
      this.canvas.style.width = CANVAS_WIDTH + 'px';
      this.canvas.style.height = CANVAS_HEIGHT + 'px';
    }
  }

  private triggerStatusFlash(): void {
    this.statusFlashTimer = 2;
    this.statusBarEl.style.borderColor = PIXEL_COLORS.goldBorder;
    this.statusBarEl.style.borderWidth = '3px';
    this.statusBarEl.style.boxShadow = `0 0 20px ${PIXEL_COLORS.goldBorder}`;
  }

  private updateStatusUI(): void {
    this.statusCurrentEl.textContent = `洋流: ${this.storm.getCurrentStrengthLevel()}级`;
    this.statusFloatingEl.textContent = `漂浮: ${this.messages.getFloatingCount()}个`;
    this.statusSalvagedEl.textContent = `打捞: ${this.messages.getSalvageCount()}次`;
  }

  private updateSalvageInfo(bottle: Bottle): void {
    const countText = bottle.salvageCount > 1 ? `第${bottle.salvageCount}次被捞起` : '首次被捞起';
    this.salvageInfoEl.innerHTML = `
      <div
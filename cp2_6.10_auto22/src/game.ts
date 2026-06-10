import { Player, SoundPulse, Ripple } from './player';
import { DungeonMap, Item, TILE_SIZE, GRID_SIZE, CANVAS_SIZE } from './map';

interface GameState {
  currentLevel: number;
  totalCoins: number;
  totalKeys: number;
  collectedCoinsByLevel: Record<number, string[]>;
  collectedKeysByLevel: Record<number, string[]>;
}

const STORAGE_KEY = 'sonar_dungeon_save';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  scanCanvas: HTMLCanvasElement;
  scanCtx: CanvasRenderingContext2D;
  player: Player;
  map: DungeonMap;
  currentLevel: number;
  totalCoins: number;
  totalKeys: number;
  collectedCoinsByLevel: Record<number, string[]>;
  collectedKeysByLevel: Record<number, string[]>;
  echoIntensity: number;
  terrainDensity: number;
  screenShake: { active: boolean; startTime: number; duration: number; intensity: number };
  audioCtx: AudioContext | null;
  messageEl: HTMLElement | null;
  messageTimeout: number | null;
  lastFrameTime: number;
  running: boolean;
  scale: number;
  offsetX: number;
  offsetY: number;

  constructor(canvas: HTMLCanvasElement, scanCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.scanCanvas = scanCanvas;
    const scanCtx = scanCanvas.getContext('2d');
    if (!scanCtx) throw new Error('Failed to get scanlines context');
    this.scanCtx = scanCtx;

    this.currentLevel = 1;
    this.totalCoins = 0;
    this.totalKeys = 0;
    this.collectedCoinsByLevel = {};
    this.collectedKeysByLevel = {};
    this.echoIntensity = 0;
    this.terrainDensity = 0;
    this.screenShake = { active: false, startTime: 0, duration: 100, intensity: 3 };
    this.audioCtx = null;
    this.messageEl = null;
    this.messageTimeout = null;
    this.lastFrameTime = performance.now();
    this.running = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.loadState();

    this.map = new DungeonMap(this.currentLevel);
    const spawn = this.map.gridToWorld(this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.player = new Player(spawn.x, spawn.y);

    this.restoreLevelState();
    this.resize();
    this.setupMessageElement();
    this.setupResizeListener();
  }

  private setupMessageElement(): void {
    this.messageEl = document.getElementById('game-message');
  }

  private setupResizeListener(): void {
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const size = Math.min(w, h) * 0.92;

    this.scale = size / CANVAS_SIZE;
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;

    this.scanCanvas.width = CANVAS_SIZE;
    this.scanCanvas.height = CANVAS_SIZE;
    this.scanCanvas.style.width = `${size}px`;
    this.scanCanvas.style.height = `${size}px`;

    this.offsetX = (w - size) / 2;
    this.offsetY = (h - size) / 2;

    this.drawScanlines();
  }

  private drawScanlines(): void {
    this.scanCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    this.scanCtx.fillStyle = '#ffffff';
    for (let y = 0; y < CANVAS_SIZE; y += 3) {
      this.scanCtx.fillRect(0, y, CANVAS_SIZE, 1);
    }
  }

  private initAudio(): void {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        this.audioCtx = null;
      }
    }
  }

  private playCoinSound(): void {
    this.initAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(900, now + 0.15);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  private playKeySound(): void {
    this.initAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.1);
    osc.frequency.linearRampToValueAtTime(1000, now + 0.2);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  private playPortalSound(): void {
    this.initAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  private playDoorSound(): void {
    this.initAudio();
    if (!this.audioCtx) return;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    const now = this.audioCtx.currentTime;
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(400, now + 0.4);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  private showMessage(text: string, duration: number = 1500): void {
    if (!this.messageEl) return;
    this.messageEl.textContent = text;
    this.messageEl.classList.add('show');

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageTimeout = window.setTimeout(() => {
      if (this.messageEl) {
        this.messageEl.classList.remove('show');
      }
    }, duration);
  }

  private updateHUD(): void {
    const echoEl = document.getElementById('echo-intensity');
    const densityEl = document.getElementById('terrain-density');
    const coinsEl = document.getElementById('coins-count');
    const keysEl = document.getElementById('keys-count');
    const levelEl = document.getElementById('level-display');

    if (echoEl) echoEl.textContent = this.echoIntensity.toFixed(2);
    if (densityEl) densityEl.textContent = this.terrainDensity.toFixed(2);
    if (coinsEl) coinsEl.textContent = String(this.totalCoins);
    if (keysEl) keysEl.textContent = String(this.totalKeys);
    if (levelEl) {
      levelEl.textContent = String(this.currentLevel);
      if (this.currentLevel > 3) {
        levelEl.classList.add('deep');
      } else {
        levelEl.classList.remove('deep');
      }
    }
  }

  private triggerShake(): void {
    this.screenShake.active = true;
    this.screenShake.startTime = performance.now();
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state: GameState = JSON.parse(saved);
        this.currentLevel = state.currentLevel || 1;
        this.totalCoins = state.totalCoins || 0;
        this.totalKeys = state.totalKeys || 0;
        this.collectedCoinsByLevel = state.collectedCoinsByLevel || {};
        this.collectedKeysByLevel = state.collectedKeysByLevel || {};
      }
    } catch {
      console.warn('Failed to load saved state');
    }
  }

  saveState(): void {
    try {
      const state: GameState = {
        currentLevel: this.currentLevel,
        totalCoins: this.totalCoins,
        totalKeys: this.totalKeys,
        collectedCoinsByLevel: this.collectedCoinsByLevel,
        collectedKeysByLevel: this.collectedKeysByLevel
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      console.warn('Failed to save state');
    }
  }

  private restoreLevelState(): void {
    const collectedCoins = this.collectedCoinsByLevel[this.currentLevel] || [];
    const collectedKeys = this.collectedKeysByLevel[this.currentLevel] || [];

    for (const item of this.map.items) {
      if (item.type === 'coin' && collectedCoins.includes(item.id)) {
        item.collected = true;
      }
      if (item.type === 'key' && collectedKeys.includes(item.id)) {
        item.collected = true;
      }
    }
  }

  private checkItemCollisions(): void {
    const pg = this.map.worldToGrid(this.player.x, this.player.y);

    for (const item of this.map.items) {
      if (item.collected && item.type !== 'door') continue;

      const dx = (item.x + 0.5) * TILE_SIZE - this.player.x;
      const dy = (item.y + 0.5) * TILE_SIZE - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.player.radius + TILE_SIZE * 0.4) {
        this.handleItemPickup(item, pg);
      }
    }
  }

  private handleItemPickup(item: Item, pg: { x: number; y: number }): void {
    switch (item.type) {
      case 'coin':
        if (!item.collected) {
          item.collected = true;
          this.totalCoins++;
          if (!this.collectedCoinsByLevel[this.currentLevel]) {
            this.collectedCoinsByLevel[this.currentLevel] = [];
          }
          this.collectedCoinsByLevel[this.currentLevel].push(item.id);
          this.playCoinSound();
          this.showMessage('+ 1 金币', 800);
          this.saveState();
        }
        break;

      case 'key':
        if (!item.collected) {
          item.collected = true;
          this.totalKeys++;
          if (!this.collectedKeysByLevel[this.currentLevel]) {
            this.collectedKeysByLevel[this.currentLevel] = [];
          }
          this.collectedKeysByLevel[this.currentLevel].push(item.id);
          this.playKeySound();
          this.showMessage('获得钥匙！', 1200);
          this.saveState();
        }
        break;

      case 'portal': {
        this.playPortalSound();
        this.showMessage('传送中...', 1000);
        let newPos = this.map.getRandomWalkablePosition();
        let attempts = 0;
        while (attempts < 50 && (Math.abs(newPos.x - pg.x) < 4 && Math.abs(newPos.y - pg.y) < 4)) {
          newPos = this.map.getRandomWalkablePosition();
          attempts++;
        }
        const worldPos = this.map.gridToWorld(newPos.x, newPos.y);
        this.player.setPosition(worldPos.x, worldPos.y);
        this.player.pulses = [];
        this.player.ripples = [];
        break;
      }

      case 'door':
        if (this.totalKeys > 0) {
          this.totalKeys--;
          this.playDoorSound();
          this.nextLevel();
        } else {
          this.showMessage('需要钥匙！', 1000);
        }
        break;
    }
  }

  private nextLevel(): void {
    if (this.currentLevel >= 6) {
      this.showMessage('★ 恭喜通关！★', 3000);
      this.currentLevel = 1;
      this.totalCoins = 0;
      this.totalKeys = 0;
      this.collectedCoinsByLevel = {};
      this.collectedKeysByLevel = {};
      this.saveState();
      setTimeout(() => {
        this.map = new DungeonMap(this.currentLevel);
        const spawn = this.map.gridToWorld(this.map.playerSpawn.x, this.map.playerSpawn.y);
        this.player.setPosition(spawn.x, spawn.y);
        this.player.pulses = [];
        this.player.ripples = [];
        this.restoreLevelState();
      }, 100);
      return;
    }

    this.currentLevel++;
    this.saveState();

    const depthLabel = this.currentLevel > 3 ? '深层' : '浅层';
    this.showMessage(`进入 ${depthLabel} 第 ${this.currentLevel > 3 ? this.currentLevel - 3 : this.currentLevel} 层`, 1500);

    this.map = new DungeonMap(this.currentLevel);
    const spawn = this.map.gridToWorld(this.map.playerSpawn.x, this.map.playerSpawn.y);
    this.player.setPosition(spawn.x, spawn.y);
    this.player.pulses = [];
    this.player.ripples = [];
    this.restoreLevelState();
  }

  start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const deltaTime = Math.min(50, now - this.lastFrameTime);
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number): void {
    const result = this.player.update(this.map, deltaTime);

    if (result.collided) {
      this.triggerShake();
    }

    if (this.player.pulses.length > 0) {
      let maxEcho = 0;
      for (const pulse of this.player.pulses) {
        const echo = this.map.calculateEchoIntensity(pulse.x, pulse.y, pulse.radius);
        if (echo > maxEcho) maxEcho = echo;
      }
      this.echoIntensity = maxEcho;
    } else {
      this.echoIntensity *= 0.92;
    }

    this.terrainDensity = this.map.calculateTerrainDensity(this.player.x, this.player.y);

    this.checkItemCollisions();
    this.updateHUD();
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();

    if (this.screenShake.active) {
      const now = performance.now();
      const elapsed = now - this.screenShake.startTime;
      if (elapsed < this.screenShake.duration) {
        const progress = elapsed / this.screenShake.duration;
        const intensity = this.screenShake.intensity * (1 - progress);
        const sx = (Math.random() - 0.5) * intensity * 2;
        const sy = (Math.random() - 0.5) * intensity * 2;
        ctx.translate(sx, sy);
      } else {
        this.screenShake.active = false;
      }
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    this.drawWalls();
    this.drawItems();
    this.drawRipples();
    this.drawSoundPulses();
    this.drawPlayer();
    this.drawFogOfWar();
    this.drawBorder();

    ctx.restore();
  }

  private drawWalls(): void {
    const ctx = this.ctx;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.map.grid[y][x] === 1) {
          const wx = x * TILE_SIZE;
          const wy = y * TILE_SIZE;

          ctx.strokeStyle = '#5D3FD3';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#5D3FD3';
          ctx.shadowBlur = 6;

          const hasTop = y > 0 && this.map.grid[y - 1][x] === 0;
          const hasBottom = y < GRID_SIZE - 1 && this.map.grid[y + 1][x] === 0;
          const hasLeft = x > 0 && this.map.grid[y][x - 1] === 0;
          const hasRight = x < GRID_SIZE - 1 && this.map.grid[y][x + 1] === 0;

          if (hasTop) {
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx + TILE_SIZE, wy);
            ctx.stroke();
          }
          if (hasBottom) {
            ctx.beginPath();
            ctx.moveTo(wx, wy + TILE_SIZE);
            ctx.lineTo(wx + TILE_SIZE, wy + TILE_SIZE);
            ctx.stroke();
          }
          if (hasLeft) {
            ctx.beginPath();
            ctx.moveTo(wx, wy);
            ctx.lineTo(wx, wy + TILE_SIZE);
            ctx.stroke();
          }
          if (hasRight) {
            ctx.beginPath();
            ctx.moveTo(wx + TILE_SIZE, wy);
            ctx.lineTo(wx + TILE_SIZE, wy + TILE_SIZE);
            ctx.stroke();
          }

          ctx.shadowBlur = 0;
        }
      }
    }
  }

  private drawItems(): void {
    const ctx = this.ctx;
    const t = performance.now() * 0.003;

    for (const item of this.map.items) {
      if (item.collected && item.type !== 'door') continue;

      const wx = item.x * TILE_SIZE + TILE_SIZE / 2;
      const wy = item.y * TILE_SIZE + TILE_SIZE / 2;
      const bobOffset = Math.sin(t + item.x + item.y) * 2;

      ctx.save();
      ctx.translate(wx, wy + bobOffset);

      switch (item.type) {
        case 'coin':
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFA500';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(-1, -1, 1.5, 0, Math.PI * 2);
          ctx.stroke();
          break;

        case 'key':
          ctx.shadowColor = '#C0C0C0';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#C0C0C0';
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(-4, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(-4, 0, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#C0C0C0';
          ctx.fillRect(-1, -1.5, 9, 3);
          ctx.fillRect(5, -1.5, 2, 5);
          ctx.fillRect(3, -1.5, 2, 4);
          break;

        case 'portal': {
          ctx.shadowColor = '#9932CC';
          ctx.shadowBlur = 20;
          for (let i = 3; i >= 0; i--) {
            const r = 10 + i * 3 + Math.sin(t * 2 + i) * 2;
            const alpha = 0.3 - i * 0.06;
            ctx.strokeStyle = `rgba(153, 50, 204, ${alpha + 0.3})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.fillStyle = '#9932CC';
          ctx.beginPath();
          ctx.arc(0, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'door':
          ctx.shadowColor = this.totalKeys > 0 ? '#00FF00' : '#FF4444';
          ctx.shadowBlur = 15;
          ctx.fillStyle = this.totalKeys > 0 ? '#00AA00' : '#882222';
          ctx.fillRect(-8, -12, 16, 24);
          ctx.strokeStyle = this.totalKeys > 0 ? '#00FF00' : '#FF4444';
          ctx.lineWidth = 2;
          ctx.strokeRect(-8, -12, 16, 24);
          ctx.fillStyle = this.totalKeys > 0 ? '#00FF00' : '#FF4444';
          ctx.beginPath();
          ctx.arc(4, 0, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      ctx.restore();
    }
  }

  private drawRipples(): void {
    const ctx = this.ctx;
    const now = performance.now();

    for (const ripple of this.player.ripples) {
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) continue;

      const progress = elapsed / ripple.duration;
      const alpha = (1 - progress) * 0.6;
      const radius = progress * ripple.maxRadius;

      ctx.save();
      ctx.strokeStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#64C8FF';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(150, 220, 255, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawSoundPulses(): void {
    const ctx = this.ctx;

    for (const pulse of this.player.pulses) {
      if (pulse.radius < 2) continue;

      const gradient = ctx.createRadialGradient(
        pulse.x, pulse.y, pulse.radius * 0.5,
        pulse.x, pulse.y, pulse.radius
      );
      gradient.addColorStop(0, `rgba(0, 255, 255, 0)`);
      gradient.addColorStop(0.6, `rgba(0, 255, 255, ${pulse.opacity * 0.15})`);
      gradient.addColorStop(0.85, `rgba(0, 255, 255, ${pulse.opacity * 0.6})`);
      gradient.addColorStop(1, `rgba(100, 255, 255, ${pulse.opacity * 0.9})`);

      ctx.save();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(200, 255, 255, ${pulse.opacity * 0.4})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pulse.x, pulse.y, pulse.radius * 0.92, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawPlayer(): void {
    const ctx = this.ctx;
    const t = this.player.glowPhase;
    const pulse = 1 + Math.sin(t) * 0.1;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 25;
    ctx.shadowColor = '#FFFFFF';
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -10 * pulse);
    ctx.lineTo(8 * pulse, 0);
    ctx.lineTo(0, 10 * pulse);
    ctx.lineTo(-8 * pulse, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawFogOfWar(): void {
    const ctx = this.ctx;
    const pg = this.map.worldToGrid(this.player.x, this.player.y);
    const revealRadius = 3;

    let sonicReveal: { x: number; y: number }[] = [];
    for (const pulse of this.player.pulses) {
      const g = this.map.worldToGrid(pulse.x, pulse.y);
      const gridR = Math.ceil(pulse.radius / TILE_SIZE);
      for (let dy = -gridR; dy <= gridR; dy++) {
        for (let dx = -gridR; dx <= gridR; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= gridR) {
            sonicReveal.push({ x: g.x + dx, y: g.y + dy });
          }
        }
      }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.map.explored[y][x]) continue;

        let revealed = false;
        const ddx = x - pg.x;
        const ddy = y - pg.y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) <= revealRadius) {
          revealed = true;
        }

        if (!revealed) {
          for (const s of sonicReveal) {
            if (s.x === x && s.y === y) {
              revealed = true;
              break;
            }
          }
        }

        if (!revealed) {
          ctx.fillStyle = 'rgba(0, 0, 0, 1)';
          ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  private drawBorder(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = '#5D3FD3';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#5D3FD3';
    ctx.shadowBlur = 10;
    ctx.strokeRect(1, 1, CANVAS_SIZE - 2, CANVAS_SIZE - 2);

    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 5;
    const cornerSize = 15;

    ctx.beginPath();
    ctx.moveTo(5, cornerSize + 5);
    ctx.lineTo(5, 5);
    ctx.lineTo(cornerSize + 5, 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - 5 - cornerSize, 5);
    ctx.lineTo(CANVAS_SIZE - 5, 5);
    ctx.lineTo(CANVAS_SIZE - 5, 5 + cornerSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, CANVAS_SIZE - 5 - cornerSize);
    ctx.lineTo(5, CANVAS_SIZE - 5);
    ctx.lineTo(5 + cornerSize, CANVAS_SIZE - 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE - 5 - cornerSize, CANVAS_SIZE - 5);
    ctx.lineTo(CANVAS_SIZE - 5, CANVAS_SIZE - 5);
    ctx.lineTo(CANVAS_SIZE - 5, CANVAS_SIZE - 5 - cornerSize);
    ctx.stroke();

    ctx.restore();
  }
}

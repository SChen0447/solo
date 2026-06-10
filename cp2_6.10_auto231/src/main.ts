import { GameManager } from './gameManager';
import { Renderer, UIHitbox } from './renderer';
import { Rarity, RoomType, BaitType, GHOSTS, getGhostsByRarity, ROOM_CONFIG, BAIT_CONFIG } from './ghostData';

const TARGET_FPS = 60;
const FRAME_MS = 1000 / TARGET_FPS;

class GameApp {
  private canvas: HTMLCanvasElement;
  private gameManager: GameManager;
  private renderer: Renderer;
  private lastFrameTime: number = 0;
  private animationId: number | null = null;
  private isPaused: boolean = false;
  private lastSaveTime: number = 0;
  private saveInterval: number = 10000;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.gameManager = new GameManager();
    this.renderer = new Renderer(this.canvas, this.gameManager);

    this.gameManager.loadSave();
    this.bindEvents();
    this.startLoop();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.isPaused = true;
        this.gameManager.save();
      } else {
        this.isPaused = false;
        this.lastFrameTime = performance.now();
      }
    });

    window.addEventListener('beforeunload', () => {
      this.gameManager.save();
    });
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.cancelPlacing();
    });
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleClick({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelPlacing();
      }
    });
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.renderer.screenToGame(sx, sy);

    if (this.renderer.placingBait) {
      if (x >= 20 && x <= 780 && y >= 60 && y <= 520) {
        const type = this.renderer.placingBait;
        const cooldown = this.gameManager.getBaitCooldown(type, performance.now());
        if (cooldown <= 0) {
          this.gameManager.placeBait(type, x, y);
        }
      }
      this.renderer.placingBait = null;
      return;
    }

    const hitbox = this.findHitboxAt(x, y);
    if (hitbox) {
      this.handleUIHit(hitbox);
      return;
    }

    const ghost = this.gameManager.findGhostAt(x, y);
    if (ghost) {
      this.gameManager.tryCatchGhost(ghost.instanceId, x, y);
      return;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.renderer.screenToGame(sx, sy);

    let hoveredBait: Exclude<BaitType, 'none'> | null = null;
    for (const hb of this.renderer.lastHitboxes) {
      if (hb.id === 'bait' && this.pointInRect(x, y, hb)) {
        hoveredBait = hb.data.type;
        break;
      }
    }
    this.renderer.hoveredBait = hoveredBait;

    if (this.renderer.placingBait) {
      this.canvas.style.cursor = 'crosshair';
    } else if (hoveredBait || this.findHitboxAt(x, y)) {
      this.canvas.style.cursor = 'pointer';
    } else if (this.gameManager.findGhostAt(x, y)) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private findHitboxAt(x: number, y: number): UIHitbox | null {
    for (let i = this.renderer.lastHitboxes.length - 1; i >= 0; i--) {
      const hb = this.renderer.lastHitboxes[i];
      if (this.pointInRect(x, y, hb)) {
        return hb;
      }
    }
    return null;
  }

  private pointInRect(x: number, y: number, r: UIHitbox): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  private handleUIHit(hitbox: UIHitbox): void {
    switch (hitbox.id) {
      case 'codex':
        this.renderer.setCodexOpen(!this.renderer.codexOpen);
        break;
      case 'codexTab':
        this.renderer.codexRarityTab = hitbox.data.rarity as Rarity;
        break;
      case 'compose':
        this.handleCompose();
        break;
      case 'resonance':
        this.gameManager.useResonance();
        break;
      case 'room':
        this.gameManager.setCurrentRoom(hitbox.data.room as RoomType);
        break;
      case 'unlock':
        this.gameManager.unlockRoom(hitbox.data.room as RoomType);
        break;
      case 'bait':
        this.handleBaitClick(hitbox.data.type as Exclude<BaitType, 'none'>);
        break;
    }
  }

  private handleBaitClick(type: Exclude<BaitType, 'none'>): void {
    const cooldown = this.gameManager.getBaitCooldown(type, performance.now());
    if (cooldown <= 0) {
      this.renderer.placingBait = type;
    }
  }

  private cancelPlacing(): void {
    this.renderer.placingBait = null;
  }

  private handleCompose(): void {
    const ghosts = getGhostsByRarity(this.renderer.codexRarityTab);
    for (const g of ghosts) {
      if (this.gameManager.canCompose(g.id)) {
        this.gameManager.compose(g.id);
        break;
      }
    }
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();
    const loop = (now: number) => {
      this.animationId = requestAnimationFrame(loop);
      if (this.isPaused) {
        this.lastFrameTime = now;
        return;
      }

      const dt = Math.min(now - this.lastFrameTime, FRAME_MS * 3);
      this.lastFrameTime = now;

      this.gameManager.update(now, dt);
      this.renderer.render(now);

      if (now - this.lastSaveTime >= this.saveInterval) {
        this.gameManager.save();
        this.lastSaveTime = now;
      }
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.gameManager.save();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

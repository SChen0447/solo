import type { GameState, InputState } from './entities';
import {
  createPlayer,
  createMushrooms,
  createStarDust,
  createTentacle,
  createPortal,
  createStars,
  updatePlayer,
  updateMushroom,
  updateSpore,
  updateStarDust,
  updateTentacle,
  updatePortal,
  updateStars,
  updateParticle,
  applyPlayerBoost,
  applyPlayerSlow,
  triggerPlayerFlash,
  triggerMushroomsPulse,
  createExplosionParticles,
  checkCollision,
  checkTentaclePlayerCollision,
} from './entities';
import { Renderer } from './renderer';

export class GameLoop {
  private state: GameState;
  private renderer: Renderer;
  private input: InputState;
  private lastTime: number = 0;
  private running: boolean = false;
  private animationId: number = 0;
  private mousePos: { x: number; y: number } | null = null;
  private onRestartCallback: (() => void) | null = null;
  private onPortalCallback: (() => void) | null = null;
  private readonly FRAME_TIME = 1000 / 60;
  private accumulator: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number, level: number = 1) {
    this.input = { up: false, down: false, left: false, right: false };
    this.state = this.createInitialState(width, height, level);
    this.renderer = new Renderer(ctx, width, height);
  }

  private createInitialState(width: number, height: number, level: number): GameState {
    const mushroomCount = 25 + (level - 1) * 10;
    const tentacleInterval = Math.max(4000, 11000 - (level - 1) * 2000);

    const mushrooms = createMushrooms(mushroomCount, width, height, 40);

    return {
      player: createPlayer(width, height),
      mushrooms,
      spores: [],
      starDusts: [],
      tentacles: [],
      portal: null,
      particles: [],
      stars: createStars(120, width, height),
      starCount: 0,
      level,
      isGameOver: false,
      gameOverTimer: 0,
      nextStarTimer: 3000,
      nextTentacleTimer: tentacleInterval,
      canvasWidth: width,
      canvasHeight: height,
      mushroomBaseCount: mushroomCount,
      tentacleBaseInterval: tentacleInterval,
      showRestartButton: false,
      restartButton: null,
    };
  }

  setInput(input: InputState): void {
    this.input = { ...input };
  }

  setMousePos(x: number, y: number): void {
    this.mousePos = { x, y };
  }

  handleClick(x: number, y: number): boolean {
    if (this.state.isGameOver && this.state.showRestartButton && this.state.restartButton) {
      const btn = this.state.restartButton;
      if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.restart();
        return true;
      }
    }
    return false;
  }

  onRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  onPortal(callback: () => void): void {
    this.onPortalCallback = callback;
  }

  resize(width: number, height: number): void {
    this.state.canvasWidth = width;
    this.state.canvasHeight = height;
    this.renderer.resize(width, height);
    this.renderer.invalidateMushroomCache();
  }

  restart(): void {
    const level = 1;
    this.state = this.createInitialState(
      this.state.canvasWidth,
      this.state.canvasHeight,
      level
    );
    this.renderer.invalidateMushroomCache();
    if (this.onRestartCallback) {
      this.onRestartCallback();
    }
  }

  private advanceLevel(): void {
    const newLevel = this.state.level + 1;
    const mushroomCount = 25 + (newLevel - 1) * 10;
    const tentacleInterval = Math.max(4000, 11000 - (newLevel - 1) * 2000);

    const newMushrooms = createMushrooms(mushroomCount, this.state.canvasWidth, this.state.canvasHeight, 40);

    this.state.level = newLevel;
    this.state.mushrooms = newMushrooms;
    this.state.spores = [];
    this.state.starDusts = [];
    this.state.tentacles = [];
    this.state.portal = null;
    this.state.particles = [];
    this.state.starCount = 0;
    this.state.nextStarTimer = 3000;
    this.state.nextTentacleTimer = tentacleInterval;
    this.state.mushroomBaseCount = mushroomCount;
    this.state.tentacleBaseInterval = tentacleInterval;
    this.state.player.pos = { x: this.state.canvasWidth / 2, y: this.state.canvasHeight / 2 };
    this.state.player.trail = [];
    this.renderer.invalidateMushroomCache();

    if (this.onPortalCallback) {
      this.onPortalCallback();
    }
  }

  getState(): GameState {
    return this.state;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = Math.min(100, now - this.lastTime);
    this.lastTime = now;

    this.accumulator += delta;
    while (this.accumulator >= this.FRAME_TIME) {
      this.update(this.FRAME_TIME);
      this.accumulator -= this.FRAME_TIME;
    }

    this.renderer.render(this.state, this.mousePos);
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    if (this.state.isGameOver) {
      this.updateGameOver(dt);
      this.updateParticles(dt);
      return;
    }

    updatePlayer(
      this.state.player,
      this.input,
      dt,
      this.state.canvasWidth,
      this.state.canvasHeight
    );

    this.updateMushrooms(dt);
    this.updateSpores(dt);
    this.checkSporePlayerCollision();
    this.updateStarDusts(dt);
    this.checkStarCollection();
    this.updateTentacles(dt);
    this.checkTentacleCollision();
    this.updatePortal(dt);
    this.checkPortalCollision();
    updateStars(this.state.stars, dt);
    this.updateParticles(dt);
    this.spawnEntities(dt);
  }

  private updateMushrooms(dt: number): void {
    let needCacheInvalidate = false;
    for (const m of this.state.mushrooms) {
      const wasPulsing = m.isPulsing;
      updateMushroom(m, dt, this.state.spores);
      if (wasPulsing !== m.isPulsing || m.isPulsing) {
        needCacheInvalidate = true;
      }
    }
    if (needCacheInvalidate) {
      this.renderer.invalidateMushroomCache();
    }
  }

  private updateSpores(dt: number): void {
    this.state.spores = this.state.spores.filter((s) => updateSpore(s, dt));
  }

  private checkSporePlayerCollision(): void {
    if (this.state.player.isSlowed) return;

    for (const s of this.state.spores) {
      if (checkCollision(s.pos, s.radius, this.state.player.pos, this.state.player.radius)) {
        applyPlayerSlow(this.state.player);
        triggerPlayerFlash(this.state.player, '#ff6666');
        break;
      }
    }
  }

  private updateStarDusts(dt: number): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    this.state.starDusts = this.state.starDusts.filter(
      (star) => updateStarDust(star, dt, this.state.player, w, h)
    );
  }

  private checkStarCollection(): void {
    const collected: number[] = [];

    this.state.starDusts.forEach((star, index) => {
      if (star.isAbsorbing && star.absorbTimer <= 0 && !star.active) {
        collected.push(index);
      }
    });

    if (collected.length > 0) {
      const newCount = this.state.starCount + collected.length;
      const oldBoostThreshold = Math.floor(this.state.starCount / 5);
      const newBoostThreshold = Math.floor(newCount / 5);
      const oldPortalThreshold = this.state.starCount >= 15;
      const newPortalThreshold = newCount >= 15;

      for (let i = 0; i < collected.length; i++) {
        this.state.particles.push(
          ...createExplosionParticles(this.state.player.pos, '#ffd700', 6)
        );
      }

      this.state.starCount = newCount;

      if (newBoostThreshold > oldBoostThreshold) {
        applyPlayerBoost(this.state.player);
        this.state.particles.push(
          ...createExplosionParticles(this.state.player.pos, '#00ffd5', 12)
        );
      }

      if (newPortalThreshold && !oldPortalThreshold) {
        triggerMushroomsPulse(this.state.mushrooms);
        this.renderer.invalidateMushroomCache();
        this.state.portal = createPortal(this.state.canvasWidth, this.state.canvasHeight);
        this.state.particles.push(
          ...createExplosionParticles(
            { x: this.state.canvasWidth / 2, y: this.state.canvasHeight / 2 },
            '#c864ff',
            30
          )
        );
      }
    }
  }

  private updateTentacles(dt: number): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    this.state.tentacles = this.state.tentacles.filter(
      (t) => updateTentacle(t, dt, this.state.player, w, h)
    );
  }

  private checkTentacleCollision(): void {
    for (const t of this.state.tentacles) {
      if (checkTentaclePlayerCollision(t, this.state.player)) {
        this.triggerGameOver();
        break;
      }
    }
  }

  private updatePortal(dt: number): void {
    if (this.state.portal && this.state.portal.active) {
      updatePortal(this.state.portal, dt);
    }
  }

  private checkPortalCollision(): void {
    if (this.state.portal && this.state.portal.active) {
      if (
        checkCollision(
          this.state.portal.pos,
          this.state.portal.radius * 0.6,
          this.state.player.pos,
          this.state.player.radius
        )
      ) {
        this.advanceLevel();
      }
    }
  }

  private updateParticles(dt: number): void {
    this.state.particles = this.state.particles.filter((p) => updateParticle(p, dt));
  }

  private spawnEntities(dt: number): void {
    this.state.nextStarTimer -= dt;
    if (this.state.nextStarTimer <= 0) {
      this.state.nextStarTimer = 3000 + Math.random() * 2000;
      if (this.state.starDusts.length < 5) {
        const star = createStarDust(
          this.state.canvasWidth,
          this.state.canvasHeight,
          this.state.mushrooms
        );
        if (star) this.state.starDusts.push(star);
      }
    }

    this.state.nextTentacleTimer -= dt;
    if (this.state.nextTentacleTimer <= 0) {
      const interval = this.state.tentacleBaseInterval;
      this.state.nextTentacleTimer = interval + Math.random() * 2000;
      if (this.state.tentacles.length < 3 + this.state.level) {
        this.state.tentacles.push(
          createTentacle(
            this.state.canvasWidth,
            this.state.canvasHeight,
            this.state.player.pos
          )
        );
      }
    }
  }

  private triggerGameOver(): void {
    this.state.isGameOver = true;
    this.state.gameOverTimer = 0;
    this.state.showRestartButton = false;
    this.state.restartButton = null;
    triggerPlayerFlash(this.state.player, '#ff3366');
    this.state.particles.push(
      ...createExplosionParticles(this.state.player.pos, '#c864ff', 40)
    );
  }

  private updateGameOver(dt: number): void {
    this.state.gameOverTimer += dt;

    if (this.state.gameOverTimer >= 1500 && !this.state.showRestartButton) {
      this.state.showRestartButton = true;
      const btnW = 140;
      const btnH = 44;
      this.state.restartButton = {
        x: (this.state.canvasWidth - btnW) / 2,
        y: this.state.canvasHeight / 2 + 40,
        w: btnW,
        h: btnH,
      };
    }

    updateStars(this.state.stars, dt);
  }
}

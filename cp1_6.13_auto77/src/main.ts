import { Player } from './Player';
import { Enemy } from './Enemy';
import { Renderer } from './Renderer';
import { Particle, GameState, CONFIG } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private player: Player;
  private enemy: Enemy;
  private renderer: Renderer;
  private particles: Particle[] = [];
  private gameState: GameState;
  private lastTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;

    this.player = new Player(width, height);
    this.enemy = new Enemy(width, height);
    this.renderer = new Renderer(this.canvas, width, height);

    this.gameState = {
      status: 'playing',
      playerHealth: CONFIG.PLAYER_MAX_HEALTH,
      crystalHealth: CONFIG.CRYSTAL_MAX_HEALTH,
      reflectCount: 0,
      score: 0,
    };

    this.bindEvents();
    this.hideLoadingScreen();
    this.start();
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loadingScreen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 500);
      }
    }, 800);
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (['w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
    this.player.handleKeyDown(e.key);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.player.handleKeyUp(e.key);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.player.resize(width, height);
    this.enemy.resize(width, height);
    this.renderer.resize(width, height);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.gameState.status === 'playing') {
      this.player.handleMouseClick(mouseX, mouseY);
    } else {
      if (this.renderer.isRestartButtonClicked(mouseX, mouseY, this.gameState)) {
        this.restart();
      }
    }
  }

  private restart(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.player = new Player(width, height);
    this.enemy = new Enemy(width, height);
    this.particles = [];

    this.gameState = {
      status: 'playing',
      playerHealth: CONFIG.PLAYER_MAX_HEALTH,
      crystalHealth: CONFIG.CRYSTAL_MAX_HEALTH,
      reflectCount: 0,
      score: 0,
    };
  }

  private start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    if (this.gameState.status === 'playing') {
      this.update(deltaTime);
    }

    this.render(deltaTime);
    requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number): void {
    const reflectParticles = this.player.update(deltaTime, this.enemy.bullets, () => {
      this.gameState.reflectCount++;
      this.gameState.score += 10;
    });
    this.particles.push(...reflectParticles);

    const crystalHitParticles = this.enemy.update(deltaTime, this.player.x, this.player.y);
    this.particles.push(...crystalHitParticles);

    if (this.enemy.checkPlayerCollision(this.player.x, this.player.y, this.player.width, this.player.height)) {
      const isDead = this.player.takeDamage();
      this.gameState.playerHealth = this.player.health;
      this.renderer.triggerFlash();

      if (isDead) {
        this.gameState.status = 'defeat';
      }
    }

    if (this.player.chargedBeam && this.player.chargedBeam.active) {
      if (this.enemy.checkBeamCollision(
        this.player.chargedBeam.x,
        this.player.chargedBeam.y,
        this.player.chargedBeam.width
      )) {
        const hitParticles = this.enemy.takeDamage();
        this.particles.push(...hitParticles);
        this.gameState.crystalHealth = this.enemy.health;
        this.gameState.score += 50;
        this.player.chargedBeam.active = false;
        this.player.chargedBeam = null;

        if (this.enemy.health <= 0) {
          this.gameState.status = 'victory';
        }
      }
    }

    this.updateParticles(deltaTime);
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 50 * deltaTime;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private render(deltaTime: number): void {
    this.renderer.update(deltaTime, this.gameState);

    const shieldInfo = this.player.getShieldInfo();
    const crystalInfo = this.enemy.getCrystalInfo();

    this.renderer.render(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height,
      this.player.health,
      this.player.isCharged,
      this.player.engineParticles,
      shieldInfo,
      crystalInfo,
      this.enemy.bullets,
      this.player.chargedBeam,
      this.particles,
      this.gameState
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

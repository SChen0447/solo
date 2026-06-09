import { generateMaze, GameMap, CELL_SIZE, GRID_SIZE, Position, isWall } from './map';
import { Player } from './player';
import { Monster, createMonsters } from './monster';
import { Renderer } from './renderer';

type GameState = 'menu' | 'instructions' | 'playing' | 'gameover' | 'victory';

class Game {
  canvas: HTMLCanvasElement;
  renderer: Renderer;
  state: GameState = 'menu';
  map!: GameMap;
  player!: Player;
  monsters: Monster[] = [];
  lastTime: number = 0;
  exitOpen: boolean = false;
  gameOverTimer: number = 0;
  victoryTimer: number = 0;
  fireworkTimer: number = 0;
  visibleGrid: boolean[][] = [];

  menuScreen!: HTMLElement;
  instructionsScreen!: HTMLElement;
  gameOverScreen!: HTMLElement;
  victoryScreen!: HTMLElement;
  scoreDisplay!: HTMLElement;
  countdownEl!: HTMLElement;
  victoryScoreEl!: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);

    this.menuScreen = document.getElementById('menu-screen')!;
    this.instructionsScreen = document.getElementById('instructions-screen')!;
    this.gameOverScreen = document.getElementById('game-over-screen')!;
    this.victoryScreen = document.getElementById('victory-screen')!;
    this.scoreDisplay = document.getElementById('score-display')!;
    this.countdownEl = document.getElementById('countdown')!;
    this.victoryScoreEl = document.getElementById('victory-score')!;

    this.bindEvents();
    this.initVisibleGrid();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private initVisibleGrid() {
    this.visibleGrid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      this.visibleGrid[y] = new Array(GRID_SIZE).fill(false);
    }
  }

  private bindEvents() {
    document.getElementById('start-btn')!.addEventListener('click', () => this.startGame());
    document.getElementById('instructions-btn')!.addEventListener('click', () => this.showInstructions());
    document.getElementById('back-btn')!.addEventListener('click', () => this.showMenu());

    window.addEventListener('resize', () => this.renderer.resize());

    window.addEventListener('keydown', (e) => {
      if (this.state === 'playing' && this.player) {
        this.player.setKey(e.key, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.player) {
        this.player.setKey(e.key, false);
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.state === 'playing' && this.player) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX / (window.devicePixelRatio || 1);
        const y = (e.clientY - rect.top) * scaleY / (window.devicePixelRatio || 1);
        if (x >= 0 && x <= this.renderer.width && y >= 0 && y <= this.renderer.height) {
          this.player.firePulse();
        }
      }
    });
  }

  private startGame() {
    this.map = generateMaze();
    this.player = new Player(this.map.start);
    const monsterCount = 5 + Math.floor(Math.random() * 3);
    this.monsters = createMonsters(this.map, monsterCount);
    for (const m of this.monsters) {
      m.generatePatrolPath(this.map);
    }
    this.exitOpen = false;
    this.initVisibleGrid();
    this.revealArea(this.player.x, this.player.y, 120);
    this.state = 'playing';

    this.menuScreen.classList.add('hidden');
    this.instructionsScreen.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');
    this.victoryScreen.classList.add('hidden');
    this.scoreDisplay.style.display = 'block';
    this.updateScoreDisplay();
  }

  private showInstructions() {
    this.menuScreen.classList.add('hidden');
    this.instructionsScreen.classList.remove('hidden');
    this.state = 'instructions';
  }

  private showMenu() {
    this.instructionsScreen.classList.add('hidden');
    this.menuScreen.classList.remove('hidden');
    this.scoreDisplay.style.display = 'none';
    this.state = 'menu';
  }

  private gameOver() {
    this.state = 'gameover';
    this.gameOverTimer = 3;
    this.gameOverScreen.classList.remove('hidden');
    this.countdownEl.textContent = '3';
  }

  private victory() {
    this.state = 'victory';
    this.victoryTimer = 5;
    this.fireworkTimer = 0;
    this.victoryScreen.classList.remove('hidden');
    this.victoryScoreEl.textContent = `最终积分: ${this.player.score}`;
  }

  private updateScoreDisplay() {
    const collected = this.map.treasures.filter(t => t.collected).length;
    this.scoreDisplay.textContent = `积分: ${this.player.score} / 50  (宝箱: ${collected}/5)`;
  }

  private revealArea(px: number, py: number, radius: number) {
    const gx = Math.floor(px / CELL_SIZE);
    const gy = Math.floor(py / CELL_SIZE);
    const gr = Math.ceil(radius / CELL_SIZE) + 1;

    for (let y = gy - gr; y <= gy + gr; y++) {
      for (let x = gx - gr; x <= gx + gr; x++) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const cx = x * CELL_SIZE + CELL_SIZE / 2;
          const cy = y * CELL_SIZE + CELL_SIZE / 2;
          const dist = Math.sqrt((cx - px) ** 2 + (cy - py) ** 2);
          if (dist <= radius) {
            this.visibleGrid[y][x] = true;
          }
        }
      }
    }
  }

  private checkPulseCollisions() {
    if (!this.player) return;

    for (const pulse of this.player.pulses) {
      const gx = Math.floor(pulse.x / CELL_SIZE);
      const gy = Math.floor(pulse.y / CELL_SIZE);
      const gr = Math.ceil(pulse.radius / CELL_SIZE) + 1;

      for (let y = gy - gr; y <= gy + gr; y++) {
        for (let x = gx - gr; x <= gx + gr; x++) {
          if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) continue;
          if (isWall(this.map, x, y)) {
            const key = `${x},${y}`;
            if (!pulse.hitWalls.has(key)) {
              const cx = x * CELL_SIZE + CELL_SIZE / 2;
              const cy = y * CELL_SIZE + CELL_SIZE / 2;
              const dist = Math.sqrt((cx - pulse.x) ** 2 + (cy - pulse.y) ** 2);
              if (dist <= pulse.radius + CELL_SIZE / 2) {
                pulse.hitWalls.add(key);
                this.player.addEcho(cx, cy, 'wall');
                this.revealArea(cx, cy, 64);
              }
            }
          }
        }
      }

      for (const monster of this.monsters) {
        if (!pulse.hitMonsters.has(monster.id)) {
          if (monster.checkPulseCollision(pulse.x, pulse.y, pulse.radius)) {
            pulse.hitMonsters.add(monster.id);
            this.player.addEcho(monster.x, monster.y, 'monster');
            monster.stun();
            this.revealArea(monster.x, monster.y, 64);
          }
        }
      }

      this.revealArea(pulse.x, pulse.y, pulse.radius);
    }
  }

  private checkTreasureCollection() {
    const pg = this.player.getGridPosition();
    for (const treasure of this.map.treasures) {
      if (!treasure.collected && treasure.x === pg.x && treasure.y === pg.y) {
        treasure.collected = true;
        this.player.addScore(10);
        this.updateScoreDisplay();
        const allCollected = this.map.treasures.every(t => t.collected);
        if (allCollected) {
          this.exitOpen = true;
        }
      }
    }
  }

  private checkExit() {
    if (!this.exitOpen) return;
    const pg = this.player.getGridPosition();
    if (pg.x === this.map.exit.x && pg.y === this.map.exit.y) {
      this.victory();
    }
  }

  private checkMonsterCollisions() {
    for (const monster of this.monsters) {
      if (monster.checkPlayerCollision(this.player.x, this.player.y, this.player.radius)) {
        this.gameOver();
        return;
      }
    }
  }

  private update(dt: number) {
    this.renderer.update(dt);

    if (this.state === 'playing') {
      this.player.update(dt, this.map);
      for (const monster of this.monsters) {
        monster.update(dt, this.map, this.player.x, this.player.y);
      }
      this.checkPulseCollisions();
      this.checkTreasureCollection();
      this.checkMonsterCollisions();
      this.checkExit();
      this.revealArea(this.player.x, this.player.y, 80);
    } else if (this.state === 'gameover') {
      this.gameOverTimer -= dt;
      this.countdownEl.textContent = Math.ceil(this.gameOverTimer).toString();
      if (this.gameOverTimer <= 0) {
        this.startGame();
      }
    } else if (this.state === 'victory') {
      this.victoryTimer -= dt;
      this.fireworkTimer -= dt;
      if (this.fireworkTimer <= 0) {
        this.fireworkTimer = 0.3;
        const fx = Math.random() * this.renderer.width;
        const fy = Math.random() * this.renderer.height * 0.6 + 50;
        this.renderer.spawnFirework(fx, fy);
      }
      if (this.victoryTimer <= 0) {
        this.showMenu();
        this.victoryScreen.classList.add('hidden');
      }
    }
  }

  private render() {
    if (this.state === 'menu' || this.state === 'instructions') {
      this.renderer.drawMenu();
      if (this.state === 'victory') {
        this.renderer.drawFireworks();
      }
    } else if (this.state === 'playing' || this.state === 'gameover') {
      this.renderer.drawGame(this.map, this.player, this.monsters, this.exitOpen, this.visibleGrid);
    } else if (this.state === 'victory') {
      this.renderer.drawGame(this.map, this.player, this.monsters, this.exitOpen, this.visibleGrid);
      this.renderer.drawFireworks();
    }
  }

  private gameLoop = () => {
    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.1) dt = 0.1;
    this.lastTime = now;

    this.update(dt);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});

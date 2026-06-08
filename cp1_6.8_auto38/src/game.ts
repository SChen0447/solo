import { GameMap } from './map';
import { Player, Monster, Gold } from './entity';

const CELL_SIZE = 20;
const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;
const STATUS_BAR_HEIGHT = 40;
const ASPECT_RATIO = 16 / 9;

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map!: GameMap;
  player!: Player;
  monsters: Monster[] = [];
  golds: Gold[] = [];
  floatingTexts: FloatingText[] = [];
  particles: Particle[] = [];

  cameraX: number = 0;
  cameraY: number;
  targetCameraX: number = 0;
  targetCameraY: number = 0;
  cameraSmoothTime: number = 0.1;

  lastTime: number = 0;
  gameWon: boolean = false;
  winAnimationTime: number = 0;
  totalGold: number = 3;
  collectedGold: number = 0;
  totalMonsters: number = 2;

  viewportWidth: number = 0;
  viewportHeight: number = 0;

  keys: Set<string> = new Set();
  moveCooldown: number = 0;
  moveCooldownTime: number = 0.12;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.cameraY = STATUS_BAR_HEIGHT;
    this.targetCameraY = STATUS_BAR_HEIGHT;
    this.resize();
    this.init();
    this.setupInput();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let canvasWidth, canvasHeight;
    if (windowWidth / windowHeight > ASPECT_RATIO) {
      canvasHeight = windowHeight;
      canvasWidth = canvasHeight * ASPECT_RATIO;
    } else {
      canvasWidth = windowWidth;
      canvasHeight = canvasWidth / ASPECT_RATIO;
    }

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';

    this.viewportWidth = canvasWidth;
    this.viewportHeight = canvasHeight;

    this.ctx.imageSmoothingEnabled = false;
  }

  init(): void {
    this.map = new GameMap(MAP_WIDTH, MAP_HEIGHT);
    this.monsters = [];
    this.golds = [];
    this.floatingTexts = [];
    this.particles = [];
    this.gameWon = false;
    this.winAnimationTime = 0;
    this.collectedGold = 0;

    const playerPos = this.map.getRandomFloorPosition();
    this.player = new Player(playerPos.x, playerPos.y);

    const occupiedPositions: Set<string> = new Set();
    occupiedPositions.add(`${playerPos.x},${playerPos.y}`);

    for (let i = 0; i < this.totalGold; i++) {
      let pos;
      do {
        pos = this.map.getRandomFloorPosition();
      } while (occupiedPositions.has(`${pos.x},${pos.y}`));
      occupiedPositions.add(`${pos.x},${pos.y}`);
      this.golds.push(new Gold(pos.x, pos.y));
    }

    for (let i = 0; i < this.totalMonsters; i++) {
      let pos;
      do {
        pos = this.map.getRandomFloorPosition();
      } while (occupiedPositions.has(`${pos.x},${pos.y}`));
      occupiedPositions.add(`${pos.x},${pos.y}`);
      this.monsters.push(new Monster(pos.x, pos.y));
    }

    this.updateCameraTarget();
    this.cameraX = this.targetCameraX;
    this.cameraY = this.targetCameraY;
  }

  setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === 'r' && this.gameWon) {
        this.init();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  updateCameraTarget(): void {
    const mapPixelWidth = this.map.width * CELL_SIZE;
    const mapPixelHeight = this.map.height * CELL_SIZE;

    const viewCenterX = this.viewportWidth / 2;
    const viewCenterY = (this.viewportHeight - STATUS_BAR_HEIGHT) / 2 + STATUS_BAR_HEIGHT;

    this.targetCameraX = viewCenterX - (this.player.x * CELL_SIZE + CELL_SIZE / 2);
    this.targetCameraY = viewCenterY - (this.player.y * CELL_SIZE + CELL_SIZE / 2);

    const minX = this.viewportWidth - mapPixelWidth;
    const maxX = 0;
    const minY = STATUS_BAR_HEIGHT + (this.viewportHeight - STATUS_BAR_HEIGHT) - mapPixelHeight;
    const maxY = STATUS_BAR_HEIGHT;

    if (mapPixelWidth < this.viewportWidth) {
      this.targetCameraX = (this.viewportWidth - mapPixelWidth) / 2;
    } else {
      this.targetCameraX = Math.max(minX, Math.min(maxX, this.targetCameraX));
    }

    if (mapPixelHeight < this.viewportHeight - STATUS_BAR_HEIGHT) {
      this.targetCameraY = STATUS_BAR_HEIGHT + ((this.viewportHeight - STATUS_BAR_HEIGHT) - mapPixelHeight) / 2;
    } else {
      this.targetCameraY = Math.max(minY, Math.min(maxY, this.targetCameraY));
    }
  }

  update(deltaTime: number): void {
    if (this.gameWon) {
      this.winAnimationTime += deltaTime;
      this.updateParticles(deltaTime);
      return;
    }

    this.moveCooldown -= deltaTime;
    if (this.moveCooldown <= 0) {
      this.handleMovement();
    }

    this.map.update(deltaTime);
    this.player.update(deltaTime);

    for (const monster of this.monsters) {
      if (monster.active) {
        monster.update(deltaTime, this.player, this.map);
        if (monster.x === this.player.x && monster.y === this.player.y) {
          this.player.takeDamage(monster.attack);
          this.addFloatingText(
            this.player.x,
            this.player.y,
            `-${monster.attack}`,
            '#ff4444'
          );
        }
      }
    }

    for (const gold of this.golds) {
      gold.update(deltaTime);
      if (gold.active && !gold.collected && gold.x === this.player.x && gold.y === this.player.y) {
        gold.collect();
        this.collectedGold++;
        this.addFloatingText(gold.x, gold.y, '+1 Gold', '#f39c12');
        if (this.collectedGold >= this.totalGold) {
          this.triggerWin();
        }
      }
    }

    this.updateFloatingTexts(deltaTime);
    this.updateParticles(deltaTime);
    this.updateCameraTarget();
    this.updateCamera(deltaTime);
  }

  handleMovement(): void {
    let dx = 0, dy = 0;

    if (this.keys.has('arrowup') || this.keys.has('w')) dy = -1;
    else if (this.keys.has('arrowdown') || this.keys.has('s')) dy = 1;
    else if (this.keys.has('arrowleft') || this.keys.has('a')) dx = -1;
    else if (this.keys.has('arrowright') || this.keys.has('d')) dx = 1;

    if (dx !== 0 || dy !== 0) {
      const moved = this.player.move(dx, dy, this.map);
      if (moved) {
        this.checkCombat();
        this.moveCooldown = this.moveCooldownTime;
      }
    }
  }

  checkCombat(): void {
    for (const monster of this.monsters) {
      if (monster.active && monster.x === this.player.x && monster.y === this.player.y) {
        const killed = monster.takeDamage(this.player.attack);
        this.addFloatingText(
          monster.x,
          monster.y,
          killed ? 'Monster defeated!' : `You hit the monster!`,
          killed ? '#ffd700' : '#ffffff'
        );
        if (killed) {
          this.spawnDeathParticles(monster.x, monster.y, '#9b59b6');
        } else {
          this.player.takeDamage(monster.attack);
          this.addFloatingText(
            this.player.x,
            this.player.y,
            `-${monster.attack}`,
            '#ff4444'
          );
        }
      }
    }
  }

  updateCamera(deltaTime: number): void {
    const speed = 1 / this.cameraSmoothTime;
    this.cameraX += (this.targetCameraX - this.cameraX) * speed * deltaTime;
    this.cameraY += (this.targetCameraY - this.cameraY) * speed * deltaTime;
  }

  addFloatingText(tileX: number, tileY: number, text: string, color: string): void {
    this.floatingTexts.push({
      x: tileX * CELL_SIZE + CELL_SIZE / 2,
      y: tileY * CELL_SIZE,
      text,
      color,
      life: 1.5,
      maxLife: 1.5
    });
  }

  updateFloatingTexts(deltaTime: number): void {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= deltaTime;
      ft.y -= 20 * deltaTime;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  spawnDeathParticles(tileX: number, tileY: number, color: string): void {
    const cx = tileX * CELL_SIZE + CELL_SIZE / 2;
    const cy = tileY * CELL_SIZE + CELL_SIZE / 2;
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 30 + Math.random() * 20;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.5,
        maxLife: 0.5,
        size: 2 + Math.random() * 2
      });
    }
  }

  triggerWin(): void {
    this.gameWon = true;
    this.winAnimationTime = 0;
    const center = this.map.getCenterPosition();
    const cx = center.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = center.y * CELL_SIZE + CELL_SIZE / 2;

    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 80;
      const colors = ['#ffd700', '#ffec8b', '#ffa500', '#f39c12', '#ffecb3'];
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 2,
        maxLife: 2,
        size: 2 + Math.random() * 4
      });
    }
  }

  updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    this.drawBackgroundGradient();

    ctx.save();
    ctx.translate(this.cameraX, this.cameraY);

    this.drawMap();
    this.drawGolds();
    this.drawMonsters();
    this.drawPlayer();
    this.drawParticles();
    this.drawFloatingTexts();

    if (this.gameWon) {
      this.drawWinText();
    }

    ctx.restore();

    this.drawStatusBar();
  }

  drawBackgroundGradient(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.viewportWidth / 2,
      this.viewportHeight / 2,
      0,
      this.viewportWidth / 2,
      this.viewportHeight / 2,
      this.viewportWidth * 0.6
    );
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#0f0f1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, STATUS_BAR_HEIGHT, this.viewportWidth, this.viewportHeight - STATUS_BAR_HEIGHT);
  }

  drawMap(): void {
    const ctx = this.ctx;

    for (let y = 0; y < this.map.height; y++) {
      for (let x = 0; x < this.map.width; x++) {
        const tile = this.map.tiles[y][x];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;

        if (tile === '#') {
          ctx.fillStyle = '#e94560';
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        } else {
          ctx.fillStyle = this.map.getFloorColor(x + y);
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        }
      }
    }
  }

  drawPlayer(): void {
    if (!this.player.active) return;
    const ctx = this.ctx;
    const shake = this.player.getShakeOffset();
    const px = this.player.x * CELL_SIZE + shake.ox;
    const py = this.player.y * CELL_SIZE + shake.oy;

    ctx.font = `${CELL_SIZE - 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.player.color;
    ctx.fillText(
      this.player.char,
      px + CELL_SIZE / 2,
      py + CELL_SIZE / 2 + 1
    );
  }

  drawMonsters(): void {
    const ctx = this.ctx;
    ctx.font = `${CELL_SIZE - 2}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const monster of this.monsters) {
      if (!monster.active) continue;
      const px = monster.x * CELL_SIZE;
      const py = monster.y * CELL_SIZE;
      ctx.fillStyle = monster.color;
      ctx.fillText(
        monster.char,
        px + CELL_SIZE / 2,
        py + CELL_SIZE / 2 + 1
      );
    }
  }

  drawGolds(): void {
    const ctx = this.ctx;

    for (const gold of this.golds) {
      if (!gold.active) continue;
      const px = gold.x * CELL_SIZE + CELL_SIZE / 2;
      const py = gold.y * CELL_SIZE + CELL_SIZE / 2;
      const scale = gold.getScale();
      const rotation = gold.getRotation();

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      ctx.font = `${CELL_SIZE - 4}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = gold.color;
      ctx.fillText(gold.char, 0, 1);
      ctx.restore();
    }
  }

  drawFloatingTexts(): void {
    const ctx = this.ctx;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const ft of this.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000';
      ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  drawWinText(): void {
    const ctx = this.ctx;
    const center = this.map.getCenterPosition();
    const cx = center.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = center.y * CELL_SIZE + CELL_SIZE / 2;

    const pulse = Math.sin(this.winAnimationTime * 4) * 0.2 + 1;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText('You Win!', 2, 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillText('You Win!', 0, 0);
    ctx.restore();
  }

  drawStatusBar(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, this.viewportWidth, STATUS_BAR_HEIGHT);

    const gradient = ctx.createLinearGradient(0, STATUS_BAR_HEIGHT - 1, this.viewportWidth, STATUS_BAR_HEIGHT - 1);
    gradient.addColorStop(0, '#ffd700');
    gradient.addColorStop(1, '#9b59b6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, STATUS_BAR_HEIGHT - 1, this.viewportWidth, 1);

    const centerY = STATUS_BAR_HEIGHT / 2;
    const totalItems = 3;
    const spacing = this.viewportWidth / (totalItems + 1);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    const hpX = spacing;
    this.drawHeartIcon(hpX - 30, centerY, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.player.hp}/${this.player.maxHp}`, hpX + 10, centerY);

    const goldX = spacing * 2;
    this.drawGoldIcon(goldX - 30, centerY, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.collectedGold}/${this.totalGold}`, goldX + 10, centerY);

    const monsterX = spacing * 3;
    const aliveMonsters = this.monsters.filter(m => m.active).length;
    this.drawSkullIcon(monsterX - 30, centerY, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${aliveMonsters}/${this.totalMonsters}`, monsterX + 10, centerY);
  }

  drawHeartIcon(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.3);
    ctx.bezierCurveTo(x, y, x - size, y, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.6, x, y + size, x, y + size * 1.1);
    ctx.bezierCurveTo(x, y + size, x + size, y + size * 0.6, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y, x, y, x, y + size * 0.3);
    ctx.fill();
  }

  drawGoldIcon(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.2, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e67e22';
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', x, y + 1);
  }

  drawSkullIcon(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.arc(x, y - size * 0.1, size * 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(x - size * 0.6, y + size * 0.2, size * 1.2, size * 0.6);

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x - size * 0.35, y - size * 0.15, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.35, y - size * 0.15, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(x - size * 0.1, y + size * 0.1, size * 0.2, size * 0.3);
  }

  gameLoop(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

const game = new Game();
game.start();

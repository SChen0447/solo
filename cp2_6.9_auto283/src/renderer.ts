import { CELL_SIZE, GRID_SIZE, GameMap, MAP_WIDTH, MAP_HEIGHT } from './map';
import { Player, PLAYER_RADIUS } from './player';
import { Monster, MONSTER_SIGHT_RADIUS } from './monster';

interface StarParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class Renderer {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  width: number = MAP_WIDTH;
  height: number = MAP_HEIGHT;
  stars: StarParticle[] = [];
  fireworks: FireworkParticle[] = [];
  treasureAnimTime: number = 0;
  offsetX: number = 0;
  offsetY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;
    this.resize();
    this.initStars();
  }

  resize() {
    const container = this.canvas.parentElement;
    const maxW = container ? container.clientWidth : window.innerWidth;
    const maxH = container ? container.clientHeight : window.innerHeight;
    const scale = Math.min(maxW / this.width, maxH / this.height, 1);
    const displayW = Math.floor(this.width * scale);
    const displayH = Math.floor(this.height * scale);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = displayW + 'px';
    this.canvas.style.height = displayH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offsetX = (maxW - displayW) / 2;
    this.offsetY = (maxH - displayH) / 2;
  }

  private initStars() {
    this.stars = [];
    for (let i = 0; i < 300; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 10 + 5,
        alpha: Math.random() * 0.8 + 0.2
      });
    }
  }

  update(dt: number) {
    this.treasureAnimTime += dt;

    for (const star of this.stars) {
      star.y += star.speed * dt;
      star.x += Math.sin(this.treasureAnimTime + star.y * 0.01) * star.speed * 0.3 * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
      if (star.x > this.width) star.x = 0;
      if (star.x < 0) star.x = this.width;
    }

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const f = this.fireworks[i];
      f.life -= dt;
      if (f.life <= 0) {
        this.fireworks.splice(i, 1);
        continue;
      }
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.vy += 150 * dt;
    }
  }

  spawnFirework(x: number, y: number) {
    const colors = ['#00FF88', '#FFD700', '#FF4444', '#4488FF', '#FF88FF', '#FFFFFF'];
    const particleCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const speed = 100 + Math.random() * 200;
      this.fireworks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1 + Math.random() * 1.5,
        maxLife: 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3
      });
    }
  }

  clear() {
    this.ctx.fillStyle = '#0A0A0A';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStars() {
    for (const star of this.stars) {
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      this.ctx.fill();
    }
  }

  drawMaze(map: GameMap, visibleGrid: boolean[][]) {
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (map.grid[y][x] === 1) {
          const px = x * CELL_SIZE;
          const py = y * CELL_SIZE;

          if (y === 0 || map.grid[y - 1][x] === 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py);
            this.ctx.lineTo(px + CELL_SIZE, py);
            this.ctx.stroke();
          }
          if (y === GRID_SIZE - 1 || map.grid[y + 1][x] === 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + CELL_SIZE);
            this.ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            this.ctx.stroke();
          }
          if (x === 0 || map.grid[y][x - 1] === 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(px, py);
            this.ctx.lineTo(px, py + CELL_SIZE);
            this.ctx.stroke();
          }
          if (x === GRID_SIZE - 1 || map.grid[y][x + 1] === 0) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + CELL_SIZE, py);
            this.ctx.lineTo(px + CELL_SIZE, py + CELL_SIZE);
            this.ctx.stroke();
          }
        }
      }
    }
  }

  drawPlayer(player: Player) {
    this.ctx.save();
    this.ctx.shadowColor = '#00FF88';
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
    this.ctx.fillStyle = '#00FF88';
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.beginPath();
    this.ctx.arc(player.x, player.y, PLAYER_RADIUS + 3, 0, Math.PI * 2);
    this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  drawMonster(monster: Monster) {
    this.ctx.save();
    this.ctx.translate(monster.x, monster.y);
    this.ctx.rotate(monster.facingAngle);

    if (!monster.isStunned && monster.isChasing) {
      this.ctx.shadowColor = '#FF4444';
      this.ctx.shadowBlur = 15;
    }

    const s = monster.size / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(s, 0);
    this.ctx.lineTo(-s * 0.7, -s * 0.8);
    this.ctx.lineTo(-s * 0.7, s * 0.8);
    this.ctx.closePath();
    this.ctx.fillStyle = monster.color;
    this.ctx.fill();

    if (!monster.isStunned && monster.isChasing) {
      this.ctx.restore();
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(monster.x, monster.y, MONSTER_SIGHT_RADIUS, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 68, 68, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  drawSoundPulses(player: Player) {
    for (const pulse of player.pulses) {
      this.ctx.beginPath();
      this.ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${pulse.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  drawEchoPoints(player: Player) {
    for (const echo of player.echoPoints) {
      this.ctx.save();
      this.ctx.shadowColor = echo.color;
      this.ctx.shadowBlur = 15;
      this.ctx.beginPath();
      this.ctx.arc(echo.x, echo.y, echo.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = echo.color.replace(')', `, ${echo.alpha})`).replace('rgb', 'rgba');
      const rgb = this.hexToRgb(echo.color);
      this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${echo.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  drawTreasures(map: GameMap) {
    for (const treasure of map.treasures) {
      if (treasure.collected) continue;
      const cx = treasure.x * CELL_SIZE + CELL_SIZE / 2;
      const cy = treasure.y * CELL_SIZE + CELL_SIZE / 2;
      const size = 16;
      const flash = (Math.sin(this.treasureAnimTime * 4) + 1) / 2;

      this.ctx.save();
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 10 + flash * 15;

      this.ctx.fillStyle = '#FFD700';
      this.ctx.fillRect(cx - size / 2, cy - size / 2, size, size);

      this.ctx.fillStyle = '#B8860B';
      this.ctx.fillRect(cx - size / 2, cy - size / 2, size, 3);
      this.ctx.fillRect(cx - 1, cy - size / 2, 2, size);

      this.ctx.fillStyle = `rgba(255, 255, 200, ${0.3 + flash * 0.5})`;
      this.ctx.fillRect(cx - size / 2 + 2, cy - size / 2 + 1, size - 4, 2);

      this.ctx.restore();
    }
  }

  drawExit(map: GameMap, isOpen: boolean) {
    const cx = map.exit.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = map.exit.y * CELL_SIZE + CELL_SIZE / 2;
    const size = 20;

    this.ctx.save();
    if (isOpen) {
      const pulse = (Math.sin(this.treasureAnimTime * 3) + 1) / 2;
      this.ctx.shadowColor = '#00FF88';
      this.ctx.shadowBlur = 15 + pulse * 20;
      this.ctx.fillStyle = '#00FF88';
    } else {
      this.ctx.fillStyle = '#333333';
    }
    this.ctx.fillRect(cx - size / 2, cy - size / 2, size, size);
    this.ctx.restore();

    if (isOpen) {
      this.ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(cx - size / 2 - 3, cy - size / 2 - 3, size + 6, size + 6);
    }
  }

  drawFireworks() {
    for (const f of this.fireworks) {
      const alpha = Math.max(0, f.life / f.maxLife);
      this.ctx.save();
      this.ctx.shadowColor = f.color;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
      const rgb = this.hexToRgb(f.color);
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  drawGame(map: GameMap, player: Player, monsters: Monster[], exitOpen: boolean, visibleGrid: boolean[][]) {
    this.clear();
    this.drawMaze(map, visibleGrid);
    this.drawTreasures(map);
    this.drawExit(map, exitOpen);
    for (const monster of monsters) {
      this.drawMonster(monster);
    }
    this.drawSoundPulses(player);
    this.drawEchoPoints(player);
    this.drawPlayer(player);
  }

  drawMenu() {
    this.clear();
    this.drawStars();
  }
}

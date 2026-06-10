import { CONFIG, COLORS } from './config.js';

export interface Position {
  x: number;
  y: number;
}

export enum RoomType {
  NORMAL = 'normal',
  CORRIDOR = 'corridor',
  CENTER = 'center',
  OXYGEN = 'oxygen'
}

export interface Room {
  id: string;
  gridX: number;
  gridY: number;
  type: RoomType;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
  connections: string[];
}

export enum ItemType {
  OXYGEN_TANK = 'oxygen_tank',
  ENERGY_BATTERY = 'energy_battery',
  CORE_PART = 'core_part'
}

export interface Item {
  id: string;
  type: ItemType;
  position: Position;
  collected: boolean;
}

export interface Obstacle {
  id: string;
  position: Position;
  size: { width: number; height: number };
  repaired: boolean;
}

export interface Player {
  position: Position;
  energy: number;
  maxEnergy: number;
  oxygen: number;
  maxOxygen: number;
  coreParts: number;
  isMoving: boolean;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface Monster {
  position: Position;
  visionRadius: number;
  isChasing: boolean;
}

export interface Particle {
  position: Position;
  velocity: Position;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  rooms: Room[];
  player: Player;
  monster: Monster;
  items: Item[];
  obstacles: Obstacle[];
  particles: Particle[];
  gameStatus: GameStatus;
  repairTimer: number | null;
  elapsedTime: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private mapOffsetX: number = 0;
  private mapOffsetY: number = 0;
  private lastEnergy: number = 100;
  private lastOxygen: number = 100;
  private displayEnergy: number = 100;
  private displayOxygen: number = 100;
  private pulseTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.imageSmoothingEnabled = false;

    const totalMapW = CONFIG.GRID_SIZE * CONFIG.ROOM_PIXEL_SIZE + (CONFIG.GRID_SIZE - 1) * CONFIG.CORRIDOR_WIDTH;
    const totalMapH = CONFIG.GRID_SIZE * CONFIG.ROOM_PIXEL_SIZE + (CONFIG.GRID_SIZE - 1) * CONFIG.CORRIDOR_WIDTH;
    this.mapOffsetX = (width - totalMapW) / 2;
    this.mapOffsetY = (height - totalMapH) / 2;
  }

  render(state: GameState, dt: number): void {
    const { ctx, width, height } = this;
    this.pulseTime += dt;

    this.smoothResources(state.player.energy, state.player.oxygen, dt);

    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    this.drawScanlines();
    this.drawBorderGlow();

    ctx.save();
    ctx.translate(this.mapOffsetX, this.mapOffsetY);

    this.drawRooms(state.rooms);
    this.drawCorridors(state.rooms);
    this.drawObstacles(state.obstacles);
    this.drawItems(state.items);
    this.drawMonsterVision(state.monster, state.player);
    this.drawMonster(state.monster);
    this.drawPlayer(state.player);
    this.drawParticles(state.particles);

    ctx.restore();

    if (state.monster.isChasing) {
      this.drawDangerOverlay();
    }

    this.drawArcBars(state.player);

    if (state.repairTimer !== null) {
      this.drawRepairProgress(state.repairTimer);
    }
  }

  private smoothResources(targetEnergy: number, targetOxygen: number, dt: number): void {
    const speed = 1 / CONFIG.UI_TRANSITION_DURATION;
    this.displayEnergy += (targetEnergy - this.displayEnergy) * Math.min(1, speed * dt);
    this.displayOxygen += (targetOxygen - this.displayOxygen) * Math.min(1, speed * dt);
    this.lastEnergy = targetEnergy;
    this.lastOxygen = targetOxygen;
  }

  private drawScanlines(): void {
    const { ctx, width, height } = this;
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = COLORS.TEXT;
    ctx.lineWidth = 1;
    for (let y = 0; y < height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawBorderGlow(): void {
    const { ctx, width, height } = this;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 1.5);
    ctx.save();
    ctx.strokeStyle = `rgba(0, 255, 213, ${0.2 + pulse * 0.2})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    ctx.strokeStyle = `rgba(0, 255, 213, ${0.08 + pulse * 0.08})`;
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, width - 12, height - 12);
    ctx.restore();
  }

  private drawRooms(rooms: Room[]): void {
    const { ctx } = this;
    for (const room of rooms) {
      if (room.type === RoomType.CORRIDOR) continue;

      let floorColor = COLORS.ROOM_FLOOR;
      if (room.type === RoomType.CENTER) floorColor = COLORS.CENTER_ROOM;
      else if (room.type === RoomType.OXYGEN) floorColor = COLORS.OXYGEN_ROOM;
      else if ((room.gridX + room.gridY) % 2 === 0) floorColor = COLORS.ROOM_FLOOR_ALT;

      ctx.fillStyle = floorColor;
      ctx.fillRect(room.pixelX, room.pixelY, room.width, room.height);

      ctx.strokeStyle = COLORS.ROOM_WALL;
      ctx.lineWidth = 3;
      ctx.strokeRect(room.pixelX, room.pixelY, room.width, room.height);

      ctx.strokeStyle = COLORS.ROOM_WALL_HIGHLIGHT;
      ctx.lineWidth = 1;
      ctx.strokeRect(room.pixelX + 4, room.pixelY + 4, room.width - 8, room.height - 8);

      if (room.type === RoomType.CENTER) {
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 3);
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 255, ${0.3 + pulse * 0.4})`;
        ctx.lineWidth = 2;
        const cx = room.pixelX + room.width / 2;
        const cy = room.pixelY + room.height / 2;
        const r = Math.min(room.width, room.height) * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (room.type === RoomType.OXYGEN) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 2);
        ctx.fillStyle = `rgba(74, 158, 255, ${0.08 + pulse * 0.08})`;
        ctx.fillRect(room.pixelX, room.pixelY, room.width, room.height);
        ctx.restore();
      }
    }
  }

  private drawCorridors(rooms: Room[]): void {
    const { ctx } = this;
    const corridorRooms = rooms.filter(r => r.type === RoomType.CORRIDOR);
    for (const corr of corridorRooms) {
      ctx.fillStyle = COLORS.CORRIDOR;
      ctx.fillRect(corr.pixelX, corr.pixelY, corr.width, corr.height);

      ctx.strokeStyle = COLORS.CORRIDOR_HIGHLIGHT;
      ctx.lineWidth = 1;
      if (corr.width > corr.height) {
        const midY = corr.pixelY + corr.height / 2;
        ctx.beginPath();
        ctx.moveTo(corr.pixelX, midY);
        ctx.lineTo(corr.pixelX + corr.width, midY);
        ctx.stroke();
      } else {
        const midX = corr.pixelX + corr.width / 2;
        ctx.beginPath();
        ctx.moveTo(midX, corr.pixelY);
        ctx.lineTo(midX, corr.pixelY + corr.height);
        ctx.stroke();
      }
    }
  }

  private drawObstacles(obstacles: Obstacle[]): void {
    const { ctx } = this;
    for (const obs of obstacles) {
      const color = obs.repaired ? COLORS.OBSTACLE_REPAIRED : COLORS.OBSTACLE_BROKEN;
      ctx.fillStyle = color;
      ctx.fillRect(obs.position.x, obs.position.y, obs.size.width, obs.size.height);

      ctx.strokeStyle = obs.repaired ? '#4a8a5a' : '#aa4a5a';
      ctx.lineWidth = 2;
      ctx.strokeRect(obs.position.x, obs.position.y, obs.size.width, obs.size.height);

      if (!obs.repaired) {
        ctx.strokeStyle = COLORS.WARNING;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(obs.position.x + 2, obs.position.y + 2);
        ctx.lineTo(obs.position.x + obs.size.width - 2, obs.position.y + obs.size.height - 2);
        ctx.moveTo(obs.position.x + obs.size.width - 2, obs.position.y + 2);
        ctx.lineTo(obs.position.x + 2, obs.position.y + obs.size.height - 2);
        ctx.stroke();
      }
    }
  }

  private drawItems(items: Item[]): void {
    const { ctx } = this;
    for (const item of items) {
      if (item.collected) continue;

      const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 4 + item.position.x);
      const size = CONFIG.ITEM_SIZE + pulse * 2;

      let color: string, glowColor: string;
      switch (item.type) {
        case ItemType.OXYGEN_TANK:
          color = COLORS.OXYGEN_TANK;
          glowColor = COLORS.OXYGEN_TANK_GLOW;
          break;
        case ItemType.ENERGY_BATTERY:
          color = COLORS.ENERGY_BATTERY;
          glowColor = COLORS.ENERGY_BATTERY_GLOW;
          break;
        case ItemType.CORE_PART:
          color = COLORS.CORE_PART;
          glowColor = COLORS.CORE_PART_GLOW;
          break;
      }

      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 12 + pulse * 6;
      ctx.fillStyle = color;

      if (item.type === ItemType.CORE_PART) {
        ctx.beginPath();
        const cx = item.position.x;
        const cy = item.position.y;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = cx + Math.cos(angle) * size;
          const py = cy + Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (item.type === ItemType.OXYGEN_TANK) {
        ctx.beginPath();
        ctx.ellipse(item.position.x, item.position.y, size * 0.6, size, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(item.position.x - size * 0.7, item.position.y - size * 0.5, size * 1.4, size);
      }
      ctx.restore();
    }
  }

  private drawMonsterVision(monster: Monster, player: Player): void {
    if (!monster.isChasing) return;
    const { ctx } = this;
    const visionPx = monster.visionRadius * CONFIG.ROOM_PIXEL_SIZE;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      monster.position.x, monster.position.y, 0,
      monster.position.x, monster.position.y, visionPx
    );
    gradient.addColorStop(0, 'rgba(255, 45, 85, 0.2)');
    gradient.addColorStop(0.6, 'rgba(255, 45, 85, 0.08)');
    gradient.addColorStop(1, 'rgba(255, 45, 85, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(monster.position.x, monster.position.y, visionPx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawMonster(monster: Monster): void {
    const { ctx } = this;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 5);
    const size = CONFIG.MONSTER_SIZE + pulse * 2;

    ctx.save();
    ctx.shadowColor = COLORS.MONSTER_GLOW;
    ctx.shadowBlur = 15 + pulse * 8;
    ctx.fillStyle = COLORS.MONSTER;

    ctx.beginPath();
    const cx = monster.position.x;
    const cy = monster.position.y;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + this.pulseTime * 2;
      const r = i % 2 === 0 ? size : size * 0.6;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPlayer(player: Player): void {
    const { ctx } = this;
    const pulse = 0.5 + 0.5 * Math.sin(this.pulseTime * 6);
    const size = CONFIG.PLAYER_SIZE;

    ctx.save();
    ctx.shadowColor = COLORS.PLAYER_GLOW;
    ctx.shadowBlur = player.isMoving ? 18 + pulse * 10 : 12;
    ctx.fillStyle = COLORS.PLAYER;

    ctx.beginPath();
    ctx.arc(player.position.x, player.position.y, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = COLORS.PLAYER_DARK;
    let dirX = 0, dirY = 0;
    switch (player.direction) {
      case 'up': dirY = -1; break;
      case 'down': dirY = 1; break;
      case 'left': dirX = -1; break;
      case 'right': dirX = 1; break;
    }
    ctx.beginPath();
    ctx.arc(
      player.position.x + dirX * size * 0.4,
      player.position.y + dirY * size * 0.4,
      size * 0.4, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    const { ctx } = this;
    for (const p of particles) {
      if (p.life <= 0) continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawDangerOverlay(): void {
    const { ctx, width, height, pulseTime } = this;
    const pulse = 0.5 + 0.5 * Math.sin(pulseTime * 8);
    ctx.save();

    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(255, 45, 85, 0)');
    gradient.addColorStop(1, `rgba(255, 45, 85, ${0.15 + pulse * 0.15})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = `rgba(255, 45, 85, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, width, height);
    ctx.restore();
  }

  private drawArcBars(player: Player): void {
    const { ctx, width, height, pulseTime } = this;
    const barSize = Math.min(width, height) * 0.15;
    const barThickness = Math.max(10, barSize * 0.12);
    const margin = barSize * 0.5;

    const energyPct = Math.max(0, this.displayEnergy / player.maxEnergy);
    const oxygenPct = Math.max(0, this.displayOxygen / player.maxOxygen);

    this.drawSingleArcBar(
      margin + barSize / 2,
      height - margin - barSize / 2,
      barSize / 2,
      barThickness,
      energyPct,
      COLORS.ENERGY_BAR,
      COLORS.ENERGY_BAR_GLOW,
      'E',
      pulseTime
    );

    this.drawSingleArcBar(
      width - margin - barSize / 2,
      height - margin - barSize / 2,
      barSize / 2,
      barThickness,
      oxygenPct,
      COLORS.OXYGEN_BAR,
      COLORS.OXYGEN_BAR_GLOW,
      'O',
      pulseTime
    );
  }

  private drawSingleArcBar(
    cx: number, cy: number, radius: number, thickness: number,
    percent: number, color: string, glow: string, label: string, pulseTime: number
  ): void {
    const { ctx } = this;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const isWarning = percent < CONFIG.WARNING_THRESHOLD;
    const pulse = 0.5 + 0.5 * Math.sin(pulseTime * 8);
    const displayColor = isWarning ? COLORS.WARNING : color;
    const displayGlow = isWarning ? COLORS.WARNING_GLOW : glow;

    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.stroke();

    if (isWarning) {
      ctx.globalAlpha = 0.3 + pulse * 0.5;
    }
    ctx.shadowColor = displayGlow;
    ctx.shadowBlur = isWarning ? 20 + pulse * 15 : 12;
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    const valueAngle = startAngle + (endAngle - startAngle) * percent;
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.fillStyle = displayColor;
    ctx.font = `bold ${Math.floor(radius * 0.5)}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pctText = Math.round(percent * 100) + '%';
    ctx.fillText(pctText, cx, cy);

    ctx.font = `${Math.floor(radius * 0.32)}px 'Share Tech Mono', monospace`;
    ctx.fillStyle = isWarning ? COLORS.WARNING : COLORS.TEXT_DIM;
    ctx.fillText(label, cx, cy + radius * 0.55);

    ctx.restore();
  }

  private drawRepairProgress(timer: number): void {
    const { ctx, width, pulseTime } = this;
    const progress = 1 - timer / CONFIG.REPAIR_DURATION;
    const barWidth = width * 0.4;
    const barHeight = 8;
    const x = (width - barWidth) / 2;
    const y = 60;

    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(pulseTime * 6);
    ctx.shadowColor = COLORS.CORE_PART_GLOW;
    ctx.shadowBlur = 15 + pulse * 10;

    ctx.fillStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.fillStyle = COLORS.CORE_PART;
    ctx.fillRect(x, y, barWidth * progress, barHeight);

    ctx.strokeStyle = COLORS.CORE_PART;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, barHeight);
    ctx.restore();
  }
}

import { TILE_SIZE, Platform } from './player';

export const ROOM_WIDTH = 20;
export const ROOM_HEIGHT = 15;
export const CANVAS_WIDTH = ROOM_WIDTH * TILE_SIZE;
export const CANVAS_HEIGHT = ROOM_HEIGHT * TILE_SIZE;

export interface Spike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MovingBlockState {
  x: number;
  y: number;
}

export class MovingBlock implements Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  speed: number;
  progress: number;
  direction: number;
  trail: { x: number; y: number; alpha: number }[];

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    speed: number,
    size: number = TILE_SIZE
  ) {
    this.x = startX;
    this.y = startY;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.speed = speed;
    this.progress = 0;
    this.direction = 1;
    this.width = size;
    this.height = size;
    this.trail = [];
  }

  update(): void {
    this.trail.unshift({ x: this.x, y: this.y, alpha: 0.3 });
    if (this.trail.length > 12) {
      this.trail.pop();
    }
    this.trail.forEach((t, i) => {
      t.alpha = 0.3 * (1 - i / this.trail.length);
    });

    this.progress += this.speed * this.direction;
    if (this.progress >= 1) {
      this.progress = 1;
      this.direction = -1;
    } else if (this.progress <= 0) {
      this.progress = 0;
      this.direction = 1;
    }

    this.x = this.startX + (this.endX - this.startX) * this.progress;
    this.y = this.startY + (this.endY - this.startY) * this.progress;
  }

  saveState(): MovingBlockState {
    return { x: this.x, y: this.y };
  }

  restoreState(state: MovingBlockState): void {
    this.x = state.x;
    this.y = state.y;
  }

  reset(): void {
    this.progress = 0;
    this.direction = 1;
    this.x = this.startX;
    this.y = this.startY;
    this.trail = [];
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#1E40AF';
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 8;
      ctx.fillRect(t.x, t.y, this.width, this.height);
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = '#1E3A8A';
    ctx.strokeStyle = '#60A5FA';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 15;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}

export interface CrystalState {
  collected: boolean;
  pulsePhase: number;
}

export class Crystal {
  x: number;
  y: number;
  size: number;
  collected: boolean;
  pulsePhase: number;
  roomIndex: number;

  constructor(x: number, y: number, roomIndex: number) {
    this.x = x;
    this.y = y;
    this.size = TILE_SIZE * 0.6;
    this.collected = false;
    this.pulsePhase = 0;
    this.roomIndex = roomIndex;
  }

  update(playerCenterX: number, playerCenterY: number): void {
    this.pulsePhase += 0.05;
    if (this.collected) return;

    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const dist = Math.hypot(playerCenterX - cx, playerCenterY - cy);
    if (dist < TILE_SIZE * 2) {
      this.pulsePhase += 0.15;
    }
  }

  saveState(): CrystalState {
    return { collected: this.collected, pulsePhase: this.pulsePhase };
  }

  restoreState(state: CrystalState): void {
    this.collected = state.collected;
    this.pulsePhase = state.pulsePhase;
  }

  reset(): void {
    this.collected = false;
  }

  render(ctx: CanvasRenderingContext2D, playerCenterX: number, playerCenterY: number): void {
    if (this.collected) return;

    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const dist = Math.hypot(playerCenterX - cx, playerCenterY - cy);
    const proximity = Math.max(0, 1 - dist / (TILE_SIZE * 2));

    const baseScale = 1.0;
    const pulseScale = 1.0 + Math.sin(this.pulsePhase * Math.PI * 2) * 0.1 + proximity * 0.1;
    const scale = baseScale * pulseScale;
    const radius = (this.size / 2) * scale;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.shadowColor = '#F97316';
    ctx.shadowBlur = 20 + proximity * 20;

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#FDE047');
    gradient.addColorStop(0.6, '#FB923C');
    gradient.addColorStop(1, '#F97316');
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#FED7AA';
    ctx.lineWidth = 2;

    this.drawHexagon(ctx, radius);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  getBounds(): Platform {
    return { x: this.x, y: this.y, width: this.size, height: this.size };
  }
}

export class ExitDoor {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  roomIndex: number;

  constructor(x: number, y: number, roomIndex: number) {
    this.x = x;
    this.y = y;
    this.width = TILE_SIZE * 1.2;
    this.height = TILE_SIZE * 1.8;
    this.isOpen = false;
    this.roomIndex = roomIndex;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const color = this.isOpen ? '#34D399' : '#6B7280';
    const glowColor = this.isOpen ? '#10B981' : '#4B5563';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.isOpen ? 25 : 10;
    ctx.fillStyle = '#1F2937';
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    if (this.isOpen) {
      ctx.shadowBlur = 30;
      ctx.strokeStyle = '#6EE7B7';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(this.x + 5, this.y + 10 + i * 15);
        ctx.lineTo(this.x + this.width - 5, this.y + 10 + i * 15);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = '#EF4444';
      ctx.shadowColor = '#EF4444';
      ctx.shadowBlur = 10;
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOCKED', this.x + this.width / 2, this.y + this.height / 2);
    }

    ctx.restore();
  }

  getBounds(): Platform {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

export class Room {
  platforms: Platform[];
  spikes: Spike[];
  movingBlocks: MovingBlock[];
  crystals: Crystal[];
  exitDoor: ExitDoor | null;
  spawnX: number;
  spawnY: number;
  nextRoomDoorX: number;
  nextRoomDoorY: number;
  nextRoomDoorWidth: number;
  nextRoomDoorHeight: number;

  constructor() {
    this.platforms = [];
    this.spikes = [];
    this.movingBlocks = [];
    this.crystals = [];
    this.exitDoor = null;
    this.spawnX = 0;
    this.spawnY = 0;
    this.nextRoomDoorX = 0;
    this.nextRoomDoorY = 0;
    this.nextRoomDoorWidth = 0;
    this.nextRoomDoorHeight = 0;
  }

  addFloor(): void {
    this.platforms.push({
      x: 0,
      y: (ROOM_HEIGHT - 1) * TILE_SIZE,
      width: ROOM_WIDTH * TILE_SIZE,
      height: TILE_SIZE
    });
    this.platforms.push({
      x: 0,
      y: 0,
      width: TILE_SIZE,
      height: ROOM_HEIGHT * TILE_SIZE
    });
    this.platforms.push({
      x: (ROOM_WIDTH - 1) * TILE_SIZE,
      y: 0,
      width: TILE_SIZE,
      height: ROOM_HEIGHT * TILE_SIZE
    });
    this.platforms.push({
      x: 0,
      y: 0,
      width: ROOM_WIDTH * TILE_SIZE,
      height: TILE_SIZE
    });
  }
}

export class Level {
  rooms: Room[];
  totalCrystals: number;

  constructor() {
    this.rooms = [];
    this.totalCrystals = 6;
    this.createRooms();
  }

  private createRooms(): void {
    this.rooms.push(this.createRoom1());
    this.rooms.push(this.createRoom2());
    this.rooms.push(this.createRoom3());
  }

  private createRoom1(): Room {
    const room = new Room();
    room.addFloor();

    room.spawnX = 2 * TILE_SIZE;
    room.spawnY = 12 * TILE_SIZE;

    room.platforms.push({
      x: 5 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      width: 3 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 10 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 3 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 15 * TILE_SIZE,
      y: 7 * TILE_SIZE,
      width: 3 * TILE_SIZE,
      height: TILE_SIZE
    });

    room.spikes.push({
      x: 4 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });
    room.spikes.push({
      x: 9 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });

    room.crystals.push(new Crystal(16 * TILE_SIZE, 5.5 * TILE_SIZE, 0));

    room.nextRoomDoorX = (ROOM_WIDTH - 2) * TILE_SIZE;
    room.nextRoomDoorY = 12 * TILE_SIZE;
    room.nextRoomDoorWidth = TILE_SIZE;
    room.nextRoomDoorHeight = TILE_SIZE * 2;

    return room;
  }

  private createRoom2(): Room {
    const room = new Room();
    room.addFloor();

    room.spawnX = 2 * TILE_SIZE;
    room.spawnY = 12 * TILE_SIZE;

    room.platforms.push({
      x: 4 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 8 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 12 * TILE_SIZE,
      y: 7 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 16 * TILE_SIZE,
      y: 5 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });

    room.spikes.push({
      x: 6 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });
    room.spikes.push({
      x: 11 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });

    room.movingBlocks.push(new MovingBlock(
      3 * TILE_SIZE, 7 * TILE_SIZE,
      3 * TILE_SIZE, 11 * TILE_SIZE,
      0.015
    ));
    room.movingBlocks.push(new MovingBlock(
      14 * TILE_SIZE, 10 * TILE_SIZE,
      14 * TILE_SIZE, 3 * TILE_SIZE,
      0.012
    ));
    room.movingBlocks.push(new MovingBlock(
      6 * TILE_SIZE, 6 * TILE_SIZE,
      10 * TILE_SIZE, 6 * TILE_SIZE,
      0.01
    ));
    room.movingBlocks.push(new MovingBlock(
      15 * TILE_SIZE, 11 * TILE_SIZE,
      18 * TILE_SIZE, 11 * TILE_SIZE,
      0.018
    ));

    room.crystals.push(new Crystal(9 * TILE_SIZE, 7.5 * TILE_SIZE, 1));

    room.nextRoomDoorX = (ROOM_WIDTH - 2) * TILE_SIZE;
    room.nextRoomDoorY = 12 * TILE_SIZE;
    room.nextRoomDoorWidth = TILE_SIZE;
    room.nextRoomDoorHeight = TILE_SIZE * 2;

    return room;
  }

  private createRoom3(): Room {
    const room = new Room();
    room.addFloor();

    room.spawnX = 2 * TILE_SIZE;
    room.spawnY = 12 * TILE_SIZE;

    room.platforms.push({
      x: 3 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 7 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 11 * TILE_SIZE,
      y: 7 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 5 * TILE_SIZE,
      y: 5 * TILE_SIZE,
      width: 2 * TILE_SIZE,
      height: TILE_SIZE
    });
    room.platforms.push({
      x: 14 * TILE_SIZE,
      y: 4 * TILE_SIZE,
      width: 4 * TILE_SIZE,
      height: TILE_SIZE
    });

    room.spikes.push({
      x: 2 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });
    room.spikes.push({
      x: 6 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });
    room.spikes.push({
      x: 10 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.7
    });
    room.spikes.push({
      x: 14 * TILE_SIZE,
      y: 13 * TILE_SIZE + TILE_SIZE * 0.3,
      width: TILE_SIZE * 3,
      height: TILE_SIZE * 0.7
    });

    room.movingBlocks.push(new MovingBlock(
      9 * TILE_SIZE, 6 * TILE_SIZE,
      9 * TILE_SIZE, 11 * TILE_SIZE,
      0.02
    ));
    room.movingBlocks.push(new MovingBlock(
      12 * TILE_SIZE, 9 * TILE_SIZE,
      17 * TILE_SIZE, 9 * TILE_SIZE,
      0.015
    ));

    room.crystals.push(new Crystal(4 * TILE_SIZE, 3.5 * TILE_SIZE, 2));
    room.crystals.push(new Crystal(12 * TILE_SIZE, 5.5 * TILE_SIZE, 2));
    room.crystals.push(new Crystal(16 * TILE_SIZE, 2.5 * TILE_SIZE, 2));

    room.exitDoor = new ExitDoor(17 * TILE_SIZE, 2 * TILE_SIZE, 2);

    return room;
  }

  getRoom(index: number): Room {
    return this.rooms[index];
  }

  getTotalCrystalsCollected(): number {
    let count = 0;
    for (const room of this.rooms) {
      for (const crystal of room.crystals) {
        if (crystal.collected) count++;
      }
    }
    return count;
  }

  checkAllCrystalsCollected(): boolean {
    return this.getTotalCrystalsCollected() >= this.totalCrystals;
  }

  update(playerCenterX: number, playerCenterY: number, currentRoom: number): void {
    const room = this.rooms[currentRoom];
    for (const block of room.movingBlocks) {
      block.update();
    }
    for (const crystal of room.crystals) {
      crystal.update(playerCenterX, playerCenterY);
    }
    if (this.checkAllCrystalsCollected() && room.exitDoor) {
      room.exitDoor.isOpen = true;
    }
  }

  render(ctx: CanvasRenderingContext2D, currentRoom: number, playerCenterX: number, playerCenterY: number): void {
    const room = this.rooms[currentRoom];

    ctx.fillStyle = '#374151';
    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 2;
    for (const p of room.platforms) {
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeRect(p.x, p.y, p.width, p.height);
      ctx.save();
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.width, p.y);
      ctx.stroke();
      ctx.restore();
    }

    for (const spike of room.spikes) {
      this.renderSpike(ctx, spike);
    }

    for (const block of room.movingBlocks) {
      block.render(ctx);
    }

    for (const crystal of room.crystals) {
      crystal.render(ctx, playerCenterX, playerCenterY);
    }

    if (room.exitDoor) {
      room.exitDoor.render(ctx);
    } else {
      this.renderNextRoomDoor(ctx, room);
    }
  }

  private renderNextRoomDoor(ctx: CanvasRenderingContext2D, room: Room): void {
    ctx.save();
    ctx.shadowColor = '#34D399';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#064E3B';
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 2;
    ctx.fillRect(room.nextRoomDoorX, room.nextRoomDoorY, room.nextRoomDoorWidth, room.nextRoomDoorHeight);
    ctx.strokeRect(room.nextRoomDoorX, room.nextRoomDoorY, room.nextRoomDoorWidth, room.nextRoomDoorHeight);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#6EE7B7';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(room.nextRoomDoorX + room.nextRoomDoorWidth / 2, room.nextRoomDoorY + room.nextRoomDoorHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('EXIT →', 0, 0);
    ctx.restore();
    ctx.restore();
  }

  private renderSpike(ctx: CanvasRenderingContext2D, spike: Spike): void {
    ctx.save();
    const count = Math.floor(spike.width / (TILE_SIZE / 2));
    const spikeWidth = spike.width / count;

    for (let i = 0; i < count; i++) {
      const sx = spike.x + i * spikeWidth;

      ctx.shadowColor = '#DC2626';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#DC2626';
      ctx.strokeStyle = '#FCA5A5';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(sx, spike.y + spike.height);
      ctx.lineTo(sx + spikeWidth / 2, spike.y);
      ctx.lineTo(sx + spikeWidth, spike.y + spike.height);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  checkSpikeCollision(bounds: Platform, currentRoom: number): boolean {
    const room = this.rooms[currentRoom];
    for (const spike of room.spikes) {
      if (this.boundsIntersect(bounds, spike)) return true;
    }
    return false;
  }

  checkMovingBlockCollision(bounds: Platform, currentRoom: number): boolean {
    const room = this.rooms[currentRoom];
    for (const block of room.movingBlocks) {
      if (this.boundsIntersect(bounds, block)) return true;
    }
    return false;
  }

  checkCrystalCollection(bounds: Platform, currentRoom: number): boolean {
    const room = this.rooms[currentRoom];
    let collected = false;
    for (const crystal of room.crystals) {
      if (!crystal.collected && this.boundsIntersect(bounds, crystal.getBounds())) {
        crystal.collected = true;
        collected = true;
      }
    }
    return collected;
  }

  checkNextRoomDoor(bounds: Platform, currentRoom: number): boolean {
    if (currentRoom >= this.rooms.length - 1) return false;
    const room = this.rooms[currentRoom];
    const doorBounds: Platform = {
      x: room.nextRoomDoorX,
      y: room.nextRoomDoorY,
      width: room.nextRoomDoorWidth,
      height: room.nextRoomDoorHeight
    };
    return this.boundsIntersect(bounds, doorBounds);
  }

  checkExitDoor(bounds: Platform, currentRoom: number): boolean {
    const room = this.rooms[currentRoom];
    if (!room.exitDoor || !room.exitDoor.isOpen) return false;
    return this.boundsIntersect(bounds, room.exitDoor.getBounds());
  }

  private boundsIntersect(a: Platform, b: Platform): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}

import { CONFIG, COLORS } from './config.js';
import {
  Position, Room, RoomType, Item, ItemType, Obstacle,
  Player, Monster, Particle, GameState, GameStatus
} from './Renderer.js';
import type { GameCommand, ParticlePool } from './PlayerController.js';

interface GridCell {
  gx: number;
  gy: number;
  roomId: string | null;
  isCorridor: boolean;
}

interface PatrolPoint {
  position: Position;
  roomId: string;
}

export class GameWorld implements ParticlePool {
  public state: GameState;
  private grid: GridCell[][] = [];
  private patrolPath: PatrolPoint[] = [];
  private patrolIndex: number = 0;
  private monsterAiFrameCounter: number = 0;
  private moveParticleTimer: number = 0;
  private uiCallbacks: {
    updateParts: (count: number, total: number) => void;
    showRepairTimer: (show: boolean) => void;
    updateTimer: (value: number) => void;
    showGameOver: (won: boolean, message: string) => void;
    hideGameOver: () => void;
  } | null = null;

  constructor() {
    this.state = this.createInitialState();
    this.generateWorld();
  }

  setUICallbacks(callbacks: GameWorld['uiCallbacks']): void {
    this.uiCallbacks = callbacks;
  }

  private createInitialState(): GameState {
    return {
      rooms: [],
      player: {
        position: { x: 0, y: 0 },
        energy: CONFIG.PLAYER_INITIAL_ENERGY,
        maxEnergy: CONFIG.PLAYER_MAX_ENERGY,
        oxygen: CONFIG.PLAYER_INITIAL_OXYGEN,
        maxOxygen: CONFIG.PLAYER_MAX_OXYGEN,
        coreParts: 0,
        isMoving: false,
        direction: 'down',
      },
      monster: {
        position: { x: 0, y: 0 },
        visionRadius: CONFIG.MONSTER_VISION_RADIUS,
        isChasing: false,
      },
      items: [],
      obstacles: [],
      particles: [],
      gameStatus: 'playing',
      repairTimer: null,
      elapsedTime: 0,
    };
  }

  reset(): void {
    this.state = this.createInitialState();
    this.particles.length = 0;
    this.generateWorld();
    this.uiCallbacks?.hideGameOver();
    this.uiCallbacks?.updateParts(0, CONFIG.CORE_PARTS_REQUIRED);
    this.uiCallbacks?.showRepairTimer(false);
  }

  getMapOffset(): { x: number; y: number } {
    const totalMapW = CONFIG.GRID_SIZE * CONFIG.ROOM_PIXEL_SIZE + (CONFIG.GRID_SIZE - 1) * CONFIG.CORRIDOR_WIDTH;
    const totalMapH = CONFIG.GRID_SIZE * CONFIG.ROOM_PIXEL_SIZE + (CONFIG.GRID_SIZE - 1) * CONFIG.CORRIDOR_WIDTH;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const w = canvas?.width || 800;
    const h = canvas?.height || 600;
    return { x: (w - totalMapW) / 2, y: (h - totalMapH) / 2 };
  }

  add(particle: Particle): void {
    if (this.state.particles.length >= CONFIG.PARTICLE_MAX_COUNT) {
      this.state.particles.shift();
    }
    this.state.particles.push(particle);
  }

  private generateWorld(): void {
    this.grid = [];
    for (let y = 0; y < CONFIG.GRID_SIZE; y++) {
      this.grid[y] = [];
      for (let x = 0; x < CONFIG.GRID_SIZE; x++) {
        this.grid[y][x] = { gx: x, gy: y, roomId: null, isCorridor: false };
      }
    }

    this.generateRooms();
    this.generateCorridors();
    this.placeItemsAndObstacles();
    this.placePlayer();
    this.placeMonster();
  }

  private generateRooms(): void {
    const centerGX = Math.floor(CONFIG.GRID_SIZE / 2) - 1;
    const centerGY = Math.floor(CONFIG.GRID_SIZE / 2) - 1;

    const normalRooms: { gx: number; gy: number }[] = [];

    for (let gy = 0; gy < CONFIG.GRID_SIZE; gy++) {
      for (let gx = 0; gx < CONFIG.GRID_SIZE; gx++) {
        const isCenter = (gx === centerGX || gx === centerGX + 1) && (gy === centerGY || gy === centerGY + 1);
        if (isCenter) continue;
        normalRooms.push({ gx, gy });
      }
    }

    this.shuffle(normalRooms);

    const oxygenRooms = normalRooms.splice(0, CONFIG.OXYGEN_ROOM_COUNT);

    this.createRoom(centerGX, centerGY, RoomType.CENTER, true);
    this.createRoom(centerGX + 1, centerGY, RoomType.CENTER, false);
    this.createRoom(centerGX, centerGY + 1, RoomType.CENTER, false);
    this.createRoom(centerGX + 1, centerGY + 1, RoomType.CENTER, false);

    for (const or of oxygenRooms) {
      this.createRoom(or.gx, or.gy, RoomType.OXYGEN);
    }

    for (const nr of normalRooms) {
      this.createRoom(nr.gx, nr.gy, RoomType.NORMAL);
    }
  }

  private createRoom(gx: number, gy: number, type: RoomType, isMainCenter: boolean = false): void {
    const id = `room_${gx}_${gy}`;
    const pixelX = gx * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH);
    const pixelY = gy * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH);

    let width = CONFIG.ROOM_PIXEL_SIZE;
    let height = CONFIG.ROOM_PIXEL_SIZE;

    if (type === RoomType.CENTER) {
      const centerGX = Math.floor(CONFIG.GRID_SIZE / 2) - 1;
      const centerGY = Math.floor(CONFIG.GRID_SIZE / 2) - 1;
      if (gx === centerGX) width = CONFIG.ROOM_PIXEL_SIZE * 2 + CONFIG.CORRIDOR_WIDTH;
      if (gy === centerGY) height = CONFIG.ROOM_PIXEL_SIZE * 2 + CONFIG.CORRIDOR_WIDTH;
    }

    if (!isMainCenter && type === RoomType.CENTER) {
      this.grid[gy][gx].roomId = `room_${centerGX}_${centerGY}`;
      return;
    }

    const room: Room = {
      id,
      gridX: gx,
      gridY: gy,
      type,
      pixelX,
      pixelY,
      width,
      height,
      connections: [],
    };

    this.state.rooms.push(room);
    this.grid[gy][gx].roomId = id;

    if (type === RoomType.CENTER) {
      const centerGX = Math.floor(CONFIG.GRID_SIZE / 2) - 1;
      const centerGY = Math.floor(CONFIG.GRID_SIZE / 2) - 1;
      this.grid[centerGY][centerGX + 1].roomId = id;
      this.grid[centerGY + 1][centerGX].roomId = id;
      this.grid[centerGY + 1][centerGX + 1].roomId = id;
    }
  }

  private generateCorridors(): void {
    const connections = new Set<string>();

    for (let gy = 0; gy < CONFIG.GRID_SIZE; gy++) {
      for (let gx = 0; gx < CONFIG.GRID_SIZE; gx++) {
        if (gx < CONFIG.GRID_SIZE - 1) {
          this.connectRooms(gx, gy, gx + 1, gy, connections);
        }
        if (gy < CONFIG.GRID_SIZE - 1) {
          this.connectRooms(gx, gy, gx, gy + 1, connections);
        }
      }
    }

    this.ensureConnectivity();
  }

  private connectRooms(gx1: number, gy1: number, gx2: number, gy2: number, connections: Set<string>): void {
    const roomId1 = this.grid[gy1][gx1].roomId;
    const roomId2 = this.grid[gy2][gx2].roomId;
    if (!roomId1 || !roomId2 || roomId1 === roomId2) return;

    const key = [roomId1, roomId2].sort().join('-');
    if (connections.has(key)) return;
    connections.add(key);

    if (Math.random() < 0.55) {
      this.createCorridor(gx1, gy1, gx2, gy2);
      const r1 = this.state.rooms.find(r => r.id === roomId1);
      const r2 = this.state.rooms.find(r => r.id === roomId2);
      if (r1 && r2) {
        if (!r1.connections.includes(r2.id)) r1.connections.push(r2.id);
        if (!r2.connections.includes(r1.id)) r2.connections.push(r1.id);
      }
    }
  }

  private createCorridor(gx1: number, gy1: number, gx2: number, gy2: number): void {
    const isHorizontal = gy1 === gy2;
    let pixelX: number, pixelY: number, width: number, height: number;

    if (isHorizontal) {
      pixelX = Math.min(gx1, gx2) * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) + CONFIG.ROOM_PIXEL_SIZE;
      pixelY = gy1 * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) + CONFIG.ROOM_PIXEL_SIZE / 2 - CONFIG.CORRIDOR_WIDTH / 2;
      width = CONFIG.CORRIDOR_WIDTH;
      height = CONFIG.CORRIDOR_WIDTH;
    } else {
      pixelX = gx1 * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) + CONFIG.ROOM_PIXEL_SIZE / 2 - CONFIG.CORRIDOR_WIDTH / 2;
      pixelY = Math.min(gy1, gy2) * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) + CONFIG.ROOM_PIXEL_SIZE;
      width = CONFIG.CORRIDOR_WIDTH;
      height = CONFIG.CORRIDOR_WIDTH;
    }

    const corrId = `corr_${gx1}_${gy1}_${gx2}_${gy2}`;
    this.state.rooms.push({
      id: corrId,
      gridX: Math.round((gx1 + gx2) / 2),
      gridY: Math.round((gy1 + gy2) / 2),
      type: RoomType.CORRIDOR,
      pixelX,
      pixelY,
      width: isHorizontal ? CONFIG.CORRIDOR_WIDTH : CONFIG.CORRIDOR_WIDTH,
      height: isHorizontal ? CONFIG.CORRIDOR_WIDTH : CONFIG.CORRIDOR_WIDTH,
      connections: [],
    });

    if (isHorizontal) {
      const corrLong: Room = {
        id: corrId,
        gridX: gx1,
        gridY: gy1,
        type: RoomType.CORRIDOR,
        pixelX,
        pixelY,
        width: CONFIG.CORRIDOR_WIDTH,
        height: CONFIG.CORRIDOR_WIDTH,
        connections: [],
      };
      for (let i = this.state.rooms.length - 1; i >= 0; i--) {
        if (this.state.rooms[i].id === corrId) {
          this.state.rooms[i] = {
            ...corrLong,
            pixelX,
            pixelY,
            width: (gx2 - gx1) * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) - CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH,
            height: CONFIG.CORRIDOR_WIDTH,
          };
          break;
        }
      }
    } else {
      for (let i = this.state.rooms.length - 1; i >= 0; i--) {
        if (this.state.rooms[i].id === corrId) {
          this.state.rooms[i] = {
            ...this.state.rooms[i],
            pixelX,
            pixelY,
            width: CONFIG.CORRIDOR_WIDTH,
            height: (gy2 - gy1) * (CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH) - CONFIG.ROOM_PIXEL_SIZE + CONFIG.CORRIDOR_WIDTH,
          };
          break;
        }
      }
    }
  }

  private ensureConnectivity(): void {
    const visited = new Set<string>();
    const startRoom = this.state.rooms.find(r => r.type === RoomType.CENTER);
    if (!startRoom) return;

    const queue: Room[] = [startRoom];
    visited.add(startRoom.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const connId of current.connections) {
        if (!visited.has(connId)) {
          const connRoom = this.state.rooms.find(r => r.id === connId);
          if (connRoom) {
            visited.add(connId);
            queue.push(connRoom);
          }
        }
      }
    }

    const nonCorridors = this.state.rooms.filter(r => r.type !== RoomType.CORRIDOR);
    const unvisited = nonCorridors.filter(r => !visited.has(r.id));

    for (const room of unvisited) {
      this.connectToNearest(room, visited);
    }
  }

  private connectToNearest(room: Room, visited: Set<string>): void {
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    this.shuffle(directions);

    for (const [dx, dy] of directions) {
      const ngx = room.gridX + dx;
      const ngy = room.gridY + dy;
      if (ngx < 0 || ngx >= CONFIG.GRID_SIZE || ngy < 0 || ngy >= CONFIG.GRID_SIZE) continue;

      const neighborId = this.grid[ngy][ngx].roomId;
      if (neighborId && visited.has(neighborId)) {
        if (dx !== 0) {
          this.createCorridor(room.gridX, room.gridY, ngx, ngy);
        } else {
          this.createCorridor(room.gridX, room.gridY, ngx, ngy);
        }
        const neighbor = this.state.rooms.find(r => r.id === neighborId);
        if (neighbor && !room.connections.includes(neighborId)) {
          room.connections.push(neighborId);
          neighbor.connections.push(room.id);
        }
        visited.add(room.id);
        return;
      }
    }
  }

  private placeItemsAndObstacles(): void {
    const nonCorridorRooms = this.state.rooms.filter(
      r => r.type !== RoomType.CORRIDOR && r.type !== RoomType.CENTER
    );
    this.shuffle(nonCorridorRooms);

    let itemIndex = 0;
    const itemPlan: { type: ItemType; count: number }[] = [
      { type: ItemType.CORE_PART, count: CONFIG.CORE_PART_COUNT },
      { type: ItemType.OXYGEN_TANK, count: CONFIG.OXYGEN_TANK_COUNT },
      { type: ItemType.ENERGY_BATTERY, count: CONFIG.ENERGY_BATTERY_COUNT },
    ];

    for (const plan of itemPlan) {
      for (let i = 0; i < plan.count; i++) {
        const room = nonCorridorRooms[itemIndex % nonCorridorRooms.length];
        this.placeItemInRoom(room, plan.type);
        itemIndex++;
      }
    }

    for (const room of nonCorridorRooms) {
      const obstacleCount = Math.floor(Math.random() * (CONFIG.OBSTACLE_COUNT_PER_ROOM + 1));
      for (let i = 0; i < obstacleCount; i++) {
        this.placeObstacleInRoom(room);
      }
    }
  }

  private placeItemInRoom(room: Room, type: ItemType): void {
    const margin = 25;
    const item: Item = {
      id: `item_${this.state.items.length}`,
      type,
      position: {
        x: room.pixelX + margin + Math.random() * (room.width - margin * 2),
        y: room.pixelY + margin + Math.random() * (room.height - margin * 2),
      },
      collected: false,
    };
    this.state.items.push(item);
  }

  private placeObstacleInRoom(room: Room): void {
    const obsW = 20 + Math.random() * 15;
    const obsH = 20 + Math.random() * 15;
    const margin = 20;
    const obstacle: Obstacle = {
      id: `obs_${this.state.obstacles.length}`,
      position: {
        x: room.pixelX + margin + Math.random() * (room.width - margin * 2 - obsW),
        y: room.pixelY + margin + Math.random() * (room.height - margin * 2 - obsH),
      },
      size: { width: obsW, height: obsH },
      repaired: false,
    };
    this.state.obstacles.push(obstacle);
  }

  private placePlayer(): void {
    const centerRoom = this.state.rooms.find(r => r.type === RoomType.CENTER);
    if (!centerRoom) return;
    this.state.player.position = {
      x: centerRoom.pixelX + centerRoom.width / 2,
      y: centerRoom.pixelY + centerRoom.height / 2,
    };
  }

  private placeMonster(): void {
    const corridorRooms = this.state.rooms.filter(r => r.type === RoomType.CORRIDOR);
    this.patrolPath = corridorRooms.map(c => ({
      position: { x: c.pixelX + c.width / 2, y: c.pixelY + c.height / 2 },
      roomId: c.id,
    }));

    if (this.patrolPath.length === 0) {
      const edgeRoom = this.state.rooms.find(r => r.type === RoomType.NORMAL || r.type === RoomType.OXYGEN);
      if (edgeRoom) {
        this.state.monster.position = {
          x: edgeRoom.pixelX + edgeRoom.width / 2,
          y: edgeRoom.pixelY + edgeRoom.height / 2,
        };
      }
      return;
    }

    this.shuffle(this.patrolPath);
    this.patrolIndex = 0;
    this.state.monster.position = { ...this.patrolPath[0].position };
  }

  update(dt: number, movement: { x: number; y: number }, direction: 'up' | 'down' | 'left' | 'right' | null, commands: GameCommand[], spawnMoveParticles: (pos: Position, dir: { x: number; y: number }) => void, spawnDamageParticles: (pos: Position) => void): void {
    if (this.state.gameStatus !== 'playing') return;

    this.state.elapsedTime += dt;

    this.updatePlayer(dt, movement, direction, spawnMoveParticles);
    this.handleCommands(commands);
    this.updateResources(dt);
    this.updateMonster(dt);
    this.checkCollisions(spawnDamageParticles);
    this.checkWinCondition();
    this.updateParticles(dt);
    this.checkGameOver();
  }

  private updatePlayer(dt: number, movement: { x: number; y: number }, direction: 'up' | 'down' | 'left' | 'right' | null, spawnMoveParticles: (pos: Position, dir: { x: number; y: number }) => void): void {
    const player = this.state.player;
    const isMoving = movement.x !== 0 || movement.y !== 0;
    player.isMoving = isMoving;

    if (direction) player.direction = direction;

    if (!isMoving) return;

    const speed = CONFIG.PLAYER_SPEED * dt;
    const newX = player.position.x + movement.x * speed;
    const newY = player.position.y + movement.y * speed;

    const playerRadius = CONFIG.PLAYER_SIZE * 0.8;

    if (this.canMoveTo(newX, player.position.y, playerRadius)) {
      player.position.x = newX;
    }
    if (this.canMoveTo(player.position.x, newY, playerRadius)) {
      player.position.y = newY;
    }

    player.energy = Math.max(0, player.energy - CONFIG.ENERGY_COST_PER_MOVE * (Math.abs(movement.x) + Math.abs(movement.y)));

    this.moveParticleTimer += dt;
    if (this.moveParticleTimer > 0.08) {
      this.moveParticleTimer = 0;
      spawnMoveParticles({ ...player.position }, movement);
    }
  }

  private canMoveTo(px: number, py: number, radius: number): boolean {
    for (const obs of this.state.obstacles) {
      if (obs.repaired) continue;
      if (this.circleRectCollide(px, py, radius, obs.position.x, obs.position.y, obs.size.width, obs.size.height)) {
        return false;
      }
    }
    return this.isInsideAnyRoom(px, py, radius);
  }

  private circleRectCollide(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number): boolean {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  private isInsideAnyRoom(px: number, py: number, radius: number): boolean {
    for (const room of this.state.rooms) {
      if (room.type === RoomType.CORRIDOR) {
        if (px >= room.pixelX - radius && px <= room.pixelX + room.width + radius &&
            py >= room.pixelY - radius && py <= room.pixelY + room.height + radius) {
          return true;
        }
      } else {
        if (px >= room.pixelX + radius && px <= room.pixelX + room.width - radius &&
            py >= room.pixelY + radius && py <= room.pixelY + room.height - radius) {
          return true;
        }
      }
    }
    return false;
  }

  private handleCommands(commands: GameCommand[]): void {
    for (const cmd of commands) {
      if (cmd.type === 'interact' && cmd.target) {
        this.handleInteract(cmd.target);
      }
    }
  }

  private handleInteract(target: Position): void {
    const player = this.state.player;
    const interactRadius = 40;
    const dx = target.x - player.position.x;
    const dy = target.y - player.position.y;
    if (dx * dx + dy * dy > interactRadius * interactRadius) return;

    for (const item of this.state.items) {
      if (item.collected) continue;
      const idx = item.position.x - target.x;
      const idy = item.position.y - target.y;
      if (idx * idx + idy * idy < 900) {
        this.collectItem(item);
        return;
      }
    }

    for (const obs of this.state.obstacles) {
      if (obs.repaired) continue;
      if (target.x >= obs.position.x - 10 && target.x <= obs.position.x + obs.size.width + 10 &&
          target.y >= obs.position.y - 10 && target.y <= obs.position.y + obs.size.height + 10) {
        obs.repaired = true;
        return;
      }
    }
  }

  private collectItem(item: Item): void {
    item.collected = true;
    const player = this.state.player;

    switch (item.type) {
      case ItemType.OXYGEN_TANK:
        player.oxygen = Math.min(player.maxOxygen, player.oxygen + CONFIG.OXYGEN_TANK_RESTORE);
        break;
      case ItemType.ENERGY_BATTERY:
        player.energy = Math.min(player.maxEnergy, player.energy + CONFIG.ENERGY_BATTERY_RESTORE);
        break;
      case ItemType.CORE_PART:
        player.coreParts++;
        this.uiCallbacks?.updateParts(player.coreParts, CONFIG.CORE_PARTS_REQUIRED);
        break;
    }
  }

  private updateResources(dt: number): void {
    const player = this.state.player;
    const currentRoom = this.getPlayerCurrentRoom();

    if (!currentRoom || currentRoom.type !== RoomType.OXYGEN) {
      player.oxygen = Math.max(0, player.oxygen - CONFIG.OXYGEN_COST_PER_SECOND * dt);
    }

    if (this.state.repairTimer !== null) {
      this.state.repairTimer = Math.max(0, this.state.repairTimer - dt);
      this.uiCallbacks?.updateTimer(this.state.repairTimer);
    }
  }

  private getPlayerCurrentRoom(): Room | null {
    const { x, y } = this.state.player.position;
    for (const room of this.state.rooms) {
      if (room.type === RoomType.CORRIDOR) continue;
      if (x >= room.pixelX && x <= room.pixelX + room.width &&
          y >= room.pixelY && y <= room.pixelY + room.height) {
        return room;
      }
    }
    return null;
  }

  private updateMonster(dt: number): void {
    this.monsterAiFrameCounter++;

    const monster = this.state.monster;
    const player = this.state.player;

    const dx = player.position.x - monster.position.x;
    const dy = player.position.y - monster.position.y;
    const distSq = dx * dx + dy * dy;
    const visionPxSq = (CONFIG.MONSTER_VISION_RADIUS * CONFIG.ROOM_PIXEL_SIZE) ** 2;

    monster.isChasing = distSq < visionPxSq;

    let targetX: number, targetY: number;

    if (monster.isChasing) {
      targetX = player.position.x;
      targetY = player.position.y;
    } else {
      if (this.patrolPath.length === 0) return;
      const target = this.patrolPath[this.patrolIndex];
      targetX = target.position.x;
      targetY = target.position.y;

      const pdx = targetX - monster.position.x;
      const pdy = targetY - monster.position.y;
      if (pdx * pdx + pdy * pdy < 25) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
      }
    }

    const mdx = targetX - monster.position.x;
    const mdy = targetY - monster.position.y;
    const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
    if (mdist > 0.1) {
      const speed = CONFIG.MONSTER_SPEED * dt;
      monster.position.x += (mdx / mdist) * speed;
      monster.position.y += (mdy / mdist) * speed;
    }
  }

  private checkCollisions(spawnDamageParticles: (pos: Position) => void): void {
    const player = this.state.player;
    const monster = this.state.monster;
    const dx = player.position.x - monster.position.x;
    const dy = player.position.y - monster.position.y;
    const collisionDist = CONFIG.PLAYER_SIZE + CONFIG.MONSTER_SIZE - 6;

    if (dx * dx + dy * dy < collisionDist * collisionDist) {
      player.energy = Math.max(0, player.energy - CONFIG.MONSTER_DAMAGE);
      spawnDamageParticles({ ...player.position });

      if (this.state.repairTimer !== null) {
        this.state.repairTimer = null;
        this.uiCallbacks?.showRepairTimer(false);
      }

      const pushDist = 30;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const pushX = (dx / dist) * pushDist;
      const pushY = (dy / dist) * pushDist;
      if (this.canMoveTo(player.position.x + pushX, player.position.y, CONFIG.PLAYER_SIZE * 0.8)) {
        player.position.x += pushX;
      }
      if (this.canMoveTo(player.position.x, player.position.y + pushY, CONFIG.PLAYER_SIZE * 0.8)) {
        player.position.y += pushY;
      }
    }
  }

  private checkWinCondition(): void {
    const player = this.state.player;
    const currentRoom = this.getPlayerCurrentRoom();

    if (this.state.repairTimer !== null) {
      if (this.state.repairTimer <= 0) {
        this.state.gameStatus = 'won';
        this.uiCallbacks?.showGameOver(true, '核心系统修复成功！你成功逃离了太空站！');
      }
      return;
    }

    if (player.coreParts >= CONFIG.CORE_PARTS_REQUIRED && currentRoom?.type === RoomType.CENTER) {
      this.state.repairTimer = CONFIG.REPAIR_DURATION;
      this.uiCallbacks?.showRepairTimer(true);
      this.uiCallbacks?.updateTimer(CONFIG.REPAIR_DURATION);
    }
  }

  private updateParticles(dt: number): void {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
        continue;
      }
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.95;
      p.velocity.y *= 0.95;
    }
  }

  private checkGameOver(): void {
    if (this.state.gameStatus !== 'playing') return;

    if (this.state.player.energy <= 0) {
      this.state.gameStatus = 'lost';
      this.uiCallbacks?.showGameOver(false, '能量耗尽！你在黑暗的太空中永远沉睡了...');
    } else if (this.state.player.oxygen <= 0) {
      this.state.gameStatus = 'lost';
      this.uiCallbacks?.showGameOver(false, '氧气耗尽！窒息让你失去了意识...');
    }
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

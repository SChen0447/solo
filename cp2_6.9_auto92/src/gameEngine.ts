import { generateMaze, MazeData, MAZE_SIZE, CELL_WALL } from './mazeGenerator';

export interface PlayerState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  coins: number;
  keys: number;
  potions: number;
  moveProgress: number;
  isMoving: boolean;
  moveDuration: number;
  moveStartTime: number;
}

export interface Collectible {
  x: number;
  y: number;
  collected: boolean;
  animProgress: number;
}

export interface Chest {
  x: number;
  y: number;
  opened: boolean;
}

export interface Monster {
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

export interface CombatState {
  active: boolean;
  monster: Monster | null;
  message: string;
  monsterShake: number;
  lastAttackTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FlyingCoin {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  duration: number;
  startTime: number;
}

export interface GameState {
  maze: MazeData;
  player: PlayerState;
  floor: number;
  coins: Collectible[];
  keys: Collectible[];
  chests: Chest[];
  monsters: Monster[];
  combat: CombatState;
  particles: Particle[];
  flyingCoins: FlyingCoin[];
  stepsSinceCombat: number;
  gameOver: boolean;
  gameOverType: 'hp' | 'stamina' | null;
  hoveredItem: string | null;
  mouseX: number;
  mouseY: number;
  collectedCoinsAnim: Collectible[];
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export class GameEngine {
  state: GameState;
  private keysPressed: Set<string> = new Set();
  private lastMoveTime: number = 0;
  private moveCooldown: number = 200;
  private listeners: (() => void)[] = [];

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const maze = generateMaze();
    const player: PlayerState = {
      x: maze.entrance.x,
      y: maze.entrance.y,
      prevX: maze.entrance.x,
      prevY: maze.entrance.y,
      hp: 10,
      maxHp: 10,
      stamina: 10,
      maxStamina: 10,
      coins: 0,
      keys: 0,
      potions: 0,
      moveProgress: 1,
      isMoving: false,
      moveDuration: 200,
      moveStartTime: 0
    };

    const coins: Collectible[] = maze.coinPositions.map(p => ({
      x: p.x, y: p.y, collected: false, animProgress: 0
    }));

    const keys: Collectible[] = maze.keyPositions.map(p => ({
      x: p.x, y: p.y, collected: false, animProgress: 0
    }));

    const chests: Chest[] = maze.chestPositions.map(p => ({
      x: p.x, y: p.y, opened: false
    }));

    const monsters: Monster[] = maze.monsterPositions.map(p => ({
      x: p.x, y: p.y, hp: 4, alive: true
    }));

    return {
      maze,
      player,
      floor: 1,
      coins,
      keys,
      chests,
      monsters,
      combat: {
        active: false,
        monster: null,
        message: '',
        monsterShake: 0,
        lastAttackTime: 0
      },
      particles: [],
      flyingCoins: [],
      stepsSinceCombat: 0,
      gameOver: false,
      gameOverType: null,
      hoveredItem: null,
      mouseX: 0,
      mouseY: 0,
      collectedCoinsAnim: []
    };
  }

  subscribe(listener: () => void): void {
    this.listeners.push(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  handleKeyDown(key: string): void {
    if (this.state.gameOver || this.state.combat.active) {
      if (this.state.combat.active && (key === ' ' || key === 'Spacebar')) {
        this.playerAttack();
      }
      return;
    }

    this.keysPressed.add(key.toLowerCase());
  }

  handleKeyUp(key: string): void {
    this.keysPressed.delete(key.toLowerCase());
  }

  handleMouseMove(x: number, y: number): void {
    this.state.mouseX = x;
    this.state.mouseY = y;
  }

  update(now: number): void {
    if (this.state.gameOver) return;

    this.updatePlayerMovement(now);
    this.processInput(now);
    this.updateAnimations(now);
    this.updateParticles(now);
    this.updateFlyingCoins(now);
    this.checkCombatCooldown(now);

    this.notify();
  }

  private updatePlayerMovement(now: number): void {
    const player = this.state.player;
    if (player.isMoving) {
      const elapsed = now - player.moveStartTime;
      player.moveProgress = Math.min(1, elapsed / player.moveDuration);
      if (player.moveProgress >= 1) {
        player.isMoving = false;
        player.x = player.prevX;
        player.y = player.prevY;
        player.moveProgress = 1;
        this.onPlayerReachedCell();
      }
    }
  }

  private processInput(now: number): void {
    if (this.state.player.isMoving) return;
    if (this.state.combat.active) return;
    if (now - this.lastMoveTime < this.moveCooldown) return;

    let direction: Direction | null = null;
    if (this.keysPressed.has('w') || this.keysPressed.has('arrowup')) direction = 'up';
    else if (this.keysPressed.has('s') || this.keysPressed.has('arrowdown')) direction = 'down';
    else if (this.keysPressed.has('a') || this.keysPressed.has('arrowleft')) direction = 'left';
    else if (this.keysPressed.has('d') || this.keysPressed.has('arrowright')) direction = 'right';

    if (direction) {
      this.tryMove(direction, now);
      this.lastMoveTime = now;
    }
  }

  private tryMove(direction: Direction, now: number): void {
    const player = this.state.player;
    let newX = player.x;
    let newY = player.y;

    switch (direction) {
      case 'up': newY--; break;
      case 'down': newY++; break;
      case 'left': newX--; break;
      case 'right': newX++; break;
    }

    if (newX < 0 || newX >= MAZE_SIZE || newY < 0 || newY >= MAZE_SIZE) return;
    if (this.state.maze.grid[newY][newX] === CELL_WALL) return;

    player.prevX = player.x;
    player.prevY = player.y;
    player.x = newX;
    player.y = newY;
    player.isMoving = true;
    player.moveProgress = 0;
    player.moveStartTime = now;

    player.stamina--;
    if (player.stamina <= 0) {
      player.stamina = 0;
      this.triggerGameOver('stamina');
    }

    this.state.stepsSinceCombat++;
  }

  private onPlayerReachedCell(): void {
    const player = this.state.player;

    this.collectCoins(player.x, player.y);
    this.collectKeys(player.x, player.y);
    this.tryOpenChest(player.x, player.y);

    const monster = this.state.monsters.find(m => m.alive && m.x === player.x && m.y === player.y);
    if (monster) {
      this.startCombat(monster);
      this.state.stepsSinceCombat = 0;
      return;
    }

    if (this.state.stepsSinceCombat >= 12) {
      this.forceMonsterEncounter();
      this.state.stepsSinceCombat = 0;
    }

    if (player.x === this.state.maze.exit.x && player.y === this.state.maze.exit.y) {
      this.nextFloor();
    }
  }

  private collectCoins(x: number, y: number): void {
    for (const coin of this.state.coins) {
      if (!coin.collected && coin.x === x && coin.y === y) {
        coin.collected = true;
        coin.animProgress = 0;
        this.state.player.coins++;
        this.state.collectedCoinsAnim.push({ ...coin });
      }
    }
  }

  private collectKeys(x: number, y: number): void {
    for (const key of this.state.keys) {
      if (!key.collected && key.x === x && key.y === y) {
        key.collected = true;
        this.state.player.keys++;
      }
    }
  }

  private tryOpenChest(x: number, y: number): void {
    const chest = this.state.chests.find(c => !c.opened && c.x === x && c.y === y);
    if (!chest) return;

    if (this.state.player.keys <= 0) return;

    chest.opened = true;
    this.state.player.keys--;

    this.spawnChestParticles(chest.x, chest.y);

    if (Math.random() < 0.6) {
      const bonus = Math.floor(Math.random() * 6) + 5;
      this.state.player.coins += bonus;
      this.addFlyingCoins(chest.x, chest.y, bonus);
    } else {
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 5);
      this.state.player.potions++;
    }
  }

  private spawnChestParticles(gridX: number, gridY: number): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 2 + Math.random() * 2;
      this.state.particles.push({
        x: gridX,
        y: gridY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400,
        maxLife: 400,
        color: '#FFD700',
        size: 3
      });
    }
  }

  private addFlyingCoins(fromGridX: number, fromGridY: number, count: number): void {
    const now = performance.now();
    for (let i = 0; i < Math.min(count, 5); i++) {
      this.state.flyingCoins.push({
        startX: fromGridX,
        startY: fromGridY,
        endX: -1,
        endY: -1,
        progress: 0,
        duration: 500,
        startTime: now + i * 50
      });
    }
  }

  private forceMonsterEncounter(): void {
    const player = this.state.player;
    const adjacent = this.state.monsters.filter(m =>
      m.alive && Math.abs(m.x - player.x) + Math.abs(m.y - player.y) === 1
    );

    let target: Monster | null = null;
    if (adjacent.length > 0) {
      target = adjacent[0];
    } else {
      const nearby = this.state.monsters.filter(m =>
        m.alive && Math.abs(m.x - player.x) + Math.abs(m.y - player.y) <= 3
      );
      if (nearby.length > 0) {
        target = nearby[Math.floor(Math.random() * nearby.length)];
      }
    }

    if (target) {
      this.startCombat(target);
    }
  }

  private startCombat(monster: Monster): void {
    this.state.combat.active = true;
    this.state.combat.monster = monster;
    this.state.combat.message = '遭遇怪物！按空格攻击';
    this.state.combat.monsterShake = 0;
  }

  playerAttack(): void {
    if (!this.state.combat.active || !this.state.combat.monster) return;

    const now = performance.now();
    if (now - this.state.combat.lastAttackTime < 400) return;
    this.state.combat.lastAttackTime = now;

    const monster = this.state.combat.monster;
    monster.hp -= 2;
    this.state.combat.monsterShake = 200;

    if (monster.hp <= 0) {
      monster.alive = false;
      const dropCoins = Math.floor(Math.random() * 3) + 1;
      this.state.player.coins += dropCoins;
      this.addFlyingCoins(monster.x, monster.y, dropCoins);
      this.state.combat.active = false;
      this.state.combat.monster = null;
      this.state.combat.message = `胜利！获得 ${dropCoins} 金币`;
    } else {
      this.state.player.hp--;
      this.state.combat.message = '你受到反击！按空格继续攻击';
      if (this.state.player.hp <= 0) {
        this.state.player.hp = 0;
        this.state.combat.active = false;
        this.triggerGameOver('hp');
      }
    }
  }

  private updateAnimations(now: number): void {
    for (const coin of this.state.collectedCoinsAnim) {
      coin.animProgress = Math.min(1, coin.animProgress + 0.05);
    }
    this.state.collectedCoinsAnim = this.state.collectedCoinsAnim.filter(c => c.animProgress < 1);

    if (this.state.combat.monsterShake > 0) {
      this.state.combat.monsterShake = Math.max(0, this.state.combat.monsterShake - 16);
    }
  }

  private updateParticles(now: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.state.particles.length; i++) {
      const p = this.state.particles[i];
      p.x += p.vx * 0.03;
      p.y += p.vy * 0.03;
      p.life -= 16;
      if (p.life <= 0) toRemove.push(i);
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.state.particles.splice(toRemove[i], 1);
    }
  }

  private updateFlyingCoins(now: number): void {
    for (const fc of this.state.flyingCoins) {
      if (now >= fc.startTime) {
        fc.progress = Math.min(1, (now - fc.startTime) / fc.duration);
      }
    }
    this.state.flyingCoins = this.state.flyingCoins.filter(fc => fc.progress < 1);
  }

  private checkCombatCooldown(now: number): void {
    if (this.state.combat.monsterShake > 0) {
      this.state.combat.monsterShake = Math.max(0, this.state.combat.monsterShake - 16);
    }
  }

  private nextFloor(): void {
    this.state.floor++;
    const maze = generateMaze();
    this.state.maze = maze;

    const player = this.state.player;
    player.x = maze.entrance.x;
    player.y = maze.entrance.y;
    player.prevX = maze.entrance.x;
    player.prevY = maze.entrance.y;
    player.hp = Math.min(player.maxHp, player.hp + 5);
    player.stamina = Math.min(player.maxStamina, player.stamina + 4);
    player.isMoving = false;
    player.moveProgress = 1;

    this.state.coins = maze.coinPositions.map(p => ({
      x: p.x, y: p.y, collected: false, animProgress: 0
    }));
    this.state.keys = maze.keyPositions.map(p => ({
      x: p.x, y: p.y, collected: false, animProgress: 0
    }));
    this.state.chests = maze.chestPositions.map(p => ({
      x: p.x, y: p.y, opened: false
    }));
    this.state.monsters = maze.monsterPositions.map(p => ({
      x: p.x, y: p.y, hp: 4, alive: true
    }));
    this.state.particles = [];
    this.state.flyingCoins = [];
    this.state.stepsSinceCombat = 0;
  }

  private triggerGameOver(type: 'hp' | 'stamina'): void {
    this.state.gameOver = true;
    this.state.gameOverType = type;
  }

  restart(): void {
    this.state = this.createInitialState();
    this.keysPressed.clear();
    this.notify();
  }

  usePotion(): void {
    if (this.state.player.potions > 0 && this.state.player.hp < this.state.player.maxHp) {
      this.state.player.potions--;
      this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 5);
    }
  }
}

export type ShipType = 'fighter' | 'frigate' | 'carrier';
export type ShipSide = 'player' | 'enemy';
export type CommandMode = 'move' | 'attack' | 'retreat';

export interface ShipStats {
  readonly type: ShipType;
  readonly name: string;
  readonly maxHp: number;
  readonly speed: number;
  readonly attackRange: number;
  readonly attackInterval: number;
  readonly damage: number;
  readonly radius: number;
  readonly scoreValue: number;
  readonly color: string;
}

export const SHIP_STATS: Record<ShipType, ShipStats> = {
  fighter: {
    type: 'fighter',
    name: '战斗机',
    maxHp: 50,
    speed: 3,
    attackRange: 80,
    attackInterval: 800,
    damage: 15,
    radius: 8,
    scoreValue: 10,
    color: '#45A29E'
  },
  frigate: {
    type: 'frigate',
    name: '护卫舰',
    maxHp: 120,
    speed: 2,
    attackRange: 120,
    attackInterval: 1200,
    damage: 30,
    radius: 10,
    scoreValue: 25,
    color: '#66FCF1'
  },
  carrier: {
    type: 'carrier',
    name: '航母',
    maxHp: 250,
    speed: 1.5,
    attackRange: 150,
    attackInterval: 2000,
    damage: 50,
    radius: 14,
    scoreValue: 50,
    color: '#F4E04D'
  }
};

const ENEMY_COLORS: Record<ShipType, string> = {
  fighter: '#C3073F',
  frigate: '#6F2232',
  carrier: '#8B0000'
};

export class Ship {
  id: number;
  type: ShipType;
  side: ShipSide;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  angle: number;
  hp: number;
  maxHp: number;
  speed: number;
  attackRange: number;
  attackInterval: number;
  damage: number;
  radius: number;
  scoreValue: number;
  color: string;
  isSelected: boolean;
  target: Ship | null;
  commandMode: CommandMode | null;
  lastAttackTime: number;
  isAlive: boolean;

  private static nextId = 1;

  constructor(type: ShipType, side: ShipSide, x: number, y: number) {
    const stats = SHIP_STATS[type];
    this.id = Ship.nextId++;
    this.type = type;
    this.side = side;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.angle = side === 'player' ? 0 : Math.PI;
    this.hp = stats.maxHp;
    this.maxHp = stats.maxHp;
    this.speed = stats.speed;
    this.attackRange = stats.attackRange;
    this.attackInterval = stats.attackInterval;
    this.damage = stats.damage;
    this.radius = stats.radius;
    this.scoreValue = stats.scoreValue;
    this.color = side === 'player' ? stats.color : ENEMY_COLORS[type];
    this.isSelected = false;
    this.target = null;
    this.commandMode = null;
    this.lastAttackTime = 0;
    this.isAlive = true;
  }

  takeDamage(damage: number): boolean {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.isAlive = false;
      return true;
    }
    return false;
  }

  setMoveTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.target = null;
    this.commandMode = 'move';
  }

  setAttackTarget(target: Ship): void {
    this.target = target;
    this.commandMode = 'attack';
  }

  setRetreat(): void {
    this.target = null;
    this.commandMode = 'retreat';
    if (this.side === 'player') {
      this.targetX = 50;
      this.targetY = this.y;
    } else {
      this.targetX = 750;
      this.targetY = this.y;
    }
  }

  update(deltaTime: number, currentTime: number): boolean {
    if (!this.isAlive) return false;

    if (this.commandMode === 'attack' && this.target && this.target.isAlive) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.attackRange) {
        this.moveToward(this.target.x, this.target.y);
      } else {
        this.angle = Math.atan2(dy, dx);
        if (currentTime - this.lastAttackTime >= this.attackInterval) {
          this.lastAttackTime = currentTime;
          return true;
        }
      }
    } else if (this.commandMode === 'move' || this.commandMode === 'retreat') {
      this.moveToward(this.targetX, this.targetY);
    } else {
      if (this.target && !this.target.isAlive) {
        this.target = null;
        this.commandMode = null;
      }
    }

    return false;
  }

  private moveToward(tx: number, ty: number): void {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.speed) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
      this.angle = Math.atan2(dy, dx);
    } else if (dist > 0.5) {
      this.x = tx;
      this.y = ty;
      this.angle = Math.atan2(dy, dx);
    }

    this.x = Math.max(this.radius, Math.min(800 - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(550 - this.radius, this.y));
  }

  findNearestEnemy(ships: Ship[]): Ship | null {
    let nearest: Ship | null = null;
    let minDist = Infinity;

    for (const ship of ships) {
      if (ship.side === this.side || !ship.isAlive) continue;
      const dx = ship.x - this.x;
      const dy = ship.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = ship;
      }
    }

    return nearest;
  }
}

export class FleetManager {
  ships: Ship[];
  private damageCallbacks: Array<(attacker: Ship, target: Ship) => void> = [];

  constructor() {
    this.ships = [];
  }

  onShipAttack(callback: (attacker: Ship, target: Ship) => void): void {
    this.damageCallbacks.push(callback);
  }

  addShip(ship: Ship): void {
    this.ships.push(ship);
  }

  removeDeadShips(): Ship[] {
    const dead: Ship[] = [];
    this.ships = this.ships.filter(s => {
      if (!s.isAlive) {
        dead.push(s);
        return false;
      }
      return true;
    });
    return dead;
  }

  getAliveShips(): Ship[] {
    return this.ships.filter(s => s.isAlive);
  }

  getShipsBySide(side: ShipSide): Ship[] {
    return this.ships.filter(s => s.side === side && s.isAlive);
  }

  selectShipAt(x: number, y: number, side: ShipSide): Ship | null {
    for (const ship of this.ships) {
      if (ship.side !== side || !ship.isAlive) continue;
      const dx = ship.x - x;
      const dy = ship.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= ship.radius + 4) {
        return ship;
      }
    }
    return null;
  }

  getShipAt(x: number, y: number): Ship | null {
    for (const ship of this.ships) {
      if (!ship.isAlive) continue;
      const dx = ship.x - x;
      const dy = ship.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= ship.radius + 4) {
        return ship;
      }
    }
    return null;
  }

  clearSelection(): void {
    for (const ship of this.ships) {
      ship.isSelected = false;
    }
  }

  getSelectedShip(): Ship | null {
    return this.ships.find(s => s.isSelected) || null;
  }

  updateAll(deltaTime: number, currentTime: number): void {
    for (const ship of this.ships) {
      if (!ship.isAlive) continue;

      if (ship.side === 'enemy' && !ship.commandMode) {
        const target = ship.findNearestEnemy(this.ships);
        if (target) {
          ship.setAttackTarget(target);
        }
      }

      const shouldAttack = ship.update(deltaTime, currentTime);
      if (shouldAttack && ship.target && ship.target.isAlive) {
        for (const cb of this.damageCallbacks) {
          cb(ship, ship.target);
        }
      }
    }
  }

  getFleetScore(side: ShipSide): { count: number; power: number } {
    const ships = this.getShipsBySide(side);
    let power = 0;
    for (const s of ships) {
      power += s.scoreValue;
    }
    return { count: ships.length, power };
  }

  reset(): void {
    this.ships = [];
    this.damageCallbacks = [];
    Ship['nextId'] = 1;
  }
}

export function createInitialFleets(fleet: FleetManager): void {
  fleet.addShip(new Ship('fighter', 'player', 120, 200));
  fleet.addShip(new Ship('fighter', 'player', 120, 300));
  fleet.addShip(new Ship('fighter', 'player', 120, 400));
  fleet.addShip(new Ship('frigate', 'player', 80, 300));

  fleet.addShip(new Ship('fighter', 'enemy', 680, 180));
  fleet.addShip(new Ship('fighter', 'enemy', 680, 260));
  fleet.addShip(new Ship('fighter', 'enemy', 680, 340));
  fleet.addShip(new Ship('fighter', 'enemy', 680, 420));
  fleet.addShip(new Ship('frigate', 'enemy', 720, 300));
}

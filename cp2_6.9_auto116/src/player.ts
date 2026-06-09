import { Direction, Position, MAZE_SIZE } from './maze';

export type ItemType = 'health' | 'attack' | 'shield';

export interface Item {
  type: ItemType;
  id: string;
}

const MOVE_DURATION = 0.15;
const ATTACK_WINDUP = 0.1;
const ATTACK_COOLDOWN = 0.2;
const MAX_INVENTORY = 3;

export class Player {
  pos: Position;
  targetPos: Position;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
  hasShield: boolean;
  inventory: Item[];
  direction: Direction;
  isMoving: boolean;
  moveProgress: number;
  isAttacking: boolean;
  attackPhase: 'windup' | 'swing' | 'cooldown' | null;
  attackTimer: number;
  moveTimer: number;

  constructor() {
    this.pos = { x: 1, y: 1 };
    this.targetPos = { x: 1, y: 1 };
    this.hp = 5;
    this.maxHp = 5;
    this.attack = 1;
    this.level = 1;
    this.hasShield = false;
    this.inventory = [];
    this.direction = 'right';
    this.isMoving = false;
    this.moveProgress = 0;
    this.isAttacking = false;
    this.attackPhase = null;
    this.attackTimer = 0;
    this.moveTimer = 0;
  }

  resetForNewCycle(): void {
    this.pos = { x: 1, y: 1 };
    this.targetPos = { x: 1, y: 1 };
    this.hp = this.maxHp;
    this.direction = 'right';
    this.isMoving = false;
    this.moveProgress = 0;
    this.isAttacking = false;
    this.attackPhase = null;
    this.attackTimer = 0;
    this.moveTimer = 0;
  }

  levelUp(): void {
    this.level++;
    this.maxHp++;
    this.hp = this.maxHp;
    this.attack++;
  }

  fullReset(): void {
    this.pos = { x: 1, y: 1 };
    this.targetPos = { x: 1, y: 1 };
    this.hp = 5;
    this.maxHp = 5;
    this.attack = 1;
    this.level = 1;
    this.hasShield = false;
    this.inventory = [];
    this.direction = 'right';
    this.isMoving = false;
    this.moveProgress = 0;
    this.isAttacking = false;
    this.attackPhase = null;
    this.attackTimer = 0;
    this.moveTimer = 0;
  }

  canAct(): boolean {
    return !this.isMoving && !this.isAttacking;
  }

  tryMove(dir: Direction, isWalkable: (x: number, y: number) => boolean): boolean {
    if (!this.canAct()) return false;

    this.direction = dir;
    let nx = this.pos.x;
    let ny = this.pos.y;

    switch (dir) {
      case 'up': ny--; break;
      case 'down': ny++; break;
      case 'left': nx--; break;
      case 'right': nx++; break;
    }

    if (!isWalkable(nx, ny)) return false;
    if (nx < 0 || nx >= MAZE_SIZE || ny < 0 || ny >= MAZE_SIZE) return false;

    this.targetPos = { x: nx, y: ny };
    this.isMoving = true;
    this.moveProgress = 0;
    this.moveTimer = 0;
    return true;
  }

  tryAttack(): boolean {
    if (!this.canAct()) return false;

    this.isAttacking = true;
    this.attackPhase = 'windup';
    this.attackTimer = 0;
    return true;
  }

  getAttackPosition(): Position {
    let ax = this.pos.x;
    let ay = this.pos.y;
    switch (this.direction) {
      case 'up': ay--; break;
      case 'down': ay++; break;
      case 'left': ax--; break;
      case 'right': ax++; break;
    }
    return { x: ax, y: ay };
  }

  update(dt: number): boolean {
    let didHit = false;

    if (this.isMoving) {
      this.moveTimer += dt;
      this.moveProgress = Math.min(1, this.moveTimer / MOVE_DURATION);
      if (this.moveProgress >= 1) {
        this.pos = { ...this.targetPos };
        this.isMoving = false;
        this.moveProgress = 0;
      }
    }

    if (this.isAttacking) {
      this.attackTimer += dt;
      if (this.attackPhase === 'windup' && this.attackTimer >= ATTACK_WINDUP) {
        this.attackPhase = 'swing';
        this.attackTimer = 0;
        didHit = true;
      } else if (this.attackPhase === 'swing' && this.attackTimer >= 0.05) {
        this.attackPhase = 'cooldown';
        this.attackTimer = 0;
      } else if (this.attackPhase === 'cooldown' && this.attackTimer >= ATTACK_COOLDOWN) {
        this.isAttacking = false;
        this.attackPhase = null;
        this.attackTimer = 0;
      }
    }

    return didHit;
  }

  getRenderPos(): Position {
    if (!this.isMoving) {
      return { ...this.pos };
    }
    const t = this.easeOut(this.moveProgress);
    return {
      x: this.pos.x + (this.targetPos.x - this.pos.x) * t,
      y: this.pos.y + (this.targetPos.y - this.pos.y) * t
    };
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  takeDamage(dmg: number): boolean {
    if (this.hasShield) {
      this.hasShield = false;
      return false;
    }
    this.hp = Math.max(0, this.hp - dmg);
    return this.hp <= 0;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  pickupItem(item: Item): boolean {
    if (this.inventory.length >= MAX_INVENTORY) return false;
    this.inventory.push(item);
    return true;
  }

  useItem(index: number): string | null {
    if (index < 0 || index >= this.inventory.length) return null;
    const item = this.inventory[index];
    this.inventory.splice(index, 1);

    switch (item.type) {
      case 'health':
        this.heal(2);
        return '使用生命药水，恢复2点血量';
      case 'attack':
        this.attack++;
        return '使用攻击力提升，攻击力+1';
      case 'shield':
        this.hasShield = true;
        return '装备护盾，可抵挡下一次伤害';
      default:
        return null;
    }
  }
}

export function generateRandomItem(): Item {
  const types: ItemType[] = ['health', 'attack', 'shield'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  };
}

export interface EnemyState {
  name: string;
  attack: number;
  defense: number;
  maxHp: number;
  currentHp: number;
}

export interface EnemyConfig {
  attackRange: [number, number];
  defenseRange: [number, number];
  hpRange: [number, number];
}

const ENEMY_NAMES = [
  '史莱姆', '哥布林', '骷髅兵', '蝙蝠', '狼人',
  '石像鬼', '亡灵法师', '黑暗骑士', '巨龙', '恶魔'
];

const DEFAULT_CONFIG: EnemyConfig = {
  attackRange: [20, 80],
  defenseRange: [10, 60],
  hpRange: [80, 300]
};

export class Enemy {
  private state: EnemyState;

  constructor(config?: Partial<EnemyConfig>) {
    const merged: EnemyConfig = { ...DEFAULT_CONFIG, ...config };
    this.state = this.generateRandom(merged);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private pickRandomName(): string {
    const idx = Math.floor(Math.random() * ENEMY_NAMES.length);
    return ENEMY_NAMES[idx];
  }

  private generateRandom(config: EnemyConfig): EnemyState {
    const attack = this.randInt(config.attackRange[0], config.attackRange[1]);
    const defense = this.randInt(config.defenseRange[0], config.defenseRange[1]);
    const hp = this.randInt(config.hpRange[0], config.hpRange[1]);
    return {
      name: this.pickRandomName(),
      attack,
      defense,
      maxHp: hp,
      currentHp: hp
    };
  }

  regenerate(config?: Partial<EnemyConfig>): EnemyState {
    const merged: EnemyConfig = { ...DEFAULT_CONFIG, ...config };
    this.state = this.generateRandom(merged);
    return { ...this.state };
  }

  getName(): string {
    return this.state.name;
  }

  getAttack(): number {
    return this.state.attack;
  }

  getDefense(): number {
    return this.state.defense;
  }

  getMaxHp(): number {
    return this.state.maxHp;
  }

  getCurrentHp(): number {
    return this.state.currentHp;
  }

  isAlive(): boolean {
    return this.state.currentHp > 0;
  }

  resetHp(): void {
    this.state.currentHp = this.state.maxHp;
  }

  takeDamage(incomingAttack: number): number {
    const damage = Math.max(1, incomingAttack - this.state.defense);
    this.state.currentHp = Math.max(0, this.state.currentHp - damage);
    return damage;
  }

  getState(): EnemyState {
    return { ...this.state };
  }
}

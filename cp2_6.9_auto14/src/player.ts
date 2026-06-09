export interface PlayerConfig {
  attack: number;
  defense: number;
  hp: number;
}

export interface PlayerState {
  attack: number;
  defense: number;
  maxHp: number;
  currentHp: number;
}

export class Player {
  private state: PlayerState;

  constructor(config: PlayerConfig) {
    this.state = {
      attack: config.attack,
      defense: config.defense,
      maxHp: config.hp,
      currentHp: config.hp
    };
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

  setAttack(value: number): void {
    this.state.attack = Math.max(10, Math.min(100, value));
  }

  setDefense(value: number): void {
    this.state.defense = Math.max(5, Math.min(80, value));
  }

  setMaxHp(value: number): void {
    const newMaxHp = Math.max(50, Math.min(500, value));
    this.state.maxHp = newMaxHp;
    if (this.state.currentHp > newMaxHp) {
      this.state.currentHp = newMaxHp;
    }
  }

  resetHp(): void {
    this.state.currentHp = this.state.maxHp;
  }

  takeDamage(incomingAttack: number): number {
    const damage = Math.max(1, incomingAttack - this.state.defense);
    this.state.currentHp = Math.max(0, this.state.currentHp - damage);
    return damage;
  }

  getState(): PlayerState {
    return { ...this.state };
  }
}

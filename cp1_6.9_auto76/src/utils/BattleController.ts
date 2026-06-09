export type HeroClass = 'warrior' | 'archer' | 'mage';
export type MonsterType = 'skeleton' | 'slime' | 'bat';
export type TrapType = 'spike' | 'ice' | 'fire';
export type Phase = 'player' | 'monster' | 'transition';

export interface Hero {
  id: string;
  name: string;
  class: HeroClass;
  hp: number;
  maxHp: number;
  attack: number;
  level: number;
  exp: number;
  expToNext: number;
  skillCooldown: number;
  skillMaxCooldown: number;
  gridX: number;
  gridY: number;
  isSelected: boolean;
}

export interface Monster {
  id: string;
  type: MonsterType;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  gridX: number;
  gridY: number;
  pathIndex: number;
  isSlowed: boolean;
  slowTurns: number;
}

export interface Trap {
  id: string;
  type: TrapType;
  gridX: number;
  gridY: number;
  triggered: boolean;
  damage: number;
}

export interface GameState {
  heroes: Hero[];
  monsters: Monster[];
  traps: Trap[];
  gold: number;
  turn: number;
  phase: Phase;
  playerPhaseTime: number;
  score: number;
  sealedSpawns: Set<string>;
}

export interface BattleEvent {
  type: 'damage' | 'heal' | 'kill' | 'exp' | 'levelup' | 'trap' | 'phase' | 'gold' | 'seal';
  targetId?: string;
  sourceId?: string;
  value?: number;
  message?: string;
}

export class BattleController {
  private state: GameState;
  private listeners: ((event: BattleEvent) => void)[] = [];

  constructor(state: GameState) {
    this.state = state;
  }

  public addListener(fn: (event: BattleEvent) => void): void {
    this.listeners.push(fn);
  }

  public removeListener(fn: (event: BattleEvent) => void): void {
    this.listeners = this.listeners.filter((l) => l !== fn);
  }

  private emit(event: BattleEvent): void {
    for (const fn of this.listeners) {
      fn(event);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public moveHero(heroId: string, targetX: number, targetY: number): boolean {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) return false;

    const dx = Math.abs(targetX - hero.gridX);
    const dy = Math.abs(targetY - hero.gridY);
    if (dx + dy !== 1) return false;

    hero.gridX = targetX;
    hero.gridY = targetY;
    return true;
  }

  public placeTrap(type: TrapType, gridX: number, gridY: number): Trap | null {
    const trap: Trap = {
      id: `trap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      gridX,
      gridY,
      triggered: false,
      damage: type === 'spike' ? 15 : type === 'ice' ? 10 : 25
    };

    this.state.traps.push(trap);

    const spawnKey = `${gridX}_${gridY}`;
    const isSpawn = this.state.sealedSpawns.has(spawnKey) || 
      this.isMonsterSpawn(gridX, gridY);
    
    if (isSpawn) {
      const trapsAtSpawn = this.state.traps.filter(
        (t) => t.gridX === gridX && t.gridY === gridY
      );
      if (trapsAtSpawn.length >= 3) {
        this.state.sealedSpawns.add(spawnKey);
        this.emit({ type: 'seal', message: `封印了 (${gridX},${gridY}) 的怪物刷新点！` });
      }
    }

    this.emit({ type: 'trap', targetId: trap.id, message: `放置了${this.trapName(type)}` });
    return trap;
  }

  private trapName(type: TrapType): string {
    return type === 'spike' ? '尖刺陷阱' : type === 'ice' ? '冰冻陷阱' : '火墙陷阱';
  }

  private isMonsterSpawn(_gridX: number, _gridY: number): boolean {
    return false;
  }

  public useSkill(heroId: string): boolean {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero || hero.skillCooldown > 0) return false;

    hero.skillCooldown = hero.skillMaxCooldown;

    switch (hero.class) {
      case 'warrior':
        this.warriorTaunt(hero);
        break;
      case 'archer':
        this.archerScatter(hero);
        break;
      case 'mage':
        this.mageFireball(hero);
        break;
    }

    return true;
  }

  private warriorTaunt(hero: Hero): void {
    this.emit({ type: 'phase', sourceId: hero.id, message: `${hero.name} 使用了嘲讽！` });
  }

  private archerScatter(hero: Hero): void {
    const nearby = this.getMonstersNearHero(hero, 3);
    for (const monster of nearby.slice(0, 3)) {
      this.dealDamage(monster.id, Math.floor(hero.attack * 0.6), hero.id);
    }
    this.emit({ type: 'phase', sourceId: hero.id, message: `${hero.name} 使用了散射！` });
  }

  private mageFireball(hero: Hero): void {
    const nearby = this.getMonstersNearHero(hero, 2);
    for (const monster of nearby) {
      this.dealDamage(monster.id, Math.floor(hero.attack * 1.5), hero.id);
    }
    this.emit({ type: 'phase', sourceId: hero.id, message: `${hero.name} 释放了火球术！` });
  }

  private getMonstersNearHero(hero: Hero, range: number): Monster[] {
    return this.state.monsters.filter((m) => {
      const dx = Math.abs(m.gridX - hero.gridX);
      const dy = Math.abs(m.gridY - hero.gridY);
      return dx + dy <= range;
    });
  }

  public dealDamage(targetId: string, damage: number, sourceId?: string): void {
    let target: Hero | Monster | undefined = this.state.heroes.find((h) => h.id === targetId);
    if (!target) {
      target = this.state.monsters.find((m) => m.id === targetId);
    }
    if (!target) return;

    target.hp = Math.max(0, target.hp - damage);
    this.emit({ type: 'damage', targetId, sourceId, value: damage });

    if (target.hp <= 0) {
      if ('type' in target) {
        this.killMonster(target.id);
      } else {
        this.emit({ type: 'kill', targetId, message: `${target.name} 倒下了！` });
      }
    }
  }

  private killMonster(monsterId: string): void {
    const idx = this.state.monsters.findIndex((m) => m.id === monsterId);
    if (idx === -1) return;
    const monster = this.state.monsters[idx];

    const goldReward = monster.type === 'skeleton' ? 15 : monster.type === 'slime' ? 10 : 20;
    const expReward = monster.type === 'skeleton' ? 20 : monster.type === 'slime' ? 10 : 25;

    this.state.gold += goldReward;
    this.state.score += goldReward;
    this.emit({ type: 'gold', value: goldReward });

    for (const hero of this.state.heroes) {
      if (hero.hp > 0) {
        this.gainExp(hero.id, Math.floor(expReward / this.state.heroes.filter((h) => h.hp > 0).length));
      }
    }

    this.state.monsters.splice(idx, 1);
    this.emit({ type: 'kill', targetId: monsterId, message: `击败了${this.monsterName(monster.type)}！` });
  }

  private monsterName(type: MonsterType): string {
    return type === 'skeleton' ? '骷髅' : type === 'slime' ? '史莱姆' : '蝙蝠';
  }

  public gainExp(heroId: string, exp: number): void {
    const hero = this.state.heroes.find((h) => h.id === heroId);
    if (!hero) return;

    hero.exp += exp;
    this.emit({ type: 'exp', targetId: heroId, value: exp });

    while (hero.exp >= hero.expToNext) {
      hero.exp -= hero.expToNext;
      hero.level += 1;
      hero.maxHp += 20;
      hero.hp = Math.min(hero.maxHp, hero.hp + 20);
      hero.attack += 5;
      hero.expToNext = Math.floor(hero.expToNext * 1.5);
      this.emit({ type: 'levelup', targetId: heroId, message: `${hero.name} 升级到 Lv.${hero.level}！` });
    }
  }

  public spawnMonsters(spawnPoints: { x: number; y: number }[]): void {
    const idBase = Date.now();
    let counter = 0;

    for (const spawn of spawnPoints) {
      const spawnKey = `${spawn.x}_${spawn.y}`;
      if (this.state.sealedSpawns.has(spawnKey)) continue;

      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        const types: MonsterType[] = ['skeleton', 'slime', 'bat'];
        const type = types[Math.floor(Math.random() * types.length)];
        const base = this.monsterStats(type);
        const monster: Monster = {
          id: `monster_${idBase}_${counter++}`,
          type,
          hp: base.hp,
          maxHp: base.hp,
          attack: base.attack,
          speed: base.speed,
          gridX: spawn.x,
          gridY: spawn.y,
          pathIndex: 0,
          isSlowed: false,
          slowTurns: 0
        };
        this.state.monsters.push(monster);
      }
    }
  }

  private monsterStats(type: MonsterType): { hp: number; attack: number; speed: number } {
    switch (type) {
      case 'skeleton':
        return { hp: 40, attack: 8, speed: 1 };
      case 'slime':
        return { hp: 60, attack: 5, speed: 0.5 };
      case 'bat':
        return { hp: 25, attack: 6, speed: 2 };
    }
  }

  public moveMonstersAlongPath(path: { x: number; y: number }[]): void {
    for (const monster of this.state.monsters) {
      if (monster.isSlowed) {
        monster.slowTurns -= 1;
        if (monster.slowTurns <= 0) {
          monster.isSlowed = false;
        } else {
          continue;
        }
      }

      if (monster.pathIndex < path.length - 1) {
        monster.pathIndex += 1;
        monster.gridX = path[monster.pathIndex].x;
        monster.gridY = path[monster.pathIndex].y;
      }

      const trap = this.state.traps.find(
        (t) => t.gridX === monster.gridX && t.gridY === monster.gridY && !t.triggered
      );
      if (trap) {
        trap.triggered = true;
        this.dealDamage(monster.id, trap.damage);
        if (trap.type === 'ice') {
          monster.isSlowed = true;
          monster.slowTurns = 1;
        }
        this.emit({
          type: 'trap',
          targetId: monster.id,
          sourceId: trap.id,
          value: trap.damage,
          message: `${this.monsterName(monster.type)} 触发了${this.trapName(trap.type)}！`
        });
      }
    }
  }

  public monstersAttackHeroes(): void {
    const liveHeroes = this.state.heroes.filter((h) => h.hp > 0);
    if (liveHeroes.length === 0) return;

    for (const monster of this.state.monsters) {
      const adjacentHero = liveHeroes.find(
        (h) => Math.abs(h.gridX - monster.gridX) + Math.abs(h.gridY - monster.gridY) <= 1
      );
      if (adjacentHero) {
        this.dealDamage(adjacentHero.id, monster.attack, monster.id);
      }
    }
  }

  public heroesAttackMonsters(): void {
    for (const hero of this.state.heroes) {
      if (hero.hp <= 0) continue;
      const nearby = this.getMonstersNearHero(hero, 1);
      if (nearby.length > 0) {
        const target = nearby[0];
        this.dealDamage(target.id, hero.attack, hero.id);
      }
    }
  }

  public tickCooldowns(): void {
    for (const hero of this.state.heroes) {
      if (hero.skillCooldown > 0) {
        hero.skillCooldown -= 1;
      }
    }
  }

  public advancePhase(): void {
    if (this.state.phase === 'player') {
      this.state.phase = 'transition';
    } else if (this.state.phase === 'transition') {
      this.state.phase = 'monster';
    } else {
      this.state.phase = 'player';
      this.state.turn += 1;
      this.state.playerPhaseTime = 60;
    }
    this.emit({ type: 'phase', message: `进入${this.phaseName(this.state.phase)}阶段` });
  }

  private phaseName(phase: Phase): string {
    return phase === 'player' ? '玩家' : phase === 'monster' ? '怪物' : '过渡';
  }

  public checkVictory(totalSpawns: number, hasTreasure: boolean): boolean {
    return this.state.sealedSpawns.size >= totalSpawns && hasTreasure;
  }

  public checkDefeat(): boolean {
    return this.state.heroes.every((h) => h.hp <= 0);
  }
}

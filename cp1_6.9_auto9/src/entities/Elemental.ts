export type ElementType = 'fire' | 'water' | 'wind';

export interface Skill {
  id: string;
  name: string;
  description: string;
  type: 'normal' | 'elemental' | 'defense';
  element: ElementType | null;
  damage: number;
  isAoe: boolean;
  cooldown: number;
  currentCooldown: number;
}

export interface ElementalConfig {
  id: string;
  name: string;
  element: ElementType;
  maxHp: number;
  attack: number;
  speed: number;
  defense: number;
  skills: Skill[];
  team: 'player' | 'enemy';
}

export class Elemental {
  id: string;
  name: string;
  element: ElementType;
  maxHp: number;
  currentHp: number;
  attack: number;
  speed: number;
  defense: number;
  skills: Skill[];
  team: 'player' | 'enemy';
  isDefending: boolean;
  isAlive: boolean;
  damageBoost: number;
  extraTurns: number;

  constructor(config: ElementalConfig) {
    this.id = config.id;
    this.name = config.name;
    this.element = config.element;
    this.maxHp = config.maxHp;
    this.currentHp = config.maxHp;
    this.attack = config.attack;
    this.speed = config.speed;
    this.defense = config.defense;
    this.skills = JSON.parse(JSON.stringify(config.skills));
    this.team = config.team;
    this.isDefending = false;
    this.isAlive = true;
    this.damageBoost = 1;
    this.extraTurns = 0;
  }

  static getElementMultiplier(attackerElement: ElementType, defenderElement: ElementType): number {
    if (attackerElement === defenderElement) {
      return 0.8;
    }
    if (
      (attackerElement === 'fire' && defenderElement === 'wind') ||
      (attackerElement === 'wind' && defenderElement === 'water') ||
      (attackerElement === 'water' && defenderElement === 'fire')
    ) {
      return 1.5;
    }
    return 1.0;
  }

  static getElementColor(element: ElementType): string {
    switch (element) {
      case 'fire':
        return '#ff6b35';
      case 'water':
        return '#4fc3f7';
      case 'wind':
        return '#81c784';
    }
  }

  static getElementName(element: ElementType): string {
    switch (element) {
      case 'fire':
        return '火';
      case 'water':
        return '水';
      case 'wind':
        return '风';
    }
  }

  takeDamage(rawDamage: number, attackerElement: ElementType): { damage: number; multiplier: number; isKill: boolean } {
    if (!this.isAlive) {
      return { damage: 0, multiplier: 1, isKill: false };
    }

    const multiplier = Elemental.getElementMultiplier(attackerElement, this.element);
    let damage = rawDamage * multiplier;

    if (this.isDefending) {
      damage *= 0.5;
      this.isDefending = false;
    }

    damage = Math.max(1, Math.floor(damage - this.defense * 0.3));
    this.currentHp = Math.max(0, this.currentHp - damage);

    const isKill = this.currentHp <= 0;
    if (isKill) {
      this.isAlive = false;
    }

    return { damage, multiplier, isKill };
  }

  useSkill(skillId: string, targets: Elemental[]): {
    results: { target: Elemental; damage: number; multiplier: number; isKill: boolean }[];
    usedSkill: Skill | null;
  } {
    const skill = this.skills.find(s => s.id === skillId);
    if (!skill || skill.currentCooldown > 0) {
      return { results: [], usedSkill: null };
    }

    if (skill.type === 'defense') {
      this.isDefending = true;
      return { results: [], usedSkill: skill };
    }

    skill.currentCooldown = skill.cooldown;

    const results = targets.map(target => {
      const element = skill.element || this.element;
      const baseDamage = skill.damage + this.attack * 0.5;
      const boostedDamage = baseDamage * this.damageBoost;
      const result = target.takeDamage(boostedDamage, element);
      return { target, ...result };
    });

    this.damageBoost = 1;

    return { results, usedSkill: skill };
  }

  tickCooldowns(): void {
    this.skills.forEach(skill => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown--;
      }
    });
  }

  getHpPercentage(): number {
    return this.currentHp / this.maxHp;
  }

  toSerializable(): any {
    return {
      id: this.id,
      name: this.name,
      element: this.element,
      maxHp: this.maxHp,
      currentHp: this.currentHp,
      attack: this.attack,
      speed: this.speed,
      defense: this.defense,
      skills: this.skills,
      team: this.team,
      isDefending: this.isDefending,
      isAlive: this.isAlive,
      hpPercentage: this.getHpPercentage()
    };
  }
}

export const createPlayerTeam = (): Elemental[] => {
  return [
    new Elemental({
      id: 'player_fire',
      name: '烈焰龙兽',
      element: 'fire',
      maxHp: 100,
      attack: 25,
      speed: 18,
      defense: 8,
      team: 'player',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'fire_blast', name: '烈焰喷射', description: '对单个目标造成火焰伤害，克制风系', type: 'elemental', element: 'fire', damage: 30, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'fire_storm', name: '火焰风暴', description: '对全体敌方造成火焰伤害', type: 'elemental', element: 'fire', damage: 18, isAoe: true, cooldown: 4, currentCooldown: 0 }
      ]
    }),
    new Elemental({
      id: 'player_water',
      name: '潮汐精灵',
      element: 'water',
      maxHp: 120,
      attack: 20,
      speed: 15,
      defense: 12,
      team: 'player',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'water_wave', name: '水波冲击', description: '对单个目标造成水系伤害，克制火系', type: 'elemental', element: 'water', damage: 28, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'defend', name: '水盾防御', description: '本回合受到的伤害减半', type: 'defense', element: null, damage: 0, isAoe: false, cooldown: 3, currentCooldown: 0 }
      ]
    }),
    new Elemental({
      id: 'player_wind',
      name: '疾风之翼',
      element: 'wind',
      maxHp: 85,
      attack: 28,
      speed: 28,
      defense: 6,
      team: 'player',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'wind_slash', name: '旋风切割', description: '对单个目标造成风系伤害，克制水系', type: 'elemental', element: 'wind', damage: 32, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'defend', name: '风盾', description: '本回合受到的伤害减半', type: 'defense', element: null, damage: 0, isAoe: false, cooldown: 3, currentCooldown: 0 }
      ]
    })
  ];
};

export const createEnemyTeam = (): Elemental[] => {
  return [
    new Elemental({
      id: 'enemy_fire',
      name: '炎魔战士',
      element: 'fire',
      maxHp: 110,
      attack: 22,
      speed: 16,
      defense: 10,
      team: 'enemy',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'fire_blast', name: '烈焰喷射', description: '对单个目标造成火焰伤害', type: 'elemental', element: 'fire', damage: 28, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'fire_storm', name: '火焰风暴', description: '对全体敌方造成火焰伤害', type: 'elemental', element: 'fire', damage: 16, isAoe: true, cooldown: 4, currentCooldown: 0 }
      ]
    }),
    new Elemental({
      id: 'enemy_water',
      name: '深渊海妖',
      element: 'water',
      maxHp: 130,
      attack: 18,
      speed: 14,
      defense: 14,
      team: 'enemy',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'water_wave', name: '水波冲击', description: '对单个目标造成水系伤害', type: 'elemental', element: 'water', damage: 26, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'defend', name: '水盾防御', description: '本回合受到的伤害减半', type: 'defense', element: null, damage: 0, isAoe: false, cooldown: 3, currentCooldown: 0 }
      ]
    }),
    new Elemental({
      id: 'enemy_wind',
      name: '风暴领主',
      element: 'wind',
      maxHp: 90,
      attack: 26,
      speed: 26,
      defense: 8,
      team: 'enemy',
      skills: [
        { id: 'normal_attack', name: '普通攻击', description: '对单个目标造成基础伤害', type: 'normal', element: null, damage: 15, isAoe: false, cooldown: 0, currentCooldown: 0 },
        { id: 'wind_slash', name: '旋风切割', description: '对单个目标造成风系伤害', type: 'elemental', element: 'wind', damage: 30, isAoe: false, cooldown: 2, currentCooldown: 0 },
        { id: 'defend', name: '风盾', description: '本回合受到的伤害减半', type: 'defense', element: null, damage: 0, isAoe: false, cooldown: 3, currentCooldown: 0 }
      ]
    })
  ];
};

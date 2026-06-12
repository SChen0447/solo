import {
  ShipType, Faction, TurnPhase, SkillType, StatusEffect,
  ShipUnit, HexCoord, AttackResult, GameSnapshot,
  SHIP_STATS, SHIP_SKILLS, SHIP_NAMES,
  ENERGY_REGEN_PER_TURN, MAX_ENERGY, GRID_SIZE,
} from './UnitTypes';

const HEX_DIRS: HexCoord[] = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

function hexDist(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

function hexKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

function isValidHex(c: HexCoord): boolean {
  if (c.q < 0 || c.q >= GRID_SIZE || c.r < 0 || c.r >= GRID_SIZE) return false;
  if (c.q + c.r < 0 || c.q + c.r >= GRID_SIZE * 2 - 1) return false;
  return true;
}

let shipIdCounter = 0;

function createShip(type: ShipType, faction: Faction, pos: HexCoord): ShipUnit {
  const stats = SHIP_STATS[type];
  const names = SHIP_NAMES[type];
  const nameIdx = shipIdCounter % names.length;
  const id = `${faction}_ship_${shipIdCounter++}`;
  return {
    id,
    type,
    faction,
    name: names[nameIdx],
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    attack: stats.attack,
    speed: stats.speed,
    energy: MAX_ENERGY,
    maxEnergy: MAX_ENERGY,
    pos: { ...pos },
    skills: [...SHIP_SKILLS[type]],
    statusEffects: [],
    movedThisTurn: false,
    attackedThisTurn: false,
    skillUsedThisTurn: false,
    shieldActive: false,
    shieldTurnsLeft: 0,
    silenced: false,
    salvoActive: false,
    cantMoveThisTurn: false,
  };
}

export class GameBoard {
  playerShips: ShipUnit[] = [];
  enemyShips: ShipUnit[] = [];
  turn = 1;
  phase: TurnPhase = TurnPhase.Move;
  selectedShipId: string | null = null;
  movableHexes: HexCoord[] = [];
  attackableTargets: string[] = [];
  log: string[] = [];
  gameOver = false;
  winner: Faction | null = null;

  init(): void {
    shipIdCounter = 0;
    this.turn = 1;
    this.phase = TurnPhase.Move;
    this.selectedShipId = null;
    this.movableHexes = [];
    this.attackableTargets = [];
    this.log = [];
    this.gameOver = false;
    this.winner = null;

    const playerTypes: ShipType[] = [
      ShipType.Frigate, ShipType.Frigate, ShipType.Destroyer,
      ShipType.Destroyer, ShipType.Battleship,
    ];
    const playerPositions: HexCoord[] = [
      { q: 0, r: 3 }, { q: 0, r: 4 }, { q: 1, r: 3 },
      { q: 1, r: 4 }, { q: 0, r: 5 },
    ];
    this.playerShips = playerTypes.map((t, i) => createShip(t, Faction.Player, playerPositions[i]));

    const enemyTypes: ShipType[] = [];
    const allTypes = [ShipType.Frigate, ShipType.Destroyer, ShipType.Battleship];
    for (let i = 0; i < 3; i++) {
      enemyTypes.push(allTypes[Math.floor(Math.random() * allTypes.length)]);
    }
    const enemyPositions: HexCoord[] = [
      { q: 8, r: 2 }, { q: 9, r: 2 }, { q: 8, r: 3 },
    ];
    this.enemyShips = enemyTypes.map((t, i) => createShip(t, Faction.Enemy, enemyPositions[i]));

    this.addLog('战斗开始！指挥官，请部署您的舰队。');
  }

  private addLog(msg: string): void {
    this.log.push(msg);
    if (this.log.length > 50) this.log.shift();
  }

  getAllShips(): ShipUnit[] {
    return [...this.playerShips, ...this.enemyShips];
  }

  getShipById(id: string): ShipUnit | undefined {
    return this.getAllShips().find(s => s.id === id);
  }

  getAliveShips(faction?: Faction): ShipUnit[] {
    const all = this.getAllShips().filter(s => s.hp > 0);
    if (faction) return all.filter(s => s.faction === faction);
    return all;
  }

  selectShip(id: string | null): void {
    this.selectedShipId = id;
    this.movableHexes = [];
    this.attackableTargets = [];

    if (!id) return;
    const ship = this.getShipById(id);
    if (!ship || ship.hp <= 0) {
      this.selectedShipId = null;
      return;
    }

    if (this.phase === TurnPhase.Move && ship.faction === Faction.Player && !ship.movedThisTurn) {
      this.movableHexes = this.calcMovableHexes(ship);
    }
    if (this.phase === TurnPhase.Attack && ship.faction === Faction.Player && !ship.attackedThisTurn) {
      this.attackableTargets = this.calcAttackableTargets(ship);
    }
  }

  private calcMovableHexes(ship: ShipUnit): HexCoord[] {
    if (ship.cantMoveThisTurn) return [];
    const occupied = new Set<string>();
    for (const s of this.getAllShips()) {
      if (s.hp > 0 && s.id !== ship.id) {
        occupied.add(hexKey(s.pos));
      }
    }

    const result: HexCoord[] = [];
    const visited = new Set<string>();
    const queue: { coord: HexCoord; dist: number }[] = [{ coord: ship.pos, dist: 0 }];
    visited.add(hexKey(ship.pos));

    while (queue.length > 0) {
      const { coord, dist } = queue.shift()!;
      if (dist > 0 && !occupied.has(hexKey(coord))) {
        result.push(coord);
      }
      if (dist < ship.speed) {
        for (const dir of HEX_DIRS) {
          const next = hexAdd(coord, dir);
          const key = hexKey(next);
          if (isValidHex(next) && !visited.has(key) && !occupied.has(key)) {
            visited.add(key);
            queue.push({ coord: next, dist: dist + 1 });
          }
        }
      }
    }
    return result;
  }

  private calcAttackableTargets(ship: ShipUnit): string[] {
    const enemyFaction = ship.faction === Faction.Player ? Faction.Enemy : Faction.Player;
    const enemies = this.getAliveShips(enemyFaction);
    const range = ship.type === ShipType.Battleship ? 4 : 3;
    return enemies
      .filter(e => hexDist(ship.pos, e.pos) <= range)
      .map(e => e.id);
  }

  moveShip(shipId: string, target: HexCoord): boolean {
    const ship = this.getShipById(shipId);
    if (!ship || ship.movedThisTurn || ship.cantMoveThisTurn) return false;
    if (!this.movableHexes.some(h => h.q === target.q && h.r === target.r)) return false;

    ship.pos = { ...target };
    ship.movedThisTurn = true;
    this.addLog(`${ship.name} 移动到 (${target.q}, ${target.r})`);
    this.movableHexes = [];
    return true;
  }

  attackShip(attackerId: string, targetId: string, useSkill: SkillType | null = null): AttackResult | null {
    const attacker = this.getShipById(attackerId);
    const target = this.getShipById(targetId);
    if (!attacker || !target || attacker.attackedThisTurn) return null;
    if (!this.attackableTargets.includes(targetId) && attacker.faction === Faction.Player) return null;

    let damage = attacker.attack;
    let skillUsed: SkillType | null = null;

    if (useSkill && attacker.skills.some(s => s.type === useSkill)) {
      const skill = attacker.skills.find(s => s.type === useSkill)!;
      if (attacker.energy < skill.energyCost) return null;
      if (attacker.silenced) return null;

      attacker.energy -= skill.energyCost;
      skillUsed = useSkill;

      if (useSkill === SkillType.Salvo) {
        damage *= 2;
        attacker.cantMoveThisTurn = true;
        attacker.salvoActive = true;
        this.addLog(`${attacker.name} 发动齐射！攻击力翻倍！`);
      } else if (useSkill === SkillType.EMP) {
        target.silenced = true;
        target.statusEffects.push({ type: StatusEffect.Silenced, remainingTurns: 1 });
        this.addLog(`${attacker.name} 发射电磁脉冲！${target.name} 被沉默！`);
      } else if (useSkill === SkillType.EmergencyShield) {
        attacker.shieldActive = true;
        attacker.shieldTurnsLeft = 2;
        attacker.statusEffects.push({ type: StatusEffect.Shielded, remainingTurns: 2 });
        this.addLog(`${attacker.name} 启动紧急护盾！减伤50%，持续2回合`);
      }
    }

    if (target.shieldActive) {
      damage = Math.floor(damage * 0.5);
    }

    target.hp = Math.max(0, target.hp - damage);
    attacker.attackedThisTurn = true;
    attacker.skillUsedThisTurn = skillUsed !== null;

    const killed = target.hp <= 0;
    if (killed) {
      this.addLog(`${target.name} 被击毁！`);
    } else {
      this.addLog(`${attacker.name} 对 ${target.name} 造成 ${damage} 点伤害${target.shieldActive ? '（护盾减半）' : ''}`);
    }

    this.checkGameOver();
    return { attackerId, targetId, damage, killed, skillUsed };
  }

  private checkGameOver(): void {
    const playerAlive = this.getAliveShips(Faction.Player).length;
    const enemyAlive = this.getAliveShips(Faction.Enemy).length;
    if (playerAlive === 0) {
      this.gameOver = true;
      this.winner = Faction.Enemy;
      this.addLog('舰队全灭...战斗失败。');
    } else if (enemyAlive === 0) {
      this.gameOver = true;
      this.winner = Faction.Player;
      this.addLog('敌方舰队全灭！胜利！');
    }
  }

  endTurn(): void {
    for (const ship of this.getAliveShips(Faction.Player)) {
      ship.energy = Math.min(MAX_ENERGY, ship.energy + ENERGY_REGEN_PER_TURN);
      this.processStatusEffects(ship);
      this.resetTurnFlags(ship);
    }

    this.turn++;
    this.phase = TurnPhase.Move;
    this.selectedShipId = null;
    this.movableHexes = [];
    this.attackableTargets = [];
    this.addLog(`--- 第 ${this.turn} 回合 ---`);

    this.runEnemyAI();

    for (const ship of this.getAliveShips(Faction.Enemy)) {
      ship.energy = Math.min(MAX_ENERGY, ship.energy + ENERGY_REGEN_PER_TURN);
      this.processStatusEffects(ship);
      this.resetTurnFlags(ship);
    }

    if (!this.gameOver) {
      this.checkGameOver();
    }
  }

  private processStatusEffects(ship: ShipUnit): void {
    const remaining: typeof ship.statusEffects = [];
    for (const eff of ship.statusEffects) {
      eff.remainingTurns--;
      if (eff.remainingTurns <= 0) {
        if (eff.type === StatusEffect.Shielded) {
          ship.shieldActive = false;
          ship.shieldTurnsLeft = 0;
        } else if (eff.type === StatusEffect.Silenced) {
          ship.silenced = false;
        } else if (eff.type === StatusEffect.SalvoCooldown) {
          ship.cantMoveThisTurn = false;
          ship.salvoActive = false;
        }
      } else {
        remaining.push(eff);
      }
    }
    ship.statusEffects = remaining;
  }

  private resetTurnFlags(ship: ShipUnit): void {
    ship.movedThisTurn = false;
    ship.attackedThisTurn = false;
    ship.skillUsedThisTurn = false;
  }

  advancePhase(): void {
    if (this.phase === TurnPhase.Move) {
      this.phase = TurnPhase.Attack;
      this.movableHexes = [];
      if (this.selectedShipId) {
        const ship = this.getShipById(this.selectedShipId);
        if (ship && ship.faction === Faction.Player && !ship.attackedThisTurn) {
          this.attackableTargets = this.calcAttackableTargets(ship);
        }
      }
      this.addLog('进入攻击阶段');
    } else if (this.phase === TurnPhase.Attack) {
      this.phase = TurnPhase.End;
      this.attackableTargets = [];
      this.addLog('进入结束阶段');
    }
  }

  private runEnemyAI(): void {
    const enemies = this.getAliveShips(Faction.Enemy);
    const players = this.getAliveShips(Faction.Player);
    if (players.length === 0) return;

    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;

      let target = players.reduce((min, p) => p.hp < min.hp ? p : min, players[0]);

      if (enemy.shieldActive && enemy.shieldTurnsLeft <= 1) {
        const retreatDirs = HEX_DIRS;
        for (const dir of retreatDirs) {
          const newPos = hexAdd(enemy.pos, dir);
          if (isValidHex(newPos) && !this.getAllShips().some(s => s.hp > 0 && s.id !== enemy.id && hexKey(s.pos) === hexKey(newPos))) {
            enemy.pos = newPos;
            this.addLog(`${enemy.name} 后撤至 (${newPos.q}, ${newPos.r})`);
            break;
          }
        }
      } else {
        const movable = this.calcMovableHexes(enemy);
        if (movable.length > 0) {
          let bestHex = enemy.pos;
          let bestDist = hexDist(enemy.pos, target.pos);
          for (const hex of movable) {
            const d = hexDist(hex, target.pos);
            if (d < bestDist) {
              bestDist = d;
              bestHex = hex;
            }
          }
          if (hexKey(bestHex) !== hexKey(enemy.pos)) {
            enemy.pos = bestHex;
            this.addLog(`${enemy.name} 移动到 (${bestHex.q}, ${bestHex.r})`);
          }
        }
      }

      const attackable = this.calcAttackableTargets(enemy);
      if (attackable.length > 0) {
        const weakestId = attackable.reduce((best, id) => {
          const s = this.getShipById(id)!;
          const b = this.getShipById(best)!;
          return s.hp < b.hp ? id : best;
        }, attackable[0]);

        let useSkill: SkillType | null = null;
        if (enemy.skills.length > 0 && !enemy.silenced) {
          const skill = enemy.skills[0];
          if (enemy.energy >= skill.energyCost) {
            if (skill.type === SkillType.EmergencyShield && enemy.hp < enemy.maxHp * 0.4) {
              useSkill = SkillType.EmergencyShield;
            } else if (skill.type === SkillType.EMP && target.hp > 0) {
              useSkill = SkillType.EMP;
            } else if (skill.type === SkillType.Salvo && hexDist(enemy.pos, target.pos) <= 4) {
              useSkill = SkillType.Salvo;
            }
          }
        }

        this.attackableTargets = attackable;
        const result = this.attackShip(enemy.id, weakestId, useSkill);
        if (result) {
          this.addLog(`敌方 ${enemy.name} 攻击了 ${this.getShipById(weakestId)?.name || '目标'}`);
        }
      }

      enemy.movedThisTurn = true;
      enemy.attackedThisTurn = true;
    }
  }

  getSnapshot(): GameSnapshot {
    return {
      turn: this.turn,
      phase: this.phase,
      playerShips: this.playerShips.map(s => ({ ...s, pos: { ...s.pos }, skills: [...s.skills], statusEffects: s.statusEffects.map(e => ({ ...e })) })),
      enemyShips: this.enemyShips.map(s => ({ ...s, pos: { ...s.pos }, skills: [...s.skills], statusEffects: s.statusEffects.map(e => ({ ...e })) })),
      selectedShipId: this.selectedShipId,
      movableHexes: this.movableHexes.map(h => ({ ...h })),
      attackableTargets: [...this.attackableTargets],
      log: [...this.log],
      gameOver: this.gameOver,
      winner: this.winner,
    };
  }

  static hexToPixel(q: number, r: number, hexSize: number, offsetX: number, offsetY: number): { x: number; y: number } {
    const x = hexSize * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r) + offsetX;
    const y = hexSize * (1.5 * r) + offsetY;
    return { x, y };
  }

  static pixelToHex(px: number, py: number, hexSize: number, offsetX: number, offsetY: number): HexCoord {
    const x = px - offsetX;
    const y = py - offsetY;
    const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / hexSize;
    const r = (2 / 3 * y) / hexSize;
    return GameBoard.hexRound(q, r);
  }

  static hexRound(q: number, r: number): HexCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  getTotalPlayerEnergy(): number {
    return this.getAliveShips(Faction.Player).reduce((sum, s) => sum + s.energy, 0);
  }

  getEnemySummary(): string {
    const alive = this.getAliveShips(Faction.Enemy);
    if (alive.length === 0) return '全灭';
    return `${alive.length}艘存活 | 总HP: ${alive.reduce((s, e) => s + e.hp, 0)}`;
  }
}

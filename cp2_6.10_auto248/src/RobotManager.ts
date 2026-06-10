import type { Robot, RobotType, ResourceType, PirateShip, Building } from './types';
import { ROBOT_STATS, BASE_POSITION, ENERGY_TOWER_RADIUS, ENERGY_TOWER_CHARGE_RATE } from './constants';
import { uid, clamp, moveVecTowards, dist } from './utils';
import { PlanetManager } from './PlanetManager';

type MiningResult = { type: ResourceType; amount: number } | null;
type CombatResult = { damageDealt: number; damageReceived: number } | null;

export class RobotManager {
  private robots: Robot[] = [];
  private maxRobots: number = 20;

  addRobot(type: RobotType): Robot | null {
    if (this.robots.length >= this.maxRobots) return null;

    const stats = ROBOT_STATS[type];
    const robot: Robot = {
      id: uid(),
      type,
      x: BASE_POSITION.x + (Math.random() - 0.5) * 2,
      y: BASE_POSITION.y + (Math.random() - 0.5) * 2,
      targetX: BASE_POSITION.x,
      targetY: BASE_POSITION.y,
      energy: stats.maxEnergy,
      maxEnergy: stats.maxEnergy,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      status: 'idle',
      backpack: {},
      backpackCapacity: stats.backpackCapacity,
      miningProgress: 0,
      speed: stats.speed,
      attack: stats.attack,
      defense: stats.defense,
      range: stats.range,
      visionRadius: stats.visionRadius,
      drillPower: stats.drillPower,
    };

    this.robots.push(robot);
    return robot;
  }

  removeRobot(id: string): void {
    this.robots = this.robots.filter((r) => r.id !== id);
  }

  getRobots(): Robot[] {
    return this.robots;
  }

  getRobotById(id: string): Robot | undefined {
    return this.robots.find((r) => r.id === id);
  }

  assignMoveTask(robotId: string, targetX: number, targetY: number): boolean {
    const robot = this.getRobotById(robotId);
    if (!robot) return false;
    robot.targetX = targetX;
    robot.targetY = targetY;
    robot.status = 'moving';
    return true;
  }

  assignMiningTask(robotId: string, targetX: number, targetY: number): boolean {
    const robot = this.getRobotById(robotId);
    if (!robot || robot.type !== 'miner') return false;
    robot.targetX = targetX;
    robot.targetY = targetY;
    robot.status = 'moving';
    robot.miningProgress = 0;
    return true;
  }

  assignCombatTask(robotId: string, targetX: number, targetY: number): boolean {
    const robot = this.getRobotById(robotId);
    if (!robot || robot.type !== 'fighter') return false;
    robot.targetX = targetX;
    robot.targetY = targetY;
    robot.status = 'moving';
    return true;
  }

  assignExploreTask(robotId: string, targetX: number, targetY: number): boolean {
    const robot = this.getRobotById(robotId);
    if (!robot || robot.type !== 'scout') return false;
    robot.targetX = targetX;
    robot.targetY = targetY;
    robot.status = 'moving';
    return true;
  }

  assignReturnTask(robotId: string): boolean {
    const robot = this.getRobotById(robotId);
    if (!robot) return false;
    robot.targetX = BASE_POSITION.x;
    robot.targetY = BASE_POSITION.y;
    robot.status = 'returning';
    return true;
  }

  getBackpackTotal(robot: Robot): number {
    return Object.values(robot.backpack).reduce((sum, v) => sum + (v || 0), 0);
  }

  isBackpackFull(robot: Robot): boolean {
    return this.getBackpackTotal(robot) >= robot.backpackCapacity;
  }

  addToBackpack(robot: Robot, type: ResourceType, amount: number): number {
    const current = this.getBackpackTotal(robot);
    const remaining = robot.backpackCapacity - current;
    const actual = Math.min(amount, remaining);
    robot.backpack[type] = (robot.backpack[type] || 0) + actual;
    return actual;
  }

  clearBackpack(robot: Robot): Partial<Record<ResourceType, number>> {
    const items = { ...robot.backpack };
    robot.backpack = {};
    return items;
  }

  isInEnergyTowerRange(robot: Robot, buildings: Building[]): boolean {
    for (const b of buildings) {
      if (b.type !== 'energy_tower' || b.buildProgress < 1) continue;
      const dx = robot.x - (b.x + 0.5);
      const dy = robot.y - (b.y + 0.5);
      if (dx * dx + dy * dy <= ENERGY_TOWER_RADIUS * ENERGY_TOWER_RADIUS) {
        return true;
      }
    }
    return false;
  }

  update(
    dt: number,
    planetManager: PlanetManager,
    buildings: Building[],
    pirates: PirateShip[],
    hasRadiation: boolean
  ): {
    miningResults: MiningResult[];
    combatResults: { robotId: string; pirateId: string; damage: number }[];
    returnedResources: { robotId: string; resources: Partial<Record<ResourceType, number>> }[];
    disabledRobots: string[];
  } {
    const miningResults: MiningResult[] = [];
    const combatResults: { robotId: string; pirateId: string; damage: number }[] = [];
    const returnedResources: { robotId: string; resources: Partial<Record<ResourceType, number>> }[] = [];
    const disabledRobots: string[] = [];

    const speedMultiplier = hasRadiation ? 0.5 : 1;
    const chargeMultiplier = hasRadiation ? 0.5 : 1;

    for (let i = this.robots.length - 1; i >= 0; i--) {
      const robot = this.robots[i];

      if (this.isInEnergyTowerRange(robot, buildings)) {
        robot.energy = clamp(
          robot.energy + ENERGY_TOWER_CHARGE_RATE * chargeMultiplier * dt,
          0,
          robot.maxEnergy
        );
      }

      if (robot.hp <= 0) {
        this.robots.splice(i, 1);
        continue;
      }

      if (robot.energy <= 0) {
        if (robot.status !== 'disabled') {
          robot.status = 'disabled';
          disabledRobots.push(robot.id);
        }
        continue;
      }

      const targetDist = Math.sqrt(
        Math.pow(robot.targetX - robot.x, 2) + Math.pow(robot.targetY - robot.y, 2)
      );

      if (robot.status === 'moving' || robot.status === 'returning' || robot.status === 'exploring') {
        if (targetDist > 0.05) {
          const step = robot.speed * speedMultiplier * dt;
          const newPos = moveVecTowards(
            { x: robot.x, y: robot.y },
            { x: robot.targetX, y: robot.targetY },
            step
          );
          const energyCost = Math.abs(newPos.x - robot.x) + Math.abs(newPos.y - robot.y);
          robot.x = newPos.x;
          robot.y = newPos.y;
          robot.energy = clamp(robot.energy - energyCost * 0.3, 0, robot.maxEnergy);

          if (robot.type === 'scout') {
            planetManager.revealArea(Math.round(robot.x), Math.round(robot.y), robot.visionRadius);
          }
        } else {
          if (robot.status === 'returning') {
            const resources = this.clearBackpack(robot);
            returnedResources.push({ robotId: robot.id, resources });
            robot.status = 'idle';
          } else if (robot.status === 'exploring') {
            planetManager.revealArea(Math.round(robot.x), Math.round(robot.y), robot.visionRadius);
            robot.status = 'idle';
          } else if (robot.status === 'moving') {
            const sector = planetManager.getSector(Math.round(robot.targetX), Math.round(robot.targetY));
            if (sector && sector.resource.type && robot.type === 'miner' && !this.isBackpackFull(robot)) {
              robot.status = 'mining';
              robot.miningProgress = 0;
            } else if (pirates.length > 0 && robot.type === 'fighter') {
              robot.status = 'fighting';
            } else {
              robot.status = 'idle';
            }
          }
        }
      }

      if (robot.status === 'mining' && robot.type === 'miner') {
        const sx = Math.round(robot.x);
        const sy = Math.round(robot.y);
        const res = planetManager.getResourcesInSector(sx, sy);

        if (!res.type || res.amount <= 0 || this.isBackpackFull(robot)) {
          if (this.getBackpackTotal(robot) > 0) {
            this.assignReturnTask(robot.id);
          } else {
            robot.status = 'idle';
          }
          continue;
        }

        robot.miningProgress += dt * 2;
        robot.energy = clamp(robot.energy - dt * 2, 0, robot.maxEnergy);

        if (robot.miningProgress >= 1) {
          robot.miningProgress = 0;
          const drillResult = planetManager.applyDrillDamage(sx, sy, robot.drillPower);
          if (drillResult.type && drillResult.amount > 0) {
            const stored = this.addToBackpack(robot, drillResult.type, drillResult.amount);
            miningResults.push({ type: drillResult.type, amount: stored });
          }
        }
      }

      if (robot.status === 'fighting' && robot.type === 'fighter') {
        let nearestPirate: PirateShip | null = null;
        let nearestDist = Infinity;

        for (const p of pirates) {
          const d = dist({ x: robot.x, y: robot.y }, { x: p.x, y: p.y });
          if (d < nearestDist) {
            nearestDist = d;
            nearestPirate = p;
          }
        }

        if (!nearestPirate) {
          robot.status = 'idle';
        } else if (nearestDist > robot.range) {
          robot.targetX = nearestPirate.x;
          robot.targetY = nearestPirate.y;
          const step = robot.speed * speedMultiplier * dt;
          const newPos = moveVecTowards(
            { x: robot.x, y: robot.y },
            { x: nearestPirate.x, y: nearestPirate.y },
            step
          );
          robot.x = newPos.x;
          robot.y = newPos.y;
          robot.energy = clamp(robot.energy - step * 0.3, 0, robot.maxEnergy);
        } else {
          const damage = Math.max(1, robot.attack - Math.floor(nearestPirate.attack * 0.1));
          combatResults.push({ robotId: robot.id, pirateId: nearestPirate.id, damage });
          robot.energy = clamp(robot.energy - dt * 5, 0, robot.maxEnergy);
        }
      }
    }

    return { miningResults, combatResults, returnedResources, disabledRobots };
  }

  applyPirateDamage(robotId: string, damage: number): number {
    const robot = this.getRobotById(robotId);
    if (!robot) return 0;
    const actualDamage = Math.max(1, damage - robot.defense);
    robot.hp = clamp(robot.hp - actualDamage, 0, robot.maxHp);

    if (Math.random() < 0.3 && Object.keys(robot.backpack).length > 0) {
      const keys = Object.keys(robot.backpack) as ResourceType[];
      const lostKey = keys[Math.floor(Math.random() * keys.length)];
      const lostAmount = Math.floor((robot.backpack[lostKey] || 0) * 0.3);
      robot.backpack[lostKey] = Math.max(0, (robot.backpack[lostKey] || 0) - lostAmount);
    }

    robot.energy = clamp(robot.energy - damage * 0.5, 0, robot.maxEnergy);
    return actualDamage;
  }

  boostAllEnergyCapacity(percent: number): void {
    for (const robot of this.robots) {
      const bonus = Math.floor(robot.maxEnergy * percent);
      robot.maxEnergy += bonus;
      robot.energy = Math.min(robot.energy + bonus, robot.maxEnergy);
    }
  }

  getCount(): number {
    return this.robots.length;
  }

  getMaxRobots(): number {
    return this.maxRobots;
  }
}

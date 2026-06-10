import type { Sector, PlanetType, SectorResource, ResourceType } from './types';
import { GRID_SIZE, PLANET_CONFIG, BASE_POSITION } from './constants';
import { seededRandom, inBounds, uid } from './utils';

export class PlanetManager {
  private sectors: Sector[][] = [];
  private planetType: PlanetType = 'rocky';
  private seed: number = Date.now();

  init(seed: number, planetType: PlanetType): void {
    this.seed = seed;
    this.planetType = planetType;
    this.generateSectors();
  }

  private generateSectors(): void {
    const rand = seededRandom(this.seed);
    const config = PLANET_CONFIG[this.planetType];
    const cx = BASE_POSITION.x;
    const cy = BASE_POSITION.y;

    this.sectors = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Sector[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const isBase = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;

        let type: Sector['type'] = 'empty';
        let resource: SectorResource = { type: null, amount: 0, maxAmount: 0 };

        if (isBase) {
          type = 'base';
        } else {
          const mountainChance = this.planetType === 'rocky' || this.planetType === 'lava' ? 0.15 : 0.05;
          const isMountain = rand() < mountainChance && distFromCenter > 2 && distFromCenter < 7;

          if (isMountain) {
            type = 'mountain';
          } else {
            const resourceRoll = rand();
            const metalThreshold = 0.35 * config.metalBias;
            const iceThreshold = metalThreshold + 0.25 * config.iceBias;
            const heliumThreshold = iceThreshold + 0.15 * config.helium3Bias;

            const centerBias = this.planetType === 'rocky' && distFromCenter < 6 ? 1.5 : 1;
            const poleBias = (this.planetType === 'ice_moon' && (y < 3 || y > GRID_SIZE - 4)) ? 2 : 1;
            const gasBias = this.planetType === 'gas_giant' ? 1.8 : 1;

            if (resourceRoll < metalThreshold * centerBias) {
              type = 'metal';
              const amount = Math.floor(config.baseResourceAmount * (0.6 + rand() * 0.8) * centerBias);
              resource = { type: 'metal', amount, maxAmount: amount };
            } else if (resourceRoll < iceThreshold * poleBias) {
              type = 'ice';
              const amount = Math.floor(config.baseResourceAmount * (0.6 + rand() * 0.8) * poleBias);
              resource = { type: 'ice', amount, maxAmount: amount };
            } else if (resourceRoll < heliumThreshold * gasBias) {
              type = 'helium3';
              const amount = Math.floor(config.baseResourceAmount * (0.5 + rand() * 0.7) * gasBias);
              resource = { type: 'helium3', amount, maxAmount: amount };
            }

            if (resource.maxAmount > 0 && rand() < 0.05) {
              resource.type = 'metal';
              const titaniumAmount = Math.floor(resource.maxAmount * 0.3);
              resource = { type: 'titanium', amount: titaniumAmount, maxAmount: titaniumAmount };
              type = 'metal';
            }
          }
        }

        const baseRevealRadius = 3;
        const revealed = isBase || distFromCenter <= baseRevealRadius;

        row.push({
          x,
          y,
          type,
          revealed,
          resource,
          building: null,
          radiation: false,
          meteorBoost: false,
          ruin: false,
        });
      }
      this.sectors.push(row);
    }
  }

  getSectors(): Sector[][] {
    return this.sectors;
  }

  getSector(x: number, y: number): Sector | null {
    if (!inBounds(x, y)) return null;
    return this.sectors[y][x];
  }

  getResourcesInSector(x: number, y: number): SectorResource {
    const sector = this.getSector(x, y);
    return sector ? sector.resource : { type: null, amount: 0, maxAmount: 0 };
  }

  applyDrillDamage(x: number, y: number, amount: number): { type: ResourceType | null; amount: number } {
    const sector = this.getSector(x, y);
    if (!sector || !sector.resource.type || sector.resource.amount <= 0) {
      return { type: null, amount: 0 };
    }

    const multiplier = sector.meteorBoost ? 2 : 1;
    const extracted = Math.min(amount * multiplier, sector.resource.amount);
    sector.resource.amount -= extracted;

    if (sector.resource.amount <= 0) {
      sector.type = 'empty';
      const resType = sector.resource.type;
      sector.resource = { type: null, amount: 0, maxAmount: 0 };
      return { type: resType, amount: extracted };
    }

    return { type: sector.resource.type, amount: extracted };
  }

  isRevealed(x: number, y: number): boolean {
    const sector = this.getSector(x, y);
    return sector ? sector.revealed : false;
  }

  revealArea(cx: number, cy: number, radius: number): void {
    for (let y = Math.max(0, cy - radius); y <= Math.min(GRID_SIZE - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(GRID_SIZE - 1, cx + radius); x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          const sector = this.sectors[y][x];
          if (!sector.revealed) {
            sector.revealed = true;
          }
        }
      }
    }
  }

  setRadiationArea(cx: number, cy: number, radius: number, active: boolean): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          this.sectors[y][x].radiation = active;
        }
      }
    }
  }

  setAllRadiation(active: boolean): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.sectors[y][x].radiation = active;
      }
    }
  }

  spawnMeteorShower(): { cx: number; cy: number } {
    const cx = Math.floor(2 + Math.random() * (GRID_SIZE - 4));
    const cy = Math.floor(2 + Math.random() * (GRID_SIZE - 4));

    for (let y = Math.max(0, cy - 1); y <= Math.min(GRID_SIZE - 1, cy + 1); y++) {
      for (let x = Math.max(0, cx - 1); x <= Math.min(GRID_SIZE - 1, cx + 1); x++) {
        const sector = this.sectors[y][x];
        sector.meteorBoost = true;
        if (sector.resource.type === null && sector.type !== 'base' && sector.type !== 'mountain') {
          const amount = Math.floor(30 + Math.random() * 40);
          sector.type = 'metal';
          sector.resource = { type: 'metal', amount, maxAmount: amount };
        }
      }
    }

    return { cx, cy };
  }

  clearMeteorBoost(): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        this.sectors[y][x].meteorBoost = false;
      }
    }
  }

  spawnRuin(): { x: number; y: number } | null {
    const candidates: { x: number; y: number }[] = [];
    for (let y = 2; y < GRID_SIZE - 2; y++) {
      for (let x = 2; x < GRID_SIZE - 2; x++) {
        const s = this.sectors[y][x];
        if (s.revealed && !s.building && !s.ruin && s.type !== 'base') {
          candidates.push({ x, y });
        }
      }
    }
    if (candidates.length === 0) return null;
    const pos = candidates[Math.floor(Math.random() * candidates.length)];
    this.sectors[pos.y][pos.x].ruin = true;
    return pos;
  }

  clearRuin(x: number, y: number): void {
    const sector = this.getSector(x, y);
    if (sector) sector.ruin = false;
  }

  getBuilding(x: number, y: number): Sector['building'] {
    const sector = this.getSector(x, y);
    return sector ? sector.building : null;
  }

  setBuilding(x: number, y: number, building: Sector['building']): boolean {
    const sector = this.getSector(x, y);
    if (!sector) return false;
    sector.building = building;
    return true;
  }

  removeBuilding(x: number, y: number): void {
    const sector = this.getSector(x, y);
    if (sector) sector.building = null;
  }

  getPlanetType(): PlanetType {
    return this.planetType;
  }

  regenerateResources(dt: number): void {
    const regenRate = 0.3;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const sector = this.sectors[y][x];
        if (sector.resource.type && sector.resource.amount < sector.resource.maxAmount) {
          sector.resource.amount = Math.min(
            sector.resource.maxAmount,
            sector.resource.amount + regenRate * dt
          );
        }
      }
    }
  }
}

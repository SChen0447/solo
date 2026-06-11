import { NPC, Vector2, TILE_SIZE, NPC_COOLDOWN, INTERACTION_DISTANCE } from './types';
import { distance, getRandomWalkablePosition, normalize } from './utils';

export class NPCSystem {
  private npcs: NPC[];
  private tiles: number[][];

  constructor() {
    this.npcs = [];
    this.tiles = [];
  }

  init(npcs: NPC[], tiles: number[][]): void {
    this.npcs = npcs.map(npc => ({ ...npc }));
    this.tiles = tiles;
  }

  update(dt: number, playerPos: Vector2, currentTime: number): { shouldGiveLight: boolean; npcId: string | null } {
    let shouldGiveLight = false;
    let npcId: string | null = null;

    for (const npc of this.npcs) {
      if (npc.isOnCooldown && currentTime >= npc.cooldownEndTime) {
        npc.isOnCooldown = false;
      }

      npc.wanderTimer -= dt;
      if (npc.wanderTimer <= 0) {
        npc.wanderTimer = 2 + Math.random() * 3;
        const angle = Math.random() * Math.PI * 2;
        npc.wanderDirection = {
          x: Math.cos(angle),
          y: Math.sin(angle)
        };
      }

      const moveSpeed = 60;
      const newPos: Vector2 = {
        x: npc.position.x + npc.wanderDirection.x * moveSpeed * dt,
        y: npc.position.y + npc.wanderDirection.y * moveSpeed * dt
      };

      const margin = 8;
      const gridX = Math.floor(newPos.x / TILE_SIZE);
      const gridY = Math.floor(newPos.y / TILE_SIZE);
      if (this.tiles[gridY]?.[gridX] === 0 &&
          newPos.x > margin && newPos.x < this.tiles[0].length * TILE_SIZE - margin &&
          newPos.y > margin && newPos.y < this.tiles.length * TILE_SIZE - margin) {
        npc.position = newPos;
      } else {
        npc.wanderDirection = {
          x: -npc.wanderDirection.x + (Math.random() - 0.5) * 0.5,
          y: -npc.wanderDirection.y + (Math.random() - 0.5) * 0.5
        };
        npc.wanderDirection = normalize(npc.wanderDirection);
      }

      const dist = distance(npc.position, playerPos);
      if (dist < INTERACTION_DISTANCE && !npc.isOnCooldown) {
        shouldGiveLight = true;
        npcId = npc.id;
        npc.isOnCooldown = true;
        npc.cooldownEndTime = currentTime + NPC_COOLDOWN;
        npc.position = getRandomWalkablePosition(this.tiles);
      }
    }

    return { shouldGiveLight, npcId };
  }

  getNPCs(): NPC[] {
    return this.npcs;
  }

  clear(): void {
    this.npcs = [];
  }
}

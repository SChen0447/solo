import {
  Terrain,
  TerrainData,
  CharacterState,
  MovingPlatformTerrain,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from './terrainData';

export class CollisionManager {
  private terrainData: TerrainData;

  constructor(terrainData: TerrainData) {
    this.terrainData = terrainData;
  }

  updateCharacter(
    character: CharacterState,
    keys: Set<string>,
    deltaTime: number
  ): void {
    if (character.stunned) {
      character.stunTimer -= deltaTime;
      character.blinkTimer += deltaTime;
      if (character.stunTimer <= 0) {
        character.stunned = false;
        character.blinkTimer = 0;
      }
      character.vx *= 0.9;
      character.vy *= 0.9;
      character.x += character.vx;
      character.y += character.vy;
      this.clampToBounds(character);
      return;
    }

    let moveSpeed = character.speed;
    let speedMultiplier = 1;

    if (character.isOnSlope) {
      speedMultiplier *= 0.8;
    }

    character.vx = 0;
    character.vy = 0;

    if (keys.has('a') || keys.has('A') || keys.has('ArrowLeft')) {
      character.vx = -moveSpeed * speedMultiplier;
    }
    if (keys.has('d') || keys.has('D') || keys.has('ArrowRight')) {
      character.vx = moveSpeed * speedMultiplier;
    }
    if (keys.has('w') || keys.has('W') || keys.has('ArrowUp')) {
      character.vy = -moveSpeed * speedMultiplier;
    }
    if (keys.has('s') || keys.has('S') || keys.has('ArrowDown')) {
      character.vy = moveSpeed * speedMultiplier;
    }

    character.isOnGround = false;
    character.isOnSlope = false;
    character.isOnMovingPlatform = false;

    if (character.attachedPlatformId) {
      const platform = this.terrainData
        .getTerrains()
        .find((t) => t.id === character.attachedPlatformId) as
        | MovingPlatformTerrain
        | undefined;
      if (platform) {
        const pos = this.terrainData.getPlatformCurrentPosition(platform);
        character.x += pos.dx;
        character.y += pos.dy;
        character.isOnMovingPlatform = true;
        character.isOnGround = true;
      } else {
        character.attachedPlatformId = null;
      }
    }

    const nextX = character.x + character.vx;
    const nextY = character.y + character.vy;

    this.checkCollisions(character, nextX, nextY);

    character.x += character.vx;
    character.y += character.vy;

    this.clampToBounds(character);
  }

  private clampToBounds(character: CharacterState): void {
    character.x = Math.max(
      character.radius,
      Math.min(CANVAS_WIDTH - character.radius, character.x)
    );
    character.y = Math.max(
      character.radius,
      Math.min(CANVAS_HEIGHT - character.radius, character.y)
    );
  }

  private checkCollisions(
    character: CharacterState,
    nextX: number,
    nextY: number
  ): void {
    const terrains = this.terrainData.getTerrains();

    for (const terrain of terrains) {
      let tx = terrain.x;
      let ty = terrain.y;

      if (terrain.type === 'moving_platform') {
        const mp = terrain as MovingPlatformTerrain;
        const pos = this.terrainData.getPlatformCurrentPosition(mp);
        tx = pos.x;
        ty = pos.y;
      }

      if (
        terrain.type === 'platform' ||
        terrain.type === 'moving_platform' ||
        terrain.type === 'slope_left_high' ||
        terrain.type === 'slope_right_high'
      ) {
        this.resolveRectCollision(character, terrain, tx, ty, nextX, nextY);
      } else if (terrain.type === 'speed_boost') {
        if (this.circleRectOverlap(character, tx, ty, terrain.width, terrain.height)) {
          const dir = (terrain as any).direction;
          const mult = (terrain as any).boostMultiplier;
          if (dir === 'left') character.vx = -Math.abs(character.vx) * mult * 2;
          if (dir === 'right') character.vx = Math.abs(character.vx) * mult * 2;
          if (dir === 'up') character.vy = -Math.abs(character.vy) * mult * 2;
          if (dir === 'down') character.vy = Math.abs(character.vy) * mult * 2;
        }
      } else if (terrain.type === 'teleport') {
        if (this.circleRectOverlap(character, tx, ty, terrain.width, terrain.height)) {
          const targetId = (terrain as any).targetId;
          if (targetId) {
            const target = terrains.find((t) => t.id === targetId);
            if (target) {
              character.x = target.x + target.width / 2;
              character.y = target.y + target.height / 2;
              character.vx = 0;
              character.vy = 0;
            }
          }
        }
      } else if (terrain.type === 'obstacle') {
        if (this.circleRectOverlap(character, tx, ty, terrain.width, terrain.height)) {
          if (!character.stunned) {
            character.stunned = true;
            character.stunTimer = 1;
            character.blinkTimer = 0;
            character.vx = -character.vx * 0.5;
            character.vy = -character.vy * 0.5;
          }
        }
      }
    }
  }

  private resolveRectCollision(
    character: CharacterState,
    terrain: Terrain,
    tx: number,
    ty: number,
    _nextX: number,
    _nextY: number
  ): void {
    const isSlope =
      terrain.type === 'slope_left_high' || terrain.type === 'slope_right_high';

    if (this.circleRectOverlap(character, tx, ty, terrain.width, terrain.height)) {
      const left = tx;
      const right = tx + terrain.width;
      const top = ty;
      const bottom = ty + terrain.height;

      const cx = character.x;
      const cy = character.y;
      const r = character.radius;

      const closestX = Math.max(left, Math.min(cx, right));
      const closestY = Math.max(top, Math.min(cy, bottom));

      const dx = cx - closestX;
      const dy = cy - closestY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < r) {
        const overlap = r - dist;
        let nx = dist > 0 ? dx / dist : 0;
        let ny = dist > 0 ? dy / dist : -1;

        if (dist === 0) {
          nx = 0;
          ny = -1;
        }

        character.x += nx * overlap;
        character.y += ny * overlap;

        if (ny < -0.5) {
          character.isOnGround = true;
          if (isSlope) {
            character.isOnSlope = true;
          }
          if (terrain.type === 'moving_platform') {
            character.isOnMovingPlatform = true;
            character.attachedPlatformId = terrain.id;
          }
        }

        if (nx !== 0 && Math.abs(nx) > Math.abs(ny)) {
          character.vx = 0;
        }
        if (ny !== 0 && Math.abs(ny) >= Math.abs(nx)) {
          character.vy = 0;
        }
      }
    } else {
      if (terrain.type === 'moving_platform' && character.attachedPlatformId === terrain.id) {
        const charBottom = character.y + character.radius;
        if (charBottom < ty - 2 || charBottom > ty + terrain.height + 2) {
          character.attachedPlatformId = null;
        }
      }
    }

    if (!isSlope && character.isOnGround && terrain.type === 'moving_platform') {
      character.attachedPlatformId = terrain.id;
    }
  }

  private circleRectOverlap(
    character: CharacterState,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): boolean {
    const closestX = Math.max(rx, Math.min(character.x, rx + rw));
    const closestY = Math.max(ry, Math.min(character.y, ry + rh));
    const dx = character.x - closestX;
    const dy = character.y - closestY;
    return dx * dx + dy * dy < character.radius * character.radius;
  }

  exportCollisionData(): string {
    return this.terrainData.exportJSON();
  }
}

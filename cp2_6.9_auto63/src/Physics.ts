import { Block, Platform, Vector2, PlayerState, GAME_CONFIG, Pole } from './types';

interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export class Physics {
  private worldWidth: number;
  private worldHeight: number;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  setWorldSize(w: number, h: number): void {
    this.worldWidth = w;
    this.worldHeight = h;
  }

  update(
    deltaTime: number,
    playerState: PlayerState,
    blocks: Block[],
    platforms: readonly Platform[],
    gravity: number
  ): { playerOnGround: boolean } {
    const dt = deltaTime;

    this.applyMagneticForces(playerState, blocks, dt);

    for (const block of blocks) {
      if (block.attachedToPlayer) {
        block.velocity.x = 0;
        block.velocity.y = 0;
        const offsetX = block.position.x - playerState.position.x;
        const offsetY = block.position.y - playerState.position.y;
        block.position.x = playerState.position.x + offsetX;
        block.position.y = playerState.position.y + offsetY;
        continue;
      }

      block.velocity.y += gravity * dt;
      block.velocity.x *= GAME_CONFIG.FRICTION;
      block.velocity.y *= 0.995;

      if (Math.abs(block.velocity.x) < 0.5) block.velocity.x = 0;

      block.position.x += block.velocity.x * dt;
      block.position.y += block.velocity.y * dt;

      this.constrainBlock(block);
    }

    this.resolveBlockCollisions(blocks);

    for (const block of blocks) {
      this.resolveBlockPlatformCollision(block, platforms);
    }

    const playerSize = GAME_CONFIG.PLAYER_SIZE;
    const playerBox: AABB = {
      x: playerState.position.x - playerSize / 2,
      y: playerState.position.y - playerSize / 2,
      w: playerSize,
      h: playerSize,
    };

    for (const block of blocks) {
      if (block.attachedToPlayer) continue;
      const blockBox: AABB = {
        x: block.position.x - block.size / 2,
        y: block.position.y - block.size / 2,
        w: block.size,
        h: block.size,
      };
      if (aabbOverlap(playerBox, blockBox)) {
        this.separateAABB(playerState, block, playerBox, blockBox);
      }
    }

    let playerOnGround = false;
    for (const plat of platforms) {
      const platBox: AABB = {
        x: plat.position.x,
        y: plat.position.y,
        w: plat.size.x,
        h: plat.size.y,
      };
      if (aabbOverlap(playerBox, platBox)) {
        const overlapX =
          Math.min(playerBox.x + playerBox.w, platBox.x + platBox.w) -
          Math.max(playerBox.x, platBox.x);
        const overlapY =
          Math.min(playerBox.y + playerBox.h, platBox.y + platBox.h) -
          Math.max(playerBox.y, platBox.y);

        if (overlapY < overlapX) {
          if (playerState.position.y < plat.position.y) {
            playerState.position.y = plat.position.y - playerSize / 2;
            if (playerState.velocity.y > 0) playerState.velocity.y = 0;
            playerOnGround = true;
          } else {
            playerState.position.y = plat.position.y + plat.size.y + playerSize / 2;
            if (playerState.velocity.y < 0) playerState.velocity.y = 0;
          }
        } else {
          if (playerState.position.x < plat.position.x) {
            playerState.position.x = plat.position.x - playerSize / 2;
          } else {
            playerState.position.x = plat.position.x + plat.size.x + playerSize / 2;
          }
          playerState.velocity.x = 0;
        }
      }
    }

    playerState.position.x = clamp(
      playerState.position.x,
      playerSize / 2,
      this.worldWidth - playerSize / 2
    );
    playerState.position.y = clamp(
      playerState.position.y,
      playerSize / 2,
      this.worldHeight - playerSize / 2
    );

    this.updateAttachment(playerState, blocks);

    return { playerOnGround };
  }

  private applyMagneticForces(
    playerState: PlayerState,
    blocks: Block[],
    dt: number
  ): void {
    const px = playerState.position.x;
    const py = playerState.position.y;
    const radiusSq = GAME_CONFIG.MAGNETIC_RADIUS * GAME_CONFIG.MAGNETIC_RADIUS;
    const attachDistSq = GAME_CONFIG.ATTACH_DISTANCE * GAME_CONFIG.ATTACH_DISTANCE;

    for (const block of blocks) {
      if (block.attachedToPlayer) continue;

      const dx = block.position.x - px;
      const dy = block.position.y - py;
      const distSq = dx * dx + dy * dy;

      if (distSq > radiusSq) continue;

      const dist = Math.sqrt(distSq);
      if (dist <= 0.1) continue;

      if (distSq <= attachDistSq) {
        block.attachedToPlayer = true;
        block.velocity.x = 0;
        block.velocity.y = 0;
        continue;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const forceMag = GAME_CONFIG.MAGNETIC_STRENGTH / Math.max(distSq, 400);
      const sign = playerState.pole === 'N' ? 1 : -1;
      const ax = (sign * forceMag * nx) / block.mass;
      const ay = (sign * forceMag * ny) / block.mass;

      block.velocity.x += ax * dt;
      block.velocity.y += ay * dt;

      const maxSpeed = 400;
      const speedSq =
        block.velocity.x * block.velocity.x + block.velocity.y * block.velocity.y;
      if (speedSq > maxSpeed * maxSpeed) {
        const s = maxSpeed / Math.sqrt(speedSq);
        block.velocity.x *= s;
        block.velocity.y *= s;
      }
    }
  }

  private updateAttachment(playerState: PlayerState, blocks: Block[]): void {
    const attachDistSq = GAME_CONFIG.ATTACH_DISTANCE * GAME_CONFIG.ATTACH_DISTANCE;
    const detachDistSq = (GAME_CONFIG.ATTACH_DISTANCE + 25) * (GAME_CONFIG.ATTACH_DISTANCE + 25);

    for (const block of blocks) {
      const dx = block.position.x - playerState.position.x;
      const dy = block.position.y - playerState.position.y;
      const distSq = dx * dx + dy * dy;

      if (block.attachedToPlayer) {
        if (playerState.pole === 'N') {
          block.attachedToPlayer = false;
        } else if (distSq > detachDistSq) {
          block.attachedToPlayer = false;
        } else {
          if (distSq > 1) {
            const dist = Math.sqrt(distSq);
            const targetDist = GAME_CONFIG.ATTACH_DISTANCE * 0.8;
            const diff = dist - targetDist;
            if (Math.abs(diff) > 1) {
              const move = diff * 0.2;
              block.position.x -= (dx / dist) * move;
              block.position.y -= (dy / dist) * move;
            }
          }
        }
      } else if (playerState.pole === 'S' && distSq <= attachDistSq) {
        block.attachedToPlayer = true;
        block.velocity.x = 0;
        block.velocity.y = 0;
      }
    }
  }

  private constrainBlock(block: Block): void {
    block.position.x = clamp(
      block.position.x,
      block.size / 2,
      this.worldWidth - block.size / 2
    );
    block.position.y = clamp(
      block.position.y,
      block.size / 2,
      this.worldHeight - block.size / 2
    );
  }

  private resolveBlockCollisions(blocks: Block[]): void {
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + 1; j < blocks.length; j++) {
        const a = blocks[i];
        const b = blocks[j];
        const aBox: AABB = {
          x: a.position.x - a.size / 2,
          y: a.position.y - a.size / 2,
          w: a.size,
          h: a.size,
        };
        const bBox: AABB = {
          x: b.position.x - b.size / 2,
          y: b.position.y - b.size / 2,
          w: b.size,
          h: b.size,
        };
        if (aabbOverlap(aBox, bBox)) {
          const overlapX =
            Math.min(aBox.x + aBox.w, bBox.x + bBox.w) - Math.max(aBox.x, bBox.x);
          const overlapY =
            Math.min(aBox.y + aBox.h, bBox.y + bBox.h) - Math.max(aBox.y, bBox.y);

          if (overlapX < overlapY) {
            const pushX = overlapX / 2;
            if (a.position.x < b.position.x) {
              a.position.x -= pushX;
              b.position.x += pushX;
            } else {
              a.position.x += pushX;
              b.position.x -= pushX;
            }
            const relVx = a.velocity.x - b.velocity.x;
            a.velocity.x -= relVx * GAME_CONFIG.RESTITUTION;
            b.velocity.x += relVx * GAME_CONFIG.RESTITUTION;
          } else {
            const pushY = overlapY / 2;
            if (a.position.y < b.position.y) {
              a.position.y -= pushY;
              b.position.y += pushY;
            } else {
              a.position.y += pushY;
              b.position.y -= pushY;
            }
            const relVy = a.velocity.y - b.velocity.y;
            a.velocity.y -= relVy * GAME_CONFIG.RESTITUTION;
            b.velocity.y += relVy * GAME_CONFIG.RESTITUTION;
            if (overlapY > 1) {
              a.velocity.y *= 0.5;
              b.velocity.y *= 0.5;
            }
          }
        }
      }
    }
  }

  private resolveBlockPlatformCollision(block: Block, platforms: readonly Platform[]): void {
    const blockBox: AABB = {
      x: block.position.x - block.size / 2,
      y: block.position.y - block.size / 2,
      w: block.size,
      h: block.size,
    };

    for (const plat of platforms) {
      const platBox: AABB = {
        x: plat.position.x,
        y: plat.position.y,
        w: plat.size.x,
        h: plat.size.y,
      };
      if (!aabbOverlap(blockBox, platBox)) continue;

      const overlapX =
        Math.min(blockBox.x + blockBox.w, platBox.x + platBox.w) -
        Math.max(blockBox.x, platBox.x);
      const overlapY =
        Math.min(blockBox.y + blockBox.h, platBox.y + platBox.h) -
        Math.max(blockBox.y, platBox.y);

      if (overlapY <= overlapX) {
        if (block.position.y < plat.position.y) {
          block.position.y = plat.position.y - block.size / 2;
          if (block.velocity.y > 0) block.velocity.y = 0;
        } else {
          block.position.y = plat.position.y + plat.size.y + block.size / 2;
          if (block.velocity.y < 0) block.velocity.y = 0;
        }
      } else {
        if (block.position.x < plat.position.x) {
          block.position.x = plat.position.x - block.size / 2;
        } else {
          block.position.x = plat.position.x + plat.size.x + block.size / 2;
        }
        block.velocity.x = 0;
      }

      blockBox.x = block.position.x - block.size / 2;
      blockBox.y = block.position.y - block.size / 2;
    }
  }

  private separateAABB(
    playerState: PlayerState,
    block: Block,
    pBox: AABB,
    bBox: AABB
  ): void {
    const overlapX =
      Math.min(pBox.x + pBox.w, bBox.x + bBox.w) - Math.max(pBox.x, bBox.x);
    const overlapY =
      Math.min(pBox.y + pBox.h, bBox.y + bBox.h) - Math.max(pBox.y, bBox.y);

    if (overlapX < overlapY) {
      const push = overlapX / 2;
      if (playerState.position.x < block.position.x) {
        playerState.position.x -= push;
        block.position.x += push;
      } else {
        playerState.position.x += push;
        block.position.x -= push;
      }
      block.velocity.x *= 0.3;
    } else {
      const push = overlapY / 2;
      if (playerState.position.y < block.position.y) {
        playerState.position.y -= push;
        block.position.y += push;
        if (playerState.velocity.y > 0) playerState.velocity.y = 0;
      } else {
        playerState.position.y += push;
        block.position.y -= push;
        if (playerState.velocity.y < 0) playerState.velocity.y = 0;
      }
      block.velocity.y *= 0.3;
    }
  }

  isPlayerNearBlock(playerPos: Vector2, block: Block): boolean {
    const dx = playerPos.x - block.position.x;
    const dy = playerPos.y - block.position.y;
    const radiusSq = GAME_CONFIG.MAGNETIC_RADIUS * GAME_CONFIG.MAGNETIC_RADIUS;
    return dx * dx + dy * dy <= radiusSq;
  }

  getMagneticForceInfo(playerState: PlayerState, block: Block): { inRange: boolean; pole: Pole } {
    const dx = block.position.x - playerState.position.x;
    const dy = block.position.y - playerState.position.y;
    const distSq = dx * dx + dy * dy;
    const radiusSq = GAME_CONFIG.MAGNETIC_RADIUS * GAME_CONFIG.MAGNETIC_RADIUS;
    return {
      inRange: distSq <= radiusSq && distSq > GAME_CONFIG.ATTACH_DISTANCE * GAME_CONFIG.ATTACH_DISTANCE,
      pole: playerState.pole,
    };
  }
}

import type { PlayerPos } from './maze';
import { Maze, SEGMENTS_PER_RING, RING_COUNT } from './maze';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface ShardParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const MOVE_DURATION = 0.2;
const SQUASH_DURATION = 0.05;
const TRAIL_COUNT = 8;
const TRAIL_SPACING = 10;
const TRAIL_LIFE = 0.4;
const BREAK_DURATION = 0.5;

export type PlayerState = 'idle' | 'moving' | 'squash' | 'breaking' | 'respawning' | 'success';

export class Player {
  private ctx: CanvasRenderingContext2D;
  private maze: Maze;

  private pos: PlayerPos = { ring: RING_COUNT - 1, segment: 0 };

  private state: PlayerState = 'idle';
  private moveStartPos: PlayerPos = { ring: 0, segment: 0 };
  private moveTargetPos: PlayerPos = { ring: 0, segment: 0 };
  private moveProgress = 0;
  private moveDuration = MOVE_DURATION;
  private squashProgress = 0;

  private trail: TrailPoint[] = [];
  private trailTimer = 0;

  private shards: ShardParticle[] = [];
  private maxShards = 30;
  private breakProgress = 0;

  private radius = 8;
  private glowRadius = 20;
  private color = '#ffffff';

  private onMoveCallback?: () => void;
  private onCrackCallback?: () => void;
  private onSuccessCallback?: () => void;

  constructor(ctx: CanvasRenderingContext2D, maze: Maze) {
    this.ctx = ctx;
    this.maze = maze;
    this.initShards();
  }

  private initShards() {
    this.shards = [];
    for (let i = 0; i < this.maxShards; i++) {
      this.shards.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
      });
    }
  }

  setCallbacks(callbacks: {
    onMove?: () => void;
    onCrack?: () => void;
    onSuccess?: () => void;
  }) {
    this.onMoveCallback = callbacks.onMove;
    this.onCrackCallback = callbacks.onCrack;
    this.onSuccessCallback = callbacks.onSuccess;
  }

  reset(pos: PlayerPos) {
    this.pos = { ...pos };
    this.state = 'idle';
    this.trail = [];
    this.trailTimer = 0;
    for (const s of this.shards) s.active = false;
  }

  getPos(): PlayerPos {
    return { ...this.pos };
  }

  getState(): PlayerState {
    return this.state;
  }

  isBusy(): boolean {
    return this.state !== 'idle';
  }

  tryMoveLeft(): boolean {
    return this.tryRotate(-1);
  }

  tryMoveRight(): boolean {
    return this.tryRotate(1);
  }

  tryMoveUp(): boolean {
    if (this.isBusy()) return false;
    if (this.pos.ring <= 0) return false;
    if (!this.maze.hasConnection(this.pos.ring - 1, this.pos.segment)) return false;
    this.startMove({
      ring: this.pos.ring - 1,
      segment: this.pos.segment,
    });
    return true;
  }

  tryMoveDown(): boolean {
    if (this.isBusy()) return false;
    if (this.pos.ring >= RING_COUNT - 1) return false;
    if (!this.maze.hasConnection(this.pos.ring, this.pos.segment)) return false;
    this.startMove({
      ring: this.pos.ring + 1,
      segment: this.pos.segment,
    });
    return true;
  }

  private tryRotate(dir: number): boolean {
    if (this.isBusy()) return false;
    const newSegment = ((this.pos.segment + dir) % SEGMENTS_PER_RING + SEGMENTS_PER_RING) % SEGMENTS_PER_RING;
    this.startMove({
      ring: this.pos.ring,
      segment: newSegment,
    });
    return true;
  }

  private startMove(target: PlayerPos) {
    this.moveStartPos = { ...this.pos };
    this.moveTargetPos = { ...target };
    this.moveProgress = 0;
    this.squashProgress = 0;
    this.state = 'squash';
  }

  private triggerBreak() {
    const worldPos = this.getCurrentWorldPos();
    this.state = 'breaking';
    this.breakProgress = 0;
    let idx = 0;
    for (const s of this.shards) {
      if (s.active) continue;
      if (idx >= 6) break;
      s.active = true;
      s.x = worldPos.x;
      s.y = worldPos.y;
      const angle = (idx / 6) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 80 + Math.random() * 60;
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
      s.life = 0;
      s.maxLife = BREAK_DURATION;
      idx++;
    }
    if (this.onCrackCallback) this.onCrackCallback();
  }

  private triggerSuccess() {
    this.state = 'success';
    if (this.onSuccessCallback) this.onSuccessCallback();
  }

  update(dt: number) {
    for (const s of this.shards) {
      if (!s.active) continue;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.94;
      s.vy *= 0.94;
    }

    for (const t of this.trail) {
      t.life += dt;
    }
    this.trail = this.trail.filter(t => t.life < t.maxLife);

    if (this.state === 'squash') {
      this.squashProgress += dt;
      if (this.squashProgress >= SQUASH_DURATION) {
        this.state = 'moving';
        this.moveProgress = 0;
      }
      this.updateTrail(dt);
    } else if (this.state === 'moving') {
      this.moveProgress += dt / this.moveDuration;
      if (this.moveProgress >= 1) {
        this.moveProgress = 1;
        this.pos = { ...this.moveTargetPos };
        this.state = 'idle';
        this.checkCollisions();
        if (this.onMoveCallback && this.state === 'idle') this.onMoveCallback();
      }
      this.updateTrail(dt);
    } else if (this.state === 'breaking') {
      this.breakProgress += dt;
      if (this.breakProgress >= BREAK_DURATION) {
        const entry = this.maze.getEntryPos();
        this.pos = { ...entry };
        this.state = 'idle';
        this.trail = [];
      }
    }
  }

  private updateTrail(dt: number) {
    this.trailTimer += dt;
    const interval = 0.02;
    while (this.trailTimer >= interval) {
      this.trailTimer -= interval;
      const pos = this.getCurrentWorldPos();
      this.trail.push({
        x: pos.x,
        y: pos.y,
        life: 0,
        maxLife: TRAIL_LIFE,
      });
      if (this.trail.length > TRAIL_COUNT * 3) {
        this.trail.shift();
      }
    }
  }

  private checkCollisions() {
    if (this.maze.isCrackAt(this.pos.ring, this.pos.segment)) {
      this.triggerBreak();
      return;
    }
    const exit = this.maze.getExitPos();
    if (this.pos.ring === exit.ring && this.pos.segment === exit.segment) {
      this.triggerSuccess();
    }
  }

  getCurrentWorldPos(): { x: number; y: number } {
    if (this.state === 'moving') {
      const t = this.easeOut(this.moveProgress);
      const startP = this.maze.getWorldPos(this.moveStartPos.ring, this.moveStartPos.segment);
      const endP = this.maze.getWorldPos(this.moveTargetPos.ring, this.moveTargetPos.segment);

      if (this.moveStartPos.ring === this.moveTargetPos.ring) {
        const radius = this.maze.getRadii()[this.moveStartPos.ring];
        const rot = this.maze.getRotations()[this.moveStartPos.ring];
        let segDiff = this.moveTargetPos.segment - this.moveStartPos.segment;
        if (segDiff > SEGMENTS_PER_RING / 2) segDiff -= SEGMENTS_PER_RING;
        if (segDiff < -SEGMENTS_PER_RING / 2) segDiff += SEGMENTS_PER_RING;
        const baseAngle = this.moveStartPos.segment * ((Math.PI * 2) / SEGMENTS_PER_RING) + rot - Math.PI / 2;
        const angle = baseAngle + segDiff * ((Math.PI * 2) / SEGMENTS_PER_RING) * t;
        const center = this.maze.getCenter();
        return {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        };
      } else {
        return {
          x: startP.x + (endP.x - startP.x) * t,
          y: startP.y + (endP.y - startP.y) * t,
        };
      }
    }
    if (this.state === 'breaking') {
      return { x: -1000, y: -1000 };
    }
    return this.maze.getWorldPos(this.pos.ring, this.pos.segment);
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  render() {
    this.renderTrail();
    this.renderShards();
    if (this.state !== 'breaking') {
      this.renderBall();
    }
  }

  private renderBall() {
    const ctx = this.ctx;
    const pos = this.getCurrentWorldPos();

    let scaleX = 1;
    let scaleY = 1;
    if (this.state === 'squash') {
      const t = this.squashProgress / SQUASH_DURATION;
      const s = 1 - Math.sin(t * Math.PI) * 0.2;
      scaleX = 1 + (1 - s) * 0.3;
      scaleY = s;
    } else if (this.state === 'moving') {
      scaleX = 1.1;
      scaleY = 0.95;
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.scale(scaleX, scaleY);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.glowRadius);
    glow.addColorStop(0, 'rgba(255,255,255,0.8)');
    glow.addColorStop(0.4, 'rgba(255,255,255,0.3)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, this.glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  private renderTrail() {
    const ctx = this.ctx;
    const sorted = this.trail.slice().sort((a, b) => a.life - b.life);
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      const alpha = (1 - t.life / t.maxLife) * 0.6;
      const size = 4 * (1 - t.life / t.maxLife) + 1;
      if (alpha <= 0) continue;
      ctx.save();
      const glow = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 8);
      glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  private renderShards() {
    const ctx = this.ctx;
    for (const s of this.shards) {
      if (!s.active) continue;
      const t = 1 - s.life / s.maxLife;
      ctx.save();
      ctx.fillStyle = `rgba(255,255,255,${t})`;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 * t + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }
}

export interface RopeNode {
  x: number;
  y: number;
  baseY: number;
}

export interface EnergyBall {
  x: number;
  y: number;
  radius: number;
  pulsePhase: number;
  pulseCycle: number;
  collected: boolean;
}

const ROPE_COLORS = ['#ff6b6b', '#48dbfb', '#feca57'];
const NODE_RADIUS = 4;
const ROPE_LINE_WIDTH = 3;
const FLOAT_AMPLITUDE = 20;
const ENERGY_BALL_RADIUS = 6;

export class Rope {
  nodes: RopeNode[] = [];
  color: string;
  floatPhase: number;
  floatCycle: number;
  energyBall: EnergyBall | null = null;
  platformWidth: number = 0;
  platformX: number = 0;

  constructor(
    x: number,
    y: number,
    width: number,
    nodeCount: number,
    color: string,
  ) {
    this.color = color;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.floatCycle = 1.5 + Math.random() * 1.0;

    const step = width / (nodeCount - 1);
    for (let i = 0; i < nodeCount; i++) {
      const nx = x + i * step;
      this.nodes.push({ x: nx, y, baseY: y });
    }

    this.platformX = x;
    this.platformWidth = width;
  }

  update(dt: number, time: number, playerOnRope: boolean, playerX: number) {
    const baseOffset = Math.sin(time / this.floatCycle * Math.PI * 2 + this.floatPhase) * FLOAT_AMPLITUDE;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      node.y = node.baseY + baseOffset;

      if (playerOnRope) {
        const dx = playerX - node.x;
        const influence = Math.max(0, 1 - Math.abs(dx) / 80);
        node.y += influence * 8;
      }
    }

    if (this.energyBall && !this.energyBall.collected) {
      const midIdx = Math.floor(this.nodes.length / 2);
      const midNode = this.nodes[midIdx];
      this.energyBall.x = midNode.x;
      this.energyBall.y = midNode.y - 15;
      this.energyBall.pulsePhase += dt / this.energyBall.pulseCycle * Math.PI * 2;
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255,255,255,0.3)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = ROPE_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (this.nodes.length > 0) {
      ctx.moveTo(this.nodes[0].x, this.nodes[0].y);
      for (let i = 1; i < this.nodes.length; i++) {
        ctx.lineTo(this.nodes[i].x, this.nodes[i].y);
      }
    }
    ctx.stroke();

    ctx.fillStyle = this.color;
    for (const node of this.nodes) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (this.energyBall && !this.energyBall.collected) {
      const ball = this.energyBall;
      const pulse = 0.7 + 0.3 * Math.sin(ball.pulsePhase);
      const r = ENERGY_BALL_RADIUS * pulse;

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#feca57';
      ctx.fillStyle = '#feca57';
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  getY(): number {
    if (this.nodes.length === 0) return 0;
    return this.nodes[Math.floor(this.nodes.length / 2)].y;
  }

  getLeft(): number {
    return this.nodes[0].x;
  }

  getRight(): number {
    return this.nodes[this.nodes.length - 1].x;
  }

  getNodeCount(): number {
    return this.nodes.length;
  }
}

export class RopeManager {
  ropes: Rope[] = [];
  private ropeCounter: number = 0;
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 1.5;
  private totalRopesGenerated: number = 0;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;

  constructor() {
    this.offscreen = document.createElement('canvas');
    this.offCtx = this.offscreen.getContext('2d')!;
  }

  resize(w: number, h: number) {
    this.offscreen.width = w;
    this.offscreen.height = h;
  }

  initRopes(w: number, h: number) {
    this.ropes = [];
    this.ropeCounter = 0;
    this.totalRopesGenerated = 0;

    for (let i = 0; i < 3; i++) {
      this.addRope(w, h * 0.15 + (h * 0.35) * (i / 2), w);
    }
  }

  addRope(y: number, w: number, canvasH?: number): boolean {
    const nodeCount = 6 + Math.floor(Math.random() * 3);
    const ropeWidth = w * (0.3 + Math.random() * 0.3);
    const x = Math.random() * (w - ropeWidth);
    const color = ROPE_COLORS[Math.floor(Math.random() * ROPE_COLORS.length)];

    const rope = new Rope(x, y, ropeWidth, nodeCount, color);

    this.totalRopesGenerated++;
    if (this.totalRopesGenerated % 5 === 0) {
      const midIdx = Math.floor(nodeCount / 2);
      rope.energyBall = {
        x: rope.nodes[midIdx].x,
        y: rope.nodes[midIdx].y - 15,
        radius: ENERGY_BALL_RADIUS,
        pulsePhase: 0,
        pulseCycle: 0.8,
        collected: false,
      };
    }

    this.ropes.push(rope);
    this.ropeCounter++;

    const totalNodes = this.ropes.reduce((s, r) => s + r.getNodeCount(), 0);
    if (totalNodes > 200) {
      this.ropes.shift();
    }

    return rope.energyBall !== null;
  }

  update(dt: number, time: number, w: number, h: number, playerOnRope: boolean, playerX: number) {
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer -= this.SPAWN_INTERVAL;
      this.addRope(-10, w, h);
    }

    for (const rope of this.ropes) {
      rope.update(dt, time, playerOnRope, playerX);
    }

    for (let i = this.ropes.length - 1; i >= 0; i--) {
      const rope = this.ropes[i];
      if (rope.getY() > h + 50) {
        this.ropes.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    this.offCtx.clearRect(0, 0, this.offscreen.width, this.offscreen.height);
    for (const rope of this.ropes) {
      rope.render(this.offCtx, time);
    }
    ctx.drawImage(this.offscreen, 0, 0);
  }

  scrollDown(speed: number, dt: number, w: number, h: number) {
    for (const rope of this.ropes) {
      for (const node of rope.nodes) {
        node.baseY += speed * dt;
        node.y += speed * dt;
      }
      if (rope.energyBall) {
        rope.energyBall.y += speed * dt;
      }
    }
  }
}

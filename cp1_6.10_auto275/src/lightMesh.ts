import { LightNode } from './lightNode';
import { Particle } from './particle';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

interface Connection {
  a: LightNode;
  b: LightNode;
}

export class LightMesh {
  nodes: LightNode[];
  particles: Particle[];
  pulseFrequency: number;
  connectionDistance: number;
  starThreshold: number;
  private connections: Connection[];

  constructor() {
    this.nodes = [];
    this.particles = [];
    this.pulseFrequency = 1;
    this.connectionDistance = 120;
    this.starThreshold = 30;
    this.connections = [];
  }

  addNode(x: number, y: number): void {
    if (this.nodes.length >= 200) {
      this.nodes.shift();
    }
    this.nodes.push(new LightNode(x, y));
  }

  private updateConnections(): void {
    this.connections = [];
    const maxDistSq = this.connectionDistance * this.connectionDistance;

    for (let i = 0; i < this.nodes.length; i++) {
      this.nodes[i].connections = [];
    }

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= maxDistSq) {
          this.connections.push({ a, b });
          a.connections.push(b);
          b.connections.push(a);
        }
      }
    }
  }

  explodeNode(node: LightNode): void {
    node.highlightTime = 0.3;
    for (const connected of node.connections) {
      connected.highlightTime = 0.3;
    }

    const particleCount = 6;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 50;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 3 + Math.random() * 2;
      this.particles.push(new Particle(node.x, node.y, vx, vy, node.color, size, 0.8));
    }
  }

  handleClick(x: number, y: number): boolean {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      if (this.nodes[i].containsPoint(x, y)) {
        this.explodeNode(this.nodes[i]);
        return true;
      }
    }
    return false;
  }

  private detectStarBurst(ctx: CanvasRenderingContext2D): void {
    const thresholdSq = this.starThreshold * this.starThreshold;
    const visited = new Set<number>();

    for (let i = 0; i < this.nodes.length; i++) {
      if (visited.has(i)) continue;

      const cluster: LightNode[] = [this.nodes[i]];
      visited.add(i);

      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < this.nodes.length; j++) {
          if (visited.has(j)) continue;
          for (const member of cluster) {
            const dx = this.nodes[j].x - member.x;
            const dy = this.nodes[j].y - member.y;
            if (dx * dx + dy * dy <= thresholdSq) {
              cluster.push(this.nodes[j]);
              visited.add(j);
              changed = true;
              break;
            }
          }
        }
      }

      if (cluster.length >= 3) {
        this.drawStarBurst(ctx, cluster);
      }
    }
  }

  private drawStarBurst(ctx: CanvasRenderingContext2D, cluster: LightNode[]): void {
    let cx = 0;
    let cy = 0;
    for (const node of cluster) {
      cx += node.x;
      cy += node.y;
    }
    cx /= cluster.length;
    cy /= cluster.length;

    const time = Date.now() * 0.005;
    const twinkle = (Math.sin(time) + 1) / 2;
    const alpha = 0.4 + twinkle * 0.6;

    ctx.save();
    ctx.globalAlpha = alpha;

    const rayCount = 8;
    const maxLen = 40 + cluster.length * 10;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + time * 0.5;
      const len = maxLen * (0.7 + Math.sin(time * 2 + i) * 0.3);

      const gradient = ctx.createLinearGradient(
        cx,
        cy,
        cx + Math.cos(angle) * len,
        cy + Math.sin(angle) * len
      );

      const color = cluster[i % cluster.length].color;
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + '00');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }

    const coreGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    coreGradient.addColorStop(0, '#ffffff');
    coreGradient.addColorStop(0.3, cluster[0].color);
    coreGradient.addColorStop(1, cluster[0].color + '00');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawConnections(ctx: CanvasRenderingContext2D): void {
    for (const conn of this.connections) {
      const { a, b } = conn;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = 1 - dist / this.connectionDistance;

      const highlight = a.highlightTime > 0 || b.highlightTime > 0 ? 2 : 1;
      const lineWidth = 2 * highlight;

      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      const midColor = lerpColor(a.color, b.color, 0.5);
      gradient.addColorStop(0, a.color);
      gradient.addColorStop(0.5, midColor);
      gradient.addColorStop(1, b.color);

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = 10 * highlight;
      ctx.shadowColor = midColor;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  }

  update(dt: number): void {
    for (const node of this.nodes) {
      node.update(dt, this.pulseFrequency);
    }

    this.particles = this.particles.filter((p) => p.update(dt));

    this.updateConnections();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawConnections(ctx);
    this.detectStarBurst(ctx);

    for (const node of this.nodes) {
      node.draw(ctx);
    }

    for (const particle of this.particles) {
      particle.draw(ctx);
    }
  }
}

import type {
  VineSystemSnapshot,
  VineNode,
  Branch,
  Flower,
  Particle,
  Point,
} from './vineSystem';
import { CONSTANTS } from './vineSystem';

interface RenderStats {
  fps: number;
  frameTimeMs: number;
}

const hexToRgb = (hex: string): [number, number, number] => {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g);
    if (m && m.length >= 3) return [parseInt(m[0]), parseInt(m[1]), parseInt(m[2])];
  }
  const s = hex.replace('#', '');
  return [parseInt(s.substring(0, 2), 16), parseInt(s.substring(2, 4), 16), parseInt(s.substring(4, 6), 16)];
};

const rgbString = (r: number, g: number, b: number, a = 1): string =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;

const lerpRgb = (
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] => [
  c1[0] + (c2[0] - c1[0]) * t,
  c1[1] + (c2[1] - c1[1]) * t,
  c1[2] + (c2[2] - c1[2]) * t,
];

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private readonly fpsWindow: number[] = [];
  private lastFrameTs = 0;
  private readonly GLOW_BLUR = 12;
  private rgbStart: [number, number, number];
  private rgbEnd: [number, number, number];
  private rgbWilt: [number, number, number];
  private rgbFlowerInner: [number, number, number];
  private rgbFlowerOuter: [number, number, number];
  private rgbBud: [number, number, number];
  private rgbSeed: [number, number, number];
  private rgbBorderGlow: [number, number, number];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to acquire 2D rendering context');
    this.ctx = ctx;
    this.rgbStart = hexToRgb(CONSTANTS.COLOR_NODE_START);
    this.rgbEnd = hexToRgb(CONSTANTS.COLOR_NODE_END);
    this.rgbWilt = hexToRgb(CONSTANTS.COLOR_WILT);
    this.rgbFlowerInner = hexToRgb(CONSTANTS.COLOR_FLOWER_INNER);
    this.rgbFlowerOuter = hexToRgb(CONSTANTS.COLOR_FLOWER_OUTER);
    this.rgbBud = hexToRgb(CONSTANTS.COLOR_BUD);
    this.rgbSeed = hexToRgb(CONSTANTS.COLOR_SEED);
    this.rgbBorderGlow = hexToRgb(CONSTANTS.COLOR_BORDER_GLOW);
  }

  resize(w: number, h: number): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = w;
    this.height = h;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.5, '#14142b');
    grad.addColorStop(1, '#0f0f23');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBorderGlow(): void {
    const ctx = this.ctx;
    const inset = 16;
    ctx.save();
    ctx.shadowBlur = this.GLOW_BLUR;
    ctx.shadowColor = rgbString(...this.rgbBorderGlow, 0.6);
    ctx.strokeStyle = rgbString(...this.rgbBorderGlow, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(inset, inset, this.width - inset * 2, this.height - inset * 2);
    ctx.restore();
  }

  private drawVineLine(
    from: VineNode,
    to: VineNode,
    segments: number,
    branch: Branch
  ): void {
    const ctx = this.ctx;
    if (from.deleteProgress >= 1 || to.deleteProgress >= 1) return;
    const wiltT = Math.max(from.wiltProgress, to.wiltProgress);
    const deleteT = Math.max(from.deleteProgress, to.deleteProgress);
    if (wiltT >= 1 || deleteT >= 1) return;

    const alpha = (1 - wiltT) * (1 - deleteT) * 0.95;
    const lineWidth = 3 * (1 - wiltT * 0.5);

    const fromP = from.position;
    const toP = to.position;
    const dx = toP.x - fromP.x;
    const dy = toP.y - fromP.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;

    const tFrom = this.nodeProgressT(from, branch);
    const tTo = this.nodeProgressT(to, branch);
    const cStart = wiltT > 0.01
      ? lerpRgb(this.rgbStart, this.rgbWilt, wiltT)
      : lerpRgb(this.rgbStart, this.rgbEnd, tFrom);
    const cEnd = wiltT > 0.01
      ? lerpRgb(this.rgbEnd, this.rgbWilt, wiltT)
      : lerpRgb(this.rgbStart, this.rgbEnd, tTo);

    ctx.save();
    ctx.shadowBlur = this.GLOW_BLUR * 0.7;
    ctx.shadowColor = rgbString(...cEnd, 0.5 * alpha);
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const grad = ctx.createLinearGradient(fromP.x, fromP.y, toP.x, toP.y);
    grad.addColorStop(0, rgbString(...cStart, alpha));
    grad.addColorStop(1, rgbString(...cEnd, alpha));
    ctx.strokeStyle = grad;

    ctx.beginPath();
    ctx.moveTo(fromP.x, fromP.y);
    if (segments <= 1) {
      ctx.lineTo(toP.x, toP.y);
    } else {
      const nx = -dy / len;
      const ny = dx / len;
      const mag = Math.sin(performance.now() / 600 + from.createdAt * 0.001) * 3;
      for (let i = 1; i <= segments; i++) {
        const tt = i / segments;
        const w = Math.sin(tt * Math.PI) * mag;
        const bx = fromP.x + dx * tt + nx * w;
        const by = fromP.y + dy * tt + ny * w;
        ctx.lineTo(bx, by);
      }
    }
    ctx.stroke();

    if (to.growthProgress < 1 && !to.isWilting && to.deleteProgress < 0.01) {
      const gp = to.growthProgress;
      const tailX = fromP.x + dx * gp;
      const tailY = fromP.y + dy * gp;
      const trailLen = 20;
      const tdx = dx / len * trailLen;
      const tdy = dy / len * trailLen;
      const trailGrad = ctx.createLinearGradient(tailX, tailY, tailX - tdx, tailY - tdy);
      trailGrad.addColorStop(0, rgbString(...cEnd, 0.3 * alpha));
      trailGrad.addColorStop(1, rgbString(...cEnd, 0));
      ctx.shadowBlur = 0;
      ctx.strokeStyle = trailGrad;
      ctx.lineWidth = lineWidth * 0.8;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(tailX - tdx, tailY - tdy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private nodeProgressT(node: VineNode, branch: Branch, nodes: Map<string, VineNode>): number {
    const total = Math.max(1, branch.totalLength);
    let accumulated = 0;
    let currentId: string | null = node.id;
    let safety = 0;
    while (currentId && safety++ < 200) {
      const n = nodes.get(currentId);
      if (!n) break;
      if (n.prevNodeId === null) break;
      const prev = nodes.get(n.prevNodeId);
      if (!prev) break;
      const ddx = n.position.x - prev.position.x;
      const ddy = n.position.y - prev.position.y;
      accumulated += Math.sqrt(ddx * ddx + ddy * ddy);
      currentId = prev.id;
    }
    return Math.min(1, accumulated / total);
  }

  private drawNode(node: VineNode, branch: Branch): void {
    const ctx = this.ctx;
    if (node.deleteProgress >= 1 || node.wiltProgress >= 1) return;
    const scale = node.visualScale * node.pulseScale;
    if (scale <= 0.01) return;
    const alpha = node.visualAlpha * (1 - node.wiltProgress);
    if (alpha <= 0.01) return;

    let baseRgb: [number, number, number];
    if (node.isWilting || node.wiltProgress > 0.01) {
      baseRgb = lerpRgb(this.rgbStart, this.rgbWilt, node.wiltProgress);
    } else if (node.isSeed) {
      baseRgb = this.rgbSeed;
    } else if (node.isBranchNode) {
      baseRgb = hexToRgb(CONSTANTS.COLOR_BRANCH_NODE);
    } else {
      const t = Math.min(1, this.nodeProgressT(node, branch));
      baseRgb = lerpRgb(this.rgbStart, this.rgbEnd, t);
    }
    const r = node.baseRadius * scale * (1 - node.wiltProgress * 0.5);
    ctx.save();
    ctx.shadowBlur = this.GLOW_BLUR;
    ctx.shadowColor = rgbString(...baseRgb, alpha);
    ctx.fillStyle = rgbString(...baseRgb, alpha);
    ctx.beginPath();
    ctx.arc(node.position.x, node.position.y, Math.max(0.5, r), 0, Math.PI * 2);
    ctx.fill();

    if (node.isSeed || node.isBranchNode) {
      ctx.shadowBlur = 0;
      const innerR = r * 0.5;
      const inner = lerpRgb(baseRgb, [255, 255, 255], 0.5);
      ctx.fillStyle = rgbString(...inner, alpha * 0.8);
      ctx.beginPath();
      ctx.arc(node.position.x, node.position.y, Math.max(0.3, innerR), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawFlower(flower: Flower, node: VineNode): void {
    if (flower.alpha <= 0.01 || flower.scale <= 0.01 || node.deleteProgress >= 1) return;
    const ctx = this.ctx;
    const pos = node.position;
    const alpha = flower.alpha * (1 - node.wiltProgress) * node.visualAlpha;
    if (alpha <= 0.01) return;
    const scale = flower.scale * flower.pulseScale;

    if (flower.state === 'bud' || (flower.state === 'blooming' && flower.progress < 0.2)) {
      const prog = flower.state === 'bud' ? 1 : flower.progress / 0.2;
      const r = 4 * scale * prog;
      if (r < 0.3) return;
      ctx.save();
      ctx.shadowBlur = this.GLOW_BLUR;
      ctx.shadowColor = rgbString(...this.rgbBud, alpha);
      ctx.fillStyle = rgbString(...this.rgbBud, alpha);
      ctx.translate(pos.x, pos.y);
      ctx.rotate(flower.rotation);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.3, r * 0.8, r * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const bloomProgress = flower.state === 'blooming'
      ? (flower.progress - 0.2) / 0.8
      : flower.state === 'open'
      ? 1
      : 1;
    const petalCount = 5;
    const petalW = 6 * scale;
    const petalL = 12 * scale * bloomProgress;
    const centerR = 3.5 * scale;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(flower.rotation + Math.sin(performance.now() / 1200 + flower.stateStartTime) * 0.04);

    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.shadowBlur = this.GLOW_BLUR * 0.8;
      ctx.shadowColor = rgbString(...this.rgbFlowerOuter, alpha * 0.6);

      const petalGrad = ctx.createRadialGradient(0, 0, 1, 0, -petalL * 0.7, petalL);
      petalGrad.addColorStop(0, rgbString(...this.rgbFlowerInner, alpha * 0.85));
      petalGrad.addColorStop(1, rgbString(...this.rgbFlowerOuter, alpha * 0.8));
      ctx.fillStyle = petalGrad;
      ctx.strokeStyle = rgbString(255, 215, 0, alpha * 0.9);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -petalL * 0.5, petalW, petalL, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = this.GLOW_BLUR * 0.9;
    ctx.shadowColor = rgbString(...this.rgbFlowerInner, alpha);
    const coreGrad = ctx.createRadialGradient(0, 0, 0.5, 0, 0, centerR);
    coreGrad.addColorStop(0, rgbString(255, 240, 180, alpha));
    coreGrad.addColorStop(0.6, rgbString(...this.rgbFlowerInner, alpha * 0.95));
    coreGrad.addColorStop(1, rgbString(255, 180, 0, alpha * 0.7));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawParticle(p: Particle): void {
    const lifeT = p.life / p.maxLife;
    if (lifeT <= 0) return;
    const alpha = lifeT;
    const ctx = this.ctx;
    const rgb = hexToRgb(p.color);
    const r = p.radius * (0.6 + 0.4 * lifeT);
    ctx.save();
    ctx.shadowBlur = this.GLOW_BLUR * 0.7;
    ctx.shadowColor = rgbString(...rgb, alpha);
    ctx.fillStyle = rgbString(...rgb, alpha);
    ctx.translate(p.position.x, p.position.y);
    ctx.rotate(p.rotation);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.3, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawAllVineLines(snapshot: VineSystemSnapshot): void {
    for (const branch of snapshot.branches.values()) {
      const nodeIds: string[] = [];
      let tip: string | null = branch.tipNodeId;
      while (tip) {
        const n = snapshot.nodes.get(tip);
        if (!n) break;
        nodeIds.unshift(tip);
        if (n.parentBranchId !== branch.id) break;
        tip = n.prevNodeId;
      }
      for (let i = 0; i < nodeIds.length - 1; i++) {
        const a = snapshot.nodes.get(nodeIds[i]);
        const b = snapshot.nodes.get(nodeIds[i + 1]);
        if (!a || !b) continue;
        this.drawVineLine(a, b, 6, branch);
      }
    }
  }

  private drawAllNodes(snapshot: VineSystemSnapshot): void {
    for (const node of snapshot.nodes.values()) {
      const branch = node.parentBranchId ? snapshot.branches.get(node.parentBranchId) : undefined;
      if (branch) {
        this.drawNode(node, branch);
      } else {
        for (const b of snapshot.branches.values()) {
          this.drawNode(node, b);
          break;
        }
      }
    }
  }

  private drawAllFlowers(snapshot: VineSystemSnapshot): void {
    for (const flower of snapshot.flowers) {
      if (flower.state === 'gone') continue;
      const node = snapshot.nodes.get(flower.nodeId);
      if (!node) continue;
      this.drawFlower(flower, node);
    }
  }

  private drawAllParticles(snapshot: VineSystemSnapshot): void {
    for (const p of snapshot.particles) this.drawParticle(p);
  }

  render(snapshot: VineSystemSnapshot): RenderStats {
    const start = performance.now();
    const ctx = this.ctx;
    ctx.save();
    this.drawBackground();
    this.drawBorderGlow();
    this.drawAllVineLines(snapshot);
    this.drawAllNodes(snapshot);
    this.drawAllFlowers(snapshot);
    this.drawAllParticles(snapshot);
    ctx.restore();

    const now = performance.now();
    const frameTime = now - start;
    if (this.lastFrameTs > 0) {
      const delta = now - this.lastFrameTs;
      if (delta > 0) this.fpsWindow.push(1000 / delta);
      if (this.fpsWindow.length > 30) this.fpsWindow.shift();
    }
    this.lastFrameTs = now;
    const fps = this.fpsWindow.length
      ? this.fpsWindow.reduce((s, v) => s + v, 0) / this.fpsWindow.length
      : 60;
    return { fps, frameTimeMs: frameTime };
  }

  getStats(): RenderStats {
    const fps = this.fpsWindow.length
      ? this.fpsWindow.reduce((s, v) => s + v, 0) / this.fpsWindow.length
      : 60;
    return { fps, frameTimeMs: 0 };
  }

  screenToWorld(clientX: number, clientY: number): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.width / rect.width),
      y: (clientY - rect.top) * (this.height / rect.height),
    };
  }
}

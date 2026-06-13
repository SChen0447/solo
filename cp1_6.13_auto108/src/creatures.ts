import { ParticleSystem } from './particles';

export enum CreatureType { TRILOBITE, FERN, DRAGONFLY }
export enum CreatureState { DORMANT, HOVERED, AWAKENING, SWIMMING }

interface Vec2 { x: number; y: number; }

interface CreatureData {
  type: CreatureType;
  state: CreatureState;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  angle: number;
  color: [number, number, number];
  dormantColor: [number, number, number];
  glowColor: [number, number, number];
  glowRadius: number;
  targetGlowRadius: number;
  colorBlend: number;
  path: Vec2[] | null;
  pathT: number;
  pathTimer: number;
  pathDuration: number;
  swimSpeed: number;
  animTime: number;
  trailTimer: number;
  hitRadius: number;
  scale: number;
}

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function blendColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function randomInEllipse(cx: number, cy: number, a: number, b: number, margin: number): Vec2 {
  const sa = a * margin;
  const sb = b * margin;
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random());
  return { x: cx + sa * r * Math.cos(angle), y: cy + sb * r * Math.sin(angle) };
}

function cubicBezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, t: number): Vec2 {
  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

export class CreatureSystem {
  private creatures: CreatureData[] = [];
  private particles: ParticleSystem;
  private amberCx = 0;
  private amberCy = 0;
  private amberA = 0;
  private amberB = 0;
  private mobile = false;
  private speedMul = 1.0;
  private globalTime = 0;

  constructor(particles: ParticleSystem) {
    this.particles = particles;
  }

  setMobile(m: boolean) {
    this.mobile = m;
    this.speedMul = m ? 1.2 : 1.0;
  }

  init(cx: number, cy: number, a: number, b: number, scale: number) {
    this.amberCx = cx;
    this.amberCy = cy;
    this.amberA = a;
    this.amberB = b;

    const s = scale;
    const triX = cx - a * 0.25;
    const triY = cy + b * 0.2;
    const fernX = cx + a * 0.2;
    const fernY = cy - b * 0.25;
    const dfX = cx + a * 0.05;
    const dfY = cy - b * 0.1;

    this.creatures = [
      {
        type: CreatureType.TRILOBITE,
        state: CreatureState.DORMANT,
        x: triX, y: triY,
        baseX: triX, baseY: triY,
        angle: 0.3,
        color: [120, 70, 30],
        dormantColor: [80, 78, 75],
        glowColor: [255, 165, 50],
        glowRadius: 0, targetGlowRadius: 0,
        colorBlend: 0,
        path: null, pathT: 0,
        pathTimer: 0, pathDuration: 5 + Math.random() * 3,
        swimSpeed: 0.3 + Math.random() * 0.5,
        animTime: 0, trailTimer: 0,
        hitRadius: 22 * s, scale: s
      },
      {
        type: CreatureType.FERN,
        state: CreatureState.DORMANT,
        x: fernX, y: fernY,
        baseX: fernX, baseY: fernY,
        angle: -0.4,
        color: [20, 90, 30],
        dormantColor: [80, 78, 75],
        glowColor: [50, 220, 80],
        glowRadius: 0, targetGlowRadius: 0,
        colorBlend: 0,
        path: null, pathT: 0,
        pathTimer: 0, pathDuration: 5 + Math.random() * 3,
        swimSpeed: 0.3 + Math.random() * 0.5,
        animTime: 0, trailTimer: 0,
        hitRadius: 20 * s, scale: s
      },
      {
        type: CreatureType.DRAGONFLY,
        state: CreatureState.DORMANT,
        x: dfX, y: dfY,
        baseX: dfX, baseY: dfY,
        angle: 0.1,
        color: [100, 120, 160],
        dormantColor: [80, 78, 75],
        glowColor: [100, 180, 255],
        glowRadius: 0, targetGlowRadius: 0,
        colorBlend: 0,
        path: null, pathT: 0,
        pathTimer: 0, pathDuration: 5 + Math.random() * 3,
        swimSpeed: 0.3 + Math.random() * 0.5,
        animTime: 0, trailTimer: 0,
        hitRadius: 18 * s, scale: s
      }
    ];
  }

  setHovered(type: CreatureType | null) {
    for (const c of this.creatures) {
      if (c.type === type && (c.state === CreatureState.DORMANT || c.state === CreatureState.HOVERED)) {
        c.state = CreatureState.HOVERED;
        c.targetGlowRadius = 20 * c.scale;
      } else if (c.state === CreatureState.HOVERED && c.type !== type) {
        c.state = CreatureState.DORMANT;
        c.targetGlowRadius = 0;
      }
    }
  }

  clearHovered() {
    for (const c of this.creatures) {
      if (c.state === CreatureState.HOVERED) {
        c.state = CreatureState.DORMANT;
        c.targetGlowRadius = 0;
      }
    }
  }

  awaken(type: CreatureType) {
    const c = this.creatures.find(cr => cr.type === type);
    if (!c || c.state === CreatureState.SWIMMING || c.state === CreatureState.AWAKENING) return;
    c.state = CreatureState.AWAKENING;
    c.targetGlowRadius = 0;
    this.particles.createBurst(c.x, c.y);
  }

  allAwakened(): boolean {
    return this.creatures.every(c => c.state === CreatureState.SWIMMING);
  }

  hitTest(mx: number, my: number): CreatureType | null {
    for (const c of this.creatures) {
      if (c.state === CreatureState.SWIMMING || c.state === CreatureState.AWAKENING) continue;
      const dx = mx - c.x;
      const dy = my - c.y;
      if (dx * dx + dy * dy < c.hitRadius * c.hitRadius) {
        return c.type;
      }
    }
    return null;
  }

  getCreaturePositions(): { x: number; y: number; type: CreatureType; state: CreatureState }[] {
    return this.creatures.map(c => ({ x: c.x, y: c.y, type: c.type, state: c.state }));
  }

  private generatePath(c: CreatureData): Vec2[] {
    const margin = 0.6;
    const p0: Vec2 = { x: c.x, y: c.y };
    const p3 = randomInEllipse(this.amberCx, this.amberCy, this.amberA, this.amberB, margin);
    const p1 = randomInEllipse(this.amberCx, this.amberCy, this.amberA, this.amberB, margin * 0.8);
    const p2 = randomInEllipse(this.amberCx, this.amberCy, this.amberA, this.amberB, margin * 0.8);
    return [p0, p1, p2, p3];
  }

  update(dt: number) {
    this.globalTime += dt;
    const trailInterval = this.mobile ? 0.18 : 0.08;

    for (const c of this.creatures) {
      c.animTime += dt;
      c.glowRadius = lerp(c.glowRadius, c.targetGlowRadius, dt * 4);

      if (c.state === CreatureState.AWAKENING) {
        c.colorBlend = clamp(c.colorBlend + dt / 1.2, 0, 1);
        if (c.colorBlend >= 1) {
          c.state = CreatureState.SWIMMING;
          c.path = this.generatePath(c);
          c.pathT = 0;
          c.pathTimer = 0;
          c.pathDuration = 5 + Math.random() * 3;
        }
      }

      if (c.state === CreatureState.SWIMMING) {
        if (!c.path) {
          c.path = this.generatePath(c);
          c.pathT = 0;
          c.pathTimer = 0;
        }

        const speed = c.swimSpeed * this.speedMul;
        const pathLen = this.estimatePathLength(c.path);
        c.pathT += (speed * 60 * dt) / Math.max(1, pathLen);
        c.pathTimer += dt;

        if (c.pathT >= 1 || c.pathTimer >= c.pathDuration) {
          const pos = cubicBezier(c.path[0], c.path[1], c.path[2], c.path[3], Math.min(c.pathT, 1));
          c.x = pos.x;
          c.y = pos.y;
          c.path = this.generatePath(c);
          c.pathT = 0;
          c.pathTimer = 0;
          c.pathDuration = 5 + Math.random() * 3;
          c.swimSpeed = 0.3 + Math.random() * 0.5;
        } else {
          const pos = cubicBezier(c.path[0], c.path[1], c.path[2], c.path[3], c.pathT);
          const nextT = Math.min(1, c.pathT + 0.01);
          const nextPos = cubicBezier(c.path[0], c.path[1], c.path[2], c.path[3], nextT);
          c.angle = Math.atan2(nextPos.y - pos.y, nextPos.x - pos.x);
          c.x = pos.x;
          c.y = pos.y;
        }

        c.trailTimer += dt;
        if (c.trailTimer >= trailInterval) {
          c.trailTimer = 0;
          this.particles.createTrail(c.x, c.y, c.glowColor);
        }
      }
    }
  }

  private estimatePathLength(path: Vec2[]): number {
    let len = 0;
    const steps = 20;
    let prev = path[0];
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const p = cubicBezier(path[0], path[1], path[2], path[3], t);
      len += Math.sqrt((p.x - prev.x) ** 2 + (p.y - prev.y) ** 2);
      prev = p;
    }
    return len;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const c of this.creatures) {
      this.renderCreature(ctx, c);
    }
  }

  private renderCreature(ctx: CanvasRenderingContext2D, c: CreatureData) {
    const col = blendColor(c.dormantColor, c.color, c.colorBlend);

    ctx.save();
    ctx.translate(c.x, c.y);

    if (c.glowRadius > 0.5) {
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.glowRadius);
      const [gr, gg, gb] = c.glowColor;
      grad.addColorStop(0, `rgba(${gr},${gg},${gb},0.35)`);
      grad.addColorStop(0.6, `rgba(${gr},${gg},${gb},0.1)`);
      grad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, c.glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.rotate(c.angle);

    const s = c.scale;
    const [r, g, b] = col;
    const colorStr = `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

    switch (c.type) {
      case CreatureType.TRILOBITE:
        this.drawTrilobite(ctx, s, colorStr, c);
        break;
      case CreatureType.FERN:
        this.drawFern(ctx, s, colorStr, c);
        break;
      case CreatureType.DRAGONFLY:
        this.drawDragonfly(ctx, s, colorStr, c);
        break;
    }

    ctx.restore();
  }

  private drawTrilobite(ctx: CanvasRenderingContext2D, s: number, color: string, c: CreatureData) {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * s;

    const wiggle = c.state === CreatureState.SWIMMING ? Math.sin(this.globalTime * 4) * 2 * s : 0;

    ctx.beginPath();
    ctx.ellipse(-18 * s + wiggle * 0.3, 0, 7 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 7; i++) {
      const segX = (-10 + i * 4.5) * s;
      const segW = (8 - Math.abs(i - 3) * 1.2) * s;
      const w = c.state === CreatureState.SWIMMING ? Math.sin(i * 0.6 + this.globalTime * 5) * 1.5 * s : 0;
      ctx.beginPath();
      ctx.ellipse(segX + w, 0, 2.5 * s, segW, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(segX + w, -segW);
      ctx.lineTo(segX + w, segW);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(20 * s + wiggle * 0.1, 0, 4 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFern(ctx: CanvasRenderingContext2D, s: number, color: string, c: CreatureData) {
    const sway = c.state === CreatureState.SWIMMING ? Math.sin(this.globalTime * 2.5) * 0.12 : 0;

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(0, -16 * s);
    ctx.quadraticCurveTo(sway * 30, 0, 0, 16 * s);
    ctx.stroke();

    for (let i = 0; i < 7; i++) {
      const t = (i + 1) / 8;
      const py = (-16 + 32 * t) * s;
      const px = sway * 30 * t * (1 - t) * s;
      const len = (8 + (3.5 - Math.abs(t - 0.5) * 7)) * s;

      for (const side of [-1, 1]) {
        const frondAngle = side * (0.4 + t * 0.3) + sway;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(frondAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();

        for (let j = 1; j <= 3; j++) {
          const subLen = len * 0.4 * (1 - j * 0.15);
          const subX = len * j / 4;
          ctx.beginPath();
          ctx.moveTo(subX, 0);
          ctx.lineTo(subX + subLen * 0.5, -side * subLen * 0.5);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  private drawDragonfly(ctx: CanvasRenderingContext2D, s: number, color: string, c: CreatureData) {
    const flap = c.state === CreatureState.SWIMMING
      ? Math.sin(this.globalTime * 8) * 2.5 * s
      : 0;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -13 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();

    const wingAlpha = c.colorBlend > 0.5 ? 0.35 : 0.2;
    ctx.save();
    ctx.globalAlpha = wingAlpha + c.colorBlend * 0.15;

    const wings = [
      { yOff: -8 * s, len: 13 * s, side: -1 },
      { yOff: -8 * s, len: 13 * s, side: 1 },
      { yOff: 3 * s, len: 10 * s, side: -1 },
      { yOff: 3 * s, len: 10 * s, side: 1 }
    ];

    for (const w of wings) {
      ctx.fillStyle = color;
      ctx.save();
      ctx.translate(0, w.yOff);
      ctx.rotate(w.side * 0.15 + (w.side < 0 ? flap * 0.04 : -flap * 0.04));
      ctx.beginPath();
      ctx.ellipse(w.side * w.len * 0.5, 0, w.len * 0.5, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w.side * w.len, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w.side * w.len * 0.3, -2.5 * s);
      ctx.lineTo(w.side * w.len * 0.3, 2.5 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w.side * w.len * 0.6, -2 * s);
      ctx.lineTo(w.side * w.len * 0.6, 2 * s);
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  }
}

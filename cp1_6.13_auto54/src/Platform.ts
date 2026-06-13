import { Renderer } from './Renderer';

export interface CelestialBody {
  x: number;
  y: number;
  radius: number;
  type: 'planet' | 'meteorite';
  hits: number;
  maxHits: number;
  rotation: number;
  rotationSpeed: number;
  alive: boolean;
  color: { r: number; g: number; b: number };
  dustAngle: number;
  breathPhase: number;
  surfaceSeeds: number[];
}

export class Platform {
  cx: number;
  cy: number;
  innerRadius = 100;
  outerRadius = 250;
  private planets: CelestialBody[] = [];
  private meteorites: CelestialBody[] = [];
  private flowAngle = 0;
  private breathTime = 0;
  private destroyQueue: CelestialBody[] = [];

  constructor(cx: number, cy: number) {
    this.cx = cx;
    this.cy = cy;
    this.generateBodies();
  }

  private generateBodies() {
    this.planets = [];
    this.meteorites = [];

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + (Math.random() - 0.5) * 0.5;
      const dist = this.innerRadius + 30 + Math.random() * (this.outerRadius - this.innerRadius - 60);
      const r = 18 + Math.random() * 14;
      const t = Math.random();
      const cr = Math.floor(100 + t * 50);
      const cg = Math.floor(50 + t * 30);
      const cb = Math.floor(180 + t * 60);
      const seeds: number[] = [];
      for (let s = 0; s < 5; s++) seeds.push(Math.random() * Math.PI * 2);

      this.planets.push({
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist,
        radius: r,
        type: 'planet',
        hits: 0,
        maxHits: 3,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.3 + Math.random() * 0.5,
        alive: true,
        color: { r: cr, g: cg, b: cb },
        dustAngle: Math.random() * Math.PI * 2,
        breathPhase: Math.random() * Math.PI * 2,
        surfaceSeeds: seeds,
      });
    }

    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.6;
      const dist = this.innerRadius + 20 + Math.random() * (this.outerRadius - this.innerRadius - 40);
      const r = 8 + Math.random() * 6;
      const seeds: number[] = [];
      for (let s = 0; s < 3; s++) seeds.push(Math.random() * Math.PI * 2);

      this.meteorites.push({
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist,
        radius: r,
        type: 'meteorite',
        hits: 0,
        maxHits: 999,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0,
        alive: true,
        color: { r: 80, g: 80, b: 90 },
        dustAngle: 0,
        breathPhase: Math.random() * Math.PI * 2,
        surfaceSeeds: seeds,
      });
    }
  }

  reposition(cx: number, cy: number) {
    const dx = cx - this.cx;
    const dy = cy - this.cy;
    this.cx = cx;
    this.cy = cy;
    for (const b of [...this.planets, ...this.meteorites]) {
      b.x += dx;
      b.y += dy;
    }
  }

  getBodies(): CelestialBody[] {
    return [...this.planets, ...this.meteorites].filter(b => b.alive);
  }

  hitMeteorite(body: CelestialBody) {
    body.rotationSpeed = 8;
  }

  destroyPlanet(body: CelestialBody) {
    body.alive = false;
    this.destroyQueue.push(body);
  }

  getDestroyed(): CelestialBody[] {
    const q = this.destroyQueue.slice();
    this.destroyQueue.length = 0;
    return q;
  }

  regeneratePlanets() {
    const alive = this.planets.filter(p => p.alive).length;
    if (alive < 3) {
      for (let i = 0; i < 6 - alive; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = this.innerRadius + 30 + Math.random() * (this.outerRadius - this.innerRadius - 60);
        const r = 18 + Math.random() * 14;
        const t = Math.random();
        const cr = Math.floor(100 + t * 50);
        const cg = Math.floor(50 + t * 30);
        const cb = Math.floor(180 + t * 60);
        const seeds: number[] = [];
        for (let s = 0; s < 5; s++) seeds.push(Math.random() * Math.PI * 2);
        this.planets.push({
          x: this.cx + Math.cos(angle) * dist,
          y: this.cy + Math.sin(angle) * dist,
          radius: r,
          type: 'planet',
          hits: 0,
          maxHits: 3,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: 0.3 + Math.random() * 0.5,
          alive: true,
          color: { r: cr, g: cg, b: cb },
          dustAngle: Math.random() * Math.PI * 2,
          breathPhase: Math.random() * Math.PI * 2,
          surfaceSeeds: seeds,
        });
      }
    }
  }

  update(dt: number) {
    this.flowAngle += dt * 0.8;
    this.breathTime += dt;

    for (const b of [...this.planets, ...this.meteorites]) {
      if (!b.alive) continue;
      b.rotation += b.rotationSpeed * dt;
      if (b.type === 'meteorite' && b.rotationSpeed > 0.1) {
        b.rotationSpeed *= 0.95;
        if (b.rotationSpeed < 0.1) b.rotationSpeed = 0;
      }
    }
  }

  draw(renderer: Renderer) {
    const ctx = renderer.ctx;

    this.drawRings(ctx);

    for (const b of this.meteorites) {
      if (!b.alive) continue;
      this.drawMeteorite(ctx, b);
    }

    for (const b of this.planets) {
      if (!b.alive) continue;
      this.drawPlanet(ctx, b);
    }
  }

  private drawRings(ctx: CanvasRenderingContext2D) {
    const radii = [100, 175, 250];
    for (let i = 0; i < radii.length; i++) {
      const alpha = 0.25 - i * 0.06;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#4466aa';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, radii[i], 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    renderer_setAdditive(ctx);
    ctx.lineWidth = 3;
    const segments = 60;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2 + this.flowAngle;
      const a2 = ((i + 1) / segments) * Math.PI * 2 + this.flowAngle;
      const pulse = 0.3 + 0.7 * Math.pow(Math.sin(a1 * 3 + this.flowAngle * 2), 2);
      ctx.strokeStyle = `rgba(80,150,255,${0.15 * pulse})`;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, 250, a1, a2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.04;
    const grd = ctx.createRadialGradient(this.cx, this.cy, 100, this.cx, this.cy, 250);
    grd.addColorStop(0, 'rgba(60,80,160,0.3)');
    grd.addColorStop(1, 'rgba(30,40,80,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPlanet(ctx: CanvasRenderingContext2D, body: CelestialBody) {
    const breathScale = 1 + 0.03 * Math.sin(this.breathTime * (Math.PI * 2 / 3) + body.breathPhase);
    const r = body.radius * breathScale;

    ctx.save();
    ctx.translate(body.x, body.y);

    ctx.save();
    ctx.globalAlpha = 0.2;
    const dustGrad = ctx.createRadialGradient(0, 0, r, 0, 0, r + 12);
    dustGrad.addColorStop(0, `rgba(${body.color.r},${body.color.g},${body.color.b},0.3)`);
    dustGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = dustGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r + 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.rotate(body.rotation);

    const planetGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    planetGrad.addColorStop(0, `rgb(${body.color.r + 40},${body.color.g + 30},${body.color.b + 20})`);
    planetGrad.addColorStop(0.7, `rgb(${body.color.r},${body.color.g},${body.color.b})`);
    planetGrad.addColorStop(1, `rgb(${Math.max(0, body.color.r - 40)},${Math.max(0, body.color.g - 30)},${Math.max(0, body.color.b - 20)})`);
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < body.surfaceSeeds.length; i++) {
      const sa = body.surfaceSeeds[i] + body.rotation * 0.2;
      const sd = r * 0.4 * (0.5 + 0.5 * Math.sin(i * 2.1));
      const sx = Math.cos(sa) * sd;
      const sy = Math.sin(sa) * sd;
      ctx.fillStyle = `rgba(255,255,255,0.15)`;
      ctx.beginPath();
      ctx.ellipse(sx, sy, r * 0.25, r * 0.1, sa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = `rgba(${body.color.r},${body.color.g},${body.color.b},0.4)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, r + 8, r * 0.3, body.dustAngle + this.breathTime * 0.1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    if (body.hits > 0) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`♥${body.maxHits - body.hits}`, 0, -r - 8);
      ctx.restore();
    }
  }

  private drawMeteorite(ctx: CanvasRenderingContext2D, body: CelestialBody) {
    const breathScale = 1 + 0.03 * Math.sin(this.breathTime * (Math.PI * 2 / 3) + body.breathPhase);
    const r = body.radius * breathScale;

    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.rotation);

    ctx.save();
    ctx.globalAlpha = 0.15;
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r + 6);
    glowGrad.addColorStop(0, 'rgba(150,160,180,0.3)');
    glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const mGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, 0, 0, 0, r);
    mGrad.addColorStop(0, '#707080');
    mGrad.addColorStop(0.6, '#505058');
    mGrad.addColorStop(1, '#383840');
    ctx.fillStyle = mGrad;

    ctx.beginPath();
    const verts = 7;
    for (let i = 0; i < verts; i++) {
      const a = (i / verts) * Math.PI * 2;
      const vr = r * (0.7 + 0.3 * Math.sin(a * 3 + body.surfaceSeeds[0] * 5));
      const px = Math.cos(a) * vr;
      const py = Math.sin(a) * vr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.2;
    for (let i = 0; i < body.surfaceSeeds.length; i++) {
      const ca = body.surfaceSeeds[i];
      const cd = r * 0.3;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.arc(Math.cos(ca) * cd, Math.sin(ca) * cd, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

function renderer_setAdditive(ctx: CanvasRenderingContext2D) {
  ctx.globalCompositeOperation = 'lighter';
}

export type PlantStage = 'seed' | 'sprout' | 'growing' | 'branching' | 'flowering';
export type PlantMorph = 'normal' | 'cactus' | 'vine';

export interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface PlantState {
  stage: PlantStage;
  morph: PlantMorph;
  progress: number;
  shake: number;
  shakeTime: number;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function rgb(r: number, g: number, b: number, a = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

export class Plant {
  state: PlantState;
  petals: Petal[] = [];
  private prevMorph: PlantMorph = 'normal';
  private morphTransition: number = 0;

  constructor(state?: Partial<PlantState>) {
    this.state = {
      stage: 'seed',
      morph: 'normal',
      progress: 0,
      shake: 0,
      shakeTime: 0,
      ...state
    };
  }

  setStage(stage: PlantStage): void {
    this.state.stage = stage;
  }

  setMorph(morph: PlantMorph): void {
    if (this.state.morph !== morph) {
      this.prevMorph = this.state.morph;
      this.morphTransition = 0;
      this.state.morph = morph;
    }
  }

  setProgress(p: number): void {
    this.state.progress = Math.max(0, Math.min(1, p));
  }

  triggerShake(): void {
    this.state.shakeTime = 0.5;
    this.state.shake = 1;
    this.spawnPetals();
  }

  spawnPetals(): Petal[] {
    const count = 30;
    const petalColors = ['#ffb6c1', '#ffc8dd', '#ffafcc', '#f8c8dc', '#ffd1dc'];
    const newPetals: Petal[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI - Math.PI;
      const speed = 0.5 + Math.random() * 1.5;
      const p: Petal = {
        x: 350 + (Math.random() - 0.5) * 40,
        y: 320 + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.1,
        size: 4 + Math.random() * 5,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
        alpha: 1,
        life: 0,
        maxLife: 3 + Math.random() * 2
      };
      this.petals.push(p);
      newPetals.push(p);
    }
    return newPetals;
  }

  update(dt: number): void {
    if (this.morphTransition < 1) {
      this.morphTransition = Math.min(1, this.morphTransition + dt / 0.8);
    }

    if (this.state.shakeTime > 0) {
      this.state.shakeTime -= dt;
      this.state.shake = Math.max(0, this.state.shakeTime / 0.5);
    } else {
      this.state.shake = 0;
    }

    for (let i = this.petals.length - 1; i >= 0; i--) {
      const p = this.petals[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.petals.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      const easeT = easeInOutQuad(t);
      p.vy += 0.05;
      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx + Math.sin(p.life * 2) * 0.3;
      p.y += p.vy;
      p.rotation += p.vr;
      p.alpha = 1 - easeT;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const shakeX = this.state.shake > 0 ? (Math.random() - 0.5) * 8 * this.state.shake : 0;
    const shakeY = this.state.shake > 0 ? (Math.random() - 0.5) * 6 * this.state.shake : 0;
    ctx.save();
    ctx.translate(shakeX, shakeY);
    this.drawPlantBody(ctx);
    this.drawPetals(ctx);
    ctx.restore();
  }

  private getMorphFactor(): { normal: number; cactus: number; vine: number } {
    const t = easeInOutQuad(this.morphTransition);
    const prev = this.prevMorph;
    const curr = this.state.morph;
    const factors = { normal: 0, cactus: 0, vine: 0 };
    factors[curr] = t;
    factors[prev] = 1 - t;
    return factors;
  }

  private drawPlantBody(ctx: CanvasRenderingContext2D): void {
    const stage = this.state.stage;
    const prog = this.state.progress;
    const mf = this.getMorphFactor();
    const cx = 350;
    const groundY = 520;

    ctx.save();

    if (stage === 'seed') {
      this.drawSeed(ctx, cx, groundY, prog);
    } else if (stage === 'sprout') {
      this.drawSeed(ctx, cx, groundY, 1);
      this.drawSprout(ctx, cx, groundY, prog, mf);
    } else if (stage === 'growing') {
      this.drawSeed(ctx, cx, groundY, 1);
      this.drawSprout(ctx, cx, groundY, 1, mf);
      this.drawGrowing(ctx, cx, groundY, prog, mf);
    } else if (stage === 'branching') {
      this.drawSeed(ctx, cx, groundY, 1);
      this.drawSprout(ctx, cx, groundY, 1, mf);
      this.drawGrowing(ctx, cx, groundY, 1, mf);
      this.drawBranches(ctx, cx, groundY, prog, mf);
    } else if (stage === 'flowering') {
      this.drawSeed(ctx, cx, groundY, 1);
      this.drawSprout(ctx, cx, groundY, 1, mf);
      this.drawGrowing(ctx, cx, groundY, 1, mf);
      this.drawBranches(ctx, cx, groundY, 1, mf);
      this.drawFlowers(ctx, cx, groundY, prog, mf);
    }

    ctx.restore();
  }

  private drawSeed(ctx: CanvasRenderingContext2D, cx: number, gy: number, prog: number): void {
    const p = easeInOutQuad(prog);
    const seedY = gy - 8;
    const w = lerp(16, 14, p);
    const h = lerp(10, 8, p);
    ctx.save();
    const grad = ctx.createRadialGradient(cx, seedY, 0, cx, seedY, w);
    grad.addColorStop(0, '#8B6F47');
    grad.addColorStop(0.6, '#6B5234');
    grad.addColorStop(1, '#4a3a26');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, seedY, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, seedY, w * 0.6, h * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawSprout(ctx: CanvasRenderingContext2D, cx: number, gy: number, prog: number, mf: { normal: number; cactus: number; vine: number }): void {
    const p = easeInOutQuad(prog);
    const height = lerp(0, 55, p);
    const thickness = 4 + mf.cactus * 3 + mf.vine * (-1);
    const stemColor = this.mixColor(
      { r: 100, g: 180, b: 110 },
      { r: 80, g: 160, b: 90 },
      { r: 120, g: 170, b: 100 },
      mf
    );
    ctx.save();
    ctx.strokeStyle = rgb(stemColor.r, stemColor.g, stemColor.b);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, gy - 5);
    if (mf.vine > 0.3) {
      ctx.quadraticCurveTo(cx + 15 * mf.vine, gy - height * 0.5, cx + 8 * mf.vine, gy - height);
    } else {
      ctx.quadraticCurveTo(cx, gy - height * 0.5, cx, gy - height);
    }
    ctx.stroke();
    if (p > 0.3) {
      const leafP = (p - 0.3) / 0.7;
      const leafY = gy - height * 0.6;
      const leafSize = lerp(0, 14, leafP);
      this.drawLeaf(ctx, cx - 12, leafY, -0.6, leafSize, stemColor);
      this.drawLeaf(ctx, cx + 12, leafY - 8, 0.6, leafSize, stemColor);
    }
    ctx.restore();
  }

  private drawGrowing(ctx: CanvasRenderingContext2D, cx: number, gy: number, prog: number, mf: { normal: number; cactus: number; vine: number }): void {
    const p = easeInOutQuad(prog);
    const baseHeight = 55;
    const extraHeight = lerp(0, 100, p);
    const totalHeight = baseHeight + extraHeight;
    const thickness = 5 + mf.cactus * 5 + mf.vine * (-2);
    const stemColor = this.mixColor(
      { r: 110, g: 170, b: 100 },
      { r: 90, g: 155, b: 85 },
      { r: 130, g: 180, b: 110 },
      mf
    );
    ctx.save();
    ctx.strokeStyle = rgb(stemColor.r, stemColor.g, stemColor.b);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (mf.vine > 0.3) {
      const sway = Math.sin(p * Math.PI * 2) * 30 * mf.vine;
      ctx.moveTo(cx, gy - 5);
      ctx.bezierCurveTo(
        cx + sway * 0.5, gy - totalHeight * 0.3,
        cx - sway * 0.5, gy - totalHeight * 0.6,
        cx + sway * 0.3, gy - totalHeight
      );
    } else {
      ctx.moveTo(cx, gy - 5);
      ctx.quadraticCurveTo(cx, gy - totalHeight * 0.5, cx, gy - totalHeight);
    }
    ctx.stroke();
    if (mf.cactus > 0.3) {
      for (let i = 0; i < 4; i++) {
        const ribP = (i + 1) / 5;
        const ry = gy - totalHeight * ribP;
        const ribW = lerp(0, thickness * 0.6, p);
        ctx.beginPath();
        ctx.ellipse(cx, ry, ribW, ribW * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = rgb(stemColor.r - 20, stemColor.g - 15, stemColor.b - 15);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawBranches(ctx: CanvasRenderingContext2D, cx: number, gy: number, prog: number, mf: { normal: number; cactus: number; vine: number }): void {
    const p = easeInOutQuad(prog);
    const stemH = 155;
    const topY = gy - stemH;
    const branchColor = this.mixColor(
      { r: 115, g: 175, b: 105 },
      { r: 95, g: 160, b: 90 },
      { r: 135, g: 185, b: 115 },
      mf
    );
    ctx.save();
    if (mf.cactus > 0.4) {
      const armLen = lerp(0, 60, p);
      this.drawArm(ctx, cx - 6, topY - 30, -1, armLen, branchColor, 6);
      this.drawArm(ctx, cx + 6, topY - 50, 1, armLen * 0.85, branchColor, 5);
    } else if (mf.vine > 0.4) {
      const branchLen = lerp(0, 90, p);
      this.drawVineBranch(ctx, cx, topY - 10, -1, branchLen, branchColor, 3);
      this.drawVineBranch(ctx, cx + 5, topY - 40, 1, branchLen * 0.9, branchColor, 2.5);
      this.drawVineBranch(ctx, cx - 3, topY - 70, -1, branchLen * 0.7, branchColor, 2);
    } else {
      const branchLen = lerp(0, 70, p);
      this.drawBranch(ctx, cx, topY - 20, -1, branchLen, branchColor, 4);
      this.drawBranch(ctx, cx, topY - 45, 1, branchLen * 0.85, branchColor, 3.5);
      this.drawBranch(ctx, cx, topY - 65, -1, branchLen * 0.6, branchColor, 3);
    }
    ctx.restore();
  }

  private drawFlowers(ctx: CanvasRenderingContext2D, cx: number, gy: number, prog: number, mf: { normal: number; cactus: number; vine: number }): void {
    const p = easeInOutQuad(prog);
    const stemH = 155;
    const topY = gy - stemH;
    const flowerCount = Math.floor(lerp(2, 7, p));
    const positions: { x: number; y: number; s: number }[] = [];
    if (mf.cactus > 0.4) {
      positions.push({ x: cx, y: topY - 10, s: 1 });
      positions.push({ x: cx - 25, y: topY - 50, s: 0.85 });
      positions.push({ x: cx + 30, y: topY - 80, s: 0.8 });
    } else if (mf.vine > 0.4) {
      positions.push({ x: cx, y: topY, s: 0.9 });
      positions.push({ x: cx - 50, y: topY - 30, s: 1 });
      positions.push({ x: cx + 55, y: topY - 50, s: 0.95 });
      positions.push({ x: cx - 40, y: topY - 80, s: 0.8 });
      positions.push({ x: cx + 40, y: topY - 100, s: 0.85 });
      positions.push({ x: cx - 20, y: topY - 110, s: 0.75 });
      positions.push({ x: cx + 20, y: topY - 30, s: 0.7 });
    } else {
      positions.push({ x: cx, y: topY, s: 1 });
      positions.push({ x: cx - 35, y: topY - 30, s: 0.9 });
      positions.push({ x: cx + 35, y: topY - 50, s: 0.95 });
      positions.push({ x: cx - 25, y: topY - 70, s: 0.8 });
      positions.push({ x: cx + 30, y: topY - 90, s: 0.85 });
    }
    for (let i = 0; i < Math.min(flowerCount, positions.length); i++) {
      const pos = positions[i];
      const fp = Math.min(1, p * positions.length / (i + 1));
      this.drawFlower(ctx, pos.x, pos.y, fp, pos.s, mf);
    }
  }

  private drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, p: number, scale: number, mf: { normal: number; cactus: number; vine: number }): void {
    if (p <= 0) return;
    const easeP = easeInOutQuad(p);
    const petalCount = 5;
    const petalLen = (10 + (mf.cactus * 4) + (mf.vine * 2)) * scale * easeP;
    const petalW = petalLen * 0.5;
    const flowerColors = this.mixColor(
      { r: 255, g: 182, b: 193 },
      { r: 255, g: 150, b: 130 },
      { r: 200, g: 160, b: 255 },
      mf
    );
    ctx.save();
    ctx.translate(x, y);
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(angle);
      const grad = ctx.createRadialGradient(0, -petalLen * 0.5, 0, 0, -petalLen * 0.5, petalLen);
      grad.addColorStop(0, rgb(flowerColors.r + 20, flowerColors.g + 20, flowerColors.b + 20, 0.95));
      grad.addColorStop(1, rgb(flowerColors.r, flowerColors.g, flowerColors.b, 0.7));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, -petalLen * 0.5, petalW, petalLen, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const centerR = petalLen * 0.35;
    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, centerR);
    centerGrad.addColorStop(0, '#FFE66D');
    centerGrad.addColorStop(1, '#F4C542');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, color: { r: number; g: number; b: number }, thickness: number): void {
    if (len <= 0) return;
    ctx.save();
    ctx.strokeStyle = rgb(color.r, color.g, color.b);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const endX = x + dir * len * 0.7;
    const endY = y - len * 0.85;
    ctx.quadraticCurveTo(x + dir * len * 0.5, y - len * 0.4, endX, endY);
    ctx.stroke();
    this.drawLeaf(ctx, endX - 5, endY - 3, dir - 0.4, 14, color);
    this.drawLeaf(ctx, endX + 5, endY + 5, dir + 0.3, 12, color);
    ctx.restore();
  }

  private drawArm(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, color: { r: number; g: number; b: number }, thickness: number): void {
    if (len <= 0) return;
    ctx.save();
    ctx.strokeStyle = rgb(color.r, color.g, color.b);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const midX = x + dir * len * 0.5;
    const midY = y - len * 0.2;
    const endX = x + dir * len * 0.6;
    const endY = y - len;
    ctx.bezierCurveTo(midX, midY, midX + dir * 5, midY - len * 0.4, endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  private drawVineBranch(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, len: number, color: { r: number; g: number; b: number }, thickness: number): void {
    if (len <= 0) return;
    ctx.save();
    ctx.strokeStyle = rgb(color.r, color.g, color.b);
    ctx.lineWidth = thickness;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    const cp1x = x + dir * len * 0.3;
    const cp1y = y - len * 0.1;
    const cp2x = x + dir * len * 0.8;
    const cp2y = y - len * 0.7;
    const endX = x + dir * len;
    const endY = y - len * 0.9;
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    ctx.stroke();
    this.drawLeaf(ctx, endX, endY - 2, dir, 10, color);
    this.drawLeaf(ctx, cp2x - dir * 8, cp2y, dir - 0.3, 9, color);
    this.drawLeaf(ctx, cp1x + dir * 5, cp1y, dir + 0.4, 8, color);
    ctx.restore();
  }

  private drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number, color: { r: number; g: number; b: number }): void {
    if (size <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const grad = ctx.createLinearGradient(0, -size, 0, size);
    grad.addColorStop(0, rgb(color.r + 20, color.g + 25, color.b + 15));
    grad.addColorStop(1, rgb(color.r, color.g, color.b));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.45, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgb(color.r - 30, color.g - 30, color.b - 20, 0.4);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    ctx.stroke();
    ctx.restore();
  }

  private drawPetals(ctx: CanvasRenderingContext2D): void {
    for (const p of this.petals) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private mixColor(
    normal: { r: number; g: number; b: number },
    cactus: { r: number; g: number; b: number },
    vine: { r: number; g: number; b: number },
    mf: { normal: number; cactus: number; vine: number }
  ): { r: number; g: number; b: number } {
    return {
      r: normal.r * mf.normal + cactus.r * mf.cactus + vine.r * mf.vine,
      g: normal.g * mf.normal + cactus.g * mf.cactus + vine.g * mf.vine,
      b: normal.b * mf.normal + cactus.b * mf.cactus + vine.b * mf.vine
    };
  }
}

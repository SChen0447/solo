import p5 from 'p5';
import { TotemData, ColorRGB, mixColors } from './Totem';
import { TotemManagerState } from './TotemManager';

interface TreeTrunk {
  x: number;
  width: number;
  height: number;
  branches: Array<{ angle: number; length: number }>;
}

export class Renderer {
  private p: p5;
  private width: number = 0;
  private height: number = 0;
  private treeTrunks: TreeTrunk[] = [];
  private time: number = 0;

  constructor(p: p5, width: number, height: number) {
    this.p = p;
    this.width = width;
    this.height = height;
    this.generateTreeTrunks();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateTreeTrunks();
  }

  private generateTreeTrunks(): void {
    this.treeTrunks = [];
    const trunkCount = 6 + Math.floor(Math.random() * 4);
    for (let i = 0; i < trunkCount; i++) {
      const trunk: TreeTrunk = {
        x: Math.random() * this.width,
        width: 20 + Math.random() * 40,
        height: this.height * (0.4 + Math.random() * 0.5),
        branches: []
      };
      const branchCount = 2 + Math.floor(Math.random() * 4);
      for (let b = 0; b < branchCount; b++) {
        trunk.branches.push({
          angle: (Math.random() - 0.5) * Math.PI * 0.7,
          length: 30 + Math.random() * 80
        });
      }
      this.treeTrunks.push(trunk);
    }
  }

  render(state: TotemManagerState, time: number): void {
    this.time = time;
    const p = this.p;

    this.drawBackground();
    this.drawTreeTrunks();
    this.drawForestParticles(state);
    this.drawEnergyLines(state.totems);
    this.drawCollisionSpots(state.collisionSpots);
    this.drawTotems(state.totems);
    this.drawDeathParticles(state.deathParticles);
    this.drawClickRipples(state.clickRipples);
  }

  private drawBackground(): void {
    const p = this.p;
    const topColor = p.color(10, 10, 42);
    const bottomColor = p.color(10, 26, 10);
    for (let y = 0; y < this.height; y++) {
      const t = y / this.height;
      const c = p.lerpColor(topColor, bottomColor, t);
      p.stroke(c);
      p.line(0, y, this.width, y);
    }
  }

  private drawTreeTrunks(): void {
    const p = this.p;
    p.noStroke();
    p.fill(0, 0, 0, 180);
    for (const trunk of this.treeTrunks) {
      p.rect(trunk.x - trunk.width / 2, this.height - trunk.height, trunk.width, trunk.height);
      p.ellipse(trunk.x, this.height - trunk.height, trunk.width * 1.5, trunk.width * 0.8);
      p.push();
      p.translate(trunk.x, this.height - trunk.height * 0.3);
      for (const branch of trunk.branches) {
        p.push();
        p.rotate(branch.angle);
        p.rect(0, -4, branch.length, 8);
        p.pop();
      }
      p.pop();
    }
  }

  private drawForestParticles(state: TotemManagerState): void {
    const p = this.p;
    p.noStroke();
    for (const fp of state.forestParticles) {
      const hue = 140 + Math.sin(fp.phase) * 40;
      const alpha = fp.alpha * (0.6 + Math.sin(fp.phase * 2) * 0.4);
      p.push();
      p.translate(fp.x, fp.y);
      p.rotate(fp.rotation);
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = `hsla(${hue}, 80%, 60%, ${alpha})`;
      p.fill(100, 255, 180, alpha * 255);
      p.ellipse(0, 0, fp.size, fp.size);
      p.pop();
    }
    p.drawingContext.shadowBlur = 0;
  }

  private drawTotems(totems: TotemData[]): void {
    const p = this.p;
    for (const t of totems) {
      this.drawTotemGlow(t);
      this.drawTotemBody(t);
    }
  }

  private drawTotemGlow(t: TotemData): void {
    const p = this.p;
    const radius = t.currentRadius * t.scale;
    const glowRadius = radius * (t.isHovered ? 3 : 2.2);

    const glowColor = t.isHovered
      ? { r: 255, g: 255, b: 255 }
      : t.color;

    p.push();
    p.drawingContext.globalCompositeOperation = 'lighter';
    for (let i = 3; i >= 0; i--) {
      const r = glowRadius * (0.4 + i * 0.2);
      const alpha = t.glowAlpha * t.alpha * (0.15 + (3 - i) * 0.1);
      p.noStroke();
      p.drawingContext.shadowBlur = 20;
      p.drawingContext.shadowColor = `rgba(${glowColor.r}, ${glowColor.g}, ${glowColor.b}, ${alpha})`;
      p.fill(glowColor.r, glowColor.g, glowColor.b, alpha * 255);
      p.ellipse(t.x, t.y, r * 2, r * 2);
    }
    p.pop();
    p.drawingContext.shadowBlur = 0;
  }

  private drawTotemBody(t: TotemData): void {
    const p = this.p;
    const radius = t.currentRadius * t.scale;

    p.push();
    p.drawingContext.globalCompositeOperation = 'lighter';
    const grad = p.drawingContext.createRadialGradient(
      t.x, t.y, radius * 0.1,
      t.x, t.y, radius
    );
    grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * t.alpha})`);
    grad.addColorStop(0.3, `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${0.8 * t.alpha})`);
    grad.addColorStop(0.7, `rgba(${t.color.r * 0.7}, ${t.color.g * 0.7}, ${t.color.b * 0.7}, ${0.6 * t.alpha})`);
    grad.addColorStop(1, `rgba(${t.color.r * 0.4}, ${t.color.g * 0.4}, ${t.color.b * 0.4}, ${0.2 * t.alpha})`);

    p.noStroke();
    p.drawingContext.fillStyle = grad;
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = `rgba(${t.color.r}, ${t.color.g}, ${t.color.b}, ${0.8 * t.alpha})`;
    p.ellipse(t.x, t.y, radius * 2, radius * 2);

    p.drawingContext.shadowBlur = 0;
    p.drawingContext.globalCompositeOperation = 'source-over';

    p.noFill();
    p.stroke(t.color.r, t.color.g, t.color.b, 150 * t.alpha);
    p.strokeWeight(1.5);
    p.ellipse(t.x, t.y, radius * 2.4, radius * 2.4);

    p.pop();
    p.drawingContext.shadowBlur = 0;
  }

  private drawEnergyLines(totems: TotemData[]): void {
    const p = this.p;
    const maxDist = 300;
    const minDist = 200;

    for (let i = 0; i < totems.length; i++) {
      for (let j = i + 1; j < totems.length; j++) {
        const a = totems[i];
        const b = totems[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < maxDist) {
          let alpha: number;
          let thickness: number;
          if (dist < minDist) {
            alpha = 0.7 * (1 - dist / minDist) + 0.1;
            thickness = 4 - (dist / minDist) * 3;
          } else {
            alpha = 0.1 * (1 - (dist - minDist) / (maxDist - minDist));
            thickness = 1;
          }

          const pulse = 0.7 + Math.sin(this.time * 3 + a.pulsePhase) * 0.3;
          alpha *= pulse;

          const mixed = mixColors(a.color, b.color, 0.5);

          p.push();
          p.drawingContext.globalCompositeOperation = 'lighter';
          p.drawingContext.shadowBlur = 10;
          p.drawingContext.shadowColor = `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, ${alpha})`;

          p.stroke(mixed.r, mixed.g, mixed.b, alpha * 255);
          p.strokeWeight(Math.max(1, thickness));
          p.noFill();
          p.line(a.x, a.y, b.x, b.y);

          p.stroke(mixed.r, mixed.g, mixed.b, alpha * 120);
          p.strokeWeight(Math.max(1, thickness) * 2);
          p.line(a.x, a.y, b.x, b.y);

          p.pop();
          p.drawingContext.shadowBlur = 0;
        }
      }
    }
  }

  private drawCollisionSpots(
    spots: Array<{ x: number; y: number; time: number; colorA: ColorRGB; colorB: ColorRGB }>
  ): void {
    const p = this.p;
    for (const spot of spots) {
      const age = this.time - spot.time;
      const flash = Math.sin(age * Math.PI * 4) * 0.5 + 0.5;
      const alpha = Math.max(0, 1 - age / 2) * flash;
      const mixed = mixColors(spot.colorA, spot.colorB, 0.5);
      const radius = 30 + Math.sin(age * Math.PI * 2) * 10;

      p.push();
      p.drawingContext.globalCompositeOperation = 'lighter';
      p.drawingContext.shadowBlur = 30;
      p.drawingContext.shadowColor = `rgba(${mixed.r}, ${mixed.g}, ${mixed.b}, ${alpha})`;
      p.noStroke();
      p.fill(mixed.r, mixed.g, mixed.b, alpha * 255);
      p.ellipse(spot.x, spot.y, radius * 2, radius * 2);
      p.fill(255, 255, 255, alpha * 200);
      p.ellipse(spot.x, spot.y, radius * 0.8, radius * 0.8);
      p.pop();
      p.drawingContext.shadowBlur = 0;
    }
  }

  private drawDeathParticles(
    particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: ColorRGB }>
  ): void {
    const p = this.p;
    for (const p2 of particles) {
      const alpha = Math.max(0, p2.life);
      const size = 3 + (1 - p2.life) * 5;

      p.push();
      p.drawingContext.globalCompositeOperation = 'lighter';
      p.drawingContext.shadowBlur = 10;
      p.drawingContext.shadowColor = `rgba(${p2.color.r}, ${p2.color.g}, ${p2.color.b}, ${alpha})`;
      p.noStroke();
      p.fill(p2.color.r, p2.color.g, p2.color.b, alpha * 255);
      p.ellipse(p2.x, p2.y, size, size);
      p.pop();
      p.drawingContext.shadowBlur = 0;
    }
  }

  private drawClickRipples(
    ripples: Array<{ x: number; y: number; radius: number; alpha: number; maxRadius: number }>
  ): void {
    const p = this.p;
    for (const r of ripples) {
      p.push();
      p.noFill();
      p.drawingContext.globalCompositeOperation = 'lighter';
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = `rgba(200, 220, 255, ${r.alpha})`;
      p.stroke(200, 220, 255, r.alpha * 255);
      p.strokeWeight(2);
      p.ellipse(r.x, r.y, r.radius * 2, r.radius * 2);
      p.strokeWeight(1);
      p.ellipse(r.x, r.y, r.radius * 1.5, r.radius * 1.5);
      p.pop();
      p.drawingContext.shadowBlur = 0;
    }
  }
}

import p5 from 'p5';
import { Totem, ElementType, ELEMENT_COLORS, ELEMENT_SYMBOLS } from './TotemManager';

interface LightBeam {
  totemId: number;
  x: number;
  baseY: number;
  height: number;
  color: string;
  life: number;
  maxLife: number;
}

interface ErrorFlash {
  totemId: number;
  timer: number;
  flashCount: number;
  totalFlashes: number;
}

interface FloatingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

interface VortexParticle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  speed: number;
  size: number;
  color: string;
  vy: number;
  life: number;
  maxLife: number;
}

interface SoulBeast {
  x: number;
  y: number;
  color: string;
  phase: 'emerging' | 'flying' | 'orb';
  timer: number;
  spiralAngle: number;
  spiralRadius: number;
  targetX: number;
  targetY: number;
}

interface TrailParticle {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export class Animator {
  private lightBeams: LightBeam[] = [];
  private errorFlashes: Map<number, ErrorFlash> = new Map();
  private floatingParticles: FloatingParticle[] = [];
  private vortexParticles: VortexParticle[] = [];
  private soulBeast: SoulBeast | null = null;
  private trailParticles: TrailParticle[] = [];
  private crackProgress: number = 0;
  private victoryTextTimer: number = 0;
  private errorTextTimer: number = 0;
  private gridRotation: number = 0;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private orbPulseTime: number = 0;
  private isVictory: boolean = false;

  constructor(
    private p: p5,
    private width: number,
    private height: number
  ) {
    this.initFloatingParticles();
  }

  private initFloatingParticles(): void {
    for (let i = 0; i < 60; i++) {
      this.floatingParticles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.05 + Math.random() * 0.1
      });
    }
  }

  public addLightBeam(totem: Totem): void {
    this.lightBeams.push({
      totemId: totem.id,
      x: totem.x,
      baseY: totem.y + totem.height / 2,
      height: 0,
      color: ELEMENT_COLORS[totem.element],
      life: 0,
      maxLife: 0.5
    });
  }

  public addErrorFlash(totem: Totem): void {
    this.errorFlashes.set(totem.id, {
      totemId: totem.id,
      timer: 0,
      flashCount: 0,
      totalFlashes: 6
    });
    this.errorTextTimer = 0.8;
  }

  public triggerVictory(lastElement: ElementType): void {
    this.isVictory = true;
    this.crackProgress = 0;
    this.victoryTextTimer = 2;

    const centerX = this.width / 2;
    const centerY = this.height / 2 + 50;

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.vortexParticles.push({
        x: centerX,
        y: centerY,
        angle,
        radius: 10 + Math.random() * 20,
        speed: 2 + Math.random() * 3,
        size: 3 + Math.random() * 3,
        color: this.randomElementColor(),
        vy: -1 - Math.random() * 2,
        life: 0,
        maxLife: 2 + Math.random() * 1
      });
    }

    this.soulBeast = {
      x: centerX,
      y: centerY,
      color: ELEMENT_COLORS[lastElement],
      phase: 'emerging',
      timer: 0,
      spiralAngle: 0,
      spiralRadius: 0,
      targetX: this.width - 100,
      targetY: 100
    };
  }

  private randomElementColor(): string {
    const colors = Object.values(ELEMENT_COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
  }

  public update(dt: number, mouseX: number, mouseY: number): void {
    this.gridRotation += 0.001;

    this.updateFloatingParticles(dt);
    this.updateLightBeams(dt);
    this.updateErrorFlashes(dt);
    this.updateVortexParticles(dt);
    this.updateCrack(dt);

    if (this.errorTextTimer > 0) this.errorTextTimer -= dt;
    if (this.victoryTextTimer > 0) this.victoryTextTimer -= dt;
    if (this.isVictory) this.orbPulseTime += dt;

    this.updateSoulBeast(dt, mouseX, mouseY);
    this.updateTrailParticles(dt, mouseX, mouseY);

    this.prevMouseX = mouseX;
    this.prevMouseY = mouseY;
  }

  private updateFloatingParticles(dt: number): void {
    for (const p of this.floatingParticles) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;
    }
  }

  private updateLightBeams(dt: number): void {
    for (let i = this.lightBeams.length - 1; i >= 0; i--) {
      const beam = this.lightBeams[i];
      beam.life += dt;
      beam.height = Math.min(beam.life / 0.3, 1) * this.height;
      if (beam.life >= beam.maxLife) {
        this.lightBeams.splice(i, 1);
      }
    }
  }

  private updateErrorFlashes(dt: number): void {
    for (const [id, flash] of this.errorFlashes) {
      flash.timer += dt;
      flash.flashCount = Math.floor(flash.timer / (0.2 / 6));
      if (flash.timer >= 0.2) {
        this.errorFlashes.delete(id);
      }
    }
  }

  private updateVortexParticles(dt: number): void {
    for (let i = this.vortexParticles.length - 1; i >= 0; i--) {
      const p = this.vortexParticles[i];
      p.life += dt;
      p.angle += p.speed * dt;
      p.radius += 50 * dt;
      p.x = this.width / 2 + Math.cos(p.angle) * p.radius;
      p.y = this.height / 2 + 50 + Math.sin(p.angle) * p.radius * 0.5 + p.vy * p.life * 60;
      if (p.life >= p.maxLife) {
        this.vortexParticles.splice(i, 1);
      }
    }
  }

  private updateCrack(dt: number): void {
    if (this.isVictory && this.crackProgress < 1) {
      this.crackProgress = Math.min(1, this.crackProgress + dt);
    }
  }

  private updateSoulBeast(dt: number, mouseX: number, mouseY: number): void {
    if (!this.soulBeast) return;

    this.soulBeast.timer += dt;

    if (this.soulBeast.phase === 'emerging') {
      this.soulBeast.y -= 80 * dt;
      if (this.soulBeast.timer >= 1) {
        this.soulBeast.phase = 'flying';
        this.soulBeast.timer = 0;
      }
    } else if (this.soulBeast.phase === 'flying') {
      this.soulBeast.spiralAngle += 4 * dt;
      this.soulBeast.spiralRadius = 50 + this.soulBeast.timer * 100;
      const t = Math.min(this.soulBeast.timer / 3, 1);
      const baseX = this.p.lerp(this.width / 2, this.soulBeast.targetX, t);
      const baseY = this.p.lerp(this.height / 2 + 50 - 100, this.soulBeast.targetY, t);
      this.soulBeast.x = baseX + Math.cos(this.soulBeast.spiralAngle) * this.soulBeast.spiralRadius * (1 - t);
      this.soulBeast.y = baseY + Math.sin(this.soulBeast.spiralAngle) * this.soulBeast.spiralRadius * (1 - t);
      if (this.soulBeast.timer >= 3) {
        this.soulBeast.phase = 'orb';
        this.soulBeast.x = this.soulBeast.targetX;
        this.soulBeast.y = this.soulBeast.targetY;
      }
    } else if (this.soulBeast.phase === 'orb') {
      const targetX = mouseX + 30;
      const targetY = mouseY + 30;
      this.soulBeast.x = this.p.lerp(this.soulBeast.x, targetX, 0.15);
      this.soulBeast.y = this.p.lerp(this.soulBeast.y, targetY, 0.15);

      const dx = mouseX - this.prevMouseX;
      const dy = mouseY - this.prevMouseY;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 3 && this.trailParticles.length < 200) {
        for (let i = 0; i < 2; i++) {
          this.trailParticles.push({
            x: this.soulBeast.x + (Math.random() - 0.5) * 10,
            y: this.soulBeast.y + (Math.random() - 0.5) * 10,
            size: 2 + Math.random() * 2,
            color: this.soulBeast.color,
            alpha: 0.6,
            life: 0,
            maxLife: 0.3
          });
        }
      }
    }
  }

  private updateTrailParticles(dt: number, _mouseX: number, _mouseY: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life += dt;
      p.alpha = this.p.lerp(0.6, 0.1, p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.trailParticles.splice(i, 1);
      }
    }
  }

  public draw(totems: Totem[]): void {
    this.drawBackground();
    this.drawGrid();
    this.drawFloatingParticles();
    this.drawCrack();
    this.drawVortexParticles();

    for (const totem of totems) {
      this.drawTotemHalo(totem);
    }

    for (const totem of totems) {
      this.drawTotem(totems, totem);
    }

    this.drawLightBeams();
    this.drawSoulBeast();
    this.drawTrailParticles();
    this.drawErrorText();
    this.drawVictoryText();
  }

  private drawBackground(): void {
    const p = this.p;
    for (let y = 0; y < this.height; y += 20) {
      const t = y / this.height;
      const r = p.lerp(15, 5, t);
      const g = p.lerp(17, 7, t);
      const b = p.lerp(26, 10, t);
      p.stroke(r, g, b);
      p.strokeWeight(20);
      p.line(0, y, this.width, y);
    }
  }

  private drawGrid(): void {
    const p = this.p;
    p.push();
    p.translate(this.width / 2, this.height / 2);
    p.rotate(this.gridRotation);
    p.stroke(26, 32, 64);
    p.strokeWeight(1);
    p.noFill();
    const size = Math.max(this.width, this.height) * 2;
    const spacing = 40;
    for (let x = -size / 2; x <= size / 2; x += spacing) {
      p.line(x, -size / 2, x, size / 2);
    }
    for (let y = -size / 2; y <= size / 2; y += spacing) {
      p.line(-size / 2, y, size / 2, y);
    }
    p.pop();
  }

  private drawFloatingParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const pt of this.floatingParticles) {
      p.fill(255, 255, 255, pt.alpha * 255);
      p.ellipse(pt.x, pt.y, pt.size, pt.size);
    }
  }

  private drawCrack(): void {
    if (this.crackProgress <= 0) return;
    const p = this.p;
    const cx = this.width / 2;
    const cy = this.height / 2 + 50;
    const maxLen = 150 * this.crackProgress;

    p.stroke(180, 150, 80, 200);
    p.strokeWeight(2);
    p.noFill();

    this.drawCrackBranch(cx, cy, 0, maxLen, 1);
    this.drawCrackBranch(cx, cy, Math.PI / 2, maxLen, 1);
    this.drawCrackBranch(cx, cy, Math.PI, maxLen, 1);
    this.drawCrackBranch(cx, cy, -Math.PI / 2, maxLen, 1);
    this.drawCrackBranch(cx, cy, Math.PI / 4, maxLen * 0.7, 0.8);
    this.drawCrackBranch(cx, cy, 3 * Math.PI / 4, maxLen * 0.7, 0.8);
    this.drawCrackBranch(cx, cy, 5 * Math.PI / 4, maxLen * 0.7, 0.8);
    this.drawCrackBranch(cx, cy, 7 * Math.PI / 4, maxLen * 0.7, 0.8);
  }

  private drawCrackBranch(x: number, y: number, angle: number, length: number, _width: number): void {
    const p = this.p;
    const segments = 5;
    let cx = x;
    let cy = y;
    p.beginShape();
    p.vertex(cx, cy);
    for (let i = 0; i < segments; i++) {
      const t = (i + 1) / segments;
      const wobble = (Math.random() - 0.5) * 20 * t;
      const nx = x + Math.cos(angle + wobble * 0.05) * length * t;
      const ny = y + Math.sin(angle + wobble * 0.05) * length * t;
      cx = nx;
      cy = ny;
      p.vertex(cx, cy);
    }
    p.endShape();
  }

  private drawVortexParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const pt of this.vortexParticles) {
      const alpha = (1 - pt.life / pt.maxLife) * 255;
      p.fill(this.hexToRgb(pt.color, alpha));
      p.ellipse(pt.x, pt.y, pt.size, pt.size);
    }
  }

  private drawTotemHalo(totem: Totem): void {
    const p = this.p;
    const radius = totem.isActivated ? 80 : 60;
    const color = totem.isActivated ? ELEMENT_COLORS[totem.element] : '#ffffff';
    const alpha = totem.isActivated ? 30 : 15;

    p.push();
    for (let r = radius; r > 0; r -= 5) {
      const a = alpha * (1 - r / radius);
      p.noStroke();
      p.fill(this.hexToRgb(color, a));
      p.ellipse(totem.x, totem.y, r * 2, r * 2);
    }
    p.pop();
  }

  private drawTotem(_totems: Totem[], totem: Totem): void {
    const p = this.p;
    const y = totem.y + totem.pressOffset;

    const flash = this.errorFlashes.get(totem.id);
    const isFlashing = flash ? flash.flashCount % 2 === 0 : false;

    p.push();
    p.noStroke();

    if (isFlashing) {
      p.fill(255, 50, 50, 220);
    } else {
      p.fill(70, 70, 80);
    }
    p.rect(totem.x - totem.width / 2, y - totem.height / 2, totem.width, totem.height, 4);

    p.fill(50, 50, 60);
    p.rect(totem.x - totem.width / 2, y + totem.height / 2 - 15, totem.width, 15, 4);

    const symbolColor = totem.isActivated ? ELEMENT_COLORS[totem.element] : '#ffffff';
    const symbolAlpha = totem.isActivated ? 255 : 100;

    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(40);
    p.fill(this.hexToRgb(symbolColor, symbolAlpha));
    p.text(ELEMENT_SYMBOLS[totem.element], totem.x, y - totem.height / 2 + 35);

    p.pop();
  }

  private drawLightBeams(): void {
    const p = this.p;
    for (const beam of this.lightBeams) {
      const progress = beam.life / beam.maxLife;
      const alpha = (1 - progress) * 255;
      p.push();
      p.noStroke();
      for (let i = 0; i < beam.height; i += 4) {
        const yAlpha = alpha * (1 - i / beam.height);
        p.fill(this.hexToRgb(beam.color, yAlpha));
        p.rect(beam.x - 3, beam.baseY - i, 6, 4);
      }
      p.pop();
    }
  }

  private drawSoulBeast(): void {
    if (!this.soulBeast) return;
    const p = this.p;

    if (this.soulBeast.phase === 'emerging' || this.soulBeast.phase === 'flying') {
      this.drawStar(this.soulBeast.x, this.soulBeast.y, 30, this.soulBeast.color, this.soulBeast.phase === 'flying' ? this.soulBeast.timer * 3 : 0);
    } else if (this.soulBeast.phase === 'orb') {
      const pulse = 20 + Math.sin(this.orbPulseTime * (Math.PI * 2 / 1.2)) * 2;
      p.push();
      p.noStroke();
      for (let r = pulse + 15; r > 0; r -= 3) {
        const a = 15 * (1 - r / (pulse + 15));
        p.fill(this.hexToRgb(this.soulBeast.color, a));
        p.ellipse(this.soulBeast.x, this.soulBeast.y, r * 2, r * 2);
      }
      p.fill(this.hexToRgb(this.soulBeast.color, 230));
      p.ellipse(this.soulBeast.x, this.soulBeast.y, pulse, pulse);
      p.fill(255, 255, 255, 200);
      p.ellipse(this.soulBeast.x, this.soulBeast.y, pulse * 0.4, pulse * 0.4);
      p.pop();
    }
  }

  private drawStar(x: number, y: number, radius: number, color: string, rotation: number): void {
    const p = this.p;
    p.push();
    p.translate(x, y);
    p.rotate(rotation);
    p.noStroke();

    for (let r = radius + 20; r > 0; r -= 4) {
      const a = 12 * (1 - r / (radius + 20));
      p.fill(this.hexToRgb(color, a));
      this.drawStarShape(r, r * 0.5, 5);
    }

    p.fill(this.hexToRgb(color, 220));
    this.drawStarShape(radius, radius * 0.5, 5);
    p.fill(255, 255, 255, 180);
    this.drawStarShape(radius * 0.4, radius * 0.2, 5);
    p.pop();
  }

  private drawStarShape(outer: number, inner: number, points: number): void {
    const p = this.p;
    p.beginShape();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outer : inner;
      p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    p.endShape(p.CLOSE);
  }

  private drawTrailParticles(): void {
    const p = this.p;
    p.noStroke();
    for (const pt of this.trailParticles) {
      p.fill(this.hexToRgb(pt.color, pt.alpha * 255));
      p.ellipse(pt.x, pt.y, pt.size, pt.size);
    }
  }

  private drawErrorText(): void {
    if (this.errorTextTimer <= 0) return;
    const p = this.p;
    const alpha = Math.min(1, this.errorTextTimer / 0.5) * 255;
    p.push();
    p.fill(255, 255, 255, alpha);
    p.textSize(16);
    p.textAlign(p.CENTER, p.TOP);
    p.text('顺序错误！序列已重置', this.width / 2, 30);
    p.pop();
  }

  private drawVictoryText(): void {
    if (this.victoryTextTimer <= 0) return;
    const p = this.p;
    const t = 1 - this.victoryTextTimer / 2;
    const scale = 0.5 + t * 0.5;
    const alpha = this.victoryTextTimer > 1 ? 255 : (this.victoryTextTimer / 1) * 255;

    p.push();
    p.translate(this.width / 2, this.height / 2 - 50);
    p.scale(scale);
    p.fill(this.hexToRgb('#ffdd88', alpha));
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('魂兽已唤醒！', 0, 0);
    p.pop();
  }

  private hexToRgb(hex: string, alpha: number): p5.Color {
    const p = this.p;
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return p.color(r, g, b, alpha);
  }
}

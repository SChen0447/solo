import p5 from 'p5';
import { Particle } from './particle';

export interface Glow {
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  life: number;
}

export interface Meteor {
  x: number;
  y: number;
  angle: number;
  length: number;
  progress: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
}

export class Renderer {
  private p: p5;
  private bottleX: number;
  private bottleY: number;
  private bottleWidth: number;
  private bottleHeight: number;
  private floatOffset: number = 0;
  private isHovering: boolean = false;
  private hoverStart: number = 0;
  stars: Star[] = [];

  constructor(p: p5, bottleX: number, bottleY: number, width: number, height: number) {
    this.p = p;
    this.bottleX = bottleX;
    this.bottleY = bottleY;
    this.bottleWidth = width;
    this.bottleHeight = height;
    this.generateStars();
  }

  private generateStars(): void {
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.p.width,
        y: Math.random() * this.p.height,
        size: 1 + Math.random(),
        alpha: 0.3 + Math.random() * 0.5
      });
    }
  }

  setBottlePosition(x: number, y: number): void {
    this.bottleX = x;
    this.bottleY = y;
  }

  setHovering(hovering: boolean): void {
    if (hovering && !this.isHovering) {
      this.hoverStart = this.p.millis();
    }
    this.isHovering = hovering;
  }

  drawBackground(): void {
    const p = this.p;
    for (const star of this.stars) {
      p.noStroke();
      p.fill(255, 255, 255, star.alpha * 255);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  }

  drawMeteors(meteors: Meteor[]): void {
    const p = this.p;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      const progress = m.progress;
      const alpha = Math.sin(progress * Math.PI);
      const currentLen = m.length * progress;
      const startX = m.x + Math.cos(m.angle) * (currentLen - m.length);
      const startY = m.y + Math.sin(m.angle) * (currentLen - m.length);
      const endX = m.x + Math.cos(m.angle) * currentLen;
      const endY = m.y + Math.sin(m.angle) * currentLen;

      p.noFill();
      p.stroke(255, 255, 255, alpha * 255);
      p.strokeWeight(4);
      p.strokeCap(p.ROUND);

      p.beginShape();
      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const x = p.lerp(startX, endX, t);
        const y = p.lerp(startY, endY, t) + Math.sin(t * Math.PI * 2) * 3;
        p.vertex(x, y);
      }
      p.endShape();
      p.noStroke();
    }
  }

  drawBottle(time: number): void {
    const p = this.p;

    if (this.isHovering) {
      const elapsed = (time - this.hoverStart) / 1000;
      this.floatOffset = Math.sin(elapsed * Math.PI) * 3;
    } else {
      this.floatOffset *= 0.9;
    }

    const x = this.bottleX;
    const y = this.bottleY + this.floatOffset;
    const w = this.bottleWidth;
    const h = this.bottleHeight;
    const radius = 30;

    p.push();
    p.noFill();
    p.stroke(255, 255, 255, 120);
    p.strokeWeight(2);
    p.rect(x, y, w, h, radius, radius, radius, radius);
    p.pop();

    const innerX = x + 2;
    const innerY = y + 2;
    const innerW = w - 4;
    const innerH = h - 4;

    p.push();
    const gradient = p.drawingContext.createRadialGradient(
      innerX + innerW / 2, innerY + innerH / 2, 0,
      innerX + innerW / 2, innerY + innerH / 2, Math.max(innerW, innerH) / 1.5
    );
    gradient.addColorStop(0, '#0b0e2a');
    gradient.addColorStop(1, '#1a0d1a');
    p.drawingContext.fillStyle = gradient;
    p.noStroke();
    p.rect(innerX, innerY, innerW, innerH, radius - 2, radius - 2, radius - 2, radius - 2);
    p.pop();

    p.push();
    const glowGradient = p.drawingContext.createRadialGradient(
      innerX + innerW / 2, innerY + innerH - 40, 0,
      innerX + innerW / 2, innerY + innerH - 40, innerW / 2
    );
    glowGradient.addColorStop(0, 'rgba(100, 150, 255, 0.08)');
    glowGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    p.drawingContext.fillStyle = glowGradient;
    p.noStroke();
    p.ellipse(innerX + innerW / 2, innerY + innerH - 30, innerW * 0.8, 80);
    p.pop();

    this.drawCork(x + w / 2, y);
  }

  private drawCork(cx: number, cy: number): void {
    const p = this.p;

    p.push();
    p.noStroke();
    p.fill(139, 90, 43, 180);
    p.ellipse(cx, cy, 60, 40);
    p.pop();

    p.push();
    p.stroke(100, 60, 30, 100);
    p.strokeWeight(0.5);
    for (let i = -25; i <= 25; i += 5) {
      const offset = Math.sin(i * 0.5) * 2;
      p.line(cx + i, cy - 10 + offset, cx + i - 3, cy + 10 + offset);
    }
    p.pop();
  }

  drawParticles(particles: Particle[]): void {
    const p = this.p;

    for (const particle of particles) {
      if (!particle.isAlive()) continue;

      if (particle.exploding) {
        const alpha = 255 * (1 - particle.explodeProgress);
        const scale = 1 + particle.explodeProgress * 2;
        const r = particle.radius * scale;

        p.push();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + particle.explodeProgress * 3;
          const dist = particle.explodeProgress * 40;
          const px = particle.x + Math.cos(angle) * dist;
          const py = particle.y + Math.sin(angle) * dist;
          p.noStroke();
          p.fill(this.hexToRgb(particle.color, alpha / 255));
          p.ellipse(px, py, r * 0.3, r * 0.3);
        }
        p.pop();
        continue;
      }

      this.drawParticle(particle);
    }
  }

  private drawParticle(particle: Particle): void {
    const p = this.p;

    p.push();
    p.noStroke();
    p.fill(this.hexToRgb(particle.color, 1));
    p.ellipse(particle.x, particle.y, particle.radius * 2, particle.radius * 2);

    for (const noise of particle.noiseTexture) {
      p.fill(255, 255, 255, noise.alpha * 255);
      p.ellipse(particle.x + noise.x, particle.y + noise.y, 1.5, 1.5);
    }

    p.fill(255, 255, 255, 80);
    p.ellipse(
      particle.x - particle.radius * 0.3,
      particle.y - particle.radius * 0.3,
      particle.radius * 0.4,
      particle.radius * 0.4
    );
    p.pop();
  }

  drawGlows(glows: Glow[]): void {
    const p = this.p;
    for (let i = glows.length - 1; i >= 0; i--) {
      const g = glows[i];
      const currentRadius = g.maxRadius * g.life;
      const alpha = 0.8 * (1 - g.life);

      p.push();
      const gradient = p.drawingContext.createRadialGradient(g.x, g.y, 0, g.x, g.y, currentRadius);
      gradient.addColorStop(0, this.hexToRgbaStr(g.color, alpha));
      gradient.addColorStop(1, this.hexToRgbaStr(g.color, 0));
      p.drawingContext.fillStyle = gradient;
      p.noStroke();
      p.ellipse(g.x, g.y, currentRadius * 2, currentRadius * 2);
      p.pop();
    }
  }

  drawUI(count: number, isButtonHovered: boolean): void {
    const p = this.p;
    const x = this.bottleX;
    const y = this.bottleY;
    const w = this.bottleWidth;
    const h = this.bottleHeight;

    p.push();
    p.noStroke();
    p.fill(255);
    p.textSize(16);
    p.textFont('Jura');
    p.textAlign(p.LEFT, p.BOTTOM);
    p.text(`${count} / 50`, x + 15, y + h - 15);
    p.pop();

    const buttonX = x + w - 30;
    const buttonY = y + h - 30;
    const buttonRadius = 15;

    p.push();
    p.noStroke();
    if (isButtonHovered) {
      p.fill(255, 102, 136);
    } else {
      p.fill(255, 68, 102);
    }
    p.ellipse(buttonX, buttonY, buttonRadius * 2, buttonRadius * 2);

    p.stroke(255, 255, 255, 200);
    p.strokeWeight(2);
    p.strokeCap(p.ROUND);
    p.line(buttonX - 6, buttonY - 6, buttonX + 6, buttonY + 6);
    p.line(buttonX + 6, buttonY - 6, buttonX - 6, buttonY + 6);
    p.pop();
  }

  isPointInBottle(px: number, py: number): boolean {
    return (
      px >= this.bottleX &&
      px <= this.bottleX + this.bottleWidth &&
      py >= this.bottleY &&
      py <= this.bottleY + this.bottleHeight
    );
  }

  isPointInButton(px: number, py: number): boolean {
    const buttonX = this.bottleX + this.bottleWidth - 30;
    const buttonY = this.bottleY + this.bottleHeight - 30;
    const dx = px - buttonX;
    const dy = py - buttonY;
    return Math.sqrt(dx * dx + dy * dy) <= 15;
  }

  private hexToRgb(hex: string, alpha: number): p5.Color {
    const p = this.p;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return p.color(r, g, b, alpha * 255);
  }

  private hexToRgbaStr(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

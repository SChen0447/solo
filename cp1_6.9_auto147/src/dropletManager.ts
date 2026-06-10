import p5 from 'p5';
import { Droplet, RGBColor, Particle, LightPulse } from './droplet';

export class DropletManager {
  private droplets: Droplet[] = [];
  private particles: Particle[] = [];
  private lightPulses: LightPulse[] = [];
  private pendingDroplets: { x: number; y: number; color: RGBColor | null }[] = [];

  private lampCenterX: number = 0;
  private lampCenterY: number = 0;
  private lampWidth: number = 300;
  private lampHeight: number = 600;
  private lampLeft: number = 0;
  private lampRight: number = 0;
  private lampTop: number = 0;
  private lampBottom: number = 0;
  private heatPlateTop: number = 0;
  private heatPlateHeight: number = 30;

  private temperature: number = 5;
  private selectedColor: RGBColor | null = null;

  private bgTopColor: RGBColor = { r: 10, g: 14, b: 26 };
  private bgBottomColor: RGBColor = { r: 26, g: 42, b: 58 };
  private targetBgTopColor: RGBColor = { r: 10, g: 14, b: 26 };
  private targetBgBottomColor: RGBColor = { r: 26, g: 42, b: 58 };
  private bgTransitionTimer: number = 0;

  private paletteX: number = 0;
  private paletteY: number = 0;
  private paletteRadius: number = 30;
  private paletteHovered: boolean = false;

  private sliderX: number = 0;
  private sliderY: number = 0;
  private sliderWidth: number = 200;
  private sliderHeight: number = 6;
  private sliderDragging: boolean = false;
  private sliderHovered: boolean = false;

  private resetBtnX: number = 0;
  private resetBtnY: number = 0;
  private resetBtnWidth: number = 100;
  private resetBtnHeight: number = 36;
  private resetBtnHovered: boolean = false;

  private pulseTime: number = 0;
  private time: number = 0;

  private scale: number = 1;

  private static readonly MAX_DROPLETS = 50;

  constructor() {}

  public setup(p: p5): void {
    this.updateDimensions(p);
  }

  private updateDimensions(p: p5): void {
    const minDim = Math.min(p.width, p.height);
    const maxContainerW = Math.min(900, p.width * 0.9);

    let baseWidth = 300;
    let baseHeight = 600;

    if (p.width < 1024) {
      baseWidth = p.width * 0.8;
      baseHeight = baseWidth * 2;
    }

    const maxH = p.height * 0.75;
    if (baseHeight > maxH) {
      baseHeight = maxH;
      baseWidth = baseHeight / 2;
    }

    if (baseWidth > maxContainerW) {
      baseWidth = maxContainerW;
      baseHeight = baseWidth * 2;
    }

    this.scale = baseWidth / 300;
    this.lampWidth = baseWidth;
    this.lampHeight = baseHeight;
    this.lampCenterX = p.width / 2;
    this.lampCenterY = p.height / 2 - 20 * this.scale;

    this.lampLeft = this.lampCenterX - this.lampWidth / 2;
    this.lampRight = this.lampCenterX + this.lampWidth / 2;
    this.lampTop = this.lampCenterY - this.lampHeight / 2;
    this.lampBottom = this.lampCenterY + this.lampHeight / 2;
    this.heatPlateHeight = 30 * this.scale;
    this.heatPlateTop = this.lampBottom - this.heatPlateHeight - 10 * this.scale;

    this.paletteRadius = 30 * this.scale;
    this.paletteX = this.lampRight + 60 * this.scale;
    this.paletteY = this.lampCenterY;

    this.sliderWidth = 200 * this.scale;
    this.sliderHeight = 6 * this.scale;
    this.sliderX = this.lampCenterX - this.sliderWidth / 2;
    this.sliderY = this.lampBottom + 50 * this.scale;

    this.resetBtnWidth = 100 * this.scale;
    this.resetBtnHeight = 36 * this.scale;
    this.resetBtnX = this.lampRight - this.resetBtnWidth;
    this.resetBtnY = this.lampBottom + 40 * this.scale;
  }

  public windowResized(p: p5): void {
    this.updateDimensions(p);
  }

  public update(p: p5): void {
    this.time++;
    this.pulseTime = (Math.sin(this.time * (Math.PI * 2) / 180) + 1) / 2;

    this.processPendingDroplets();

    const newDroplets: Droplet[] = [];
    const toRemove = new Set<number>();

    for (let i = 0; i < this.droplets.length; i++) {
      if (toRemove.has(i)) continue;

      const droplet = this.droplets[i];
      const children = droplet.update(
        p,
        this.lampLeft + 5,
        this.lampRight - 5,
        this.lampTop,
        this.lampBottom,
        this.heatPlateTop,
        this.getTemperatureMultiplier(),
        (x: number, y: number, color: RGBColor) => this.spawnSplitParticles(x, y, color),
        (x: number, y: number) => this.spawnGoldenSplit(x, y)
      );

      if (children) {
        toRemove.add(i);
        newDroplets.push(...children);
      }
    }

    this.droplets = this.droplets.filter((_, i) => !toRemove.has(i));
    this.droplets.push(...newDroplets);

    this.checkCollisions();

    this.updateParticles();
    this.updateLightPulses();
    this.updateBackgroundTransition();
  }

  private processPendingDroplets(): void {
    while (this.pendingDroplets.length > 0 && this.droplets.length < DropletManager.MAX_DROPLETS) {
      const pending = this.pendingDroplets.shift()!;
      const radius = 8 + Math.random() * 8;
      const droplet = new Droplet(pending.x, pending.y, radius * this.scale, pending.color || undefined);
      this.droplets.push(droplet);
    }
  }

  private getTemperatureMultiplier(): number {
    return 1 + (this.temperature - 5) * 0.1;
  }

  private checkCollisions(): void {
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < this.droplets.length; i++) {
        for (let j = i + 1; j < this.droplets.length; j++) {
          if (this.droplets[i].collidesWith(this.droplets[j])) {
            const d1 = this.droplets[i];
            const d2 = this.droplets[j];
            const mergedDroplet = d1.merge(d2);
            this.spawnMergePulse(
              (d1.x + d2.x) / 2,
              (d1.y + d2.y) / 2,
              mergedDroplet.color
            );
            this.setTargetBackgroundColor(mergedDroplet.color);
            this.droplets.splice(j, 1);
            this.droplets.splice(i, 1);
            this.droplets.push(mergedDroplet);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
    }
  }

  private spawnSplitParticles(x: number, y: number, color: RGBColor): void {
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        size: (2 + Math.random() * 2) * this.scale,
        color: { ...color }
      });
    }
  }

  private spawnGoldenSplit(x: number, y: number): void {
    this.lightPulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 60 * this.scale,
      life: 48,
      maxLife: 48,
      color: { r: 255, g: 221, b: 68 },
      type: 'golden'
    });
  }

  private spawnMergePulse(x: number, y: number, color: RGBColor): void {
    this.lightPulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 50 * this.scale,
      life: 60,
      maxLife: 60,
      color: { ...color },
      type: 'merge'
    });
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.05;
      particle.life--;
      if (particle.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateLightPulses(): void {
    for (let i = this.lightPulses.length - 1; i >= 0; i--) {
      const pulse = this.lightPulses[i];
      pulse.life--;
      pulse.radius = pulse.maxRadius * (1 - pulse.life / pulse.maxLife);
      if (pulse.life <= 0) {
        this.lightPulses.splice(i, 1);
      }
    }
  }

  private setTargetBackgroundColor(color: RGBColor): void {
    const factor = 0.15;
    this.targetBgTopColor = {
      r: this.bgTopColor.r * (1 - factor) + color.r * factor * 0.3,
      g: this.bgTopColor.g * (1 - factor) + color.g * factor * 0.3,
      b: this.bgTopColor.b * (1 - factor) + color.b * factor * 0.3
    };
    this.targetBgBottomColor = {
      r: this.bgBottomColor.r * (1 - factor) + color.r * factor * 0.2,
      g: this.bgBottomColor.g * (1 - factor) + color.g * factor * 0.2,
      b: this.bgBottomColor.b * (1 - factor) + color.b * factor * 0.2
    };
  }

  private updateBackgroundTransition(): void {
    this.bgTransitionTimer++;
    if (this.bgTransitionTimer >= 30) {
      this.bgTransitionTimer = 0;
      const factor = 0.1;
      this.bgTopColor = {
        r: this.bgTopColor.r * (1 - factor) + this.targetBgTopColor.r * factor,
        g: this.bgTopColor.g * (1 - factor) + this.targetBgTopColor.g * factor,
        b: this.bgTopColor.b * (1 - factor) + this.targetBgTopColor.b * factor
      };
      this.bgBottomColor = {
        r: this.bgBottomColor.r * (1 - factor) + this.targetBgBottomColor.r * factor,
        g: this.bgBottomColor.g * (1 - factor) + this.targetBgBottomColor.g * factor,
        b: this.bgBottomColor.b * (1 - factor) + this.targetBgBottomColor.b * factor
      };
    }
  }

  public draw(p: p5): void {
    this.drawLampContainer(p);
    this.drawHeatPlate(p);
    this.drawHeatGlow(p);

    for (const droplet of this.droplets) {
      droplet.draw(p);
    }

    this.drawParticles(p);
    this.drawLightPulses(p);

    this.drawCounter(p);
    this.drawPalette(p);
    this.drawSlider(p);
    this.drawResetButton(p);
  }

  private drawLampContainer(p: p5): void {
    const ctx = p.drawingContext;
    const w = this.lampWidth;
    const h = this.lampHeight;
    const cx = this.lampCenterX;
    const topY = this.lampTop;
    const bottomY = this.lampBottom;

    p.push();

    ctx.shadowColor = 'rgba(68, 136, 255, 0.3)';
    ctx.shadowBlur = 20 * this.scale;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY + 30 * this.scale);
    ctx.bezierCurveTo(
      cx - w / 2 - 10 * this.scale, topY + h * 0.2,
      cx - w / 2 - 15 * this.scale, topY + h * 0.8,
      cx - w / 2 + 5 * this.scale, bottomY - 30 * this.scale
    );
    ctx.quadraticCurveTo(cx, bottomY, cx + w / 2 - 5 * this.scale, bottomY - 30 * this.scale);
    ctx.bezierCurveTo(
      cx + w / 2 + 15 * this.scale, topY + h * 0.8,
      cx + w / 2 + 10 * this.scale, topY + h * 0.2,
      cx + w / 2, topY + 30 * this.scale
    );
    ctx.bezierCurveTo(cx + w / 2 - 10 * this.scale, topY, cx - w / 2 + 10 * this.scale, topY, cx - w / 2, topY + 30 * this.scale);
    ctx.closePath();

    ctx.save();
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, topY, 0, bottomY);
    gradient.addColorStop(0, `rgb(${this.bgTopColor.r}, ${this.bgTopColor.g}, ${this.bgTopColor.b})`);
    gradient.addColorStop(1, `rgb(${this.bgBottomColor.r}, ${this.bgBottomColor.g}, ${this.bgBottomColor.b})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - w / 2 - 20, topY - 20, w + 40, h + 40);

    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(204, 204, 204, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();

    p.pop();
  }

  private drawHeatPlate(p: p5): void {
    const plateWidth = this.lampWidth * 0.8;
    const plateHeight = this.heatPlateHeight;
    const plateX = this.lampCenterX - plateWidth / 2;
    const plateY = this.heatPlateTop + this.pulseTime * 3 * this.scale;

    p.push();
    p.noStroke();
    p.fill(68, 34, 0, 180);
    p.rect(plateX, plateY, plateWidth, plateHeight, 4 * this.scale);

    p.fill(100, 60, 20, 100);
    p.rect(plateX + 5 * this.scale, plateY + 2 * this.scale, plateWidth - 10 * this.scale, plateHeight * 0.3, 2 * this.scale);
    p.pop();
  }

  private drawHeatGlow(p: p5): void {
    const ctx = p.drawingContext;
    const plateWidth = this.lampWidth * 0.8;
    const glowY = this.heatPlateTop;
    const glowHeight = 80 * this.scale;
    const w = this.lampWidth;
    const h = this.lampHeight;
    const cx = this.lampCenterX;
    const topY = this.lampTop;
    const bottomY = this.lampBottom;

    p.push();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, topY + 30 * this.scale);
    ctx.bezierCurveTo(
      cx - w / 2 - 10 * this.scale, topY + h * 0.2,
      cx - w / 2 - 15 * this.scale, topY + h * 0.8,
      cx - w / 2 + 5 * this.scale, bottomY - 30 * this.scale
    );
    ctx.quadraticCurveTo(cx, bottomY, cx + w / 2 - 5 * this.scale, bottomY - 30 * this.scale);
    ctx.bezierCurveTo(
      cx + w / 2 + 15 * this.scale, topY + h * 0.8,
      cx + w / 2 + 10 * this.scale, topY + h * 0.2,
      cx + w / 2, topY + 30 * this.scale
    );
    ctx.bezierCurveTo(cx + w / 2 - 10 * this.scale, topY, cx - w / 2 + 10 * this.scale, topY, cx - w / 2, topY + 30 * this.scale);
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createRadialGradient(
      this.lampCenterX, glowY, 0,
      this.lampCenterX, glowY, 100 * this.scale
    );
    gradient.addColorStop(0, `rgba(255, 102, 0, ${0.25 + this.pulseTime * 0.15})`);
    gradient.addColorStop(1, 'rgba(255, 102, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(this.lampCenterX - plateWidth, glowY - glowHeight, plateWidth * 2, glowHeight * 2);

    ctx.restore();

    p.pop();
  }

  private drawParticles(p: p5): void {
    for (const particle of this.particles) {
      const alpha = (particle.life / particle.maxLife) * 255;
      p.push();
      p.noStroke();
      p.fill(particle.color.r, particle.color.g, particle.color.b, alpha);
      p.ellipse(particle.x, particle.y, particle.size * 2, particle.size * 2);
      p.pop();
    }
  }

  private drawLightPulses(p: p5): void {
    for (const pulse of this.lightPulses) {
      const alpha = (pulse.life / pulse.maxLife);
      p.push();
      p.noFill();

      if (pulse.type === 'merge') {
        const gradient = p.drawingContext.createRadialGradient(
          pulse.x, pulse.y, 0,
          pulse.x, pulse.y, pulse.radius
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.6})`);
        gradient.addColorStop(0.5, `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, ${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${pulse.color.r}, ${pulse.color.g}, ${pulse.color.b}, 0)`);
        p.drawingContext.fillStyle = gradient;
        p.ellipse(pulse.x, pulse.y, pulse.radius * 2, pulse.radius * 2);
      } else if (pulse.type === 'golden') {
        const gradient = p.drawingContext.createRadialGradient(
          pulse.x, pulse.y, 0,
          pulse.x, pulse.y, pulse.radius
        );
        gradient.addColorStop(0, `rgba(255, 221, 68, ${alpha * 0.7})`);
        gradient.addColorStop(1, 'rgba(255, 221, 68, 0)');
        p.drawingContext.fillStyle = gradient;
        p.ellipse(pulse.x, pulse.y, pulse.radius * 2, pulse.radius * 2);
      }

      p.pop();
    }
  }

  private drawCounter(p: p5): void {
    const x = this.lampLeft + 12 * this.scale;
    const y = this.lampTop + 20 * this.scale;

    p.push();
    p.textFont('Courier New');
    p.textSize(14 * this.scale);
    p.textAlign(p.LEFT, p.TOP);
    p.fill(0, 0, 0, 80);
    p.text(`液滴: ${this.droplets.length}${this.pendingDroplets.length > 0 ? ` (+${this.pendingDroplets.length})` : ''}`, x + 1, y + 1);
    p.fill(255, 255, 255, 255);
    p.text(`液滴: ${this.droplets.length}${this.pendingDroplets.length > 0 ? ` (+${this.pendingDroplets.length})` : ''}`, x, y);
    p.pop();
  }

  private drawPalette(p: p5): void {
    const x = this.paletteX;
    const y = this.paletteY;
    const r = this.paletteRadius;

    p.push();

    if (this.paletteHovered) {
      p.drawingContext.shadowColor = 'rgba(255, 255, 255, 0.3)';
      p.drawingContext.shadowBlur = 15;
    }

    for (let i = 0; i < 360; i += 3) {
      const startAngle = p.radians(i);
      const endAngle = p.radians(i + 4);
      const color = p.color(`hsl(${i}, 80%, 60%)`);
      p.noStroke();
      p.fill(color);
      p.arc(x, y, r * 2, r * 2, startAngle, endAngle, p.PIE);
    }

    p.drawingContext.shadowBlur = 0;

    p.noStroke();
    if (this.selectedColor) {
      p.fill(this.selectedColor.r, this.selectedColor.g, this.selectedColor.b);
    } else {
      p.fill(40, 40, 50);
    }
    p.ellipse(x, y, r * 1.1, r * 1.1);

    p.fill(255, 255, 255, 200);
    p.ellipse(x, y, r * 0.9, r * 0.9);

    if (this.selectedColor) {
      p.fill(this.selectedColor.r, this.selectedColor.g, this.selectedColor.b);
      p.ellipse(x, y, r * 0.7, r * 0.7);
    } else {
      p.fill(255, 255, 255, 50);
      p.textAlign(p.CENTER, p.CENTER);
      p.textSize(10 * this.scale);
      p.noStroke();
      p.fill(100, 100, 110);
      p.text('随机', x, y);
    }

    p.textSize(11 * this.scale);
    p.textAlign(p.CENTER, p.TOP);
    p.noStroke();
    p.fill(224, 224, 224);
    p.text('调色盘', x, y + r + 8 * this.scale);

    p.pop();
  }

  private drawSlider(p: p5): void {
    const ctx = p.drawingContext;
    const x = this.sliderX;
    const y = this.sliderY;
    const w = this.sliderWidth;
    const h = this.sliderHeight;
    const knobSize = (this.sliderHovered ? 20 : 16) * this.scale;
    const radius = 3 * this.scale;

    const knobX = x + ((this.temperature - 1) / 9) * w;

    p.push();

    p.noStroke();
    p.fill(51, 51, 51);
    p.rect(x, y - h / 2, w, h, radius);

    ctx.save();
    ctx.beginPath();
    const fillW = Math.max(0, knobX - x + knobSize / 2);
    ctx.moveTo(x + radius, y - h / 2);
    ctx.lineTo(x + fillW - radius, y - h / 2);
    ctx.quadraticCurveTo(x + fillW, y - h / 2, x + fillW, y - h / 2 + radius);
    ctx.lineTo(x + fillW, y + h / 2 - radius);
    ctx.quadraticCurveTo(x + fillW, y + h / 2, x + fillW - radius, y + h / 2);
    ctx.lineTo(x + radius, y + h / 2);
    ctx.quadraticCurveTo(x, y + h / 2, x, y + h / 2 - radius);
    ctx.lineTo(x, y - h / 2 + radius);
    ctx.quadraticCurveTo(x, y - h / 2, x + radius, y - h / 2);
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, '#ff4466');
    gradient.addColorStop(1, '#4488ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y - h / 2, w, h);

    ctx.restore();

    p.noStroke();
    p.fill(255, 255, 255);
    if (this.sliderHovered || this.sliderDragging) {
      ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
      ctx.shadowBlur = 8;
    }
    p.ellipse(knobX, y, knobSize, knobSize);
    ctx.shadowBlur = 0;

    p.textSize(11 * this.scale);
    p.textAlign(p.CENTER, p.TOP);
    p.fill(224, 224, 224);
    p.text(`温度: ${this.temperature}`, x + w / 2, y + 15 * this.scale);

    p.pop();
  }

  private drawResetButton(p: p5): void {
    const x = this.resetBtnX;
    const y = this.resetBtnY;
    const w = this.resetBtnWidth;
    const h = this.resetBtnHeight;

    p.push();

    if (this.resetBtnHovered) {
      p.noStroke();
      p.fill(68, 136, 255, 80);
      p.rect(x, y, w, h, 6 * this.scale);
    }

    p.noFill();
    p.stroke(224, 224, 224, 150);
    p.strokeWeight(1);
    p.rect(x, y, w, h, 6 * this.scale);

    p.noStroke();
    p.fill(224, 224, 224);
    p.textSize(13 * this.scale);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('重置', x + w / 2, y + h / 2);

    p.pop();
  }

  public mousePressed(p: p5): void {
    if (this.isInsideLamp(p.mouseX, p.mouseY)) {
      if (this.droplets.length + this.pendingDroplets.length < DropletManager.MAX_DROPLETS) {
        const color = this.selectedColor ? { ...this.selectedColor } : null;
        this.pendingDroplets.push({ x: p.mouseX, y: p.mouseY, color });
      } else {
        this.pendingDroplets.push({ x: p.mouseX, y: p.mouseY, color: this.selectedColor ? { ...this.selectedColor } : null });
      }
      return;
    }

    if (this.isInsidePalette(p.mouseX, p.mouseY)) {
      const dx = p.mouseX - this.paletteX;
      const dy = p.mouseY - this.paletteY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > this.paletteRadius * 0.4 && dist < this.paletteRadius * 1.1) {
        const angle = Math.atan2(dy, dx);
        let hue = (angle * 180 / Math.PI + 360) % 360;
        const col = p.color(`hsl(${hue}, 80%, 60%)`);
        this.selectedColor = {
          r: p.red(col),
          g: p.green(col),
          b: p.blue(col)
        };
      } else if (dist <= this.paletteRadius * 0.4) {
        this.selectedColor = null;
      }
      return;
    }

    if (this.isInsideSlider(p.mouseX, p.mouseY)) {
      this.sliderDragging = true;
      this.updateTemperatureFromMouse(p.mouseX);
      return;
    }

    if (this.isInsideResetButton(p.mouseX, p.mouseY)) {
      this.reset();
      return;
    }
  }

  public mouseDragged(p: p5): void {
    if (this.sliderDragging) {
      this.updateTemperatureFromMouse(p.mouseX);
    }
  }

  public mouseReleased(): void {
    this.sliderDragging = false;
  }

  public mouseMoved(p: p5): void {
    this.paletteHovered = this.isInsidePalette(p.mouseX, p.mouseY);
    this.sliderHovered = this.isInsideSliderKnob(p.mouseX, p.mouseY);
    this.resetBtnHovered = this.isInsideResetButton(p.mouseX, p.mouseY);
  }

  private updateTemperatureFromMouse(mouseX: number): void {
    const ratio = (mouseX - this.sliderX) / this.sliderWidth;
    this.temperature = Math.max(1, Math.min(10, Math.round(1 + ratio * 9)));
  }

  private isInsideLamp(x: number, y: number): boolean {
    if (x < this.lampLeft || x > this.lampRight) return false;
    if (y < this.lampTop || y > this.lampBottom) return false;
    return true;
  }

  private isInsidePalette(x: number, y: number): boolean {
    const dx = x - this.paletteX;
    const dy = y - this.paletteY;
    return Math.sqrt(dx * dx + dy * dy) <= this.paletteRadius * 1.2;
  }

  private isInsideSlider(x: number, y: number): boolean {
    return x >= this.sliderX - 10 &&
           x <= this.sliderX + this.sliderWidth + 10 &&
           y >= this.sliderY - 15 * this.scale &&
           y <= this.sliderY + 15 * this.scale;
  }

  private isInsideSliderKnob(x: number, y: number): boolean {
    const knobX = this.sliderX + ((this.temperature - 1) / 9) * this.sliderWidth;
    const dx = x - knobX;
    const dy = y - this.sliderY;
    return Math.sqrt(dx * dx + dy * dy) <= 16 * this.scale;
  }

  private isInsideResetButton(x: number, y: number): boolean {
    return x >= this.resetBtnX &&
           x <= this.resetBtnX + this.resetBtnWidth &&
           y >= this.resetBtnY &&
           y <= this.resetBtnY + this.resetBtnHeight;
  }

  public reset(): void {
    this.droplets = [];
    this.particles = [];
    this.lightPulses = [];
    this.pendingDroplets = [];
    this.bgTopColor = { r: 10, g: 14, b: 26 };
    this.bgBottomColor = { r: 26, g: 42, b: 58 };
    this.targetBgTopColor = { r: 10, g: 14, b: 26 };
    this.targetBgBottomColor = { r: 26, g: 42, b: 58 };
    this.temperature = 5;
  }

  public getDropletCount(): number {
    return this.droplets.length;
  }
}

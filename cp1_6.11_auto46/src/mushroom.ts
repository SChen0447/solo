export interface MushroomConfig {
  x: number;
  y: number;
  attractionWeight: number;
  orbitRadius: number;
  glowRadius: number;
}

export class Mushroom {
  public x: number;
  public y: number;
  public targetX: number;
  public targetY: number;
  public attractionWeight: number;
  public orbitRadius: number;
  public glowRadius: number;
  public radius: number;
  public isDragging: boolean = false;
  public dragOffsetX: number = 0;
  public dragOffsetY: number = 0;

  private colorHue: number;
  private colorSaturation: number;
  private colorLightness: number;
  private teethOffsets: number[] = [];
  private pulsePhase: number;
  private smoothDelay: number = 0.2;
  private displayX: number;
  private displayY: number;

  constructor(config: MushroomConfig) {
    this.x = config.x;
    this.y = config.y;
    this.targetX = config.x;
    this.targetY = config.y;
    this.displayX = config.x;
    this.displayY = config.y;
    this.attractionWeight = config.attractionWeight;
    this.orbitRadius = config.orbitRadius;
    this.glowRadius = config.glowRadius;
    this.radius = 12 + Math.random() * 8;

    this.colorHue = 90 + Math.random() * 30;
    this.colorSaturation = 80 + Math.random() * 20;
    this.colorLightness = 50 + Math.random() * 15;

    const toothCount = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < toothCount; i++) {
      this.teethOffsets.push(0.7 + Math.random() * 0.5);
    }

    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  public getDisplayPosition(): { x: number; y: number } {
    return { x: this.displayX, y: this.displayY };
  }

  public startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true;
    this.dragOffsetX = mouseX - this.x;
    this.dragOffsetY = mouseY - this.y;
  }

  public updateDrag(mouseX: number, mouseY: number): void {
    if (this.isDragging) {
      this.targetX = mouseX - this.dragOffsetX;
      this.targetY = mouseY - this.dragOffsetY;
    }
  }

  public endDrag(): void {
    this.isDragging = false;
  }

  public containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius * 1.5;
  }

  public update(deltaTime: number): void {
    if (this.isDragging) {
      this.x = this.targetX;
      this.y = this.targetY;
    }

    const dt = deltaTime / 1000;
    const smoothFactor = Math.min(1, dt / this.smoothDelay);

    this.displayX += (this.x - this.displayX) * smoothFactor;
    this.displayY += (this.y - this.displayY) * smoothFactor;

    this.pulsePhase += deltaTime * 0.002;
  }

  public getAttractionForce(
    fireflyX: number,
    fireflyY: number
  ): { x: number; y: number; strength: number } {
    const dx = this.x - fireflyX;
    const dy = this.y - fireflyY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      return { x: 0, y: 0, strength: 0 };
    }

    const effectiveRadius = this.orbitRadius;
    let strength: number;

    if (dist <= effectiveRadius) {
      const orbitFactor = dist / effectiveRadius;
      strength = this.attractionWeight * (0.3 + orbitFactor * 0.7);

      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const orbitStrength = (1 - orbitFactor) * this.attractionWeight * 0.8;

      return {
        x: Math.cos(angle) * orbitStrength + (dx / dist) * strength * 0.2,
        y: Math.sin(angle) * orbitStrength + (dy / dist) * strength * 0.2,
        strength: strength + orbitStrength,
      };
    } else {
      const falloff = 150;
      const distFactor = Math.max(0, 1 - (dist - effectiveRadius) / falloff);
      strength = this.attractionWeight * distFactor * 0.6;
    }

    return {
      x: (dx / dist) * strength,
      y: (dy / dist) * strength,
      strength,
    };
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    const pulseIntensity = 0.85 + 0.15 * Math.sin(this.pulsePhase);
    const displayPos = this.getDisplayPosition();

    const glowGradient = ctx.createRadialGradient(
      displayPos.x, displayPos.y, 0,
      displayPos.x, displayPos.y, this.glowRadius * pulseIntensity
    );
    glowGradient.addColorStop(0, `hsla(${this.colorHue}, ${this.colorSaturation}%, ${this.colorLightness + 20}%, 0.6)`);
    glowGradient.addColorStop(0.4, `hsla(${this.colorHue + 10}, ${this.colorSaturation}%, ${this.colorLightness}%, 0.2)`);
    glowGradient.addColorStop(1, `hsla(${this.colorHue + 20}, ${this.colorSaturation - 20}%, ${this.colorLightness - 10}%, 0)`);

    ctx.beginPath();
    ctx.arc(displayPos.x, displayPos.y, this.glowRadius * pulseIntensity, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    ctx.save();
    ctx.shadowColor = `hsla(${this.colorHue}, ${this.colorSaturation}%, 60%, 0.8)`;
    ctx.shadowBlur = 20 * pulseIntensity;

    this.drawSerratedCap(ctx, displayPos.x, displayPos.y);
    this.drawStem(ctx, displayPos.x, displayPos.y);

    ctx.restore();

    this.drawSpots(ctx, displayPos.x, displayPos.y);
  }

  private drawSerratedCap(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const r = this.radius;
    const teeth = this.teethOffsets.length;

    ctx.beginPath();

    for (let i = 0; i <= teeth; i++) {
      const angle = (i / teeth) * Math.PI * 2;
      const toothR = r * this.teethOffsets[i % teeth];

      const px = x + Math.cos(angle) * toothR;
      const py = y + Math.sin(angle) * toothR;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevAngle = ((i - 1) / teeth) * Math.PI * 2;
        const midAngle = (prevAngle + angle) / 2;
        const midR = r * 0.95;

        const cpx = x + Math.cos(midAngle) * midR;
        const cpy = y + Math.sin(midAngle) * midR;

        ctx.quadraticCurveTo(cpx, cpy, px, py);
      }
    }

    ctx.closePath();

    const capGradient = ctx.createRadialGradient(
      x - r * 0.3, y - r * 0.3, 0,
      x, y, r
    );
    capGradient.addColorStop(0, `hsl(${this.colorHue + 20}, ${this.colorSaturation}%, ${this.colorLightness + 20}%)`);
    capGradient.addColorStop(0.5, `hsl(${this.colorHue + 5}, ${this.colorSaturation}%, ${this.colorLightness + 5}%)`);
    capGradient.addColorStop(1, `hsl(${this.colorHue}, ${this.colorSaturation}%, ${this.colorLightness - 10}%)`);

    ctx.fillStyle = capGradient;
    ctx.fill();
  }

  private drawStem(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const stemWidth = this.radius * 0.35;
    const stemHeight = this.radius * 0.8;

    ctx.beginPath();
    ctx.ellipse(x, y + stemHeight * 0.3, stemWidth, stemHeight * 0.5, 0, 0, Math.PI * 2);

    const stemGradient = ctx.createLinearGradient(
      x - stemWidth, y,
      x + stemWidth, y + stemHeight
    );
    stemGradient.addColorStop(0, `hsl(${this.colorHue + 30}, 40%, 70%)`);
    stemGradient.addColorStop(0.5, `hsl(${this.colorHue + 20}, 35%, 60%)`);
    stemGradient.addColorStop(1, `hsl(${this.colorHue + 10}, 45%, 50%)`);

    ctx.fillStyle = stemGradient;
    ctx.fill();
  }

  private drawSpots(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const spots = 3 + Math.floor(this.teethOffsets.length / 3);
    const displayPos = this.getDisplayPosition();

    for (let i = 0; i < spots; i++) {
      const angle = (i / spots) * Math.PI * 2 + this.teethOffsets[i % this.teethOffsets.length];
      const dist = this.radius * (0.3 + this.teethOffsets[(i + 2) % this.teethOffsets.length] * 0.4);
      const spotX = displayPos.x + Math.cos(angle) * dist;
      const spotY = displayPos.y + Math.sin(angle) * dist;
      const spotR = 1.5 + this.teethOffsets[(i + 1) % this.teethOffsets.length] * 1.5;

      ctx.beginPath();
      ctx.arc(spotX, spotY, spotR, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${this.colorHue - 10}, 60%, 85%, 0.85)`;
      ctx.fill();
    }
  }
}

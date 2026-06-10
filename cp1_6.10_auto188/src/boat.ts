export interface BoatConfig {
  canvasWidth: number;
  canvasHeight: number;
  seaLevelY: number;
  waveAmplitude: number;
  waveFrequency: number;
  time: number;
  netRangeLevel: number;
  speedLevel: number;
  isHighTide: boolean;
}

export class Boat {
  x: number;
  y: number;
  targetX: number;
  isDragging: boolean;
  private boatWidth: number;
  private boatHeight: number;
  private netSwingAngle: number;
  private baseElasticity: number;

  constructor(startX: number, startY: number, isSmall: boolean = false) {
    this.x = startX;
    this.y = startY;
    this.targetX = startX;
    this.isDragging = false;
    this.boatWidth = isSmall ? 15 : 20;
    this.boatHeight = isSmall ? 7.5 : 10;
    this.netSwingAngle = 0;
    this.baseElasticity = 0.85;
  }

  setSize(isSmall: boolean): void {
    this.boatWidth = isSmall ? 15 : 20;
    this.boatHeight = isSmall ? 7.5 : 10;
  }

  update(config: BoatConfig, mouseX: number): void {
    if (this.isDragging) {
      this.targetX = mouseX;
    }

    const elasticity = this.baseElasticity + (config.speedLevel - 1) * 0.05;
    this.x += (this.targetX - this.x) * elasticity;

    const minX = this.boatWidth;
    const maxX = config.canvasWidth - this.boatWidth;
    this.x = Math.max(minX, Math.min(maxX, this.x));

    const waveY = config.seaLevelY +
      Math.sin(config.time * config.waveFrequency + this.x * 0.02) * config.waveAmplitude;
    this.y = waveY;

    const velocity = this.targetX - this.x;
    const maxSwing = 15 * (Math.PI / 180);
    const targetSwing = Math.max(-maxSwing, Math.min(maxSwing, velocity * 0.01));
    this.netSwingAngle += (targetSwing - this.netSwingAngle) * 0.1;
  }

  getNetBounds(config: BoatConfig): { left: number; right: number; top: number; bottom: number } {
    const tideMultiplier = config.isHighTide ? 1.2 : 1.0;
    const rangeMultiplier = 1 + (config.netRangeLevel - 1) * 0.33;
    const netWidth = 30 * tideMultiplier * rangeMultiplier;
    const netDepth = 30;

    const centerX = this.x - this.boatWidth * 0.3;
    const netTop = this.y + 2;
    const netBottom = this.y + netDepth;

    return {
      left: centerX - netWidth / 2,
      right: centerX + netWidth / 2,
      top: netTop,
      bottom: netBottom
    };
  }

  draw(ctx: CanvasRenderingContext2D, config: BoatConfig): void {
    const bobOffset = Math.sin(config.time * config.waveFrequency + this.x * 0.02) * 2;
    const drawY = this.y + bobOffset;

    this.drawBoat(ctx, drawY);
    this.drawNet(ctx, drawY, config);
  }

  private drawBoat(ctx: CanvasRenderingContext2D, y: number): void {
    const x = Math.floor(this.x);
    const w = this.boatWidth;
    const h = this.boatHeight;

    ctx.fillStyle = '#8b5e3c';
    ctx.fillRect(x - w / 2, y - h / 2, w, h / 2);

    ctx.fillStyle = '#6b4423';
    ctx.fillRect(x - w / 2, y, w, h / 2);

    ctx.fillStyle = '#5a3a1f';
    ctx.fillRect(x - w / 2 - 2, y, 2, h / 2);
    ctx.fillRect(x + w / 2, y, 2, h / 2);
    ctx.fillRect(x - w / 2, y + h / 2 - 1, w + 4, 1);

    const mastX = x + 2;
    const mastTop = y - h - 8;
    ctx.fillStyle = '#5a3a1f';
    ctx.fillRect(mastX - 1, mastTop, 2, h + 8);

    ctx.fillStyle = '#f5deb3';
    ctx.beginPath();
    ctx.moveTo(mastX, mastTop);
    ctx.lineTo(mastX + 8, y - 2);
    ctx.lineTo(mastX, y - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e8d4a0';
    ctx.fillRect(mastX + 1, mastTop + 2, 6, 1);
    ctx.fillRect(mastX + 2, mastTop + 5, 4, 1);
  }

  private drawNet(ctx: CanvasRenderingContext2D, y: number, config: BoatConfig): void {
    const tideMultiplier = config.isHighTide ? 1.2 : 1.0;
    const rangeMultiplier = 1 + (config.netRangeLevel - 1) * 0.33;
    const netWidth = 30 * tideMultiplier * rangeMultiplier;
    const netDepth = 30;

    const startX = this.x - this.boatWidth * 0.3;
    const startY = y + 2;
    const endY = y + netDepth;

    const swingOffsetX = Math.sin(this.netSwingAngle) * netDepth;

    ctx.save();
    ctx.globalAlpha = 0.5;

    const gradient = ctx.createLinearGradient(startX, startY, startX, endY);
    gradient.addColorStop(0, 'rgba(59, 141, 189, 0.6)');
    gradient.addColorStop(1, 'rgba(59, 141, 189, 0.3)');

    ctx.strokeStyle = '#3b8dbd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX - netWidth / 2, startY);
    ctx.quadraticCurveTo(
      startX - netWidth / 2 + swingOffsetX * 0.5,
      (startY + endY) / 2,
      startX - netWidth / 2 + swingOffsetX,
      endY
    );
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(startX + netWidth / 2, startY);
    ctx.quadraticCurveTo(
      startX + netWidth / 2 + swingOffsetX * 0.5,
      (startY + endY) / 2,
      startX + netWidth / 2 + swingOffsetX,
      endY
    );
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = gradient;
    for (let i = 1; i <= 3; i++) {
      const t = i / 4;
      const leftX = startX - netWidth / 2 + swingOffsetX * t;
      const rightX = startX + netWidth / 2 + swingOffsetX * t;
      const curY = startY + (endY - startY) * t;
      ctx.beginPath();
      ctx.moveTo(leftX, curY);
      ctx.lineTo(rightX, curY);
      ctx.stroke();
    }

    ctx.restore();
  }
}

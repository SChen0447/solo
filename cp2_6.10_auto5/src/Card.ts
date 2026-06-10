export interface CardData {
  id: string;
  name: string;
  attack: number;
  defense: number;
  effect: string;
  themeColor: string;
}

export class Card {
  public id: string;
  public name: string;
  public attack: number;
  public defense: number;
  public effect: string;
  public themeColor: string;
  public x: number = 0;
  public y: number = 0;
  public width: number = 120;
  public height: number = 160;
  public isHovered: boolean = false;
  public isSelected: boolean = false;
  public selectedTime: number = 0;
  public targetX: number = 0;
  public targetY: number = 0;
  public isFlying: boolean = false;
  public flyProgress: number = 0;
  public startX: number = 0;
  public startY: number = 0;

  constructor(data: CardData) {
    this.id = data.id;
    this.name = data.name;
    this.attack = data.attack;
    this.defense = data.defense;
    this.effect = data.effect;
    this.themeColor = data.themeColor;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setTarget(x: number, y: number): void {
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = x;
    this.targetY = y;
    this.isFlying = true;
    this.flyProgress = 0;
  }

  update(deltaTime: number): void {
    if (this.isFlying) {
      this.flyProgress += deltaTime * 2;
      if (this.flyProgress >= 1) {
        this.flyProgress = 1;
        this.isFlying = false;
        this.x = this.targetX;
        this.y = this.targetY;
      } else {
        const t = this.flyProgress;
        this.x = this.startX + (this.targetX - this.startX) * t;
        this.y = this.startY + (this.targetY - this.startY) * t;
      }
    }
    if (this.isSelected) {
      this.selectedTime += deltaTime;
      if (this.selectedTime >= 1) {
        this.isSelected = false;
        this.selectedTime = 0;
      }
    }
  }

  containsPoint(px: number, py: number): boolean {
    return (
      px >= this.x - this.width / 2 &&
      px <= this.x + this.width / 2 &&
      py >= this.y - this.height / 2 &&
      py <= this.y + this.height / 2
    );
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const scale = this.isHovered ? 1.2 : 1;
    const w = this.width * scale;
    const h = this.height * scale;
    const x = this.x;
    const y = this.y;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    if (this.isSelected) {
      const glowIntensity = Math.sin(this.selectedTime * Math.PI * 4) * 0.3 + 0.7;
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 30 * glowIntensity;
    } else if (this.isHovered) {
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 15;
    }

    this.roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 8);
    const gradient = ctx.createLinearGradient(0, -this.height / 2, 0, this.height / 2);
    gradient.addColorStop(0, this.themeColor);
    gradient.addColorStop(1, '#6a5acd');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = this.isHovered ? 3 : 1;
    this.roundRect(ctx, -this.width / 2, -this.height / 2, this.width, this.height, 8);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    this.wrapText(ctx, this.name, -this.width / 2 + 10, -this.height / 2 + 10, this.width - 20, 16);

    ctx.font = '11px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('ATK', -this.width / 2 + 10, -this.height / 2 + 45);
    ctx.fillText('DEF', -this.width / 2 + 10, -this.height / 2 + 62);

    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(String(this.attack), this.width / 2 - 10, this.height / 2 - 25);
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText(String(this.defense), this.width / 2 - 10, this.height / 2 - 5);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = text.split('');
    let line = '';
    let lineCount = 0;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, y + lineCount * lineHeight);
        line = words[n];
        lineCount++;
        if (lineCount >= 2) {
          ctx.fillText(line + '...', x, y + lineCount * lineHeight);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y + lineCount * lineHeight);
  }

  clone(): Card {
    return new Card({
      id: this.id + '_' + Math.random().toString(36).substr(2, 9),
      name: this.name,
      attack: this.attack,
      defense: this.defense,
      effect: this.effect,
      themeColor: this.themeColor,
    });
  }
}

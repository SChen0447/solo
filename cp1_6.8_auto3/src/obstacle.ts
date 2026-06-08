export type ObstacleType = 'low' | 'high' | 'wall' | 'double';

export interface NoteCollectible {
  x: number;
  y: number;
  collected: boolean;
  size: number;
  rotation: number;
}

export class Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  passed: boolean;
  scored: boolean;
  hue: number;
  speed: number;
  beatTime: number;
  isBoss: boolean;
  note?: NoteCollectible;
  wallOffset: number;
  wallDirection: number;

  constructor(x: number, groundY: number, type: ObstacleType, beatTime: number, isBoss: boolean = false) {
    this.x = x;
    this.type = type;
    this.passed = false;
    this.scored = false;
    this.hue = 0;
    this.speed = 0;
    this.beatTime = beatTime;
    this.isBoss = isBoss;
    this.wallOffset = 0;
    this.wallDirection = 1;

    switch (type) {
      case 'low':
        this.width = 30;
        this.height = 40;
        this.y = groundY - this.height;
        break;
      case 'high':
        this.width = 50;
        this.height = 35;
        this.y = groundY - 90;
        break;
      case 'wall':
        this.width = 25;
        this.height = 80;
        this.y = groundY - this.height;
        break;
      case 'double':
        this.width = 30;
        this.height = 50;
        this.y = groundY - this.height;
        break;
    }

    if (Math.random() > 0.7 && type !== 'wall' && type !== 'double') {
      this.note = {
        x: this.x + this.width / 2,
        y: this.y - 30,
        collected: false,
        size: 15,
        rotation: 0,
      };
    }
  }

  update(deltaTime: number, speed: number, groundY: number): void {
    this.speed = speed;
    this.x -= speed;
    this.hue = (this.hue + 3) % 360;

    if (this.type === 'wall') {
      this.wallOffset += this.wallDirection * 30 * deltaTime;
      if (Math.abs(this.wallOffset) > 20) {
        this.wallDirection *= -1;
      }
    }

    if (this.note) {
      this.note.x = this.x + this.width / 2;
      this.note.rotation += deltaTime * 3;
      if (this.type === 'high') {
        this.note.y = this.y + this.height + 20;
      } else {
        this.note.y = this.y - 30;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    const color = `hsl(${this.hue}, 100%, 60%)`;
    const glowColor = `hsl(${this.hue}, 100%, 50%)`;

    ctx.fillStyle = color;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.isBoss ? 25 : 15;

    if (this.type === 'low') {
      this.drawLowObstacle(ctx);
    } else if (this.type === 'high') {
      this.drawHighObstacle(ctx);
    } else if (this.type === 'wall') {
      this.drawWallObstacle(ctx);
    } else if (this.type === 'double') {
      this.drawDoubleObstacle(ctx);
    }

    ctx.restore();

    if (this.note && !this.note.collected) {
      this.drawNote(ctx);
    }
  }

  private drawLowObstacle(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, `hsl(${this.hue}, 100%, 70%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 100%, 40%)`);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, 6);
  }

  private drawHighObstacle(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, `hsl(${this.hue}, 100%, 70%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 100%, 40%)`);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    ctx.strokeStyle = `hsl(${this.hue}, 100%, 50%)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y + this.height);
    ctx.lineTo(this.x + this.width / 2, this.y + this.height + 30);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, 6);
  }

  private drawWallObstacle(ctx: CanvasRenderingContext2D): void {
    const offsetX = this.wallOffset;

    const gradient = ctx.createLinearGradient(
      this.x + offsetX, this.y,
      this.x + offsetX + this.width, this.y
    );
    gradient.addColorStop(0, `hsl(${this.hue}, 100%, 70%)`);
    gradient.addColorStop(0.5, `hsl(${(this.hue + 30) % 360}, 100%, 60%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 100%, 70%)`);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.roundRect(this.x + offsetX, this.y, this.width, this.height, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(this.x + offsetX + 3, this.y + 10, this.width - 6, 3);
    ctx.fillRect(this.x + offsetX + 3, this.y + 25, this.width - 6, 3);
    ctx.fillRect(this.x + offsetX + 3, this.y + 40, this.width - 6, 3);
    ctx.fillRect(this.x + offsetX + 3, this.y + 55, this.width - 6, 3);
  }

  private drawDoubleObstacle(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
    gradient.addColorStop(0, `hsl(${this.hue}, 100%, 70%)`);
    gradient.addColorStop(1, `hsl(${this.hue}, 100%, 40%)`);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(this.x + 4, this.y + 4, this.width - 8, 6);

    ctx.fillStyle = `hsl(${(this.hue + 180) % 360}, 100%, 60%)`;
    ctx.shadowColor = `hsl(${(this.hue + 180) % 360}, 100%, 50%)`;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(this.x + 5, this.y - 45, this.width - 10, 30, 4);
    ctx.fill();
  }

  private drawNote(ctx: CanvasRenderingContext2D): void {
    if (!this.note) return;

    ctx.save();
    ctx.translate(this.note.x, this.note.y);
    ctx.rotate(this.note.rotation);

    const size = this.note.size;

    ctx.shadowColor = '#ff0088';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ff0088';

    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♪', 0, 1);

    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    let x = this.x;
    if (this.type === 'wall') {
      x += this.wallOffset;
    }
    return {
      x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  getHitbox(): { x: number; y: number; width: number; height: number } {
    const bounds = this.getBounds();
    const padding = 3;
    return {
      x: bounds.x + padding,
      y: bounds.y + padding,
      width: bounds.width - padding * 2,
      height: bounds.height - padding * 2,
    };
  }

  isOffScreen(): boolean {
    return this.x + this.width < -100;
  }

  checkCollision(playerBounds: { x: number; y: number; width: number; height: number }): boolean {
    const hitbox = this.getHitbox();
    return (
      playerBounds.x < hitbox.x + hitbox.width &&
      playerBounds.x + playerBounds.width > hitbox.x &&
      playerBounds.y < hitbox.y + hitbox.height &&
      playerBounds.y + playerBounds.height > hitbox.y
    );
  }

  checkNoteCollision(playerBounds: { x: number; y: number; width: number; height: number }): boolean {
    if (!this.note || this.note.collected) return false;

    const noteBounds = {
      x: this.note.x - this.note.size,
      y: this.note.y - this.note.size,
      width: this.note.size * 2,
      height: this.note.size * 2,
    };

    return (
      playerBounds.x < noteBounds.x + noteBounds.width &&
      playerBounds.x + playerBounds.width > noteBounds.x &&
      playerBounds.y < noteBounds.y + noteBounds.height &&
      playerBounds.y + playerBounds.height > noteBounds.y
    );
  }

  collectNote(): void {
    if (this.note) {
      this.note.collected = true;
    }
  }
}

export interface NoteConfig {
  x: number;
  y: number;
  speed: number;
  color: string;
  frequency: number;
  noteName: string;
  radius?: number;
}

export class Note {
  public x: number;
  public y: number;
  public speed: number;
  public color: string;
  public frequency: number;
  public noteName: string;
  public radius: number;
  public hit: boolean = false;
  public missed: boolean = false;

  private static readonly palette: string[] = [
    '#ff6b6b',
    '#ffa94d',
    '#ffd43b',
    '#69db7c',
    '#74c0fc',
    '#b197fc'
  ];

  constructor(config: NoteConfig) {
    this.x = config.x;
    this.y = config.y;
    this.speed = config.speed;
    this.color = config.color;
    this.frequency = config.frequency;
    this.noteName = config.noteName;
    this.radius = config.radius ?? 12;
  }

  public update(deltaTime: number): void {
    if (!this.hit) {
      this.y += this.speed * deltaTime;
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    if (this.hit) return;

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;

    const gradient = ctx.createRadialGradient(
      this.x - this.radius * 0.3,
      this.y - this.radius * 0.3,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.4, this.color);
    gradient.addColorStop(1, this.adjustColor(this.color, -40));

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  public isAtHitLine(hitLineY: number, tolerance: number = 15): boolean {
    return Math.abs(this.y - hitLineY) <= tolerance;
  }

  public isOutOfScreen(canvasHeight: number): boolean {
    return this.y - this.radius > canvasHeight;
  }

  private adjustColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  public static getRandomColor(): string {
    return Note.palette[Math.floor(Math.random() * Note.palette.length)];
  }
}

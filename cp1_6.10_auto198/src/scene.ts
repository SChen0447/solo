export interface GameState {
  score: number;
  combo: number;
}

export type FlashType = 'hit' | 'miss' | null;

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private hitLineY: number = 0;
  private centerX: number = 0;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.hitLineY = this.canvas.height * 0.75;
    this.centerX = this.canvas.width / 2;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
  }

  public render(state: GameState, flashType: FlashType): void {
    this.drawBackground();
    this.drawGrid();
    this.drawTracks();
    this.drawHitLine();
    this.updateScoreBoard(state, flashType);
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0f0c29');
    gradient.addColorStop(0.5, '#302b63');
    gradient.addColorStop(1, '#24243e');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    this.ctx.lineWidth = 1;

    const gridSize = 40;

    for (let x = 0; x < this.canvas.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.canvas.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  private drawTracks(): void {
    const trackWidth = 60;
    const leftBound = this.centerX - trackWidth;
    const rightBound = this.centerX + trackWidth;

    const gradient = this.ctx.createLinearGradient(leftBound, 0, rightBound, 0);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(leftBound, 0, trackWidth * 2, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(leftBound, 0);
    this.ctx.lineTo(leftBound, this.canvas.height);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(rightBound, 0);
    this.ctx.lineTo(rightBound, this.canvas.height);
    this.ctx.stroke();
  }

  private drawHitLine(): void {
    this.ctx.save();
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#ffffff';

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.hitLineY);
    this.ctx.lineTo(this.canvas.width, this.hitLineY);
    this.ctx.stroke();

    const markerSize = 8;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.hitLineY - markerSize);
    this.ctx.lineTo(this.centerX - markerSize, this.hitLineY);
    this.ctx.lineTo(this.centerX, this.hitLineY + markerSize);
    this.ctx.lineTo(this.centerX + markerSize, this.hitLineY);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private updateScoreBoard(state: GameState, flashType: FlashType): void {
    const scoreBoard = document.getElementById('scoreBoard') as HTMLElement | null;
    if (!scoreBoard) return;

    scoreBoard.textContent = `得分：${state.score} | 连击：${state.combo}`;

    scoreBoard.style.transition = 'background-color 0.2s ease';

    if (flashType === 'hit') {
      scoreBoard.style.backgroundColor = 'rgba(0, 200, 0, 0.7)';
      setTimeout(() => {
        scoreBoard.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      }, 200);
    } else if (flashType === 'miss') {
      scoreBoard.style.backgroundColor = 'rgba(200, 0, 0, 0.7)';
      setTimeout(() => {
        scoreBoard.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
      }, 200);
    }
  }

  public getHitLineY(): number {
    return this.hitLineY;
  }

  public getCenterX(): number {
    return this.centerX;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

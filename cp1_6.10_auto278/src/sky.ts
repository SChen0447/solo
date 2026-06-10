interface LightningBranch {
  startX: number;
  startY: number;
  points: { x: number; y: number }[];
}

interface Lightning {
  x: number;
  y: number;
  points: { x: number; y: number }[];
  branches: LightningBranch[];
  startTime: number;
  duration: number;
}

export class Sky {
  private width: number;
  private height: number;
  private lightning: Lightning | null = null;
  private nextLightningTime: number;
  private flashStartTime: number = 0;
  private glowStartTime: number = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.nextLightningTime = Math.random() * 7000 + 8000;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  update(currentTime: number): void {
    if (!this.lightning && currentTime >= this.nextLightningTime) {
      this.generateLightning(currentTime);
      this.flashStartTime = currentTime;
      this.glowStartTime = currentTime;
      this.nextLightningTime = currentTime + Math.random() * 7000 + 8000;
    }

    if (this.lightning && currentTime - this.lightning.startTime > this.lightning.duration) {
      this.lightning = null;
    }
  }

  private generateLightning(currentTime: number): void {
    const startX = Math.random() * this.width;
    const startY = 0;
    const points: { x: number; y: number }[] = [];
    points.push({ x: startX, y: startY });

    let x = startX;
    let y = startY;
    const segments = 8 + Math.floor(Math.random() * 5);
    const segmentHeight = this.height / segments;

    for (let i = 1; i <= segments; i++) {
      const offsetX = (Math.random() - 0.5) * 80;
      x += offsetX;
      y = startY + i * segmentHeight + (Math.random() - 0.5) * 20;
      points.push({ x: Math.max(0, Math.min(this.width, x)), y: Math.min(this.height, y) });
    }

    const branches: LightningBranch[] = [];
    const branchCount = 3 + Math.floor(Math.random() * 3);

    for (let b = 0; b < branchCount; b++) {
      const startPointIdx = 1 + Math.floor(Math.random() * (points.length - 2));
      const startPt = points[startPointIdx];
      const branchPoints: { x: number; y: number }[] = [];
      branchPoints.push({ x: startPt.x, y: startPt.y });

      let bx = startPt.x;
      let by = startPt.y;
      const branchDir = Math.random() > 0.5 ? 1 : -1;
      const branchSegments = 2 + Math.floor(Math.random() * 3);

      for (let s = 0; s < branchSegments; s++) {
        bx += branchDir * (20 + Math.random() * 40);
        by += 20 + Math.random() * 30;
        branchPoints.push({ x: Math.max(0, Math.min(this.width, bx)), y: Math.min(this.height, by) });
      }

      branches.push({
        startX: startPt.x,
        startY: startPt.y,
        points: branchPoints
      });
    }

    this.lightning = {
      x: startX,
      y: startY,
      points,
      branches,
      startTime: currentTime,
      duration: 300
    };
  }

  draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#3a5f6d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const glowElapsed = currentTime - this.glowStartTime;
    if (glowElapsed < 1500) {
      const glowAlpha = Math.max(0, (1 - glowElapsed / 1500) * 0.15);
      const glowGradient = ctx.createRadialGradient(
        this.width / 2, this.height / 3, 0,
        this.width / 2, this.height / 3, this.width / 2
      );
      glowGradient.addColorStop(0, `rgba(180, 220, 255, ${glowAlpha})`);
      glowGradient.addColorStop(1, 'rgba(180, 220, 255, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.lightning) {
      this.drawLightning(ctx);
    }
  }

  private drawLightning(ctx: CanvasRenderingContext2D): void {
    if (!this.lightning) return;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(this.lightning.points[0].x, this.lightning.points[0].y);
    for (let i = 1; i < this.lightning.points.length; i++) {
      ctx.lineTo(this.lightning.points[i].x, this.lightning.points[i].y);
    }
    ctx.stroke();

    for (const branch of this.lightning.branches) {
      ctx.beginPath();
      ctx.moveTo(branch.points[0].x, branch.points[0].y);
      for (let i = 1; i < branch.points.length; i++) {
        ctx.lineTo(branch.points[i].x, branch.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  getFlashOpacity(currentTime: number): number {
    const elapsed = currentTime - this.flashStartTime;
    if (elapsed < 100) {
      return 0.3 * (1 - elapsed / 100);
    }
    return 0;
  }
}

interface Segment {
  x: number;
  y: number;
}

export class LightCreature {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  elasticity: number;
  friction: number;
  maxSpeed: number;
  segmentCount: number;
  segments: Segment[];
  breathingPhase: number;
  isGlowing: boolean;
  glowTimer: number;
  canvasWidth: number;
  canvasHeight: number;
  isFollowing: boolean;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.vx = 0;
    this.vy = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.elasticity = 0.92;
    this.friction = 0.95;
    this.maxSpeed = 8;
    this.segmentCount = 10;
    this.breathingPhase = 0;
    this.isGlowing = false;
    this.glowTimer = 0;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isFollowing = false;

    this.segments = [];
    for (let i = 0; i < this.segmentCount; i++) {
      this.segments.push({ x: this.x, y: this.y });
    }
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    const scaleX = canvasWidth / this.canvasWidth;
    const scaleY = canvasHeight / this.canvasHeight;
    this.x *= scaleX;
    this.y *= scaleY;
    this.targetX *= scaleX;
    this.targetY *= scaleY;
    for (const s of this.segments) {
      s.x *= scaleX;
      s.y *= scaleY;
    }
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  update(): void {
    if (this.isFollowing) {
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      this.vx += dx * (1 - this.elasticity);
      this.vy += dy * (1 - this.elasticity);
    } else {
      this.vx *= this.friction;
      this.vy *= this.friction;
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 10) { this.x = 10; this.vx = Math.abs(this.vx) * 0.6; }
    if (this.x > this.canvasWidth - 10) { this.x = this.canvasWidth - 10; this.vx = -Math.abs(this.vx) * 0.6; }
    if (this.y < 10) { this.y = 10; this.vy = Math.abs(this.vy) * 0.6; }
    if (this.y > this.canvasHeight - 10) { this.y = this.canvasHeight - 10; this.vy = -Math.abs(this.vy) * 0.6; }

    this.updateSegments();
    this.breathingPhase += 0.05;

    if (this.isGlowing) {
      this.glowTimer -= 1 / 60;
      if (this.glowTimer <= 0) {
        this.isGlowing = false;
      }
    }
  }

  private updateSegments(): void {
    this.segments[0].x = this.x;
    this.segments[0].y = this.y;

    for (let i = 1; i < this.segmentCount; i++) {
      const prev = this.segments[i - 1];
      const curr = this.segments[i];
      const dx = prev.x - curr.x;
      const dy = prev.y - curr.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const spacing = 12;

      if (dist > spacing) {
        const ratio = spacing / dist;
        curr.x = prev.x - dx * ratio;
        curr.y = prev.y - dy * ratio;
      }
    }
  }

  getHeadAngle(): number {
    if (Math.abs(this.vx) < 0.001 && Math.abs(this.vy) < 0.001) {
      return 0;
    }
    return Math.atan2(this.vy, this.vx) + Math.PI;
  }

  getTailPosition(): { x: number; y: number } {
    const tail = this.segments[this.segmentCount - 1];
    return { x: tail.x, y: tail.y };
  }

  triggerGlow(): void {
    this.isGlowing = true;
    this.glowTimer = 0.2;
  }

  hitTest(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < 30;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const breathe = 1 + Math.sin(this.breathingPhase) * 0.08;
    const glowMult = this.isGlowing ? 1.3 : 1;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let pass = 0; pass < 2; pass++) {
      ctx.beginPath();
      ctx.moveTo(this.segments[0].x, this.segments[0].y);

      for (let i = 1; i < this.segmentCount - 1; i++) {
        const xc = (this.segments[i].x + this.segments[i + 1].x) / 2;
        const yc = (this.segments[i].y + this.segments[i + 1].y) / 2;
        ctx.quadraticCurveTo(this.segments[i].x, this.segments[i].y, xc, yc);
      }

      const baseHue = 200;
      const baseSat = 90;
      const baseLight = 63 * glowMult;

      if (pass === 0) {
        for (let i = 0; i < this.segmentCount - 1; i++) {
          const t = i / (this.segmentCount - 1);
          const lineWidth = (4 - t * 3) * breathe * 3;
          const light = baseLight * (1 - t * 0.3);

          ctx.strokeStyle = `hsla(${baseHue}, ${baseSat}%, ${light}%, ${0.15 * glowMult})`;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }
      } else {
        for (let i = 0; i < this.segmentCount - 1; i++) {
          const t = i / (this.segmentCount - 1);
          const lineWidth = (4 - t * 3) * breathe;
          const light = Math.min(baseLight * (1 - t * 0.2), 90);

          ctx.strokeStyle = `hsla(${baseHue}, ${baseSat}%, ${light}%, ${0.95})`;
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
        }

        const headX = this.segments[0].x;
        const headY = this.segments[0].y;
        const headRadius = 6 * breathe;

        const headGrad = ctx.createRadialGradient(
          headX, headY, 0,
          headX, headY, headRadius * 3
        );
        headGrad.addColorStop(0, `hsla(${baseHue}, 100%, 90%, 1)`);
        headGrad.addColorStop(0.4, `hsla(${baseHue}, ${baseSat}%, ${Math.min(baseLight + 10, 95)}%, 0.7)`);
        headGrad.addColorStop(1, `hsla(${baseHue}, ${baseSat}%, ${baseLight}%, 0)`);

        ctx.beginPath();
        ctx.arc(headX, headY, headRadius * 3, 0, Math.PI * 2);
        ctx.fillStyle = headGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${baseHue}, 100%, 95%, 1)`;
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

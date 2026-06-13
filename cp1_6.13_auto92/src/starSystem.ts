export interface Star {
  x: number;
  y: number;
  size: number;
  baseBrightness: number;
  brightness: number;
  phase: number;
  phaseSpeed: number;
  boost: number;
}

export class StarSystem {
  private stars: Star[] = [];
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;
  private boostAll: number = 0;
  private boostFlashCount: number = 0;
  private boostFlashTimer: number = 0;

  constructor(count: number = 200) {
    this.resize(window.innerWidth, window.innerHeight);
    this.initStars(count);
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.scale = Math.min(w / 1280, h / 800, 1);
  }

  private initStars(count: number) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        baseBrightness: 0.3 + Math.random() * 0.7,
        brightness: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.01 + Math.random() * 0.025,
        boost: 0
      });
    }
  }

  triggerVictoryFlash() {
    this.boostFlashCount = 3;
    this.boostFlashTimer = 0;
  }

  update(dt: number) {
    if (this.boostFlashCount > 0) {
      this.boostFlashTimer += dt;
      const period = 500;
      if (this.boostFlashTimer >= period) {
        this.boostFlashTimer -= period;
        this.boostFlashCount--;
      }
      const t = this.boostFlashTimer / period;
      this.boostAll = this.boostFlashCount > 0 ? Math.sin(t * Math.PI) : 0;
    } else if (this.boostAll > 0) {
      this.boostAll = Math.max(0, this.boostAll - dt * 0.002);
    }

    for (const star of this.stars) {
      star.phase += star.phaseSpeed * (dt / 16.67);
      star.brightness = star.baseBrightness + Math.sin(star.phase) * 0.35;
      star.brightness = Math.max(0.2, Math.min(1.0, star.brightness + this.boostAll));
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    for (const star of this.stars) {
      const alpha = star.brightness;
      const size = star.size * this.scale;
      ctx.beginPath();
      ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(230, 225, 255, ${alpha})`;
      ctx.shadowColor = `rgba(180, 167, 255, ${alpha * 0.8})`;
      ctx.shadowBlur = size * 3;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  repositionStars() {
    for (const star of this.stars) {
      star.x = Math.random() * this.width;
      star.y = Math.random() * this.height;
    }
  }
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export class Ripples {
  private ripples: Ripple[] = [];
  private maxRipples: number = 30;

  add(x: number, y: number, now: number) {
    if (this.ripples.length >= this.maxRipples) {
      this.ripples.shift();
    }
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 30,
      startTime: now,
      duration: 1200
    });
  }

  update(now: number) {
    this.ripples = this.ripples.filter((r) => {
      const elapsed = now - r.startTime;
      return elapsed < r.duration;
    });

    for (const ripple of this.ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;
      ripple.radius = ripple.maxRadius * progress;
    }
  }

  render(ctx: CanvasRenderingContext2D, now: number) {
    ctx.lineWidth = 1.5;

    for (const ripple of this.ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;
      const alpha = 0.8 * (1 - progress);

      const gradient = ctx.createRadialGradient(
        ripple.x,
        ripple.y,
        0,
        ripple.x,
        ripple.y,
        ripple.radius
      );
      gradient.addColorStop(0, `rgba(184,212,240,0)`);
      gradient.addColorStop(0.5, `rgba(184,212,240,${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(232,240,255,${alpha})`);

      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

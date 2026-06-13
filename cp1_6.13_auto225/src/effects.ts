import gsap from 'gsap';

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
  active: boolean;
}

export class EffectManager {
  private ripples: Ripple[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  createRipple(x: number, y: number, color: string): void {
    this.ripples.push({
      x,
      y,
      radius: 20,
      maxRadius: 40,
      opacity: 0.6,
      color,
      active: true
    });
  }

  update(deltaTime: number): void {
    const duration = 0.4;

    for (const ripple of this.ripples) {
      if (!ripple.active) continue;

      ripple.radius += (ripple.maxRadius - 20) * (deltaTime / duration);
      ripple.opacity = 0.6 * (1 - (ripple.radius - 20) / (ripple.maxRadius - 20));

      if (ripple.radius >= ripple.maxRadius) {
        ripple.active = false;
      }
    }

    this.ripples = this.ripples.filter(r => r.active);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      if (!ripple.active) continue;

      ctx.save();
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = ripple.opacity;
      ctx.shadowColor = ripple.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
    }
  }

  triggerLightBurst(_centerX: number, _centerY: number, element: HTMLElement, onComplete?: () => void): void {
    const diagonal = Math.sqrt(
      this.canvasWidth * this.canvasWidth +
      this.canvasHeight * this.canvasHeight
    ) * 1.2;

    gsap.set(element, {
      width: 0,
      height: 0,
      opacity: 1,
      left: '50%',
      top: '50%',
      xPercent: -50,
      yPercent: -50
    });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(element, { opacity: 0 });
        if (onComplete) onComplete();
      }
    });

    tl.to(element, {
      width: diagonal,
      height: diagonal,
      opacity: 1,
      duration: 0.8,
      ease: 'power2.out'
    });

    tl.to(element, {
      opacity: 0,
      duration: 0.7,
      ease: 'power1.out'
    }, '-=0.3');
  }

  fadeInImage(element: HTMLElement, duration: number = 2): void {
    gsap.fromTo(element,
      { opacity: 0 },
      { opacity: 1, duration, ease: 'power2.out' }
    );
  }

  fadeOutImage(element: HTMLElement, duration: number = 0.5): void {
    gsap.to(element, { opacity: 0, duration, ease: 'power1.in' });
  }

  flashElement(element: HTMLElement): void {
    gsap.to(element, {
      opacity: 0.3,
      duration: 0.25,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });
  }

  stopFlash(element: HTMLElement): void {
    gsap.killTweensOf(element);
    gsap.set(element, { opacity: 1 });
  }

  clear(): void {
    this.ripples = [];
  }
}

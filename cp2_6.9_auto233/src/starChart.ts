import { PlanetInfo, PLANETS } from './messageReceiver';

export class StarChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelRatio: number;
  private planets: PlanetInfo[] = PLANETS;
  private flashingPlanet: PlanetInfo | null = null;
  private flashStartTime: number = 0;
  private flashDuration: number = 1000;
  private stars: Array<{ x: number; y: number; size: number; twinkle: number }> = [];
  private descriptionEl: HTMLElement | null = null;
  private onPlanetClick: ((planet: PlanetInfo) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context for star chart canvas');
    this.ctx = ctx;
    this.pixelRatio = window.devicePixelRatio || 1;
    this.setupHighDPICanvas();
    this.generateStars();
    this.bindEvents();
  }

  private setupHighDPICanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.pixelRatio;
    this.canvas.height = rect.height * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);
  }

  public setDescriptionElement(el: HTMLElement): void {
    this.descriptionEl = el;
  }

  public setOnPlanetClick(callback: (planet: PlanetInfo) => void): void {
    this.onPlanetClick = callback;
  }

  private generateStars(): void {
    this.stars = [];
    const rect = this.canvas.getBoundingClientRect();
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
        size: Math.random() > 0.8 ? 2 : 1,
        twinkle: Math.random() * Math.PI * 2
      });
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', this.onClick.bind(this));
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private onClick(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.handleTap(coords.x, coords.y);
  }

  private onTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.handleTap(coords.x, coords.y);
    e.preventDefault();
  }

  private handleTap(x: number, y: number): void {
    for (const planet of this.planets) {
      const dx = x - planet.x;
      const dy = y - planet.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= 12) {
        this.flashPlanet(planet);
        this.showDescription(planet);
        if (this.onPlanetClick) {
          this.onPlanetClick(planet);
        }
        return;
      }
    }
  }

  public flashPlanet(planet: PlanetInfo): void {
    this.flashingPlanet = planet;
    this.flashStartTime = performance.now();
    this.showDescription(planet);
  }

  private showDescription(planet: PlanetInfo): void {
    if (this.descriptionEl) {
      this.descriptionEl.style.color = planet.color;
      this.descriptionEl.textContent = planet.description;
      this.descriptionEl.style.borderColor = planet.color;
    }
  }

  private getFlashIntensity(): number {
    if (!this.flashingPlanet) return 0;
    const elapsed = performance.now() - this.flashStartTime;
    if (elapsed > this.flashDuration) {
      this.flashingPlanet = null;
      return 0;
    }
    const progress = elapsed / this.flashDuration;
    const cycles = 2;
    const phase = progress * cycles * Math.PI * 2;
    return 0.2 + 0.8 * (0.5 + 0.5 * Math.cos(phase));
  }

  public update(_deltaTime: number): void {
  }

  public render(): void {
    const ctx = this.ctx;
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#0F0F18';
    ctx.lineWidth = 0.5;
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const now = performance.now() / 1000;
    for (const star of this.stars) {
      const twinkle = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(now * 2 + star.twinkle));
      ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.8})`;
      ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
    }

    ctx.strokeStyle = '#1A1A28';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 0; i < this.planets.length; i++) {
      for (let j = i + 1; j < this.planets.length; j++) {
        if (Math.random() > 0.5) {
          const p1 = this.planets[i];
          const p2 = this.planets[j];
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
    ctx.setLineDash([]);

    for (const planet of this.planets) {
      const isFlashing = this.flashingPlanet?.id === planet.id;
      const flashIntensity = isFlashing ? this.getFlashIntensity() : 0;
      const baseRadius = 5;
      const pulseRadius = isFlashing ? baseRadius + 4 + flashIntensity * 6 : baseRadius;

      if (isFlashing && flashIntensity > 0.1) {
        const glowRadius = pulseRadius + 10 + flashIntensity * 15;
        const gradient = ctx.createRadialGradient(
          planet.x, planet.y, 0,
          planet.x, planet.y, glowRadius
        );
        gradient.addColorStop(0, planet.color + Math.floor(flashIntensity * 80).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, planet.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(planet.x, planet.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(planet.x, planet.y, pulseRadius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = planet.color + (isFlashing ? '80' : '40');
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(planet.x, planet.y, baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = planet.color;
      ctx.shadowColor = planet.color;
      ctx.shadowBlur = isFlashing ? 12 + flashIntensity * 10 : 6;
      ctx.fill();
      ctx.shadowBlur = 0;

      for (let px = -2; px <= 2; px++) {
        for (let py = -2; py <= 2; py++) {
          if (px * px + py * py <= 9 && Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(planet.x + px, planet.y + py, 1, 1);
          }
        }
      }

      ctx.fillStyle = '#a0a0b0';
      ctx.font = '8px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, planet.x, planet.y + baseRadius + 12);

      ctx.fillStyle = '#505060';
      ctx.font = '7px Courier New';
      ctx.fillText(`${planet.frequency}MHz`, planet.x, planet.y + baseRadius + 22);
    }

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    const corners = [
      [4, 4], [width - 8, 4], [4, height - 8], [width - 8, height - 8]
    ];
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1;
    for (const [cx, cy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + 4);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 4, cy);
      ctx.stroke();
    }
  }
}

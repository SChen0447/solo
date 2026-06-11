import {
  ElementType,
  ELEMENTS,
  GENERATING_CYCLE,
  OVERCOMING_CYCLE,
  ELEMENT_COLORS,
  ELIXIR_EFFECTS,
  FIRE_COLORS
} from './constants';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colorIndex: number;
}

export interface ElixirResult {
  name: string;
  effect: string;
  element: ElementType;
  power: number;
  elements: Record<ElementType, number>;
  elementPercentages: Record<ElementType, number>;
  color: string;
}

export class AlchemyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: FireParticle[] = [];
  private particleNum = 200;
  private isAlchemizing = false;
  private alchemyTime = 0;
  private alchemyDuration = 5000;
  private harmonyIndex = 0;
  private currentElements: Record<ElementType, number> = {
    metal: 0,
    wood: 0,
    water: 0,
    fire: 0,
    earth: 0
  };
  private animationId: number | null = null;
  private lastTime = 0;
  private onCompleteCallback: (result: ElixirResult) => void = () => {};

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleNum; i++) {
      this.particles.push(this.createParticle(true));
    }
  }

  private createParticle(initial: boolean = false): FireParticle {
    const cx = this.canvas.width / 2;
    const baseY = this.canvas.height * 0.7;
    
    return {
      x: cx + (Math.random() - 0.5) * 60,
      y: initial ? baseY - Math.random() * 100 : baseY,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 3 - 1,
      life: initial ? Math.random() : 1,
      maxLife: 1,
      size: Math.random() * 8 + 4,
      colorIndex: Math.random()
    };
  }

  public updateElements(elements: Record<ElementType, number>): void {
    this.currentElements = { ...elements };
    this.harmonyIndex = this.calculateHarmonyIndex(elements);
  }

  private calculateHarmonyIndex(elements: Record<ElementType, number>): number {
    let total = 0;
    ELEMENTS.forEach((el) => {
      total += elements[el];
    });
    
    if (total === 0) return 0;
    
    let generatingScore = 0;
    let overcomingScore = 0;
    
    ELEMENTS.forEach((el) => {
      const weight = elements[el] / total;
      const generated = GENERATING_CYCLE[el];
      const overcome = OVERCOMING_CYCLE[el];
      
      generatingScore += weight * (elements[generated] / total);
      overcomingScore += weight * (elements[overcome] / total);
    });
    
    const rawIndex = (generatingScore - overcomingScore) * 10;
    return Math.max(-10, Math.min(10, rawIndex));
  }

  public startAlchemy(): boolean {
    const total = ELEMENTS.reduce((sum, el) => sum + this.currentElements[el], 0);
    if (total === 0) return false;
    
    this.isAlchemizing = true;
    this.alchemyTime = 0;
    this.lastTime = performance.now();
    this.animate();
    return true;
  }

  private animate(): void {
    if (!this.isAlchemizing) return;
    
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    
    this.alchemyTime += delta;
    
    if (this.alchemyTime >= this.alchemyDuration) {
      this.isAlchemizing = false;
      const result = this.generateElixir();
      this.onCompleteCallback(result);
      return;
    }
    
    this.updateParticles(delta);
    this.render();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private updateParticles(delta: number): void {
    const speedMultiplier = 0.5 + (Math.abs(this.harmonyIndex) / 10) * 1.5;
    const dt = delta / 16;
    
    this.particles.forEach((particle, index) => {
      particle.x += particle.vx * dt * speedMultiplier;
      particle.y += particle.vy * dt * speedMultiplier;
      particle.life -= 0.01 * dt * speedMultiplier;
      
      particle.vx += (Math.random() - 0.5) * 0.2 * dt;
      particle.vy -= 0.05 * dt;
      
      if (particle.life <= 0 || particle.y < -20) {
        this.particles[index] = this.createParticle();
      }
    });
    
    const extraParticles = Math.floor(speedMultiplier * 50);
    for (let i = 0; i < extraParticles && this.particles.length < 300; i++) {
      this.particles.push(this.createParticle());
    }
    
    while (this.particles.length > this.particleNum + extraParticles) {
      const idx = this.particles.findIndex(p => p.life < 0.3);
      if (idx >= 0) {
        this.particles.splice(idx, 1);
      } else {
        break;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const progress = this.alchemyTime / this.alchemyDuration;
    
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const isWarm = this.harmonyIndex >= 0;
    const colors = isWarm ? FIRE_COLORS.warm : FIRE_COLORS.cool;
    const intensity = Math.abs(this.harmonyIndex) / 10;
    
    const glowGradient = ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height * 0.7,
      0,
      this.canvas.width / 2,
      this.canvas.height * 0.7,
      150
    );
    glowGradient.addColorStop(0, `${isWarm ? '#ff6347' : '#00bfff'}33`);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.particles.forEach((particle) => {
      const alpha = particle.life * (0.5 + intensity * 0.5);
      const colorIdx = Math.floor(particle.colorIndex * colors.length);
      const color = colors[Math.min(colorIdx, colors.length - 1)];
      
      const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.size * (1 + intensity * 0.5)
      );
      
      gradient.addColorStop(0, this.hexToRgba(color, alpha));
      gradient.addColorStop(0.4, this.hexToRgba(color, alpha * 0.6));
      gradient.addColorStop(1, this.hexToRgba(color, 0));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        particle.x,
        particle.y,
        particle.size * (1 + intensity * 0.5),
        0,
        Math.PI * 2
      );
      ctx.fill();
    });
    
    const flashAlpha = 0.1 + Math.sin(progress * Math.PI * 20) * 0.05 * intensity;
    const bottomGradient = ctx.createLinearGradient(
      0,
      this.canvas.height * 0.8,
      0,
      this.canvas.height
    );
    bottomGradient.addColorStop(0, this.hexToRgba(isWarm ? '#ffa500' : '#7b68ee', flashAlpha));
    bottomGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = bottomGradient;
    ctx.fillRect(0, this.canvas.height * 0.8, this.canvas.width, this.canvas.height * 0.2);
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private generateElixir(): ElixirResult {
    const elements = { ...this.currentElements };
    const total = ELEMENTS.reduce((sum, el) => sum + elements[el], 0);
    
    const percentages: Record<ElementType, number> = {
      metal: 0,
      wood: 0,
      water: 0,
      fire: 0,
      earth: 0
    };
    
    ELEMENTS.forEach((el) => {
      percentages[el] = total > 0 ? (elements[el] / total) * 100 : 0;
    });
    
    let dominantElement: ElementType = 'earth';
    let maxPercentage = 0;
    
    ELEMENTS.forEach((el) => {
      if (percentages[el] > maxPercentage) {
        maxPercentage = percentages[el];
        dominantElement = el;
      }
    });
    
    const power = Math.min(100, Math.floor(total * (1 + Math.abs(this.harmonyIndex) / 20)));
    const effectTier = Math.min(2, Math.floor(power / 35));
    const effects = ELIXIR_EFFECTS[dominantElement];
    const effect = effects[effectTier];
    
    const color = this.calculateElixirColor(percentages);
    
    return {
      name: effect.name,
      effect: effect.effect,
      element: dominantElement,
      power,
      elements,
      elementPercentages: percentages,
      color
    };
  }

  private calculateElixirColor(percentages: Record<ElementType, number>): string {
    let h = 0, s = 0, l = 0, totalWeight = 0;
    
    const elementHsl: Record<ElementType, { h: number; s: number; l: number }> = {
      metal: { h: 45, s: 100, l: 60 },
      wood: { h: 120, s: 100, l: 34 },
      water: { h: 210, s: 100, l: 50 },
      fire: { h: 15, s: 100, l: 50 },
      earth: { h: 30, s: 100, l: 37 }
    };
    
    ELEMENTS.forEach((el) => {
      const weight = percentages[el] / 100;
      if (weight > 0) {
        const hsl = elementHsl[el];
        h += hsl.h * weight;
        s += hsl.s * weight;
        l += hsl.l * weight;
        totalWeight += weight;
      }
    });
    
    if (totalWeight > 0) {
      h /= totalWeight;
      s /= totalWeight;
      l /= totalWeight;
    }
    
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  public onComplete(callback: (result: ElixirResult) => void): void {
    this.onCompleteCallback = callback;
  }

  public getHarmonyIndex(): number {
    return this.harmonyIndex;
  }

  public getElementPercentages(): Record<ElementType, number> {
    const total = ELEMENTS.reduce((sum, el) => sum + this.currentElements[el], 0);
    const percentages: Record<ElementType, number> = {
      metal: 0,
      wood: 0,
      water: 0,
      fire: 0,
      earth: 0
    };
    
    if (total > 0) {
      ELEMENTS.forEach((el) => {
        percentages[el] = (this.currentElements[el] / total) * 100;
      });
    }
    
    return percentages;
  }

  public isRunning(): boolean {
    return this.isAlchemizing;
  }

  public renderIdleFrame(): void {
    this.render();
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.isAlchemizing = false;
  }
}

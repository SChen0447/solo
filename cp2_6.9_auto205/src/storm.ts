export interface WaveVertex {
  x: number;
  y: number;
}

export interface FoamParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
}

export interface OceanCurrent {
  dx: number;
  dy: number;
  strength: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const WAVE_VERTEX_COUNT = 80;
const FOAM_MAX_COUNT = 60;

interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
  offset: number;
}

export class StormSystem {
  private waveLayers: WaveLayer[] = [];
  private waveVertices: WaveVertex[] = [];
  private foamParticles: FoamParticle[] = [];
  private current: OceanCurrent = { dx: 1, dy: 0.2, strength: 3 };
  private time: number = 0;
  private currentChangeTimer: number = 0;

  constructor() {
    this.initWaveLayers();
    this.initWaveVertices();
    this.initFoamParticles();
  }

  private initWaveLayers(): void {
    this.waveLayers = [
      { amplitude: 18, frequency: 0.018, speed: 0.8, phase: 0, offset: 320 },
      { amplitude: 12, frequency: 0.032, speed: 1.4, phase: Math.PI / 3, offset: 320 },
      { amplitude: 7, frequency: 0.055, speed: 2.1, phase: Math.PI / 2, offset: 320 },
      { amplitude: 4, frequency: 0.09, speed: 3.0, phase: 0, offset: 320 }
    ];
  }

  private initWaveVertices(): void {
    for (let i = 0; i <= WAVE_VERTEX_COUNT; i++) {
      this.waveVertices.push({ x: 0, y: 0 });
    }
  }

  private initFoamParticles(): void {
    for (let i = 0; i < FOAM_MAX_COUNT; i++) {
      this.foamParticles.push(this.createFoamParticle(true));
    }
  }

  private createFoamParticle(randomY: boolean = false): FoamParticle {
    const maxLife = 120 + Math.random() * 180;
    return {
      x: 50 + Math.random() * (CANVAS_WIDTH - 50),
      y: randomY ? 300 + Math.random() * 250 : 280,
      radius: 2 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.4,
      life: maxLife,
      maxLife: maxLife,
      vx: (0.5 + Math.random() * 1.5) * (Math.random() > 0.5 ? 1 : -1),
      vy: (Math.random() - 0.5) * 0.5
    };
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.currentChangeTimer += deltaTime;

    if (this.currentChangeTimer > 5) {
      this.currentChangeTimer = 0;
      const targetStrength = 2 + Math.random() * 7;
      const targetDx = 0.6 + Math.random() * 0.8;
      const targetDy = -0.3 + Math.random() * 0.6;
      this.current.strength += (targetStrength - this.current.strength) * 0.3;
      this.current.dx += (targetDx - this.current.dx) * 0.3;
      this.current.dy += (targetDy - this.current.dy) * 0.3;
    }

    this.updateWaveVertices();
    this.updateFoamParticles(deltaTime);
  }

  private updateWaveVertices(): void {
    const step = CANVAS_WIDTH / WAVE_VERTEX_COUNT;

    for (let i = 0; i <= WAVE_VERTEX_COUNT; i++) {
      const x = i * step;
      let y = 0;

      for (const layer of this.waveLayers) {
        y += layer.amplitude * Math.sin(x * layer.frequency + this.time * layer.speed + layer.phase);
      }

      this.waveVertices[i].x = x;
      this.waveVertices[i].y = y + 320;
    }
  }

  private updateFoamParticles(deltaTime: number): void {
    const dt = deltaTime;

    for (let i = this.foamParticles.length - 1; i >= 0; i--) {
      const foam = this.foamParticles[i];
      foam.x += (foam.vx + this.current.dx * this.current.strength * 0.15) * dt * 60;
      foam.y += (foam.vy + this.current.dy * this.current.strength * 0.1) * dt * 60;
      foam.life -= dt * 60;

      const waveY = this.getWaveYAt(foam.x);
      if (foam.y < waveY - 5) {
        foam.y = waveY + Math.random() * 10;
      }

      foam.alpha = (foam.life / foam.maxLife) * (0.3 + Math.random() * 0.1);

      if (foam.life <= 0 || foam.x > CANVAS_WIDTH + 20 || foam.x < 30 || foam.y > CANVAS_HEIGHT) {
        this.foamParticles[i] = this.createFoamParticle();
        this.foamParticles[i].y = this.getWaveYAt(this.foamParticles[i].x) + Math.random() * 30;
      }
    }
  }

  public getWaveYAt(x: number): number {
    let y = 0;
    for (const layer of this.waveLayers) {
      y += layer.amplitude * Math.sin(x * layer.frequency + this.time * layer.speed + layer.phase);
    }
    return y + 320;
  }

  public getWaveVertices(): WaveVertex[] {
    return this.waveVertices;
  }

  public getFoamParticles(): FoamParticle[] {
    return this.foamParticles;
  }

  public getCurrent(): OceanCurrent {
    return { ...this.current };
  }

  public getCurrentStrengthLevel(): number {
    return Math.round(this.current.strength);
  }
}

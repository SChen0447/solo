export interface ParticleData {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  phi: number;
  theta: number;
  radius: number;
  hue: number;
  size: number;
  freqIndex: number;
  shockwaveOffset: number;
  shockwaveTarget: number;
}

export interface ColorTheme {
  name: string;
  hueStart: number;
  hueEnd: number;
  beatHue: number;
  gradientStart: string;
  gradientEnd: string;
}

export const colorThemes: Record<string, ColorTheme> = {
  aurora: {
    name: '极光蓝紫',
    hueStart: 240,
    hueEnd: 300,
    beatHue: 30,
    gradientStart: '#667eea',
    gradientEnd: '#764ba2'
  },
  fire: {
    name: '火焰红橙',
    hueStart: 0,
    hueEnd: 60,
    beatHue: 120,
    gradientStart: '#f093fb',
    gradientEnd: '#f5576c'
  },
  cyber: {
    name: '赛博粉青',
    hueStart: 280,
    hueEnd: 340,
    beatHue: 180,
    gradientStart: '#f093fb',
    gradientEnd: '#4facfe'
  }
};

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleData[] = [];
  private starRingParticles: { x: number; y: number; z: number }[] = [];
  private particleCount: number = 500;
  private starRingCount: number = 200;
  private sphereRadius: number = 200;
  private rotationY: number = 0;
  private rotationSpeed: number = 10;
  private amplitude: number = 0.5;
  private sensitivity: number = 1.0;
  private particleSize: number = 3;
  private currentTheme: ColorTheme = colorThemes.aurora;
  private isBeat: boolean = false;
  private beatProgress: number = 1;
  private beatDuration: number = 150;
  private lastBeatTime: number = 0;
  private time: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.initParticles();
    this.initStarRing();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
    
    const minDim = Math.min(rect.width, rect.height);
    this.sphereRadius = minDim * 0.35;
  }

  private initParticles(): void {
    this.particles = [];
    const freqBinCount = 128;

    const testPositions = [
      { x: this.sphereRadius, y: 0, z: 0, label: 'right' },
      { x: -this.sphereRadius, y: 0, z: 0, label: 'left' },
      { x: 0, y: this.sphereRadius, z: 0, label: 'top' },
      { x: 0, y: -this.sphereRadius, z: 0, label: 'bottom' },
      { x: 0, y: 0, z: this.sphereRadius, label: 'front' },
      { x: 0, y: 0, z: -this.sphereRadius, label: 'back' },
    ];

    for (const pos of testPositions) {
      this.particles.push({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        baseX: pos.x,
        baseY: pos.y,
        baseZ: pos.z,
        phi: 0,
        theta: 0,
        radius: this.sphereRadius,
        hue: 0,
        size: 5,
        freqIndex: 0,
        shockwaveOffset: 0,
        shockwaveTarget: 0
      });
    }

    return;

    for (let i = 0; i < this.particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = this.sphereRadius * (0.95 + Math.random() * 0.1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const hueT = Math.random();
      const hue = this.currentTheme.hueStart + hueT * (this.currentTheme.hueEnd - this.currentTheme.hueStart);

      this.particles.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        phi,
        theta,
        radius,
        hue,
        size: 1 + Math.random() * 1.5,
        freqIndex: Math.floor(Math.random() * freqBinCount),
        shockwaveOffset: 0,
        shockwaveTarget: 0
      });
    }
  }

  private initStarRing(): void {
    this.starRingParticles = [];
    const ringRadius = this.sphereRadius * 1.3;

    for (let i = 0; i < this.starRingCount; i++) {
      const angle = (i / this.starRingCount) * Math.PI * 2;
      const x = ringRadius * Math.cos(angle);
      const y = 0;
      const z = ringRadius * Math.sin(angle);
      this.starRingParticles.push({ x, y, z });
    }
  }

  public update(frequencyData: Uint8Array, isBeat: boolean, deltaTime: number): void {
    this.time += deltaTime;
    this.rotationY += (this.rotationSpeed * Math.PI / 180) * (deltaTime / 1000);

    if (isBeat) {
      this.lastBeatTime = performance.now();
      this.beatProgress = 0;
    }

    const timeSinceBeat = performance.now() - this.lastBeatTime;
    this.beatProgress = Math.min(timeSinceBeat / this.beatDuration, 1);

    const shockwaveFactor = 1 - this.beatProgress;
    const shockwaveAmount = shockwaveFactor * 0.2 * this.sphereRadius;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const freqValue = frequencyData[p.freqIndex] / 255;
      
      const waveAmplitude = this.amplitude * this.sensitivity * freqValue * 30;
      const waveOffset = Math.sin(this.time * 0.003 + p.theta * 2 + p.phi) * waveAmplitude;

      const beatRadialOffset = isBeat ? shockwaveAmount : 0;
      const currentRadius = p.radius + beatRadialOffset;

      const baseX = currentRadius * Math.sin(p.phi) * Math.cos(p.theta);
      const baseY = currentRadius * Math.sin(p.phi) * Math.sin(p.theta) + waveOffset;
      const baseZ = currentRadius * Math.cos(p.phi);

      p.baseX = baseX;
      p.baseY = baseY;
      p.baseZ = baseZ;

      const cosY = Math.cos(this.rotationY);
      const sinY = Math.sin(this.rotationY);
      p.x = baseX * cosY - baseZ * sinY;
      p.z = baseX * sinY + baseZ * cosY;
      p.y = baseY;

      const hueT = (Math.sin(this.time * 0.0005 + p.theta) + 1) / 2;
      const normalHue = this.currentTheme.hueStart + hueT * (this.currentTheme.hueEnd - this.currentTheme.hueStart);
      
      const beatHue = this.currentTheme.beatHue;
      const hueLerpFactor = shockwaveFactor;
      p.hue = normalHue + (beatHue - normalHue) * hueLerpFactor;
    }

    for (let i = 0; i < this.starRingParticles.length; i++) {
      const p = this.starRingParticles[i];
      const cosY = Math.cos(this.rotationY * 0.5);
      const sinY = Math.sin(this.rotationY * 0.5);
      const newX = p.x * cosY - p.z * sinY;
      const newZ = p.x * sinY + p.z * cosY;
      p.x = newX;
      p.z = newZ;
    }
  }

  public draw(): void {
    const ctx = this.ctx;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    const allParticles = [
      ...this.particles.map(p => ({ ...p, isStar: false })),
      ...this.starRingParticles.map(p => ({ 
        x: p.x, y: p.y, z: p.z, 
        size: 1.5, hue: 0, isStar: true 
      }))
    ];

    allParticles.sort((a, b) => a.z - b.z);

    const fov = this.sphereRadius * 2.5;

    for (const p of allParticles) {
      if (p.z < -this.sphereRadius * 0.5) continue;

      const scale = fov / (fov - p.z);
      const screenX = this.centerX + p.x * scale;
      const screenY = this.centerY + p.y * scale;

      if ('isStar' in p && p.isStar) {
        const alpha = Math.min(0.8, 0.3 + 0.5 * scale);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const particle = p as ParticleData & { isStar: boolean };
        const size = this.particleSize * particle.size * scale;
        
        if (size < 0.5) continue;

        ctx.save();
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.max(3, size), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  public setParticleSize(size: number): void {
    this.particleSize = size;
  }

  public setSensitivity(value: number): void {
    this.sensitivity = value;
  }

  public setTheme(themeName: string): void {
    const theme = colorThemes[themeName];
    if (theme) {
      this.currentTheme = theme;
    }
  }

  public getCurrentTheme(): ColorTheme {
    return this.currentTheme;
  }

  public handleResize(): void {
    this.resize();
    this.initParticles();
    this.initStarRing();
  }
}

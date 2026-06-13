import {
  RGB,
  lerp,
  clamp,
  gradientColor,
  rgbToString,
  randomRange,
  smoothNoise1D
} from './utils';

const GRID_SIZE = 50;
const WAVE_SPEED = 15;
const WAVE_MIN_HEIGHT = -20;
const WAVE_MAX_HEIGHT = 20;
const OCEAN_SHALLOW: RGB = { r: 135, g: 206, b: 235 };
const OCEAN_DEEP: RGB = { r: 25, g: 25, b: 112 };

interface WavePoint {
  x: number;
  y: number;
  baseY: number;
  height: number;
  speed: number;
  phase: number;
  frequency: number;
  amplitude: number;
}

interface WaveLayer {
  amplitude: number;
  frequency: number;
  speed: number;
  phase: number;
}

export class Ocean {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private gridSize: number;
  private points: WavePoint[][] = [];
  private waveLayers: WaveLayer[] = [];
  private time: number = 0;
  private collisionZones: { startX: number; endX: number; lastTrigger: number }[] = [];
  private foamParticles: { x: number; y: number; life: number; maxLife: number }[] = [];

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.gridSize = GRID_SIZE;
    this.init();
  }

  private init(): void {
    this.waveLayers = [
      { amplitude: 15, frequency: 0.015, speed: 1.0, phase: 0 },
      { amplitude: 8, frequency: 0.025, speed: 1.5, phase: Math.PI / 3 },
      { amplitude: 4, frequency: 0.04, speed: 2.0, phase: Math.PI / 2 },
      { amplitude: 2, frequency: 0.06, speed: 2.5, phase: Math.PI }
    ];

    const cols = this.gridSize;
    const rows = this.gridSize;
    const startY = this.height * 0.55;
    const endY = this.height * 0.95;

    for (let row = 0; row < rows; row++) {
      this.points[row] = [];
      for (let col = 0; col < cols; col++) {
        const x = (col / (cols - 1)) * this.width;
        const baseY = lerp(startY, endY, row / (rows - 1));
        const depthT = row / (rows - 1);

        this.points[row][col] = {
          x,
          y: baseY,
          baseY,
          height: 0,
          speed: randomRange(0.8, 1.2),
          phase: randomRange(0, Math.PI * 2),
          frequency: 0.5 + depthT * 0.5,
          amplitude: (1 - depthT * 0.7) * WAVE_MAX_HEIGHT
        };
      }
    }

    for (let i = 0; i < 20; i++) {
      this.foamParticles.push({
        x: randomRange(0, this.width),
        y: randomRange(this.height * 0.55, this.height * 0.75),
        life: randomRange(0, 1),
        maxLife: randomRange(1000, 3000)
      });
    }
  }

  update(deltaTime: number, harpBounds?: { x: number; y: number; width: number; height: number }): number[] {
    this.time += deltaTime;
    const dt = deltaTime / 1000;

    this.waveLayers.forEach((layer) => {
      layer.phase += layer.speed * dt * WAVE_SPEED * 0.01;
    });

    const cols = this.gridSize;
    const rows = this.gridSize;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const point = this.points[row][col];
        const depthT = row / (rows - 1);
        const waveHeight = this.calculateWaveHeight(point.x, row, depthT);

        point.height = waveHeight;
        point.y = point.baseY + waveHeight;
      }
    }

    this.foamParticles.forEach((particle) => {
      particle.life += dt;
      if (particle.life >= 1) {
        particle.life = 0;
        particle.x = randomRange(0, this.width);
        particle.y = randomRange(this.height * 0.55, this.height * 0.7);
        particle.maxLife = randomRange(1000, 3000);
      }
    });

    if (harpBounds) {
      return this.checkCollision(harpBounds);
    }

    return [];
  }

  private calculateWaveHeight(x: number, row: number, depthT: number): number {
    let height = 0;
    const timeSec = this.time / 1000;

    this.waveLayers.forEach((layer, index) => {
      const waveX = x * layer.frequency + layer.phase;
      const noiseVal = smoothNoise1D(timeSec * 0.5 + x * 0.01 + index * 100, index + 1);
      const wave = Math.sin(waveX + timeSec * layer.speed * 0.5) * layer.amplitude;
      const depthMultiplier = 1 - depthT * 0.8;
      height += wave * depthMultiplier * (0.8 + noiseVal * 0.4);
    });

    return clamp(height, WAVE_MIN_HEIGHT, WAVE_MAX_HEIGHT);
  }

  getWaveHeightAt(x: number): number {
    const col = clamp(Math.floor((x / this.width) * (this.gridSize - 1)), 0, this.gridSize - 1);
    const surfaceRow = 0;

    if (this.points[surfaceRow] && this.points[surfaceRow][col]) {
      return this.points[surfaceRow][col].height;
    }
    return 0;
  }

  checkCollision(harpBounds: { x: number; y: number; width: number; height: number }): number[] {
    const triggers: number[] = [];
    const now = performance.now();
    const triggerCooldown = 300;

    const baseY = harpBounds.y + harpBounds.height;
    const startX = harpBounds.x;
    const endX = harpBounds.x + harpBounds.width;

    const surfaceRow = 0;
    const cols = this.gridSize;

    for (let col = 0; col < cols; col++) {
      const point = this.points[surfaceRow][col];
      if (point.x >= startX && point.x <= endX) {
        const waveY = point.y;
        const collisionThreshold = baseY - 10;

        if (waveY >= collisionThreshold) {
          const zoneIndex = Math.floor(((point.x - startX) / harpBounds.width) * 3);
          const zone = this.collisionZones[zoneIndex];

          if (!zone || now - zone.lastTrigger > triggerCooldown) {
            const normalizedX = (point.x - startX) / harpBounds.width;
            const waveIntensity = (waveY - collisionThreshold) / 30;
            triggers.push(normalizedX * (0.8 + waveIntensity * 0.2));

            if (!this.collisionZones[zoneIndex]) {
              this.collisionZones[zoneIndex] = { startX: 0, endX: 0, lastTrigger: 0 };
            }
            this.collisionZones[zoneIndex].lastTrigger = now;
          }
        }
      }
    }

    return triggers;
  }

  render(): void {
    const ctx = this.ctx;
    const rows = this.gridSize;
    const cols = this.gridSize;

    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const p1 = this.points[row][col];
        const p2 = this.points[row][col + 1];
        const p3 = this.points[row + 1][col + 1];
        const p4 = this.points[row + 1][col];

        const depthT = row / (rows - 1);
        const heightT = (p1.height + p2.height + p3.height + p4.height) / 4 / WAVE_MAX_HEIGHT;
        const colorT = depthT * 0.7 + Math.abs(heightT) * 0.3;
        const color = gradientColor(OCEAN_SHALLOW, OCEAN_DEEP, colorT);

        ctx.fillStyle = rgbToString(color, 0.9);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        if (row === 0 && heightT > 0.3) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + heightT * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }

    this.renderFoam();
    this.renderSurfaceHighlight();
  }

  private renderFoam(): void {
    const ctx = this.ctx;

    this.foamParticles.forEach((particle) => {
      const alpha = Math.sin(particle.life * Math.PI) * 0.5;
      const size = 3 + particle.life * 5;

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();

      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const radius = size * (0.7 + Math.sin(particle.life * 10 + i) * 0.3);
        const px = particle.x + Math.cos(angle) * radius;
        const py = particle.y + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fill();
    });

    const surfaceY = this.height * 0.55;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x <= this.width; x += 8) {
      const waveHeight = this.getWaveHeightAt(x);
      const y = surfaceY + waveHeight;
      const foamOffset = Math.sin(x * 0.05 + this.time * 0.003) * 3;

      if (x === 0) {
        ctx.moveTo(x, y + foamOffset);
      } else {
        ctx.lineTo(x, y + foamOffset);
      }
    }
    ctx.stroke();
  }

  private renderSurfaceHighlight(): void {
    const ctx = this.ctx;
    const timeSec = this.time / 1000;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < 5; i++) {
      const x = ((timeSec * 20 + i * 200) % (this.width + 200)) - 100;
      const waveHeight = this.getWaveHeightAt(x);
      const y = this.height * 0.55 + waveHeight;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(x, y, 60, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.points = [];
    this.init();
  }
}

import { ClimateManager, ClimateZoneName } from './climateManager';

export class Minimap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private climateManager: ClimateManager;
  private size: number = 150;

  constructor(canvas: HTMLCanvasElement, climateManager: ClimateManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.climateManager = climateManager;
  }

  public update(): void {
    const ctx = this.ctx;
    const size = this.size;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 2;

    ctx.clearRect(0, 0, size, size);

    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    bgGradient.addColorStop(0, '#1a1a2e');
    bgGradient.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bgGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    const tropicalState = this.climateManager.getZoneState('tropical');
    const temperateState = this.climateManager.getZoneState('temperate');
    const polarState = this.climateManager.getZoneState('polar');

    this.drawClimateZone(ctx, centerX, centerY, radius, 'polar', polarState.density);
    this.drawClimateZone(ctx, centerX, centerY, radius, 'temperate', temperateState.density);
    this.drawClimateZone(ctx, centerX, centerY, radius, 'tropical', tropicalState.density);

    this.drawHeatmap(ctx, centerX, centerY, radius, tropicalState, temperateState, polarState);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawClimateZone(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    zone: ClimateZoneName,
    density: number
  ): void {
    const latRanges: Record<ClimateZoneName, [number, number]> = {
      tropical: [-0.25, 0.25],
      temperate: [0.25, 0.7],
      polar: [0.7, 1]
    };

    const colors: Record<ClimateZoneName, string> = {
      tropical: '#ff6b35',
      temperate: '#4caf50',
      polar: '#55aaff'
    };

    const [minLat, maxLat] = latRanges[zone];
    const intensity = Math.min(density / 15000, 1);

    const color = colors[zone];

    for (let lat = minLat; lat < maxLat; lat += 0.02) {
      const absLat = Math.abs(lat);
      const y = cy - absLat * r;
      const ringRadius = Math.sqrt(r * r - (absLat * r) * (absLat * r));
      const alpha = 0.3 + intensity * 0.5;

      ctx.strokeStyle = this.hexToRgba(color, alpha);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, y, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawHeatmap(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    tropical: { density: number },
    temperate: { density: number },
    polar: { density: number }
  ): void {
    const zones = [
      { name: 'tropical', lat: 0, density: tropical.density, color: '#ff6b35' },
      { name: 'temperate', lat: 0.45, density: temperate.density, color: '#4caf50' },
      { name: 'polar', lat: 0.85, density: polar.density, color: '#55aaff' }
    ];

    zones.forEach((zone) => {
      const intensity = Math.min(zone.density / 15000, 1);
      const y = cy - zone.lat * r;
      const glowRadius = 8 + intensity * 15;

      const gradient = ctx.createRadialGradient(cx, y, 0, cx, y, glowRadius);
      gradient.addColorStop(0, this.hexToRgba(zone.color, 0.8));
      gradient.addColorStop(0.5, this.hexToRgba(zone.color, 0.3));
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, -y, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}

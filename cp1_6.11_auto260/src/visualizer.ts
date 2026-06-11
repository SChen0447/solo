import type { GameState, Pheromone, Room, Tunnel, Ant, FoodSource, Particle, Waypoint, Position } from './types';
import { WORLD_WIDTH, WORLD_HEIGHT, PHEROMONE_GRID_SIZE } from './types';

export class GameVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenTerrain: HTMLCanvasElement;
  private offscreenTerrainCtx: CanvasRenderingContext2D;
  private offscreenPheromone: HTMLCanvasElement;
  private offscreenPheromoneCtx: CanvasRenderingContext2D;
  private offscreenHeatmap: HTMLCanvasElement;
  private offscreenHeatmapCtx: CanvasRenderingContext2D;
  private terrainDirty = true;
  private lastPheromoneCount = 0;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.offscreenTerrain = document.createElement('canvas');
    this.offscreenTerrainCtx = this.offscreenTerrain.getContext('2d')!;
    this.offscreenPheromone = document.createElement('canvas');
    this.offscreenPheromoneCtx = this.offscreenPheromone.getContext('2d')!;
    this.offscreenHeatmap = document.createElement('canvas');
    this.offscreenHeatmapCtx = this.offscreenHeatmap.getContext('2d')!;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.offscreenTerrain.width = WORLD_WIDTH;
    this.offscreenTerrain.height = WORLD_HEIGHT;
    this.offscreenPheromone.width = WORLD_WIDTH;
    this.offscreenPheromone.height = WORLD_HEIGHT;
    this.offscreenHeatmap.width = Math.ceil(WORLD_WIDTH / PHEROMONE_GRID_SIZE);
    this.offscreenHeatmap.height = Math.ceil(WORLD_HEIGHT / PHEROMONE_GRID_SIZE);
    this.terrainDirty = true;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(state.cameraOffset.x, state.cameraOffset.y);
    ctx.scale(state.zoom, state.zoom);

    if (this.terrainDirty) {
      this.renderTerrain(state.rooms, state.tunnels);
      this.terrainDirty = false;
    }
    ctx.drawImage(this.offscreenTerrain, 0, 0);

    if (state.pheromones.length !== this.lastPheromoneCount) {
      this.renderPheromonesOffscreen(state.pheromones);
      this.lastPheromoneCount = state.pheromones.length;
    }
    ctx.drawImage(this.offscreenPheromone, 0, 0);

    this.renderFoodSources(ctx, state.foodSources);
    this.renderWaypoints(ctx, state.waypoints);
    this.renderNest(ctx, state.nest.center, state.nest.radius);
    this.renderAnts(ctx, state.ants, state.time);
    this.renderParticles(ctx, state.particles);

    ctx.restore();

    this.renderHeatmapOverlay(state);
  }

  private renderTerrain(rooms: Room[], tunnels: Tunnel[]): void {
    const ctx = this.offscreenTerrainCtx;
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const grad = ctx.createLinearGradient(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    grad.addColorStop(0, '#5d4037');
    grad.addColorStop(1, '#33691e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = '#4e342e';
    for (const t of tunnels) {
      const dx = t.end.x - t.start.x;
      const dy = t.end.y - t.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const hw = t.width / 2;
      ctx.beginPath();
      ctx.moveTo(t.start.x + nx * hw, t.start.y + ny * hw);
      ctx.lineTo(t.end.x + nx * hw, t.end.y + ny * hw);
      ctx.lineTo(t.end.x - nx * hw, t.end.y - ny * hw);
      ctx.lineTo(t.start.x - nx * hw, t.start.y - ny * hw);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    for (const t of tunnels) {
      const dx = t.end.x - t.start.x;
      const dy = t.end.y - t.start.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const nx = -dy / len;
      const ny = dx / len;
      const hw = t.width / 2;
      ctx.beginPath();
      ctx.moveTo(t.start.x + nx * hw, t.start.y + ny * hw);
      ctx.lineTo(t.end.x + nx * hw, t.end.y + ny * hw);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(t.end.x - nx * hw, t.end.y - ny * hw);
      ctx.lineTo(t.start.x - nx * hw, t.start.y - ny * hw);
      ctx.stroke();
    }

    for (const r of rooms) {
      ctx.beginPath();
      ctx.arc(r.center.x, r.center.y, r.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#4e342e';
      ctx.fill();
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT;
      ctx.fillStyle = Math.random() < 0.5 ? '#1b5e20' : '#3e2723';
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 3 + 1);
    }
    ctx.globalAlpha = 1.0;
  }

  private renderPheromonesOffscreen(pheromones: Pheromone[]): void {
    const ctx = this.offscreenPheromoneCtx;
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    for (const p of pheromones) {
      const alpha = Math.min(p.strength / p.maxStrength, 1.0);
      if (alpha < 0.02) continue;
      ctx.globalAlpha = alpha * 0.5;
      if (p.type === 'friendly') {
        ctx.fillStyle = '#4fc3f7';
      } else {
        ctx.fillStyle = '#ef5350';
      }
      ctx.fillRect(
        p.position.x - PHEROMONE_GRID_SIZE / 2,
        p.position.y - PHEROMONE_GRID_SIZE / 2,
        PHEROMONE_GRID_SIZE,
        PHEROMONE_GRID_SIZE,
      );
    }
    ctx.globalAlpha = 1.0;
  }

  private renderHeatmapOverlay(state: GameState): void {
    const hmCtx = this.offscreenHeatmapCtx;
    const hmW = this.offscreenHeatmap.width;
    const hmH = this.offscreenHeatmap.height;
    hmCtx.clearRect(0, 0, hmW, hmH);

    const grid = new Float32Array(hmW * hmH);
    for (const p of state.pheromones) {
      const gx = Math.floor(p.position.x / PHEROMONE_GRID_SIZE);
      const gy = Math.floor(p.position.y / PHEROMONE_GRID_SIZE);
      if (gx >= 0 && gx < hmW && gy >= 0 && gy < hmH) {
        grid[gy * hmW + gx] += p.strength;
      }
    }

    const imageData = hmCtx.createImageData(hmW, hmH);
    for (let i = 0; i < grid.length; i++) {
      const val = Math.min(grid[i], 1.5);
      const norm = val / 1.5;
      const r = norm > 0.5 ? 255 : Math.floor(norm * 2 * 255);
      const g = norm < 0.5 ? Math.floor(norm * 2 * 255) : Math.floor((1 - norm) * 2 * 255);
      const b = norm < 0.3 ? Math.floor((0.3 - norm) / 0.3 * 200) : 0;
      const idx = i * 4;
      imageData.data[idx] = r;
      imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b;
      imageData.data[idx + 3] = Math.floor(norm * 120);
    }
    hmCtx.putImageData(imageData, 0, 0);

    const overlaySize = 200;
    this.ctx.save();
    this.ctx.globalAlpha = 0.7;
    this.ctx.drawImage(
      this.offscreenHeatmap,
      0, 0, hmW, hmH,
      10, 10, overlaySize, overlaySize * (hmH / hmW),
    );
    this.ctx.globalAlpha = 1.0;
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(10, 10, overlaySize, overlaySize * (hmH / hmW));
    this.ctx.restore();
  }

  private renderFoodSources(ctx: CanvasRenderingContext2D, sources: FoodSource[]): void {
    for (const f of sources) {
      if (f.collected) continue;
      const glowAlpha = 0.2 + Math.sin(f.glowPhase) * 0.1;
      const glowRadius = f.size * 2;
      const gradient = ctx.createRadialGradient(
        f.position.x, f.position.y, f.size * 0.3,
        f.position.x, f.position.y, glowRadius,
      );
      if (f.type === 'sugar') {
        gradient.addColorStop(0, `rgba(255, 213, 79, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(255, 213, 79, 0)');
      } else {
        gradient.addColorStop(0, `rgba(198, 40, 40, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(198, 40, 40, 0)');
      }
      ctx.beginPath();
      ctx.arc(f.position.x, f.position.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(f.position.x, f.position.y, f.size, 0, Math.PI * 2);
      ctx.fillStyle = f.type === 'sugar' ? '#ffd54f' : '#c62828';
      ctx.fill();
      ctx.strokeStyle = f.type === 'sugar' ? '#ff8f00' : '#8e0000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const remaining = f.amount / f.maxAmount;
      ctx.beginPath();
      ctx.arc(f.position.x, f.position.y, f.size + 4, -Math.PI / 2, -Math.PI / 2 + remaining * Math.PI * 2);
      ctx.strokeStyle = f.type === 'sugar' ? 'rgba(255,143,0,0.5)' : 'rgba(198,40,40,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  private renderWaypoints(ctx: CanvasRenderingContext2D, waypoints: Waypoint[]): void {
    const now = Date.now();
    for (const w of waypoints) {
      const remaining = 1 - (now - w.createdAt) / w.ttl;
      if (remaining <= 0) continue;
      ctx.save();
      ctx.globalAlpha = remaining * 0.8;
      ctx.translate(w.position.x, w.position.y);
      const pulse = 1 + Math.sin(now * 0.005) * 0.1;
      ctx.scale(pulse, pulse);
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(7, 8);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fillStyle = '#4caf50';
      ctx.fill();
      ctx.strokeStyle = '#81c784';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderNest(ctx: CanvasRenderingContext2D, center: Position, radius: number): void {
    const gradient = ctx.createRadialGradient(center.x, center.y, radius * 0.2, center.x, center.y, radius);
    gradient.addColorStop(0, 'rgba(62, 39, 35, 0.9)');
    gradient.addColorStop(0.7, 'rgba(62, 39, 35, 0.6)');
    gradient.addColorStop(1, 'rgba(62, 39, 35, 0)');
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#a1887f';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEST', center.x, center.y + 3);
  }

  private renderAnts(ctx: CanvasRenderingContext2D, ants: Ant[], time: number): void {
    for (const ant of ants) {
      ctx.save();
      ctx.translate(ant.position.x, ant.position.y);
      ctx.rotate(ant.angle);

      if (ant.role === 'player') {
        this.drawPlayerAnt(ctx, ant, time);
      } else if (ant.role === 'friendly') {
        this.drawFriendlyAnt(ctx, ant, time);
      } else {
        this.drawEnemyAnt(ctx, ant, time);
      }

      ctx.restore();

      if (ant.carryingFood) {
        const foodColor = ant.carryingFoodType === 'sugar' ? '#ffd54f' : '#c62828';
        ctx.beginPath();
        ctx.arc(ant.position.x, ant.position.y - ant.size - 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = foodColor;
        ctx.fill();
      }
    }
  }

  private drawPlayerAnt(ctx: CanvasRenderingContext2D, ant: Ant, time: number): void {
    const antennaWave = Math.sin(ant.antennaPhase) * 0.3;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(9 + antennaWave * 2, -6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(9 - antennaWave * 2, 6);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ant.size, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-ant.size * 0.6, 0, ant.size * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(3, 0, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
  }

  private drawFriendlyAnt(ctx: CanvasRenderingContext2D, ant: Ant, time: number): void {
    const antennaWave = Math.sin(ant.antennaPhase) * 0.2;
    ctx.strokeStyle = '#fff9c4';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(6 + antennaWave, -4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(6 - antennaWave, 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ant.size, 0, Math.PI * 2);
    ctx.fillStyle = '#fff9c4';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-ant.size * 0.5, 0, ant.size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff176';
    ctx.fill();
  }

  private drawEnemyAnt(ctx: CanvasRenderingContext2D, ant: Ant, time: number): void {
    const antennaWave = Math.sin(ant.antennaPhase) * 0.2;
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(7 + antennaWave, -5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(7 - antennaWave, 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, ant.size, 0, Math.PI * 2);
    ctx.fillStyle = '#b71c1c';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-ant.size * 0.5, 0, ant.size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#880e4f';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(2, 0, 1, 0, Math.PI * 2);
    ctx.fillStyle = '#ffcdd2';
    ctx.fill();
  }

  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      if (p.type === 'clash') {
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.size * 2, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.opacity * 0.3;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

import { Player, Particle, BurstRing } from './player';
import { audioManager } from './audio';

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hardness: 'soft' | 'hard';
  broken: boolean;
  layerIndex: number;
  depth: number;
}

export interface AmbientParticle {
  x: number;
  y: number;
  vy: number;
  size: number;
  alpha: number;
}

const BLOCK_SIZE = 48;
const BLOCK_GAP = 4;
const COLS = 8;
const ROWS_PER_LAYER = 6;
const LAYER_HEIGHT = ROWS_PER_LAYER * (BLOCK_SIZE + BLOCK_GAP);
const SINK_INTERVAL = 0.8;

const COLORS = ['#48dbfb', '#feca57', '#ff6b6b', '#a29bfe'];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function getLayerColor(layerIndex: number): string {
  const colorCount = COLORS.length;
  const normalized = (layerIndex % (colorCount * 3)) / (colorCount * 3);
  const segment = Math.floor(normalized * (colorCount - 1));
  const t = (normalized * (colorCount - 1)) - segment;
  return lerpColor(COLORS[segment], COLORS[Math.min(segment + 1, colorCount - 1)], t);
}

function determineHardness(color: string): 'soft' | 'hard' {
  const rgb = hexToRgb(color);
  return rgb.r > rgb.b ? 'hard' : 'soft';
}

export class Level {
  blocks: Block[] = [];
  particles: Particle[] = [];
  burstRings: BurstRing[] = [];
  ambientParticles: AmbientParticle[] = [];

  private viewportWidth: number;
  private viewportHeight: number;
  private gridOffsetX: number;
  private sinkTimer: number = 0;
  private sinkAccumulated: number = 0;
  private layerCounter: number = 0;
  private topLayerIndex: number = 0;
  private bottomLayerIndex: number = 0;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private offscreenDirty: boolean = true;

  constructor(viewportWidth: number, viewportHeight: number) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    const totalWidth = COLS * (BLOCK_SIZE + BLOCK_GAP) - BLOCK_GAP;
    this.gridOffsetX = (viewportWidth - totalWidth) / 2;
    this.initAmbientParticles();
    this.initLayers();
    this.createOffscreenCanvas();
  }

  private initAmbientParticles(): void {
    for (let i = 0; i < 80; i++) {
      this.ambientParticles.push({
        x: Math.random() * this.viewportWidth,
        y: Math.random() * this.viewportHeight,
        vy: 30 + Math.random() * 40,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.1
      });
    }
  }

  private initLayers(): void {
    const layersNeeded = Math.ceil(this.viewportHeight / LAYER_HEIGHT) + 3;
    for (let i = 0; i < layersNeeded; i++) {
      this.addLayer(i);
    }
    this.topLayerIndex = 0;
    this.bottomLayerIndex = layersNeeded - 1;
  }

  private addLayer(layerIndex: number): void {
    const color = getLayerColor(layerIndex);
    for (let row = 0; row < ROWS_PER_LAYER; row++) {
      for (let col = 0; col < COLS; col++) {
        if (Math.random() < 0.15) continue;
        const x = this.gridOffsetX + col * (BLOCK_SIZE + BLOCK_GAP);
        const y = -LAYER_HEIGHT + layerIndex * LAYER_HEIGHT + row * (BLOCK_SIZE + BLOCK_GAP);
        this.blocks.push({
          x,
          y,
          width: BLOCK_SIZE,
          height: BLOCK_SIZE,
          color,
          hardness: determineHardness(color),
          broken: false,
          layerIndex,
          depth: layerIndex / 20
        });
      }
    }
    this.layerCounter++;
  }

  private createOffscreenCanvas(): void {
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.viewportWidth;
    this.offscreenCanvas.height = this.viewportHeight + LAYER_HEIGHT * 2;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d');
  }

  private renderBlocksToOffscreen(): void {
    if (!this.offscreenCtx || !this.offscreenCanvas) return;
    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);

    for (const block of this.blocks) {
      if (block.broken) continue;
      if (block.y > this.viewportHeight + 100 || block.y < -LAYER_HEIGHT) continue;

      const drawY = block.y + LAYER_HEIGHT;

      ctx.save();
      ctx.shadowColor = block.color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = block.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.85;
      ctx.strokeRect(block.x, drawY, block.width, block.height);

      ctx.globalAlpha = 0.3;
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x + 2, drawY + 2, block.width - 4, block.height - 4);
      ctx.restore();
    }

    this.offscreenDirty = false;
  }

  resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    const totalWidth = COLS * (BLOCK_SIZE + BLOCK_GAP) - BLOCK_GAP;
    this.gridOffsetX = (width - totalWidth) / 2;
    this.offscreenDirty = true;
    this.createOffscreenCanvas();
  }

  getSinkSpeed(): number {
    return LAYER_HEIGHT / SINK_INTERVAL;
  }

  update(deltaTime: number): void {
    this.sinkTimer += deltaTime;
    const sinkAmount = this.getSinkSpeed() * deltaTime;
    this.sinkAccumulated += sinkAmount;

    for (const block of this.blocks) {
      block.y += sinkAmount;
    }

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      if (this.blocks[i].y > this.viewportHeight + 200) {
        this.blocks.splice(i, 1);
      }
    }

    while (this.sinkAccumulated >= LAYER_HEIGHT) {
      this.sinkAccumulated -= LAYER_HEIGHT;
      this.topLayerIndex++;
      this.bottomLayerIndex++;
      this.addLayer(this.bottomLayerIndex);
    }

    for (const p of this.ambientParticles) {
      p.y += p.vy * deltaTime;
      if (p.y > this.viewportHeight + 10) {
        p.y = -10;
        p.x = Math.random() * this.viewportWidth;
      }
    }

    Player.updateParticles(this.particles, deltaTime);
    Player.updateBurstRings(this.burstRings, deltaTime);

    if (this.particles.length > 0 || this.burstRings.length > 0) {
      this.offscreenDirty = true;
    }
  }

  checkPlayerCollision(player: Player): {
    broken: boolean;
    bounced: boolean;
    brokenBlocks?: Block[];
  } {
    if (player.isBouncing()) return { broken: false, bounced: false };

    const px = player.x;
    const py = player.y;
    const pr = player.radius;

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.broken) continue;

      const closestX = Math.max(block.x, Math.min(px, block.x + block.width));
      const closestY = Math.max(block.y, Math.min(py, block.y + block.height));
      const distX = px - closestX;
      const distY = py - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq < pr * pr) {
        if (block.hardness === 'soft') {
          this.breakBlock(block, i);
          return { broken: true, bounced: false, brokenBlocks: [block] };
        } else {
          player.bounce(player.y);
          audioManager.playBounceSound();
          audioManager.resetConsecutive();
          return { broken: false, bounced: true };
        }
      }
    }

    return { broken: false, bounced: false };
  }

  private breakBlock(block: Block, index: number): void {
    block.broken = true;
    this.blocks.splice(index, 1);
    const cx = block.x + block.width / 2;
    const cy = block.y + block.height / 2;
    const newParticles = Player.createBreakParticles(cx, cy, block.color, 0);
    this.particles.push(...newParticles);
    audioManager.playBreakSound(block.depth);
    this.offscreenDirty = true;
  }

  triggerResonanceBurst(player: Player): Block[] {
    const burstBlocks: Block[] = [];
    const burstRadius = 120;

    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (block.broken) continue;

      const cx = block.x + block.width / 2;
      const cy = block.y + block.height / 2;
      const dx = cx - player.x;
      const dy = cy - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < burstRadius) {
        burstBlocks.push(block);
        this.breakBlock(block, i);
      }
    }

    const ringColors = ['#48dbfb', '#feca57', '#ff6b6b', '#a29bfe', '#ffffff'];
    const ring = Player.createBurstRing(player.x, player.y, ringColors);
    this.burstRings.push(ring);
    audioManager.playBurstArpeggio();

    return burstBlocks;
  }

  checkPlayerOutOfBounds(player: Player): boolean {
    return player.y < -50;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderAmbientParticles(ctx);

    if (this.offscreenDirty || !this.offscreenCanvas) {
      this.renderBlocksToOffscreen();
    }

    if (this.offscreenCanvas) {
      ctx.save();
      ctx.translate(0, -LAYER_HEIGHT);
      ctx.drawImage(this.offscreenCanvas, 0, 0);
      ctx.restore();
    }

    Player.renderParticles(ctx, this.particles);
    Player.renderBurstRings(ctx, this.burstRings);
  }

  private renderAmbientParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.ambientParticles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#a29bfe';
      ctx.shadowColor = '#a29bfe';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  getTotalDepth(): number {
    return this.bottomLayerIndex;
  }

  reset(): void {
    this.blocks = [];
    this.particles = [];
    this.burstRings = [];
    this.sinkTimer = 0;
    this.sinkAccumulated = 0;
    this.layerCounter = 0;
    this.topLayerIndex = 0;
    this.bottomLayerIndex = 0;
    this.initLayers();
    this.offscreenDirty = true;
  }
}

export { BLOCK_SIZE, BLOCK_GAP, COLS, ROWS_PER_LAYER, LAYER_HEIGHT };

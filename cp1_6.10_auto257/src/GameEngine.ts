import { Bubble, BUBBLE_COLORS } from './Bubble';
import { ParticleSystem } from './ParticleSystem';

interface SpatialGrid {
  [key: string]: Bubble[];
}

interface EffectState {
  pulseActive: boolean;
  pulseTime: number;
  pulseMaxTime: number;
  flashActive: boolean;
  flashTime: number;
  flashMaxTime: number;
  levelTextActive: boolean;
  levelTextTime: number;
  levelTextMaxTime: number;
  levelTextNumber: number;
  fallingDelay: number;
  fallingBubblesPending: boolean;
}

export class GameEngine {
  public bubbles: Bubble[] = [];
  public particles: ParticleSystem;
  public currentBubble: Bubble | null = null;
  public nextBubbleColor: number = 0;

  public score: number = 0;
  public level: number = 1;
  public bubblesPopped: number = 0;
  public combo: number = 0;
  public lastPopTime: number = 0;

  public canvasWidth: number = 800;
  public canvasHeight: number = 600;

  public bubbleRadius: number = 24;
  public launcherX: number = 400;
  public launcherY: number = 550;

  public isDragging: boolean = false;
  public dragStartX: number = 0;
  public dragStartY: number = 0;
  public mouseX: number = 0;
  public mouseY: number = 0;

  private spatialGrid: SpatialGrid = {};
  private gridCellSize: number = 0;

  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  private particleLimit: number = 300;

  private effects: EffectState = {
    pulseActive: false,
    pulseTime: 0,
    pulseMaxTime: 1.0,
    flashActive: false,
    flashTime: 0,
    flashMaxTime: 0.15,
    levelTextActive: false,
    levelTextTime: 0,
    levelTextMaxTime: 0.8,
    levelTextNumber: 1,
    fallingDelay: 0,
    fallingBubblesPending: false,
  };

  private totalPopForFlash: number = 0;
  private isBubbleInFlight: boolean = false;
  private trailTimer: number = 0;

  constructor() {
    this.particles = new ParticleSystem();
  }

  public init(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.bubbleRadius = Math.min(width / 22, 28);
    this.gridCellSize = this.bubbleRadius * 2.2;
    this.launcherX = width / 2;
    this.launcherY = height - this.bubbleRadius * 2.5;
    this.nextBubbleColor = Math.floor(Math.random() * BUBBLE_COLORS.length);
    this.spawnInitialBubbles();
    this.prepareNextBubble();
  }

  public resize(width: number, height: number): void {
    const scaleX = width / this.canvasWidth;
    const scaleY = height / this.canvasHeight;
    this.canvasWidth = width;
    this.canvasHeight = height;
    const newRadius = Math.min(width / 22, 28);
    const radiusScale = newRadius / this.bubbleRadius;
    this.bubbleRadius = newRadius;
    this.gridCellSize = this.bubbleRadius * 2.2;
    this.launcherX = width / 2;
    this.launcherY = height - this.bubbleRadius * 2.5;

    for (const b of this.bubbles) {
      b.x *= scaleX;
      b.y *= scaleY;
      b.radius = this.bubbleRadius;
    }
    this.rebuildSpatialGrid();
  }

  private spawnInitialBubbles(): void {
    this.bubbles = [];
    const rows = 6;
    const cols = 8;
    const curvature = 0;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offset = (row % 2) * (this.bubbleRadius);
        const x = this.canvasWidth / 2 - (cols - 1) * this.bubbleRadius + col * this.bubbleRadius * 2 + offset;
        const arcOffset = curvature * Math.pow((col - cols / 2) / (cols / 2), 2);
        const y = this.bubbleRadius * 1.5 + row * this.bubbleRadius * 1.8 + arcOffset * this.bubbleRadius;

        if (x < this.bubbleRadius || x > this.canvasWidth - this.bubbleRadius) continue;

        const bubble = new Bubble(x, y, Math.floor(Math.random() * BUBBLE_COLORS.length), this.bubbleRadius);
        bubble.isAttached = true;
        bubble.gridRow = row;
        bubble.gridCol = col;
        this.bubbles.push(bubble);
      }
    }
    this.rebuildSpatialGrid();
  }

  private prepareNextBubble(): void {
    const color = this.nextBubbleColor;
    this.nextBubbleColor = Math.floor(Math.random() * BUBBLE_COLORS.length);
    this.currentBubble = new Bubble(this.launcherX, this.launcherY, color, this.bubbleRadius);
    this.isBubbleInFlight = false;
  }

  private rebuildSpatialGrid(): void {
    this.spatialGrid = {};
    for (const bubble of this.bubbles) {
      if (!bubble.isAttached || bubble.isFalling) continue;
      this.addToSpatialGrid(bubble);
    }
  }

  private addToSpatialGrid(bubble: Bubble): void {
    const key = this.getGridKey(bubble.x, bubble.y);
    if (!this.spatialGrid[key]) {
      this.spatialGrid[key] = [];
    }
    this.spatialGrid[key].push(bubble);
  }

  private getGridKey(x: number, y: number): string {
    const gx = Math.floor(x / this.gridCellSize);
    const gy = Math.floor(y / this.gridCellSize);
    return `${gx},${gy}`;
  }

  private getNearbyBubbles(x: number, y: number): Bubble[] {
    const nearby: Bubble[] = [];
    const gx = Math.floor(x / this.gridCellSize);
    const gy = Math.floor(y / this.gridCellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gx + dx},${gy + dy}`;
        if (this.spatialGrid[key]) {
          nearby.push(...this.spatialGrid[key]);
        }
      }
    }
    return nearby;
  }

  public handleDragStart(x: number, y: number): void {
    if (this.isBubbleInFlight || !this.currentBubble) return;
    this.isDragging = true;
    this.dragStartX = x;
    this.dragStartY = y;
    this.mouseX = x;
    this.mouseY = y;
  }

  public handleDragMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;

    for (const b of this.bubbles) {
      if (!b.isAttached || b.isFalling) continue;
      const dist = b.distanceTo(x, y);
      b.isGlowing = dist < b.radius * 1.5;
    }
  }

  public handleDragEnd(x: number, y: number): void {
    if (!this.isDragging || !this.currentBubble) {
      this.isDragging = false;
      return;
    }
    this.isDragging = false;
    this.mouseX = x;
    this.mouseY = y;

    const dx = x - this.dragStartX;
    const dy = y - this.dragStartY;

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    let angle = Math.atan2(-dy, dx);
    const minAngle = (10 * Math.PI) / 180;
    const maxAngle = (170 * Math.PI) / 180;
    if (angle < minAngle) angle = minAngle;
    if (angle > maxAngle) angle = maxAngle;

    const speed = 650;
    this.currentBubble.vx = Math.cos(angle) * speed;
    this.currentBubble.vy = -Math.sin(angle) * speed;
    this.isBubbleInFlight = true;
    this.trailTimer = 0;
  }

  private snapBubbleToGrid(bubble: Bubble): void {
    let bestBubble: Bubble | null = null;
    let bestDist = Infinity;

    const nearby = this.getNearbyBubbles(bubble.x, bubble.y);
    for (const other of nearby) {
      const dist = bubble.distanceTo(other.x, other.y);
      if (dist < bestDist) {
        bestDist = dist;
        bestBubble = other;
      }
    }

    if (!bestBubble) {
      bubble.isAttached = true;
      this.bubbles.push(bubble);
      this.addToSpatialGrid(bubble);
      return;
    }

    const dx = bubble.x - bestBubble.x;
    const dy = bubble.y - bestBubble.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const targetDist = this.bubbleRadius * 2;

    if (dist > 0) {
      bubble.x = bestBubble.x + (dx / dist) * targetDist;
      bubble.y = bestBubble.y + (dy / dist) * targetDist;
    }

    if (bubble.y < this.bubbleRadius * 1.5) {
      bubble.y = this.bubbleRadius * 1.5;
    }
    if (bubble.x < this.bubbleRadius) {
      bubble.x = this.bubbleRadius;
    }
    if (bubble.x > this.canvasWidth - this.bubbleRadius) {
      bubble.x = this.canvasWidth - this.bubbleRadius;
    }

    bubble.isAttached = true;
    this.bubbles.push(bubble);
    this.addToSpatialGrid(bubble);

    this.checkMatches(bubble);
  }

  private checkMatches(triggerBubble: Bubble): void {
    const visited = new Set<Bubble>();
    const toCheck: Bubble[] = [triggerBubble];
    const matchGroup: Bubble[] = [];

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      if (current.colorIndex !== triggerBubble.colorIndex) continue;

      matchGroup.push(current);

      const nearby = this.getNearbyBubbles(current.x, current.y);
      for (const neighbor of nearby) {
        if (!visited.has(neighbor) && !neighbor.isFalling) {
          const dist = current.distanceTo(neighbor.x, neighbor.y);
          if (dist < this.bubbleRadius * 2.2) {
            toCheck.push(neighbor);
          }
        }
      }
    }

    if (matchGroup.length >= 3) {
      this.popBubbles(matchGroup);
    }
  }

  private popBubbles(matchGroup: Bubble[]): void {
    const now = performance.now() / 1000;
    if (now - this.lastPopTime < 2.0) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastPopTime = now;

    for (const b of matchGroup) {
      this.particles.spawnExplosion(b.x, b.y, b.colorIndex);
      const idx = this.bubbles.indexOf(b);
      if (idx >= 0) {
        this.bubbles.splice(idx, 1);
      }
    }

    this.rebuildSpatialGrid();

    const baseScore = matchGroup.length * 10;
    const comboBonus = Math.max(0, (this.combo - 1)) * 5;
    this.score += baseScore + comboBonus;
    this.bubblesPopped += matchGroup.length;
    this.totalPopForFlash += matchGroup.length;

    if (this.combo >= 1) {
      this.effects.pulseActive = true;
      this.effects.pulseTime = 0;
    }

    if (this.totalPopForFlash >= 30) {
      this.effects.flashActive = true;
      this.effects.flashTime = 0;
      this.score += 100;
      this.totalPopForFlash = 0;
    }

    this.effects.fallingDelay = 0.3;
    this.effects.fallingBubblesPending = true;

    this.checkLevelProgress();
  }

  private findFloatingBubbles(): Bubble[] {
    const connected = new Set<Bubble>();
    const toCheck: Bubble[] = [];

    for (const b of this.bubbles) {
      if (!b.isAttached || b.isFalling) continue;
      if (b.y <= this.bubbleRadius * 2.5) {
        toCheck.push(b);
      }
    }

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      if (connected.has(current)) continue;
      connected.add(current);

      const nearby = this.getNearbyBubbles(current.x, current.y);
      for (const neighbor of nearby) {
        if (!connected.has(neighbor) && neighbor.isAttached && !neighbor.isFalling) {
          const dist = current.distanceTo(neighbor.x, neighbor.y);
          if (dist < this.bubbleRadius * 2.2) {
            toCheck.push(neighbor);
          }
        }
      }
    }

    const floating: Bubble[] = [];
    for (const b of this.bubbles) {
      if (b.isAttached && !b.isFalling && !connected.has(b)) {
        floating.push(b);
      }
    }
    return floating;
  }

  private checkLevelProgress(): void {
    const threshold = this.level * 15;
    if (this.bubblesPopped >= threshold) {
      this.level++;
      this.effects.levelTextActive = true;
      this.effects.levelTextTime = 0;
      this.effects.levelTextNumber = this.level;
      this.addNewRows();
    }
  }

  private addNewRows(): void {
    for (const b of this.bubbles) {
      b.y += this.bubbleRadius * 0.9;
    }

    const curvature = Math.min(this.level * 0.3, 2.5);
    const cols = 8;
    const newRows = 3;

    for (let row = 0; row < newRows; row++) {
      for (let col = 0; col < cols; col++) {
        const offset = (row % 2) * (this.bubbleRadius);
        const x = this.canvasWidth / 2 - (cols - 1) * this.bubbleRadius + col * this.bubbleRadius * 2 + offset;
        const arcOffset = curvature * Math.pow((col - cols / 2) / (cols / 2), 2);
        const y = this.bubbleRadius * 1.5 + row * this.bubbleRadius * 1.8 + arcOffset * this.bubbleRadius * 0.5;

        if (x < this.bubbleRadius || x > this.canvasWidth - this.bubbleRadius) continue;

        const bubble = new Bubble(x, y, Math.floor(Math.random() * BUBBLE_COLORS.length), this.bubbleRadius);
        bubble.isAttached = true;
        this.bubbles.push(bubble);
      }
    }
    this.rebuildSpatialGrid();
  }

  private handleFpsMonitoring(dt: number): void {
    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 0.5) {
      this.currentFps = this.frameCount / this.fpsTime;
      this.frameCount = 0;
      this.fpsTime = 0;

      if (this.currentFps < 50) {
        this.particleLimit = 80;
      } else {
        this.particleLimit = 300;
      }
      this.particles.setMaxParticles(this.particleLimit);
    }
  }

  public update(dt: number): void {
    this.handleFpsMonitoring(dt);

    if (this.effects.pulseActive) {
      this.effects.pulseTime += dt;
      if (this.effects.pulseTime >= this.effects.pulseMaxTime) {
        this.effects.pulseActive = false;
      }
    }
    if (this.effects.flashActive) {
      this.effects.flashTime += dt;
      if (this.effects.flashTime >= this.effects.flashMaxTime) {
        this.effects.flashActive = false;
      }
    }
    if (this.effects.levelTextActive) {
      this.effects.levelTextTime += dt;
      if (this.effects.levelTextTime >= this.effects.levelTextMaxTime) {
        this.effects.levelTextActive = false;
      }
    }

    if (this.effects.fallingBubblesPending) {
      this.effects.fallingDelay -= dt;
      if (this.effects.fallingDelay <= 0) {
        const floating = this.findFloatingBubbles();
        for (const b of floating) {
          b.isFalling = true;
          b.isAttached = false;
        }
        this.rebuildSpatialGrid();
        this.effects.fallingBubblesPending = false;
      }
    }

    for (const b of this.bubbles) {
      b.update(dt);
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.isFalling && (b.y - b.radius > this.canvasHeight || b.y > this.launcherY)) {
        this.bubbles.splice(i, 1);
      }
    }

    if (this.currentBubble && this.isBubbleInFlight) {
      this.currentBubble.update(dt);

      this.trailTimer += dt;
      if (this.trailTimer >= 0.016) {
        this.trailTimer = 0;
        this.particles.spawnTrail(this.currentBubble.x, this.currentBubble.y, this.currentBubble.colorIndex);
      }

      if (this.currentBubble.x - this.currentBubble.radius <= 0) {
        this.currentBubble.x = this.currentBubble.radius;
        this.currentBubble.vx = Math.abs(this.currentBubble.vx) * 0.9;
      }
      if (this.currentBubble.x + this.currentBubble.radius >= this.canvasWidth) {
        this.currentBubble.x = this.canvasWidth - this.currentBubble.radius;
        this.currentBubble.vx = -Math.abs(this.currentBubble.vx) * 0.9;
      }

      if (this.currentBubble.y - this.currentBubble.radius <= 0) {
        this.currentBubble.y = this.currentBubble.radius;
        this.currentBubble.vy = 0;
        this.currentBubble.vx = 0;
        this.snapBubbleToGrid(this.currentBubble);
        this.prepareNextBubble();
      } else {
        const nearby = this.getNearbyBubbles(this.currentBubble.x, this.currentBubble.y);
        let collided = false;
        for (const other of nearby) {
          if (!other.isAttached || other.isFalling) continue;
          if (this.currentBubble.collidesWith(other)) {
            collided = true;
            break;
          }
        }
        if (collided) {
          this.currentBubble.vx = 0;
          this.currentBubble.vy = 0;
          this.snapBubbleToGrid(this.currentBubble);
          this.prepareNextBubble();
        }
      }
    }

    this.particles.update(dt);
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, 0,
      this.canvasWidth / 2, this.canvasHeight / 2, Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    gradient.addColorStop(0, '#1e293b');
    gradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  private drawAimLine(ctx: CanvasRenderingContext2D): void {
    if (!this.isDragging || !this.currentBubble) return;

    const dx = this.mouseX - this.dragStartX;
    const dy = this.mouseY - this.dragStartY;
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

    let angle = Math.atan2(-dy, dx);
    const minAngle = (10 * Math.PI) / 180;
    const maxAngle = (170 * Math.PI) / 180;
    if (angle < minAngle) angle = minAngle;
    if (angle > maxAngle) angle = maxAngle;

    const startX = this.currentBubble.x;
    const startY = this.currentBubble.y;
    const length = 180;
    const endX = startX + Math.cos(angle) * length;
    const endY = startY - Math.sin(angle) * length;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.restore();
  }

  private drawLauncher(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.ellipse(
      this.launcherX,
      this.launcherY + this.bubbleRadius * 0.5,
      this.bubbleRadius * 2.5,
      this.bubbleRadius * 1.2,
      0, Math.PI, 0
    );
    ctx.fill();
    ctx.restore();
  }

  private drawUI(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = "500 24px 'Fira Code', monospace";
    ctx.textBaseline = 'top';

    const scoreText = `SCORE: ${this.score}`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    const scoreWidth = ctx.measureText(scoreText).width + 32;
    this.roundRect(ctx, 20, 20, scoreWidth, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(scoreText, 36, 32);

    const levelText = `LEVEL ${this.level}`;
    ctx.font = "500 20px 'Fira Code', monospace";
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    const levelWidth = ctx.measureText(levelText).width + 32;
    this.roundRect(ctx, this.canvasWidth - levelWidth - 20, 20, levelWidth, 44, 8);
    ctx.fill();
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(levelText, this.canvasWidth - 36, 32);

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  private drawEffects(ctx: CanvasRenderingContext2D): void {
    if (this.effects.pulseActive) {
      const t = this.effects.pulseTime / this.effects.pulseMaxTime;
      const maxRadius = Math.max(this.canvasWidth, this.canvasHeight) * 0.7;
      const radius = t * maxRadius;
      const alpha = 0.3 * (1 - t);

      ctx.save();
      ctx.globalAlpha = alpha;
      const gradient = ctx.createRadialGradient(
        this.canvasWidth / 2, this.canvasHeight / 2, 0,
        this.canvasWidth / 2, this.canvasHeight / 2, radius
      );
      gradient.addColorStop(0, 'rgba(255, 221, 87, 0.5)');
      gradient.addColorStop(0.7, 'rgba(255, 221, 87, 0.2)');
      gradient.addColorStop(1, 'rgba(255, 221, 87, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
    }

    if (this.effects.flashActive) {
      const t = this.effects.flashTime / this.effects.flashMaxTime;
      const alpha = 1 - t;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
      ctx.restore();
    }

    if (this.effects.levelTextActive) {
      const t = this.effects.levelTextTime / this.effects.levelTextMaxTime;
      let scale: number;
      if (t < 0.4) {
        scale = 0.5 + (t / 0.4) * 0.7;
      } else if (t < 0.6) {
        scale = 1.2 - ((t - 0.4) / 0.2) * 0.2;
      } else {
        scale = 1.0;
      }

      const alpha = t < 0.7 ? 1 : 1 - ((t - 0.7) / 0.3);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "700 72px 'Fira Code', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffdd57';
      ctx.shadowColor = '#ffdd57';
      ctx.shadowBlur = 20;
      ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
      ctx.scale(scale, scale);
      ctx.fillText(`Level ${this.effects.levelTextNumber}`, 0, 0);
      ctx.restore();
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);

    for (const b of this.bubbles) {
      if (b.isAttached && !b.isFalling) {
        b.drawGlow(ctx, 0.15);
      }
    }

    for (const b of this.bubbles) {
      b.draw(ctx);
    }

    this.particles.draw(ctx);

    if (this.currentBubble && !this.isBubbleInFlight) {
      this.currentBubble.draw(ctx);
    }

    this.drawAimLine(ctx);
    this.drawLauncher(ctx);
    this.drawUI(ctx);
    this.drawEffects(ctx);
  }
}

export interface Point {
  x: number;
  y: number;
}

export interface Bubble {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  vx: number;
  vy: number;
}

export interface Crack {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface IceShard {
  id: number;
  x: number;
  y: number;
  baseY: number;
  rotation: number;
  targetRotation: number;
  vertices: Point[];
  opacity: number;
  targetOpacity: number;
  thickness: number;
  floatOffset: number;
  floatSpeed: number;
  floatPhase: number;
  isDragging: boolean;
  isHovering: boolean;
  isFading: boolean;
  fadeStartTime: number;
  isMerging: boolean;
  mergeStartTime: number;
  mergeTargetX: number;
  mergeTargetY: number;
  particles: Bubble[];
  createdAt: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

export interface ColorAperture {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  createdAt: number;
}

export interface CuttingTrail {
  points: Point[];
  timestamps: number[];
}

export interface IceWallConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  shardSpawnSpeed: number;
}

const MAX_SHARDS = 15;
const FADE_DURATION = 500;
const MERGE_DURATION = 500;
const TRAIL_DURATION = 300;

export class IceWall {
  private config: IceWallConfig;
  private bubbles: Bubble[] = [];
  private cracks: Crack[] = [];
  private shards: IceShard[] = [];
  private apertures: ColorAperture[] = [];
  private cuttingTrail: CuttingTrail | null = null;
  private isCutting = false;
  private shardIdCounter = 0;
  private apertureIdCounter = 0;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private dragTrail: Point[] = [];

  constructor(config: IceWallConfig) {
    this.config = { ...config };
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.generateBubbles();
    this.generateCracks();
    this.renderIceWallTexture();
  }

  private generateBubbles(): void {
    this.bubbles = [];
    const count = Math.floor((this.config.width * this.config.height) / 15000);
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: this.config.x + Math.random() * this.config.width,
        y: this.config.y + Math.random() * this.config.height,
        radius: 1 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2
      });
    }
  }

  private generateCracks(): void {
    this.cracks = [];
    const count = Math.floor((this.config.width * this.config.height) / 40000);
    for (let i = 0; i < count; i++) {
      const startX = this.config.x + Math.random() * this.config.width;
      const startY = this.config.y + Math.random() * this.config.height;
      const length = 20 + Math.random() * 60;
      const angle = Math.random() * Math.PI * 2;
      this.cracks.push({
        startX,
        startY,
        endX: startX + Math.cos(angle) * length,
        endY: startY + Math.sin(angle) * length
      });
    }
  }

  private renderIceWallTexture(): void {
    this.offscreenCanvas.width = this.config.width;
    this.offscreenCanvas.height = this.config.height;
    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, this.config.width, this.config.height);

    const gradient = ctx.createLinearGradient(0, 0, this.config.width, this.config.height);
    gradient.addColorStop(0, 'rgba(100, 150, 220, 0.6)');
    gradient.addColorStop(0.5, 'rgba(130, 110, 200, 0.5)');
    gradient.addColorStop(1, 'rgba(80, 120, 200, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.config.width, this.config.height);

    for (const bubble of this.bubbles) {
      const bx = bubble.x - this.config.x;
      const by = bubble.y - this.config.y;
      ctx.beginPath();
      ctx.arc(bx, by, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${bubble.opacity * 0.5})`;
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    for (const crack of this.cracks) {
      ctx.beginPath();
      ctx.moveTo(crack.startX - this.config.x, crack.startY - this.config.y);
      ctx.lineTo(crack.endX - this.config.x, crack.endY - this.config.y);
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const highlightGradient = ctx.createLinearGradient(
        0, i * this.config.height / 5,
        this.config.width, (i + 1) * this.config.height / 5
      );
      highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      highlightGradient.addColorStop(0.5, `rgba(255, 255, 255, ${0.03 + Math.random() * 0.05})`);
      highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = highlightGradient;
      ctx.fillRect(0, i * this.config.height / 5, this.config.width, this.config.height / 5);
    }
  }

  update(deltaTime: number, currentTime: number): void {
    for (const bubble of this.bubbles) {
      bubble.x += bubble.vx * deltaTime * 0.06;
      bubble.y += bubble.vy * deltaTime * 0.06;
      if (bubble.x < this.config.x || bubble.x > this.config.x + this.config.width) bubble.vx *= -1;
      if (bubble.y < this.config.y || bubble.y > this.config.y + this.config.height) bubble.vy *= -1;
    }

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];

      if (shard.isFading) {
        const fadeProgress = (currentTime - shard.fadeStartTime) / FADE_DURATION;
        if (fadeProgress >= 1) {
          this.shards.splice(i, 1);
          continue;
        }
        shard.opacity = shard.targetOpacity * (1 - fadeProgress);
      }

      if (shard.isMerging) {
        const mergeProgress = (currentTime - shard.mergeStartTime) / MERGE_DURATION;
        if (mergeProgress >= 1) {
          this.addAperture(shard.mergeTargetX, shard.mergeTargetY);
          this.shards.splice(i, 1);
          continue;
        }
        const eased = this.easeInOutCubic(mergeProgress);
        shard.x = shard.x + (shard.mergeTargetX - shard.x) * eased;
        shard.y = shard.y + (shard.mergeTargetY - shard.y) * eased;
        shard.opacity = shard.targetOpacity * (1 - mergeProgress);
      }

      if (!shard.isDragging && !shard.isMerging) {
        shard.floatPhase += shard.floatSpeed * deltaTime * 0.001;
        shard.floatOffset = Math.sin(shard.floatPhase) * 5;
        shard.y = shard.baseY + shard.floatOffset;
      }

      if (shard.rotation !== shard.targetRotation) {
        const rotDiff = shard.targetRotation - shard.rotation;
        shard.rotation += rotDiff * deltaTime * 0.01;
        if (Math.abs(rotDiff) < 0.01) shard.rotation = shard.targetRotation;
      }

      if (shard.opacity !== shard.targetOpacity && !shard.isFading && !shard.isMerging) {
        const opacityDiff = shard.targetOpacity - shard.opacity;
        shard.opacity += opacityDiff * deltaTime * 0.008;
        if (Math.abs(opacityDiff) < 0.01) shard.opacity = shard.targetOpacity;
      }

      for (const particle of shard.particles) {
        particle.x += particle.vx * deltaTime * 0.05;
        particle.y += particle.vy * deltaTime * 0.05;
        if (Math.random() < 0.01) {
          particle.vx = (Math.random() - 0.5) * 0.3;
          particle.vy = (Math.random() - 0.5) * 0.3;
        }
      }
    }

    for (const aperture of this.apertures) {
      aperture.rotation += aperture.rotationSpeed * deltaTime * 0.06;
    }

    if (this.cuttingTrail) {
      this.cuttingTrail.timestamps = this.cuttingTrail.timestamps.filter(
        t => currentTime - t < TRAIL_DURATION
      );
      const keepCount = this.cuttingTrail.timestamps.length;
      this.cuttingTrail.points = this.cuttingTrail.points.slice(-keepCount);
      if (this.cuttingTrail.points.length === 0) {
        this.cuttingTrail = null;
      }
    }

    if (this.dragTrail.length > 0) {
      this.dragTrail = this.dragTrail.slice(-10);
    }

    this.enforceShardLimit();
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    ctx.save();
    ctx.globalAlpha = this.config.opacity;
    ctx.drawImage(this.offscreenCanvas, this.config.x, this.config.y);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(this.config.x, this.config.y, this.config.width, this.config.height);
    ctx.restore();

    for (const aperture of this.apertures) {
      this.renderAperture(ctx, aperture, currentTime);
    }

    if (this.cuttingTrail && this.cuttingTrail.points.length > 1) {
      this.renderCuttingTrail(ctx, currentTime);
    }

    for (const shard of this.shards) {
      if (shard.isDragging && this.dragTrail.length > 1) {
        this.renderDragTrail(ctx);
      }
    }

    for (const shard of this.shards) {
      this.renderShard(ctx, shard, currentTime);
    }
  }

  private renderAperture(ctx: CanvasRenderingContext2D, aperture: ColorAperture, _currentTime: number): void {
    ctx.save();
    ctx.translate(aperture.x, aperture.y);
    ctx.rotate(aperture.rotation);

    const colors = [
      'rgba(255, 0, 0, 0.7)',
      'rgba(255, 127, 0, 0.7)',
      'rgba(255, 255, 0, 0.7)',
      'rgba(0, 255, 0, 0.7)',
      'rgba(0, 0, 255, 0.7)',
      'rgba(75, 0, 130, 0.7)',
      'rgba(148, 0, 211, 0.7)'
    ];

    for (let i = 0; i < colors.length; i++) {
      const radius = aperture.radius * (1 - i / colors.length);
      const innerRadius = aperture.radius * (1 - (i + 1) / colors.length);
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.arc(0, 0, innerRadius, 0, Math.PI * 2, true);
      ctx.fillStyle = colors[i];
      ctx.globalAlpha = aperture.opacity;
      ctx.fill();
    }

    ctx.restore();
  }

  private renderCuttingTrail(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (!this.cuttingTrail) return;
    const points = this.cuttingTrail.points;
    const timestamps = this.cuttingTrail.timestamps;

    for (let i = 1; i < points.length; i++) {
      const age = (currentTime - timestamps[i]) / TRAIL_DURATION;
      const alpha = Math.max(0, 1 - age);
      const width = 3 * (1 - age * 0.7);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[i - 1].x, points[i - 1].y);
      ctx.lineTo(points[i].x, points[i].y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(200, 230, 255, 0.8)';
      ctx.shadowBlur = 10 * alpha;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderDragTrail(ctx: CanvasRenderingContext2D): void {
    if (this.dragTrail.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.dragTrail[0].x, this.dragTrail[0].y);
    for (let i = 1; i < this.dragTrail.length; i++) {
      const alpha = i / this.dragTrail.length * 0.3;
      ctx.lineTo(this.dragTrail[i].x, this.dragTrail[i].y);
      ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.dragTrail[i].x, this.dragTrail[i].y);
    }
    ctx.restore();
  }

  private renderShard(ctx: CanvasRenderingContext2D, shard: IceShard, _currentTime: number): void {
    if (shard.vertices.length < 3) return;

    ctx.save();
    ctx.translate(shard.x, shard.y);
    ctx.rotate(shard.rotation);
    ctx.globalAlpha = shard.opacity;

    ctx.beginPath();
    ctx.moveTo(shard.vertices[0].x, shard.vertices[0].y);
    for (let i = 1; i < shard.vertices.length; i++) {
      ctx.lineTo(shard.vertices[i].x, shard.vertices[i].y);
    }
    ctx.closePath();

    const gradient = ctx.createLinearGradient(-30, -30, 30, 30);
    gradient.addColorStop(0, 'rgba(180, 210, 255, 0.7)');
    gradient.addColorStop(0.5, 'rgba(150, 180, 240, 0.5)');
    gradient.addColorStop(1, 'rgba(120, 160, 230, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (shard.isHovering && !shard.isDragging) {
      const glowColor = this.getGlowColor(shard.thickness);
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.clip();
    for (const particle of shard.particles) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(shard.vertices[0].x, shard.vertices[0].y);
    for (let i = 1; i < shard.vertices.length; i++) {
      ctx.lineTo(shard.vertices[i].x, shard.vertices[i].y);
    }
    ctx.closePath();
    ctx.clip();
    const highlightGradient = ctx.createLinearGradient(-40, -40, 40, 40);
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
    highlightGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    highlightGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0.1)');
    ctx.fillStyle = highlightGradient;
    ctx.fillRect(-50, -50, 100, 100);
    ctx.restore();

    ctx.restore();
  }

  private getGlowColor(thickness: number): string {
    const t = Math.min(1, Math.max(0, (thickness - 60) / 60));
    const r = Math.floor(180 + t * 50);
    const g = Math.floor(220 - t * 40);
    const b = Math.floor(255 - t * 30);
    return `rgba(${r}, ${g}, ${b}, 0.9)`;
  }

  startCutting(x: number, y: number, currentTime: number): void {
    if (!this.isPointInWall(x, y)) return;
    this.isCutting = true;
    this.cuttingTrail = {
      points: [{ x, y }],
      timestamps: [currentTime]
    };
  }

  continueCutting(x: number, y: number, currentTime: number): void {
    if (!this.isCutting || !this.cuttingTrail) return;
    const lastPoint = this.cuttingTrail.points[this.cuttingTrail.points.length - 1];
    const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
    if (dist > 2) {
      this.cuttingTrail.points.push({ x, y });
      this.cuttingTrail.timestamps.push(currentTime);
    }
  }

  endCutting(_x: number, _y: number, currentTime: number): void {
    if (!this.isCutting || !this.cuttingTrail) return;
    this.isCutting = false;

    if (this.cuttingTrail.points.length >= 5) {
      const centerX = this.cuttingTrail.points.reduce((s, p) => s + p.x, 0) / this.cuttingTrail.points.length;
      const centerY = this.cuttingTrail.points.reduce((s, p) => s + p.y, 0) / this.cuttingTrail.points.length;
      this.createShard(centerX, centerY, currentTime);
    }

    setTimeout(() => {
      this.cuttingTrail = null;
    }, TRAIL_DURATION);
  }

  private createShard(x: number, y: number, currentTime: number): void {
    const size = 60 + Math.random() * 60;
    const vertices = this.generateIrregularPolygon(size);
    const thickness = size;

    const particles: Bubble[] = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: (Math.random() - 0.5) * size * 0.8,
        y: (Math.random() - 0.5) * size * 0.8,
        radius: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      });
    }

    const floatDirection = y < this.config.y + this.config.height / 2 ? 1 : -1;
    const shard: IceShard = {
      id: this.shardIdCounter++,
      x,
      y,
      baseY: y + floatDirection * (40 + Math.random() * 30),
      rotation: 0,
      targetRotation: 0,
      vertices,
      opacity: 0,
      targetOpacity: 0.85,
      thickness,
      floatOffset: 0,
      floatSpeed: (2 + Math.random()) / (this.config.shardSpawnSpeed / 2),
      floatPhase: Math.random() * Math.PI * 2,
      isDragging: false,
      isHovering: false,
      isFading: false,
      fadeStartTime: 0,
      isMerging: false,
      mergeStartTime: 0,
      mergeTargetX: x,
      mergeTargetY: y,
      particles,
      createdAt: currentTime,
      dragOffsetX: 0,
      dragOffsetY: 0
    };

    this.shards.push(shard);
  }

  private generateIrregularPolygon(size: number): Point[] {
    const vertices: Point[] = [];
    const numVertices = 6 + Math.floor(Math.random() * 4);
    const angleStep = (Math.PI * 2) / numVertices;

    for (let i = 0; i < numVertices; i++) {
      const angle = i * angleStep + (Math.random() - 0.5) * 0.3;
      const radius = size * 0.4 + Math.random() * size * 0.6;
      const jagged = radius * (0.85 + Math.random() * 0.3);
      vertices.push({
        x: Math.cos(angle) * jagged,
        y: Math.sin(angle) * jagged
      });
    }

    return vertices;
  }

  private enforceShardLimit(): void {
    const activeShards = this.shards.filter(s => !s.isFading && !s.isMerging);
    if (activeShards.length > MAX_SHARDS) {
      const oldest = activeShards[0];
      oldest.isFading = true;
      oldest.fadeStartTime = performance.now();
      oldest.targetOpacity = oldest.opacity;
    }
  }

  getShardAtPoint(x: number, y: number): IceShard | null {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const shard = this.shards[i];
      if (shard.isFading || shard.isMerging) continue;
      if (this.isPointInShard(x, y, shard)) {
        return shard;
      }
    }
    return null;
  }

  private isPointInShard(px: number, py: number, shard: IceShard): boolean {
    const cos = Math.cos(-shard.rotation);
    const sin = Math.sin(-shard.rotation);
    const dx = px - shard.x;
    const dy = py - shard.y;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    let inside = false;
    for (let i = 0, j = shard.vertices.length - 1; i < shard.vertices.length; j = i++) {
      const xi = shard.vertices[i].x, yi = shard.vertices[i].y;
      const xj = shard.vertices[j].x, yj = shard.vertices[j].y;
      if (((yi > localY) !== (yj > localY)) &&
          (localX < (xj - xi) * (localY - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  isPointInWall(x: number, y: number): boolean {
    return x >= this.config.x && x <= this.config.x + this.config.width &&
           y >= this.config.y && y <= this.config.y + this.config.height;
  }

  startDraggingShard(shard: IceShard, mouseX: number, mouseY: number): void {
    shard.isDragging = true;
    shard.isHovering = false;
    shard.targetOpacity = 0.6;
    shard.dragOffsetX = shard.x - mouseX;
    shard.dragOffsetY = shard.y - mouseY;
    this.dragTrail = [{ x: shard.x, y: shard.y }];
  }

  updateDraggingShard(shard: IceShard, mouseX: number, mouseY: number): void {
    if (!shard.isDragging) return;
    shard.x = mouseX + shard.dragOffsetX;
    shard.y = mouseY + shard.dragOffsetY;
    this.dragTrail.push({ x: shard.x, y: shard.y });
  }

  endDraggingShard(shard: IceShard, _mouseX: number, _mouseY: number, currentTime: number): void {
    if (!shard.isDragging) return;
    shard.isDragging = false;
    this.dragTrail = [];

    if (this.isPointInWall(shard.x, shard.y)) {
      shard.isMerging = true;
      shard.mergeStartTime = currentTime;
      shard.mergeTargetX = shard.x;
      shard.mergeTargetY = shard.y;
    } else {
      shard.targetOpacity = 0.85;
      shard.baseY = shard.y;
    }
  }

  rotateShard(shard: IceShard): void {
    shard.targetRotation += Math.PI / 4;
  }

  setShardHover(shard: IceShard, hovering: boolean): void {
    if (!shard.isDragging && !shard.isMerging && !shard.isFading) {
      shard.isHovering = hovering;
    }
  }

  private addAperture(x: number, y: number): void {
    this.apertures.push({
      id: this.apertureIdCounter++,
      x: Math.max(this.config.x + 20, Math.min(this.config.x + this.config.width - 20, x)),
      y: Math.max(this.config.y + 20, Math.min(this.config.y + this.config.height - 20, y)),
      radius: 20,
      rotation: 0,
      rotationSpeed: 0.02,
      opacity: 0.7,
      createdAt: performance.now()
    });
  }

  getApertures(): ColorAperture[] {
    return this.apertures;
  }

  getWallBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.config.x,
      y: this.config.y,
      width: this.config.width,
      height: this.config.height
    };
  }

  setOpacity(opacity: number): void {
    this.config.opacity = opacity;
  }

  setShardSpawnSpeed(speed: number): void {
    this.config.shardSpawnSpeed = speed;
  }

  reset(): void {
    this.shards = [];
    this.apertures = [];
    this.cuttingTrail = null;
    this.isCutting = false;
    this.dragTrail = [];
    this.shardIdCounter = 0;
    this.apertureIdCounter = 0;
    this.generateBubbles();
    this.generateCracks();
    this.renderIceWallTexture();
  }

  getIsCutting(): boolean {
    return this.isCutting;
  }

  resize(width: number, height: number): void {
    const wallWidth = Math.min(width * 0.7, height * 0.7 * 4 / 3);
    const wallHeight = wallWidth * 3 / 4;
    this.config.x = (width - wallWidth) / 2;
    this.config.y = (height - wallHeight) / 2;
    this.config.width = wallWidth;
    this.config.height = wallHeight;
    this.generateBubbles();
    this.generateCracks();
    this.renderIceWallTexture();
  }
}

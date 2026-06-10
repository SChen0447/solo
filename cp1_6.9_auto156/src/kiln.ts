import p5 from 'p5';
import { GlazeData, GlazeSystem, SPRING_STIFFNESS, SPRING_DAMPING } from './glaze';

export type GamePhase = 'placing' | 'clicking' | 'firing' | 'transition' | 'complete';

export interface Shard {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  placed: boolean;
  gridIndex: number;
  fired: boolean;
  glazeData?: GlazeData;
  errorFlash: number;
  shakeTimer: number;
  fromCollection: boolean;
}

export interface LevelConfig {
  level: number;
  totalLevels: number;
  shardCount: number;
  clickSequence: number[];
}

const SHARD_RADIUS = 30;
const GRID_SIZE = 3;
const MAX_COLLECTION = 6;
const FIRE_SUCCESS_THRESHOLD = 3;

export class KilnSystem {
  private p: p5;
  private glaze: GlazeSystem;
  private audioCtx: AudioContext | null = null;

  private shards: Shard[] = [];
  private collection: Shard[] = [];
  private draggingShard: Shard | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private hoveredShard: Shard | null = null;

  private gridPositions: Array<{ x: number; y: number }> = [];
  private gridOccupancy: Array<Shard | null> = [];

  private currentLevel: LevelConfig;
  private clickIndex = 0;
  private correctStreak = 0;
  private phase: GamePhase = 'placing';

  private kilnPulse = 0;
  private transitionProgress = 0;
  private bgHueOffset = 0;

  constructor(p: p5, glaze: GlazeSystem) {
    this.p = p;
    this.glaze = glaze;
    this.currentLevel = this.generateLevel(1);
    this.initAudio();
    this.setupLayout();
    this.initShardPile();
  }

  private initAudio(): void {
    try {
      this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch (e) {
      this.audioCtx = null;
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1): void {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
    }
  }

  private playPlaceSound(): void {
    this.playTone(800, 0.1, 'sine', 0.08);
  }

  private playCorrectSound(): void {
    this.playTone(1200, 0.08, 'sine', 0.08);
    setTimeout(() => this.playTone(1800, 0.08, 'sine', 0.06), 40);
  }

  private playErrorSound(): void {
    this.playTone(150, 0.3, 'sawtooth', 0.05);
  }

  private playFiringSound(): void {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.06), i * 80);
    });
  }

  private generateLevel(level: number): LevelConfig {
    const totalLevels = 8;
    const shardCount = Math.min(3 + Math.floor(level / 2), 9);
    const sequence: number[] = [];
    const available = Array.from({ length: shardCount }, (_, i) => i);
    for (let i = 0; i < FIRE_SUCCESS_THRESHOLD; i++) {
      const idx = Math.floor(Math.random() * available.length);
      sequence.push(available[idx]);
    }
    return { level, totalLevels, shardCount, clickSequence: sequence };
  }

  setupLayout(): void {
    const p = this.p;
    const centerX = p.width / 2;
    const centerY = p.height / 2 + 20;
    const cellSize = 80;
    const offset = cellSize * 1.5;

    this.gridPositions = [];
    this.gridOccupancy = new Array(GRID_SIZE * GRID_SIZE).fill(null);

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        this.gridPositions.push({
          x: centerX - offset + col * cellSize + cellSize / 2,
          y: centerY - offset + row * cellSize + cellSize / 2
        });
      }
    }
  }

  private initShardPile(): void {
    this.shards = [];
    const p = this.p;
    const pileX = 100;
    const pileY = p.height / 2;

    for (let i = 0; i < this.currentLevel.shardCount; i++) {
      const angle = (i / this.currentLevel.shardCount) * Math.PI * 2;
      const spread = 60;
      this.shards.push({
        id: `shard-${Date.now()}-${i}`,
        x: pileX + Math.cos(angle) * spread * 0.3 + (Math.random() - 0.5) * 20,
        y: pileY + Math.sin(angle) * spread * 0.6 + (i - this.currentLevel.shardCount / 2) * 18,
        targetX: 0,
        targetY: 0,
        vx: 0,
        vy: 0,
        radius: SHARD_RADIUS,
        placed: false,
        gridIndex: -1,
        fired: false,
        errorFlash: 0,
        shakeTimer: 0,
        fromCollection: false
      });
    }
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getLevel(): LevelConfig {
    return this.currentLevel;
  }

  getCorrectStreak(): number {
    return this.correctStreak;
  }

  getBgHueOffset(): number {
    return this.bgHueOffset;
  }

  getTransitionProgress(): number {
    return this.transitionProgress;
  }

  private resumeAudio(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  onMousePressed(mx: number, my: number): void {
    this.resumeAudio();

    if (this.phase === 'transition' || this.phase === 'complete') return;

    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      const d = Math.hypot(mx - s.x, my - s.y);
      if (d < s.radius + 5) {
        if (this.phase === 'placing' && !s.placed) {
          this.draggingShard = s;
          this.dragOffsetX = s.x - mx;
          this.dragOffsetY = s.y - my;
          return;
        }
        if (this.phase === 'clicking' && s.placed && !s.fired) {
          this.handleGridClick(s);
          return;
        }
        if (s.fired && this.phase === 'firing') {
          this.draggingShard = s;
          this.dragOffsetX = s.x - mx;
          this.dragOffsetY = s.y - my;
          return;
        }
      }
    }

    for (let i = this.collection.length - 1; i >= 0; i--) {
      const s = this.collection[i];
      const d = Math.hypot(mx - s.x, my - s.y);
      if (d < s.radius + 5) {
        this.draggingShard = s;
        this.dragOffsetX = s.x - mx;
        this.dragOffsetY = s.y - my;
        this.collection.splice(i, 1);
        this.shards.push(s);
        s.fromCollection = true;
        return;
      }
    }
  }

  onMouseDragged(mx: number, my: number): void {
    if (this.draggingShard) {
      this.draggingShard.x = mx + this.dragOffsetX;
      this.draggingShard.y = my + this.dragOffsetY;
    }
  }

  onMouseReleased(mx: number, my: number): void {
    if (!this.draggingShard) return;

    const s = this.draggingShard;

    if (this.phase === 'placing' && !s.placed && !s.fromCollection) {
      const gridIdx = this.findNearestEmptyGrid(mx, my);
      if (gridIdx >= 0) {
        this.placeShardInGrid(s, gridIdx);
      }
    } else if (s.fired) {
      if (this.isInCollectionZone(mx, my)) {
        if (this.collection.length < MAX_COLLECTION) {
          this.addToCollection(s);
        }
      } else if (s.gridIndex >= 0) {
        s.x = this.gridPositions[s.gridIndex].x;
        s.y = this.gridPositions[s.gridIndex].y;
      }
    }

    this.draggingShard = null;
  }

  onMouseMoved(mx: number, my: number): void {
    this.hoveredShard = null;
    for (const s of this.collection) {
      const d = Math.hypot(mx - s.x, my - s.y);
      if (d < s.radius + 5) {
        this.hoveredShard = s;
        break;
      }
    }
  }

  private findNearestEmptyGrid(mx: number, my: number): number {
    let nearest = -1;
    let minDist = Infinity;
    for (let i = 0; i < this.gridPositions.length; i++) {
      if (this.gridOccupancy[i]) continue;
      const g = this.gridPositions[i];
      const d = Math.hypot(mx - g.x, my - g.y);
      if (d < 55 && d < minDist) {
        minDist = d;
        nearest = i;
      }
    }
    return nearest;
  }

  private placeShardInGrid(s: Shard, gridIdx: number): void {
    const pos = this.gridPositions[gridIdx];
    s.targetX = pos.x;
    s.targetY = pos.y;
    s.placed = true;
    s.gridIndex = gridIdx;
    this.gridOccupancy[gridIdx] = s;
    this.playPlaceSound();

    const allPlaced = this.shards.filter(sh => !sh.fromCollection).every(sh => sh.placed);
    if (allPlaced) {
      this.phase = 'clicking';
      this.clickIndex = 0;
    }
  }

  private handleGridClick(s: Shard): void {
    const expectedGrid = this.currentLevel.clickSequence[this.clickIndex];
    const placedShards = this.shards.filter(sh => sh.placed && !sh.fired).sort((a, b) => a.gridIndex - b.gridIndex);
    const shardIdx = placedShards.indexOf(s);

    if (shardIdx === expectedGrid) {
      this.clickIndex++;
      this.correctStreak++;
      this.glaze.spawnSparkParticles(s.x, s.y);
      this.playCorrectSound();

      if (this.correctStreak >= FIRE_SUCCESS_THRESHOLD) {
        this.triggerFiring();
      }
    } else {
      s.errorFlash = 0.3;
      s.shakeTimer = 0.3;
      this.correctStreak = 0;
      this.clickIndex = 0;
      this.playErrorSound();
    }
  }

  private triggerFiring(): void {
    this.phase = 'firing';
    this.playFiringSound();

    const placedShards = this.shards.filter(s => s.placed && !s.fired);
    for (const s of placedShards) {
      s.fired = true;
      const g = GlazeSystem.generateGlazeData();
      s.glazeData = g;
      this.glaze.spawnFiringParticles(s.x, s.y, g.primaryColor, g.secondaryColor);
    }
  }

  private isInCollectionZone(mx: number, my: number): boolean {
    const zoneX = this.p.width - 130;
    const zoneY = 100;
    const zoneW = 110;
    const zoneH = this.p.height - 160;
    return mx >= zoneX && mx <= zoneX + zoneW && my >= zoneY && my <= zoneY + zoneH;
  }

  private addToCollection(s: Shard): void {
    const collectionX = this.p.width - 75;
    const spacing = 75;
    const startY = this.p.height / 2 - ((MAX_COLLECTION - 1) * spacing) / 2;
    const idx = this.collection.length;
    s.x = collectionX;
    s.targetX = collectionX;
    s.y = startY + idx * spacing;
    s.targetY = startY + idx * spacing;
    s.placed = false;
    s.gridIndex = -1;
    if (s.glazeData) {
      s.glazeData.flowProgress = 1;
    }
    this.collection.push(s);
    this.playPlaceSound();

    const allCollected = this.shards.filter(sh => sh.fired).length === 0;
    if (allCollected && this.phase === 'firing') {
      this.startTransition();
    }
  }

  private startTransition(): void {
    this.phase = 'transition';
    this.transitionProgress = 0;
  }

  private nextLevel(): void {
    if (this.currentLevel.level >= this.currentLevel.totalLevels) {
      this.phase = 'complete';
      return;
    }
    const newLevel = this.generateLevel(this.currentLevel.level + 1);
    this.currentLevel = newLevel;
    this.bgHueOffset = (this.bgHueOffset + 15) % 360;
    this.clickIndex = 0;
    this.correctStreak = 0;
    this.phase = 'placing';
    this.shards = this.shards.filter(s => false);
    this.gridOccupancy = new Array(GRID_SIZE * GRID_SIZE).fill(null);
    this.initShardPile();
  }

  update(dt: number): void {
    this.kilnPulse = (this.kilnPulse + dt / 2) % (Math.PI * 2);

    for (const s of this.shards) {
      if (s.placed && s !== this.draggingShard && s.gridIndex >= 0) {
        const pos = this.gridPositions[s.gridIndex];
        s.targetX = pos.x;
        s.targetY = pos.y;
        const ax = (s.targetX - s.x) * SPRING_STIFFNESS;
        const ay = (s.targetY - s.y) * SPRING_STIFFNESS;
        s.vx = (s.vx + ax) * SPRING_DAMPING;
        s.vy = (s.vy + ay) * SPRING_DAMPING;
        s.x += s.vx;
        s.y += s.vy;
      }
      if (s.errorFlash > 0) s.errorFlash -= dt;
      if (s.shakeTimer > 0) s.shakeTimer -= dt;
      if (s.glazeData && s.fired) {
        if (s.glazeData.flowProgress < 1) {
          s.glazeData.flowProgress = Math.min(1, s.glazeData.flowProgress + dt * 0.5 / 3);
        }
        if (s === this.hoveredShard) {
          s.glazeData.rotation += dt * 0.5;
        }
      }
    }

    if (this.phase === 'transition') {
      this.transitionProgress += dt / 1.5;
      if (this.transitionProgress >= 1) {
        this.nextLevel();
        this.transitionProgress = 0;
      }
    }
  }

  render(): void {
    const p = this.p;
    this.renderBackground();
    this.renderShardPilePanel();
    this.renderKiln();
    this.renderCollectionPanel();
    this.renderHUD();
    this.renderShards();
    this.renderCollectionHover();
    this.renderTransitionOverlay();
  }

  private renderBackground(): void {
    const p = this.p;
    const cx = p.width / 2;
    const cy = p.height / 2;
    const maxR = Math.hypot(p.width, p.height) / 2;

    const hueShift = this.bgHueOffset;
    for (let r = maxR; r > 0; r -= 4) {
      const t = r / maxR;
      const baseR = Math.floor(26 + (42 - 26) * (1 - t));
      const baseG = Math.floor(13 + (10 - 13) * (1 - t));
      const baseB = Math.floor(5 + (5 - 5) * (1 - t));
      const hueR = Math.min(255, baseR + Math.sin(hueShift * Math.PI / 180) * 10);
      const hueG = Math.min(255, Math.max(0, baseG + Math.cos(hueShift * Math.PI / 180) * 5));
      p.noStroke();
      p.fill(hueR, hueG, baseB);
      p.ellipse(cx, cy, r * 2, r * 2);
    }
  }

  private renderShardPilePanel(): void {
    const p = this.p;
    p.noStroke();
    p.fill(60, 35, 20, 120);
    p.rect(20, 80, 160, p.height - 140, 12);
    p.stroke(136, 85, 51, 80);
    p.strokeWeight(0.5);
    p.noFill();
    p.rect(20, 80, 160, p.height - 140, 12);

    p.noStroke();
    p.fill(200, 170, 120, 200);
    p.textSize(14);
    p.textAlign(p.CENTER, p.TOP);
    p.text('素胚瓷片', 100, 92);
  }

  private renderKiln(): void {
    const p = this.p;
    const cx = p.width / 2;
    const cy = p.height / 2 + 20;
    const pulse = Math.sin(this.kilnPulse) * 10;
    const kilnSize = 280 + pulse;

    const kilnGrad = p.drawingContext.createRadialGradient(cx, cy, 0, cx, cy, kilnSize);
    kilnGrad.addColorStop(0, 'rgba(30, 15, 5, 1)');
    kilnGrad.addColorStop(0.7, 'rgba(15, 7, 3, 1)');
    kilnGrad.addColorStop(1, 'rgba(10, 5, 5, 1)');
    p.noStroke();
    p.drawingContext.fillStyle = kilnGrad;
    p.rect(cx - kilnSize / 2, cy - kilnSize / 2, kilnSize, kilnSize, 16);

    const glowR = 160 + pulse;
    for (let i = 3; i >= 0; i--) {
      const alpha = (0.15 - i * 0.03) * (0.5 + Math.sin(this.kilnPulse) * 0.5);
      p.noFill();
      p.stroke(255, 160, 60, alpha * 255);
      p.strokeWeight(3 + i * 2);
      p.rect(cx - glowR / 2 - i * 5, cy - glowR / 2 - i * 5, glowR + i * 10, glowR + i * 10, 18);
    }

    p.stroke(136, 85, 51, 77);
    p.strokeWeight(1);
    const cellSize = 80;
    const offset = cellSize * 1.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const x = cx - offset + i * cellSize;
      p.line(x, cy - offset, x, cy - offset + cellSize * GRID_SIZE);
      const y = cy - offset + i * cellSize;
      p.line(cx - offset, y, cx - offset + cellSize * GRID_SIZE, y);
    }

    if (this.phase === 'clicking') {
      this.renderClickHints();
    }
  }

  private renderClickHints(): void {
    const p = this.p;
    const placedShards = this.shards
      .filter(s => s.placed && !s.fired)
      .sort((a, b) => a.gridIndex - b.gridIndex);

    for (let i = 0; i < this.clickIndex; i++) {
      const s = placedShards[this.currentLevel.clickSequence[i]];
      if (s) {
        p.noFill();
        p.stroke(100, 255, 150, 150);
        p.strokeWeight(2);
        p.ellipse(s.x, s.y, s.radius * 2 + 8, s.radius * 2 + 8);
      }
    }

    const nextIdx = this.currentLevel.clickSequence[this.clickIndex];
    const nextShard = placedShards[nextIdx];
    if (nextShard) {
      const pulse = (Math.sin(p.millis() / 200) + 1) / 2;
      p.noFill();
      p.stroke(255, 200, 100, 100 + pulse * 100);
      p.strokeWeight(2);
      p.ellipse(nextShard.x, nextShard.y, nextShard.radius * 2 + 14 + pulse * 6, nextShard.radius * 2 + 14 + pulse * 6);
    }
  }

  private renderCollectionPanel(): void {
    const p = this.p;
    const x = p.width - 150;
    const w = 130;

    p.noStroke();
    p.fill(20, 40, 80, 140);
    p.rect(x, 80, w, p.height - 140, 12);
    p.stroke(100, 130, 200, 80);
    p.strokeWeight(0.5);
    p.noFill();
    p.rect(x, 80, w, p.height - 140, 12);

    p.noStroke();
    p.fill(180, 200, 255, 200);
    p.textSize(14);
    p.textAlign(p.CENTER, p.TOP);
    p.text('收藏架', x + w / 2, 92);

    if (this.collection.length >= MAX_COLLECTION) {
      p.fill(255, 150, 150, 200);
      p.textSize(11);
      p.text('已满', x + w / 2, 115);
    }
  }

  private renderHUD(): void {
    const p = this.p;
    const { level, totalLevels } = this.currentLevel;

    p.noStroke();
    p.fill(200, 170, 120, 230);
    p.textSize(20);
    p.textAlign(p.CENTER, p.TOP);
    p.text(`第 ${level} / ${totalLevels} 关`, p.width / 2, 30);

    if (this.phase === 'clicking') {
      p.fill(255, 200, 100, 200);
      p.textSize(14);
      p.text(`连击: ${this.correctStreak} / ${FIRE_SUCCESS_THRESHOLD}`, p.width / 2, 60);
    }

    if (this.phase === 'placing') {
      p.fill(180, 200, 255, 200);
      p.textSize(14);
      const placed = this.shards.filter(s => s.placed).length;
      p.text(`放置瓷片: ${placed} / ${this.currentLevel.shardCount}`, p.width / 2, 60);
    }

    if (this.phase === 'firing') {
      p.fill(150, 255, 200, 220);
      p.textSize(14);
      p.text('烧制完成！拖拽瓷片到收藏架', p.width / 2, 60);
    }

    if (this.phase === 'complete') {
      p.fill(255, 220, 150, 255);
      p.textSize(28);
      p.text('恭喜通关！', p.width / 2, p.height / 2 - 50);
      p.textSize(16);
      p.fill(200, 200, 200, 200);
      p.text('你已成为星火窑大师', p.width / 2, p.height / 2 - 10);
    }
  }

  private renderShards(): void {
    const p = this.p;
    for (const s of this.shards) {
      this.renderShard(s);
    }
    for (const s of this.collection) {
      this.renderShard(s);
    }
  }

  private renderShard(s: Shard): void {
    const p = this.p;
    let x = s.x;
    let y = s.y;

    if (s.shakeTimer > 0) {
      x += (Math.random() - 0.5) * 6;
      y += (Math.random() - 0.5) * 6;
    }

    if (this.draggingShard === s) {
      p.drawingContext.shadowColor = 'rgba(0, 0, 0, 0.5)';
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowOffsetX = 0;
      p.drawingContext.shadowOffsetY = 4;
    }

    p.push();
    p.translate(x, y);

    p.noStroke();
    if (s.errorFlash > 0) {
      const flashAlpha = Math.sin(s.errorFlash * 50) * 0.5 + 0.5;
      p.fill(255, 60, 60, 180 * flashAlpha + 50);
    } else if (s.fired && s.glazeData) {
      p.fill(50, 40, 50, 200);
    } else {
      p.fill(200, 195, 185, 140);
    }
    p.ellipse(0, 0, s.radius * 2, s.radius * 2);

    if (s.fired && s.glazeData) {
      p.pop();
      this.glaze.renderGlaze(x, y, s.radius, s.glazeData, this.hoveredShard === s);
      p.push();
      p.translate(x, y);
    } else {
      p.stroke(80, 60, 40, 90);
      p.strokeWeight(0.8);
      p.noFill();
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + s.id.charCodeAt(s.id.length - 1) * 0.1;
        const r1 = s.radius * 0.4;
        const r2 = s.radius * 0.8;
        p.line(
          Math.cos(angle) * r1,
          Math.sin(angle) * r1,
          Math.cos(angle) * r2,
          Math.sin(angle) * r2
        );
      }
      p.ellipse(0, 0, s.radius * 0.5, s.radius * 0.5);
    }

    p.noFill();
    p.stroke(255, 245, 220, 180);
    p.strokeWeight(0.5);
    p.ellipse(0, -s.radius * 0.3, s.radius * 1.2, s.radius * 0.4);

    p.drawingContext.shadowColor = 'transparent';
    p.drawingContext.shadowBlur = 0;
    p.pop();
  }

  private renderCollectionHover(): void {
    const p = this.p;
    if (this.draggingShard && this.draggingShard.fired) {
      if (this.isInCollectionZone(p.mouseX, p.mouseY)) {
        const x = p.width - 130;
        const y = 80;
        const w = 110;
        const h = p.height - 140;
        const canAdd = this.collection.length < MAX_COLLECTION;
        p.noFill();
        p.stroke(canAdd ? 150 : 255, canAdd ? 255 : 100, canAdd ? 150 : 100, 200);
        p.strokeWeight(2);
        p.rect(x, y, w, h, 12);
      }
    }
  }

  private renderTransitionOverlay(): void {
    if (this.phase !== 'transition') return;
    const p = this.p;
    const alpha = Math.sin(this.transitionProgress * Math.PI) * 0.7;
    p.noStroke();
    p.fill(0, 0, 0, alpha * 255);
    p.rect(0, 0, p.width, p.height);

    if (this.transitionProgress > 0.4 && this.transitionProgress < 0.6) {
      p.fill(255, 220, 150, (1 - Math.abs(this.transitionProgress - 0.5) * 5) * 255);
      p.textSize(32);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(`第 ${this.currentLevel.level + 1} 关`, p.width / 2, p.height / 2);
    }
  }
}

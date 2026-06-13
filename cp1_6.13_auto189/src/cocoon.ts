import gsap from 'gsap';
import { InteractionState, Point } from './interaction';

interface SilkThread {
  id: number;
  startPoint: Point;
  endPoint: Point;
  baseStartPoint: Point;
  baseEndPoint: Point;
  baseLength: number;
  opacity: number;
  isDragged: boolean;
  isAdjacent: boolean;
  flowProgress: number;
  flowActive: boolean;
  stretchRatio: number;
  targetStretchRatio: number;
}

interface StarPoint {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  diameter: number;
  baseDiameter: number;
  twinklePhase: number;
  twinkleSpeed: number;
  color: string;
  flashIntensity: number;
  flashTimer: number;
  isNew: boolean;
  spawnProgress: number;
  rotation: number;
}

export interface CocoonConfig {
  centerX: number;
  centerY: number;
  majorAxis: number;
  minorAxis: number;
  threadCount: number;
  starCount: number;
  rotationSpeed: number;
}

export class Cocoon {
  private ctx: CanvasRenderingContext2D;
  private config: CocoonConfig;
  private threads: SilkThread[];
  private stars: StarPoint[];
  private rotation: number;
  private draggedThreadId: number | null;
  private dragOffset: Point;
  private time: number;

  private starColorPool: string[] = [
    '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
    '#ff61d2', '#a66cff', '#00d2d3', '#ff9f43',
    '#ee5253', '#10ac84', '#5f27cd', '#54a0ff'
  ];

  constructor(ctx: CanvasRenderingContext2D, config: CocoonConfig) {
    this.ctx = ctx;
    this.config = config;
    this.threads = [];
    this.stars = [];
    this.rotation = 0;
    this.draggedThreadId = null;
    this.dragOffset = { x: 0, y: 0 };
    this.time = 0;
    this.initThreads();
    this.initStars();
  }

  private initThreads(): void {
    const { centerX, centerY, majorAxis, minorAxis, threadCount } = this.config;
    
    for (let i = 0; i < threadCount; i++) {
      const angle1 = (i / threadCount) * Math.PI * 2 + Math.random() * 0.2;
      const angle2 = angle1 + Math.PI * 0.3 + Math.random() * 0.5;
      const helixOffset = (i / threadCount) * Math.PI * 4;
      
      const r1 = 0.8 + Math.random() * 0.2;
      const r2 = 0.7 + Math.random() * 0.3;
      
      const x1 = centerX + Math.cos(angle1 + helixOffset * 0.1) * minorAxis * r1;
      const y1 = centerY + Math.sin(angle1) * majorAxis * r1 * 0.5;
      
      const x2 = centerX + Math.cos(angle2 + helixOffset * 0.1) * minorAxis * r2;
      const y2 = centerY + Math.sin(angle2) * majorAxis * r2 * 0.5;
      
      const startPoint = { x: x1, y: y1 };
      const endPoint = { x: x2, y: y2 };
      const baseLength = this.distance(startPoint, endPoint);
      
      this.threads.push({
        id: i,
        startPoint: { ...startPoint },
        endPoint: { ...endPoint },
        baseStartPoint: { ...startPoint },
        baseEndPoint: { ...endPoint },
        baseLength,
        opacity: 0.6 + Math.random() * 0.4,
        isDragged: false,
        isAdjacent: false,
        flowProgress: 0,
        flowActive: false,
        stretchRatio: 1,
        targetStretchRatio: 1
      });
    }
  }

  private initStars(): void {
    const { centerX, centerY, majorAxis, minorAxis, starCount } = this.config;
    
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.8;
      const x = centerX + Math.cos(angle) * minorAxis * r;
      const y = centerY + Math.sin(angle) * majorAxis * r * 0.5;
      
      this.stars.push({
        id: i,
        x,
        y,
        baseX: x,
        baseY: y,
        diameter: 6 + Math.random() * 4,
        baseDiameter: 6 + Math.random() * 4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: (1.2 + Math.random() * 0.8) * 1000,
        color: '#ffe066',
        flashIntensity: 0,
        flashTimer: 0,
        isNew: false,
        spawnProgress: 1,
        rotation: 0
      });
    }
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  public update(deltaTime: number, interaction: InteractionState): void {
    this.time += deltaTime;
    this.rotation += this.config.rotationSpeed * deltaTime / 1000;
    
    this.updateThreadPositions();
    
    if (interaction.isDragging && interaction.dragCurrent) {
      this.handleDrag(interaction.dragCurrent);
    } else if (this.draggedThreadId !== null) {
      this.releaseDrag();
    }
    
    this.updateStars(deltaTime);
    this.updateFlows(deltaTime);
    this.updateStretchAnimation(deltaTime);
  }

  private updateThreadPositions(): void {
    const { centerX, centerY } = this.config;
    
    this.threads.forEach(thread => {
      if (!thread.isDragged && !thread.isAdjacent) {
        const angleOffset = this.rotation;
        
        const sx = thread.baseStartPoint.x - centerX;
        const sy = thread.baseStartPoint.y - centerY;
        thread.startPoint.x = centerX + sx * Math.cos(angleOffset) - sy * Math.sin(angleOffset);
        thread.startPoint.y = centerY + sx * Math.sin(angleOffset) + sy * Math.cos(angleOffset);
        
        const ex = thread.baseEndPoint.x - centerX;
        const ey = thread.baseEndPoint.y - centerY;
        thread.endPoint.x = centerX + ex * Math.cos(angleOffset) - ey * Math.sin(angleOffset);
        thread.endPoint.y = centerY + ex * Math.sin(angleOffset) + ey * Math.cos(angleOffset);
      }
    });
    
    this.stars.forEach(star => {
      if (!star.isNew || star.spawnProgress >= 1) {
        const sx = star.baseX - centerX;
        const sy = star.baseY - centerY;
        star.x = centerX + sx * Math.cos(this.rotation) - sy * Math.sin(this.rotation);
        star.y = centerY + sx * Math.sin(this.rotation) + sy * Math.cos(this.rotation);
      }
    });
  }

  private handleDrag(mousePos: Point): void {
    if (this.draggedThreadId === null) {
      this.findClosestThread(mousePos);
    }
    
    if (this.draggedThreadId !== null) {
      const thread = this.threads[this.draggedThreadId];
      const newEnd = {
        x: mousePos.x - this.dragOffset.x,
        y: mousePos.y - this.dragOffset.y
      };
      
      const startPos = thread.startPoint;
      const currentLength = this.distance(startPos, newEnd);
      const maxLength = thread.baseLength * 3;
      
      if (currentLength > maxLength) {
        const angle = Math.atan2(newEnd.y - startPos.y, newEnd.x - startPos.x);
        newEnd.x = startPos.x + Math.cos(angle) * maxLength;
        newEnd.y = startPos.y + Math.sin(angle) * maxLength;
      }
      
      thread.endPoint = newEnd;
      thread.stretchRatio = this.distance(startPos, newEnd) / thread.baseLength;
      thread.flowActive = true;
      
      this.updateAdjacentThreads(this.draggedThreadId, thread.stretchRatio);
      this.triggerChainFlash(this.draggedThreadId);
    }
  }

  private findClosestThread(mousePos: Point): void {
    let minDist = Infinity;
    let closestId = -1;
    let closestIsEnd = false;
    
    this.threads.forEach((thread, index) => {
      const distEnd = this.distance(mousePos, thread.endPoint);
      const distStart = this.distance(mousePos, thread.startPoint);
      
      if (distEnd < minDist && distEnd < 30) {
        minDist = distEnd;
        closestId = index;
        closestIsEnd = true;
      }
      if (distStart < minDist && distStart < 30) {
        minDist = distStart;
        closestId = index;
        closestIsEnd = false;
      }
    });
    
    if (closestId >= 0) {
      this.draggedThreadId = closestId;
      const thread = this.threads[closestId];
      thread.isDragged = true;
      
      const anchor = closestIsEnd ? thread.endPoint : thread.startPoint;
      const other = closestIsEnd ? thread.startPoint : thread.endPoint;
      
      this.dragOffset = {
        x: mousePos.x - anchor.x,
        y: mousePos.y - anchor.y
      };
      
      thread.endPoint = closestIsEnd ? anchor : other;
      thread.startPoint = closestIsEnd ? other : anchor;
    }
  }

  private updateAdjacentThreads(draggedId: number, stretchRatio: number): void {
    const adjacentIndices: number[] = [];
    for (let i = -3; i <= 3; i++) {
      if (i !== 0) {
        const idx = (draggedId + i + this.threads.length) % this.threads.length;
        adjacentIndices.push(idx);
      }
    }
    
    this.threads.forEach((thread, index) => {
      if (index === draggedId) return;
      if (adjacentIndices.includes(index)) {
        thread.isAdjacent = true;
        const dist = Math.abs(index - draggedId);
        const adjStretch = 1 + (stretchRatio - 1) * (1 - dist / 7);
        thread.targetStretchRatio = Math.min(adjStretch, 2.5);
      } else {
        thread.isAdjacent = false;
        thread.targetStretchRatio = 1;
      }
    });
  }

  private triggerChainFlash(threadId: number): void {
    const thread = this.threads[threadId];
    const midPoint = {
      x: (thread.startPoint.x + thread.endPoint.x) / 2,
      y: (thread.startPoint.y + thread.endPoint.y) / 2
    };
    
    let closestStar: StarPoint | null = null;
    let minDist = Infinity;
    
    for (const star of this.stars) {
      const dist = this.distance(midPoint, star);
      if (dist < minDist) {
        minDist = dist;
        closestStar = star;
      }
    }
    
    const targetStar = closestStar;
    if (targetStar && minDist < 100) {
      targetStar.flashIntensity = 1.5;
      targetStar.flashTimer = 300;
      
      for (const star of this.stars) {
        if (star.id !== targetStar.id) {
          const d = this.distance(targetStar, star);
          if (d < 80) {
            setTimeout(() => {
              star.flashIntensity = 1.2;
              star.flashTimer = 200;
            }, 100);
          }
        }
      }
    }
  }

  private releaseDrag(): void {
    if (this.draggedThreadId !== null) {
      const thread = this.threads[this.draggedThreadId];
      thread.isDragged = false;
      thread.flowActive = false;
      thread.targetStretchRatio = 1;
      
      gsap.to(thread, {
        stretchRatio: 1,
        duration: 0.8,
        ease: 'bounce.out',
        onUpdate: () => {
          const ratio = thread.stretchRatio;
          const angle = Math.atan2(
            thread.baseEndPoint.y - thread.startPoint.y,
            thread.baseEndPoint.x - thread.startPoint.x
          );
          const length = thread.baseLength * ratio;
          thread.endPoint.x = thread.startPoint.x + Math.cos(angle) * length;
          thread.endPoint.y = thread.startPoint.y + Math.sin(angle) * length;
        }
      });
      
      this.threads.forEach(t => {
        t.isAdjacent = false;
        t.targetStretchRatio = 1;
      });
      
      this.draggedThreadId = null;
    }
  }

  private updateStars(deltaTime: number): void {
    this.stars.forEach(star => {
      star.twinklePhase += (deltaTime / star.twinkleSpeed) * Math.PI * 2;
      
      if (star.flashTimer > 0) {
        star.flashTimer -= deltaTime;
        star.flashIntensity = Math.max(0, star.flashIntensity - deltaTime / 300);
      }
      
      if (star.isNew && star.spawnProgress < 1) {
        star.spawnProgress = Math.min(1, star.spawnProgress + deltaTime / 400);
        star.rotation += deltaTime * 0.01;
      }
    });
  }

  private updateFlows(deltaTime: number): void {
    const flowSpeed = 100;
    
    this.threads.forEach(thread => {
      if (thread.flowActive) {
        const currentLength = this.distance(thread.startPoint, thread.endPoint);
        thread.flowProgress += (flowSpeed * deltaTime / 1000) / currentLength;
        if (thread.flowProgress > 1) {
          thread.flowProgress = 0;
        }
      }
    });
  }

  private updateStretchAnimation(deltaTime: number): void {
    this.threads.forEach(thread => {
      if (!thread.isDragged && thread.stretchRatio !== thread.targetStretchRatio) {
        const diff = thread.targetStretchRatio - thread.stretchRatio;
        thread.stretchRatio += diff * deltaTime / 200;
        
        const angle = Math.atan2(
          thread.baseEndPoint.y - thread.startPoint.y,
          thread.baseEndPoint.x - thread.startPoint.x
        );
        const length = thread.baseLength * thread.stretchRatio;
        thread.endPoint.x = thread.startPoint.x + Math.cos(angle) * length;
        thread.endPoint.y = thread.startPoint.y + Math.sin(angle) * length;
      }
    });
  }

  public render(): void {
    this.threads.forEach(thread => {
      this.renderThread(thread);
    });
    
    this.stars.forEach(star => {
      this.renderStar(star);
    });
    
    this.renderEnergyField();
  }

  private renderThread(thread: SilkThread): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(
      thread.startPoint.x, thread.startPoint.y,
      thread.endPoint.x, thread.endPoint.y
    );
    
    if (thread.flowActive || thread.stretchRatio > 1.1) {
      gradient.addColorStop(0, 'rgba(161, 140, 209, ' + thread.opacity + ')');
      gradient.addColorStop(1, 'rgba(251, 194, 235, ' + thread.opacity + ')');
    } else {
      gradient.addColorStop(0, 'rgba(255, 154, 158, ' + thread.opacity + ')');
      gradient.addColorStop(1, 'rgba(250, 208, 196, ' + thread.opacity + ')');
    }
    
    ctx.beginPath();
    ctx.moveTo(thread.startPoint.x, thread.startPoint.y);
    ctx.lineTo(thread.endPoint.x, thread.endPoint.y);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    if (thread.flowActive) {
      this.renderFlow(thread);
    }
    
    ctx.beginPath();
    ctx.arc(thread.endPoint.x, thread.endPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();
  }

  private renderFlow(thread: SilkThread): void {
    const ctx = this.ctx;
    const t = thread.flowProgress;
    
    const flowX = thread.startPoint.x + (thread.endPoint.x - thread.startPoint.x) * t;
    const flowY = thread.startPoint.y + (thread.endPoint.y - thread.startPoint.y) * t;
    
    const glowGradient = ctx.createRadialGradient(flowX, flowY, 0, flowX, flowY, 15);
    glowGradient.addColorStop(0, 'rgba(251, 194, 235, 0.9)');
    glowGradient.addColorStop(0.5, 'rgba(161, 140, 209, 0.5)');
    glowGradient.addColorStop(1, 'rgba(161, 140, 209, 0)');
    
    ctx.beginPath();
    ctx.arc(flowX, flowY, 15, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
  }

  private renderStar(star: StarPoint): void {
    const ctx = this.ctx;
    const twinkle = 0.7 + 0.3 * Math.sin(star.twinklePhase);
    const flashMultiplier = 1 + star.flashIntensity;
    const scale = star.isNew ? star.spawnProgress : 1;
    const diameter = star.diameter * twinkle * flashMultiplier * scale;
    
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.rotation);
    
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, diameter * 2);
    glowGradient.addColorStop(0, star.color);
    glowGradient.addColorStop(0.3, star.color + '80');
    glowGradient.addColorStop(1, 'transparent');
    
    ctx.beginPath();
    ctx.arc(0, 0, diameter * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const outerR = diameter;
      const innerR = diameter * 0.4;
      
      const outerX = Math.cos(angle) * outerR;
      const outerY = Math.sin(angle) * outerR;
      const innerAngle = angle + Math.PI / 6;
      const innerX = Math.cos(innerAngle) * innerR;
      const innerY = Math.sin(innerAngle) * innerR;
      
      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fillStyle = star.color;
    ctx.fill();
    
    ctx.restore();
  }

  private renderEnergyField(): void {
    const ctx = this.ctx;
    const { centerX, centerY, majorAxis, minorAxis } = this.config;
    const padding = 20;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.rotation * 0.5);
    
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -this.time * 0.02;
    
    ctx.beginPath();
    ctx.ellipse(0, 0, minorAxis + padding, majorAxis / 2 + padding, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.restore();
  }

  public checkStarClick(point: Point): StarPoint | null {
    for (const star of this.stars) {
      const dist = this.distance(point, star);
      if (dist < star.diameter * 2) {
        return star;
      }
    }
    return null;
  }

  public explodeStar(star: StarPoint): { x: number; y: number; particles: { angle: number; speed: number; distance: number }[] } {
    const particleCount = 5 + Math.floor(Math.random() * 4);
    const particles: { angle: number; speed: number; distance: number }[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: 50 + Math.random() * 50,
        distance: 50 + Math.random() * 30
      });
    }
    
    const idx = this.stars.findIndex(s => s.id === star.id);
    if (idx >= 0) {
      const newColor = this.starColorPool[Math.floor(Math.random() * this.starColorPool.length)];
      
      this.stars[idx] = {
        ...this.stars[idx],
        color: newColor,
        isNew: true,
        spawnProgress: 0,
        rotation: 0,
        flashIntensity: 0,
        flashTimer: 0
      };
      
      setTimeout(() => {
        if (this.stars[idx]) {
          this.stars[idx].isNew = false;
          this.stars[idx].spawnProgress = 1;
        }
      }, 500);
    }
    
    return { x: star.x, y: star.y, particles };
  }

  public getCenter(): Point {
    return { x: this.config.centerX, y: this.config.centerY };
  }

  public getCocoonRadius(): number {
    return this.config.minorAxis + 60;
  }
}

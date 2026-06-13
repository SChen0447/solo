import { gsap } from 'gsap';
import {
  AnchorPoint,
  OreBlock,
  Particle,
  ConstellationLine,
  ShockWave,
  StarCore,
  RenderState,
  Renderer
} from './renderer';
import { InputState } from './input';

export interface ConstellationPattern {
  name: string;
  anchors: number[];
}

const CONSTELLATIONS: ConstellationPattern[] = [
  { name: '大熊座', anchors: [2, 5, 8, 11] },
  { name: '仙后座', anchors: [1, 4, 7, 10] },
  { name: '猎户座', anchors: [0, 3, 6, 9, 11] },
  { name: '天蝎座', anchors: [1, 5, 9] },
  { name: '狮子座', anchors: [2, 6, 10, 0] }
];

const MAX_STEPS = 15;
const MAX_PARTICLES = 500;
const DAMPING = 0.85;

export class GameEngine {
  private renderer: Renderer;
  private anchors: AnchorPoint[] = [];
  private oreBlocks: OreBlock[] = [];
  private particles: Particle[] = [];
  private constellationLines: ConstellationLine[] = [];
  private shockWaves: ShockWave[] = [];
  private starCore: StarCore;
  private orbitRotation: number = 0;
  private orbitA: number = 400;
  private orbitB: number = 300;
  private hoverAnchorId: number | null = null;
  private currentConstellation: ConstellationPattern;
  private stepsRemaining: number = MAX_STEPS;
  private correctConnections: number = 0;
  private totalConnections: number = 0;
  private oreIdCounter: number = 0;
  private isGameComplete: boolean = false;
  private isResetting: boolean = false;
  private dragStartAnchor: number | null = null;
  private finalShockWave: ShockWave | null = null;

  public onProgressUpdate?: (progress: string, steps: string, constellation: string) => void;
  public onComplete?: () => void;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.starCore = {
      x: 0,
      y: 0,
      radius: 30,
      baseRadius: 30,
      brightness: 0,
      color: '#8b0000',
      isIgnited: false,
      isBurning: false,
      pulsePhase: 0
    };
    this.currentConstellation = CONSTELLATIONS[0];
    this.init();
  }

  private init() {
    this.createAnchors();
    this.spawnOreBlocks();
    this.selectRandomConstellation();
  }

  private createAnchors() {
    this.anchors = [];
    const numAnchors = 12;
    for (let i = 0; i < numAnchors; i++) {
      const angle = (i / numAnchors) * Math.PI * 2;
      const x = Math.cos(angle) * this.orbitA;
      const y = Math.sin(angle) * this.orbitB;
      this.anchors.push({
        id: i,
        x,
        y,
        angle
      });
    }
  }

  private getAnchorOnEllipse(angle: number): { x: number; y: number } {
    return {
      x: Math.cos(angle) * this.orbitA,
      y: Math.sin(angle) * this.orbitB
    };
  }

  private getAngleFromPoint(x: number, y: number): number {
    const angle = Math.atan2(y / this.orbitB, x / this.orbitA);
    return angle < 0 ? angle + Math.PI * 2 : angle;
  }

  private spawnOreBlocks() {
    this.oreBlocks = [];
    const numOres = Math.floor(Math.random() * 3) + 5;
    const availableAnchors = [...Array(12).keys()];

    for (let i = 0; i < numOres; i++) {
      const idx = Math.floor(Math.random() * availableAnchors.length);
      const anchorId = availableAnchors.splice(idx, 1)[0];
      const anchor = this.anchors.find((a) => a.id === anchorId)!;
      const size = Math.random() * 20 + 30;

      this.oreBlocks.push({
        id: this.oreIdCounter++,
        anchorId,
        x: anchor.x,
        y: anchor.y,
        size,
        rotation: Math.random() * Math.PI * 2,
        color1: '#ff8c42',
        color2: '#8b4513',
        texture: this.renderer.generateOreTexture(size, this.oreIdCounter),
        isDragging: false,
        targetX: anchor.x,
        targetY: anchor.y,
        velocityX: 0,
        velocityY: 0,
        warningFlash: 0,
        isCorrect: false
      });
    }
  }

  private selectRandomConstellation() {
    const idx = Math.floor(Math.random() * CONSTELLATIONS.length);
    this.currentConstellation = CONSTELLATIONS[idx];
    this.totalConnections = this.currentConstellation.anchors.length - 1;
    this.correctConnections = 0;
    this.stepsRemaining = MAX_STEPS;
    this.constellationLines = [];
    this.updateOreCorrectness();
    this.updateUI();
  }

  private updateOreCorrectness() {
    for (const ore of this.oreBlocks) {
      ore.isCorrect = this.currentConstellation.anchors.includes(ore.anchorId);
    }
  }

  private updateUI() {
    if (this.onProgressUpdate) {
      this.onProgressUpdate(
        `${this.correctConnections}/${this.totalConnections}`,
        `剩余 ${this.stepsRemaining} 步`,
        this.currentConstellation.name
      );
    }
  }

  handleInput(type: string, state: InputState) {
    if (this.isResetting || this.isGameComplete) return;

    switch (type) {
      case 'mousedown':
        this.handleMouseDown(state);
        break;
      case 'mousemove':
        this.handleMouseMove(state);
        break;
      case 'drag':
        this.handleDrag(state);
        break;
      case 'dragend':
        this.handleDragEnd(state);
        break;
    }
  }

  private handleMouseDown(state: InputState) {
    const ore = this.findOreAtPosition(state.mouseX, state.mouseY);
    if (ore) {
      ore.isDragging = true;
      this.dragStartAnchor = ore.anchorId;
    }
  }

  private handleMouseMove(state: InputState) {
    const ore = this.findOreAtPosition(state.mouseX, state.mouseY);
    const anchor = this.findAnchorAtPosition(state.mouseX, state.mouseY);
    this.hoverAnchorId = anchor?.id ?? null;
  }

  private handleDrag(state: InputState) {
    const draggingOre = this.oreBlocks.find((o) => o.isDragging);
    if (!draggingOre) return;

    const targetAngle = this.getAngleFromPoint(state.mouseX, state.mouseY);
    const orbitPos = this.getAnchorOnEllipse(targetAngle);

    draggingOre.targetX = orbitPos.x;
    draggingOre.targetY = orbitPos.y;

    const targetAngleDeg = (targetAngle * 180) / Math.PI;
    const rotationAngle = (targetAngleDeg * Math.PI) / 180;
    draggingOre.rotation = rotationAngle;
  }

  private handleDragEnd(state: InputState) {
    const draggingOre = this.oreBlocks.find((o) => o.isDragging);
    if (!draggingOre) return;

    draggingOre.isDragging = false;

    const occupiedAnchors = this.oreBlocks
      .filter((o) => o.id !== draggingOre.id)
      .map((o) => o.anchorId);

    let nearestAnchor: AnchorPoint | null = null;
    let minDist = Infinity;

    for (const anchor of this.anchors) {
      if (occupiedAnchors.includes(anchor.id)) continue;

      const dx = draggingOre.targetX - anchor.x;
      const dy = draggingOre.targetY - anchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) {
        minDist = dist;
        nearestAnchor = anchor;
      }
    }

    if (nearestAnchor) {
      const oldAnchorId = draggingOre.anchorId;
      draggingOre.anchorId = nearestAnchor.id;
      draggingOre.targetX = nearestAnchor.x;
      draggingOre.targetY = nearestAnchor.y;

      if (oldAnchorId !== nearestAnchor.id && this.dragStartAnchor !== nearestAnchor.id) {
        this.stepsRemaining--;
        this.updateUI();
      }

      gsap.to(draggingOre, {
        x: nearestAnchor.x,
        y: nearestAnchor.y,
        duration: 0.3,
        ease: 'power2.out',
        onComplete: () => {
          this.shockWaves.push(
            this.renderer.createShockWave(nearestAnchor!.x, nearestAnchor!.y, '#87ceeb')
          );
          this.checkConstellation();
          this.checkGameOver();
        }
      });
    }

    this.dragStartAnchor = null;
  }

  private findOreAtPosition(x: number, y: number): OreBlock | null {
    for (let i = this.oreBlocks.length - 1; i >= 0; i--) {
      const ore = this.oreBlocks[i];
      const dx = x - ore.x;
      const dy = y - ore.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ore.size * 0.6) {
        return ore;
      }
    }
    return null;
  }

  private findAnchorAtPosition(x: number, y: number): AnchorPoint | null {
    for (const anchor of this.anchors) {
      const dx = x - anchor.x;
      const dy = y - anchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 20) {
        return anchor;
      }
    }
    return null;
  }

  private checkConstellation() {
    const oreAnchorIds = this.oreBlocks.map((o) => o.anchorId);
    const patternAnchors = this.currentConstellation.anchors;

    let newCorrectConnections = 0;
    const newLines: ConstellationLine[] = [];

    for (let i = 0; i < patternAnchors.length - 1; i++) {
      const from = patternAnchors[i];
      const to = patternAnchors[i + 1];

      if (oreAnchorIds.includes(from) && oreAnchorIds.includes(to)) {
        newCorrectConnections++;

        const existingLine = this.constellationLines.find(
          (l) => (l.from === from && l.to === to) || (l.from === to && l.to === from)
        );

        if (existingLine) {
          newLines.push(existingLine);
        } else {
          const fromAnchor = this.anchors.find((a) => a.id === from)!;
          const toAnchor = this.anchors.find((a) => a.id === to)!;
          const midX = (fromAnchor.x + toAnchor.x) / 2;
          const midY = (fromAnchor.y + toAnchor.y) / 2;

          const particleCount = Math.floor(Math.random() * 6) + 10;
          const goldParticles = this.renderer.createParticle(midX, midY, 'gold', particleCount);
          this.addParticles(goldParticles);

          newLines.push({
            from,
            to,
            progress: 0,
            isGlowing: true,
            glowTime: 0.5
          });

          gsap.to(newLines[newLines.length - 1], {
            progress: 1,
            duration: 0.5,
            ease: 'power2.out'
          });

          const fromOre = this.oreBlocks.find((o) => o.anchorId === from);
          const toOre = this.oreBlocks.find((o) => o.anchorId === to);
          if (fromOre) fromOre.isCorrect = true;
          if (toOre) toOre.isCorrect = true;
        }
      }
    }

    this.constellationLines = newLines;
    this.correctConnections = newCorrectConnections;
    this.updateUI();

    if (this.correctConnections === this.totalConnections) {
      this.triggerVictory();
    }
  }

  private checkGameOver() {
    if (this.stepsRemaining <= 0 && this.correctConnections < this.totalConnections) {
      this.triggerReset();
    }
  }

  private triggerReset() {
    this.isResetting = true;

    for (const ore of this.oreBlocks) {
      gsap.to(ore, {
        warningFlash: 1,
        duration: 0.3,
        yoyo: true,
        repeat: 2,
        ease: 'power2.inOut'
      });
    }

    gsap.delayedCall(1.8, () => {
      this.resetGame();
    });
  }

  private resetGame() {
    this.oreBlocks = [];
    this.constellationLines = [];
    this.particles = [];
    this.shockWaves = [];
    this.starCore = {
      x: 0,
      y: 0,
      radius: 30,
      baseRadius: 30,
      brightness: 0,
      color: '#8b0000',
      isIgnited: false,
      isBurning: false,
      pulsePhase: 0
    };
    this.finalShockWave = null;
    this.isGameComplete = false;
    this.isResetting = false;

    this.spawnOreBlocks();
    this.selectRandomConstellation();
  }

  public forceReset() {
    if (this.isGameComplete) {
      this.resetGame();
    } else {
      this.triggerReset();
    }
  }

  private triggerVictory() {
    if (this.isGameComplete) return;
    this.isGameComplete = true;

    this.igniteStarCore();

    if (this.onComplete) {
      this.onComplete();
    }
  }

  private igniteStarCore() {
    this.starCore.isIgnited = true;

    gsap.to(this.starCore, {
      brightness: 1,
      duration: 2,
      ease: 'power2.in',
      onUpdate: () => {
        const t = this.starCore.brightness;
        if (t < 0.5) {
          const ct = t * 2;
          this.starCore.color = this.lerpColor('#8b0000', '#ff4500', ct);
        } else {
          const ct = (t - 0.5) * 2;
          this.starCore.color = this.lerpColor('#ff4500', '#ffffff', ct);
        }
      }
    });

    gsap.to(this.starCore, {
      radius: 120,
      baseRadius: 120,
      duration: 2,
      ease: 'back.out(1.5)'
    });

    gsap.delayedCall(2, () => {
      this.finalShockWave = {
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 200,
        alpha: 0.8,
        color: '#ffffff'
      };

      this.starCore.isBurning = true;
    });
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private addParticles(newParticles: Particle[]) {
    this.particles.push(...newParticles);
    if (this.particles.length > MAX_PARTICLES) {
      this.particles = this.particles.slice(this.particles.length - MAX_PARTICLES);
    }
  }

  update(deltaTime: number) {
    const dt = deltaTime / 16.67;

    this.orbitRotation += 0.01 * dt;

    for (const ore of this.oreBlocks) {
      if (ore.isDragging) {
        ore.velocityX = ore.targetX - ore.x;
        ore.velocityY = ore.targetY - ore.y;
        ore.velocityX *= DAMPING;
        ore.velocityY *= DAMPING;
        ore.x += ore.velocityX * dt;
        ore.y += ore.velocityY * dt;
      } else {
        if (ore.warningFlash > 0) {
          ore.warningFlash -= deltaTime / 1000;
          if (ore.warningFlash < 0) ore.warningFlash = 0;
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime / 1000;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size = p.startSize * p.alpha;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockWaves.length - 1; i >= 0; i--) {
      const wave = this.shockWaves[i];
      const speed = (wave.maxRadius / 0.6) * (deltaTime / 1000);
      wave.radius += speed;
      wave.alpha = 0.6 * (1 - wave.radius / wave.maxRadius);

      if (wave.radius >= wave.maxRadius) {
        this.shockWaves.splice(i, 1);
      }
    }

    if (this.finalShockWave) {
      const speed = 200 * (deltaTime / 1000);
      this.finalShockWave.radius += speed;
      this.finalShockWave.alpha = 0.8 * (1 - this.finalShockWave.radius / 400);

      if (this.finalShockWave.radius >= 400) {
        this.finalShockWave = null;
      } else {
        if (!this.shockWaves.includes(this.finalShockWave)) {
          this.shockWaves.push(this.finalShockWave);
        }
      }
    }

    for (const line of this.constellationLines) {
      if (line.isGlowing) {
        line.glowTime -= deltaTime / 1000;
        if (line.glowTime <= 0) {
          line.isGlowing = false;
        }
      }
    }

    if (this.starCore.isBurning) {
      this.starCore.pulsePhase += deltaTime / 1000;
      const pulseCycle = this.starCore.pulsePhase % 0.5;
      const pulseT = pulseCycle / 0.5;
      const pulseAmount = Math.sin(pulseT * Math.PI * 2) * 0.1 + 0.9;
      this.starCore.brightness = 0.8 + 0.2 * pulseAmount;
      this.starCore.radius = this.starCore.baseRadius * (0.95 + 0.05 * pulseAmount);

      if (Math.random() < 1) {
        const orangeParticles = this.renderer.createParticle(
          this.starCore.x,
          this.starCore.y,
          'orange',
          5
        );
        this.addParticles(orangeParticles);
      }
    }

    const renderState: RenderState = {
      anchors: this.anchors,
      oreBlocks: this.oreBlocks,
      particles: this.particles,
      constellationLines: this.constellationLines,
      shockWaves: this.shockWaves,
      starCore: this.starCore,
      orbitRotation: this.orbitRotation,
      orbitA: this.orbitA,
      orbitB: this.orbitB,
      hoverAnchorId: this.hoverAnchorId,
      scale: 1
    };

    this.renderer.render(renderState, deltaTime);
  }
}

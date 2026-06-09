import p5 from 'p5';
import { AnimationManager } from './animation';

export const UNIT = 60;
export const HEX_SIZE = 2 * UNIT;
export const SNAP_DISTANCE = 0.5 * UNIT;

export interface Vertex {
  x: number;
  y: number;
}

export interface FragmentState {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  initialX: number;
  initialY: number;
  vertices: Vertex[];
  color: string;
  isPlaced: boolean;
  isDragging: boolean;
  isSnapping: boolean;
  snapProgress: number;
  snapFromX: number;
  snapFromY: number;
  isResetting: boolean;
  resetProgress: number;
  resetFromX: number;
  resetFromY: number;
  velocityX: number;
  velocityY: number;
  inertiaFrames: number;
  rotation: number;
}

const FRAGMENT_COLORS = [
  '#ff6666',
  '#ffaa44',
  '#ffdd55',
  '#66ccff',
  '#8866ff',
  '#55ff66'
];

export class GameManager {
  private p: p5;
  private anim: AnimationManager;
  fragments: FragmentState[] = [];
  placedCount = 0;
  allPlaced = false;
  completionBrightness = 0;
  fadeAlpha = 0;
  showCongrats = false;
  congratsText = '记忆重组完成，星光永恒闪耀';
  private draggedFragmentId: number | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private hoveredFragmentId: number | null = null;

  constructor(p: p5, anim: AnimationManager) {
    this.p = p;
    this.anim = anim;
    this.generateFragments();
  }

  generateFragments(): void {
    this.fragments = [];
    this.placedCount = 0;
    this.allPlaced = false;
    this.completionBrightness = 0;
    this.fadeAlpha = 0;
    this.showCongrats = false;

    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      const nextAngle = ((i + 1) * 60 - 90) * Math.PI / 180;
      const midAngle = (angle + nextAngle) / 2;

      const targetX = this.p.width / 2 + Math.cos(midAngle) * HEX_SIZE * 0.35;
      const targetY = this.p.height / 2 + Math.sin(midAngle) * HEX_SIZE * 0.35;

      const spawnDist = (3 + this.p.random(0, 2)) * UNIT;
      const spawnAngle = midAngle + this.p.random(-0.3, 0.3);
      const initialX = this.p.width / 2 + Math.cos(spawnAngle) * spawnDist;
      const initialY = this.p.height / 2 + Math.sin(spawnAngle) * spawnDist;

      const vertices = this.generateFragmentVertices(i, angle, nextAngle);

      this.fragments.push({
        id: i,
        x: initialX,
        y: initialY,
        targetX,
        targetY,
        initialX,
        initialY,
        vertices,
        color: FRAGMENT_COLORS[i],
        isPlaced: false,
        isDragging: false,
        isSnapping: false,
        snapProgress: 0,
        snapFromX: 0,
        snapFromY: 0,
        isResetting: false,
        resetProgress: 0,
        resetFromX: 0,
        resetFromY: 0,
        velocityX: 0,
        velocityY: 0,
        inertiaFrames: 0,
        rotation: 0
      });
    }
  }

  private generateFragmentVertices(index: number, startAngle: number, endAngle: number): Vertex[] {
    const vertices: Vertex[] = [];
    const segments = 4;
    const innerR = HEX_SIZE * 0.15;
    const outerR = HEX_SIZE * 0.95;

    const seed = index * 137.5;
    const rand = (i: number): number => {
      const x = Math.sin(seed + i * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    vertices.push({ x: 0, y: 0 });

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = this.p.lerp(startAngle, endAngle, t);
      const wobble = 0.85 + rand(i) * 0.25;
      const r = outerR * wobble;
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    for (let i = segments; i >= 0; i--) {
      const t = i / segments;
      const angle = this.p.lerp(startAngle, endAngle, t);
      const wobble = 0.6 + rand(i + 10) * 0.4;
      const r = innerR * wobble;
      vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }

    return vertices;
  }

  update(): void {
    for (const frag of this.fragments) {
      if (frag.isSnapping) {
        frag.snapProgress += 1 / 18;
        if (frag.snapProgress >= 1) {
          frag.snapProgress = 1;
          frag.isSnapping = false;
          frag.isPlaced = true;
          frag.x = frag.targetX;
          frag.y = frag.targetY;
          this.placedCount++;
          this.anim.createHalo(frag.x, frag.y, this.p.color(frag.color), HEX_SIZE * 1.5);
          this.anim.startColorTransition(this.p.color(frag.color));
          if (this.placedCount >= 6) {
            this.allPlaced = true;
          }
        } else {
          const t = this.anim.easeOutCubic(frag.snapProgress);
          frag.x = this.p.lerp(frag.snapFromX, frag.targetX, t);
          frag.y = this.p.lerp(frag.snapFromY, frag.targetY, t);
        }
      } else if (frag.isResetting) {
        frag.resetProgress += 1 / 18;
        if (frag.resetProgress >= 1) {
          frag.resetProgress = 1;
          frag.isResetting = false;
          frag.x = frag.initialX;
          frag.y = frag.initialY;
          frag.velocityX = 0;
          frag.velocityY = 0;
          frag.inertiaFrames = 0;
        } else {
          const t = this.anim.easeOutCubic(frag.resetProgress);
          frag.x = this.p.lerp(frag.resetFromX, frag.initialX, t);
          frag.y = this.p.lerp(frag.resetFromY, frag.initialY, t);
        }
      } else if (frag.isDragging) {
        frag.x = this.p.mouseX - this.dragOffsetX;
        frag.y = this.p.mouseY - this.dragOffsetY;
        this.anim.addTrailPoint(frag.id, frag.x, frag.y, this.p.color(frag.color));
      } else if (frag.inertiaFrames > 0 && !frag.isPlaced) {
        frag.x += frag.velocityX;
        frag.y += frag.velocityY;
        frag.velocityX *= 0.95;
        frag.velocityY *= 0.95;
        frag.inertiaFrames--;
        if (frag.inertiaFrames > 0 && (Math.abs(frag.velocityX) > 0.1 || Math.abs(frag.velocityY) > 0.1)) {
          this.anim.addTrailPoint(frag.id, frag.x, frag.y, this.p.color(frag.color));
        }
      }

      if (!frag.isPlaced && !frag.isDragging && !frag.isSnapping && !frag.isResetting) {
        const dx = frag.x - frag.targetX;
        const dy = frag.y - frag.targetY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < SNAP_DISTANCE) {
          frag.isSnapping = true;
          frag.snapProgress = 0;
          frag.snapFromX = frag.x;
          frag.snapFromY = frag.y;
          frag.velocityX = 0;
          frag.velocityY = 0;
          frag.inertiaFrames = 0;
        }
      }
    }

    if (this.allPlaced) {
      if (this.completionBrightness < 1) {
        this.completionBrightness += 1 / 60;
        if (this.completionBrightness > 1) this.completionBrightness = 1;
      } else if (!this.showCongrats) {
        this.fadeAlpha += 1 / 60;
        if (this.fadeAlpha >= 0.7) {
          this.showCongrats = true;
        }
      }
    }

    this.updateCursor();
  }

  draw(): void {
    this.drawHexFrame();

    for (const frag of this.fragments) {
      this.anim.drawTrails(frag.id, this.p.color(frag.color));
    }

    const sortedFragments = [...this.fragments].sort((a, b) => {
      if (a.isDragging && !b.isDragging) return 1;
      if (!a.isDragging && b.isDragging) return -1;
      if (a.isPlaced && !b.isPlaced) return -1;
      if (!a.isPlaced && b.isPlaced) return 1;
      return 0;
    });

    for (const frag of sortedFragments) {
      this.drawFragment(frag);
    }

    if (this.allPlaced) {
      this.drawCompletionEffect();
    }

    this.drawProgress();
    this.drawResetButton();
  }

  private drawHexFrame(): void {
    const cx = this.p.width / 2;
    const cy = this.p.height / 2;
    this.p.push();
    this.p.noFill();
    this.p.stroke(120, 120, 180, 80);
    this.p.strokeWeight(2);
    this.p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      const x = cx + Math.cos(angle) * HEX_SIZE;
      const y = cy + Math.sin(angle) * HEX_SIZE;
      this.p.vertex(x, y);
    }
    this.p.endShape(this.p.CLOSE);
    this.p.stroke(120, 120, 180, 30);
    this.p.strokeWeight(1);
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      const x = cx + Math.cos(angle) * HEX_SIZE;
      const y = cy + Math.sin(angle) * HEX_SIZE;
      this.p.line(cx, cy, x, y);
    }
    this.p.pop();
  }

  private drawFragment(frag: FragmentState): void {
    const col = this.p.color(frag.color);
    const r = this.p.red(col);
    const g = this.p.green(col);
    const b = this.p.blue(col);

    this.p.push();
    this.p.translate(frag.x, frag.y);

    if (frag.isDragging || frag.isPlaced) {
      const pulseA = frag.isPlaced ? 0.3 : this.anim.getPulseAlpha(this.p.millis(), 0.25);
      for (let i = 3; i >= 0; i--) {
        this.p.drawingContext.shadowColor = `rgba(${r}, ${g}, ${b}, ${pulseA})`;
        this.p.drawingContext.shadowBlur = 15 + i * 8;
      }
    }

    this.p.noStroke();
    this.p.fill(r, g, b, 220);
    this.p.beginShape();
    for (const v of frag.vertices) {
      this.p.vertex(v.x, v.y);
    }
    this.p.endShape(this.p.CLOSE);

    this.p.drawingContext.shadowBlur = 0;
    this.p.noFill();
    this.p.stroke(r, g, b, frag.isDragging ? 255 : 180);
    this.p.strokeWeight(frag.isDragging ? 3 : 2);
    this.p.beginShape();
    for (const v of frag.vertices) {
      this.p.vertex(v.x, v.y);
    }
    this.p.endShape(this.p.CLOSE);

    this.p.stroke(255, 255, 255, 60);
    this.p.strokeWeight(1);
    this.p.beginShape();
    for (let i = 0; i < Math.floor(frag.vertices.length / 2); i++) {
      const v = frag.vertices[i];
      if (i === 0) this.p.vertex(v.x * 0.3, v.y * 0.3);
      else this.p.vertex(v.x * 0.5, v.y * 0.5);
    }
    this.p.endShape();

    this.p.pop();
  }

  private drawCompletionEffect(): void {
    const cx = this.p.width / 2;
    const cy = this.p.height / 2;
    const brightness = this.completionBrightness;

    for (let i = 5; i >= 0; i--) {
      const rad = HEX_SIZE * (1 + i * 0.3) * brightness;
      const alpha = 0.6 * brightness * (1 - i * 0.15);
      this.p.noStroke();
      this.p.fill(255, 255, 220, alpha * 50);
      this.p.circle(cx, cy, rad * 2);
    }

    this.p.push();
    this.p.noFill();
    this.p.stroke(255, 255, 200, brightness * 255);
    this.p.strokeWeight(4 * brightness);
    this.p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 - 90) * Math.PI / 180;
      const x = cx + Math.cos(angle) * HEX_SIZE;
      const y = cy + Math.sin(angle) * HEX_SIZE;
      this.p.vertex(x, y);
    }
    this.p.endShape(this.p.CLOSE);
    this.p.pop();

    if (this.fadeAlpha > 0) {
      this.p.noStroke();
      this.p.fill(10, 10, 42, this.fadeAlpha * 255);
      this.p.rect(0, 0, this.p.width, this.p.height);
    }

    if (this.showCongrats) {
      this.p.textAlign(this.p.CENTER, this.p.CENTER);
      this.p.textFont('sans-serif');
      this.p.textSize(32);
      this.p.noStroke();
      this.p.drawingContext.shadowColor = 'rgba(255, 221, 68, 0.8)';
      this.p.drawingContext.shadowBlur = 20;
      this.p.fill(255, 221, 68, 255);
      this.p.text(this.congratsText, this.p.width / 2, this.p.height / 2);
      this.p.drawingContext.shadowBlur = 0;
    }
  }

  private drawProgress(): void {
    const baseX = 30;
    const baseY = this.p.height - 60;
    const iconSize = 24;
    const gap = 8;

    for (let i = 0; i < 6; i++) {
      const x = baseX + i * (iconSize + gap);
      const y = baseY;
      const frag = this.fragments[i];

      this.p.push();
      this.p.translate(x + iconSize / 2, y + iconSize / 2);
      this.p.noStroke();

      if (frag.isPlaced) {
        const col = this.p.color(frag.color);
        this.p.drawingContext.shadowColor = frag.color;
        this.p.drawingContext.shadowBlur = 10;
        this.p.fill(this.p.red(col), this.p.green(col), this.p.blue(col), 255);
      } else {
        this.p.fill(68, 68, 68, 200);
      }

      this.p.beginShape();
      for (let j = 0; j < 6; j++) {
        const angle = (j * 60 - 90) * Math.PI / 180;
        const px = Math.cos(angle) * iconSize * 0.45;
        const py = Math.sin(angle) * iconSize * 0.45;
        this.p.vertex(px, py);
      }
      this.p.endShape(this.p.CLOSE);
      this.p.drawingContext.shadowBlur = 0;
      this.p.pop();
    }

    const barX = baseX;
    const barY = baseY + iconSize + 10;
    const barW = 200;
    const barH = 6;

    this.p.noStroke();
    this.p.fill(60, 60, 80, 150);
    this.p.rect(barX, barY, barW, barH, 3);

    const progress = this.placedCount / 6;
    const fillW = barW * progress;
    if (fillW > 0) {
      for (let x = 0; x < fillW; x++) {
        const t = x / barW;
        const r = this.p.lerp(255, 68, t);
        const g = this.p.lerp(68, 255, t);
        const b = 68;
        this.p.stroke(r, g, b, 220);
        this.p.strokeWeight(1);
        this.p.line(barX + x, barY, barX + x, barY + barH);
      }
    }

    this.p.noStroke();
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.textSize(12);
    this.p.fill(180, 180, 220, 180);
    this.p.text(`${this.placedCount}/6`, barX, barY + barH + 6);
  }

  private drawResetButton(): void {
    const btnX = this.p.width - 45;
    const btnY = this.p.height - 45;
    const btnR = 20;
    const d = this.p.dist(this.p.mouseX, this.p.mouseY, btnX, btnY);
    const hovered = d < btnR;

    this.p.push();
    this.p.noStroke();
    this.p.fill(hovered ? 85 : 51, hovered ? 85 : 51, hovered ? 85 : 51, 220);
    this.p.circle(btnX, btnY, btnR * 2);

    this.p.fill(255, 255, 255, 255);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.textFont('sans-serif');
    this.p.textSize(16);
    this.p.textStyle(this.p.BOLD);
    this.p.text('R', btnX, btnY);
    this.p.pop();
  }

  isOverResetButton(mx: number, my: number): boolean {
    const btnX = this.p.width - 45;
    const btnY = this.p.height - 45;
    return this.p.dist(mx, my, btnX, btnY) < 20;
  }

  getFragmentAt(mx: number, my: number): FragmentState | null {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      if (frag.isPlaced || frag.isSnapping || frag.isResetting) continue;
      if (this.pointInFragment(mx, my, frag)) {
        return frag;
      }
    }
    return null;
  }

  private pointInFragment(px: number, py: number, frag: FragmentState): boolean {
    let inside = false;
    const verts = frag.vertices;
    const n = verts.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = frag.x + verts[i].x;
      const yi = frag.y + verts[i].y;
      const xj = frag.x + verts[j].x;
      const yj = frag.y + verts[j].y;
      const intersect = ((yi > py) !== (yj > py)) &&
        (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  mousePressed(mx: number, my: number, button: number): void {
    if (button === this.p.RIGHT) {
      const frag = this.getFragmentAt(mx, my);
      if (frag && !frag.isPlaced) {
        this.resetFragment(frag);
      }
      return;
    }

    if (button !== this.p.LEFT) return;

    if (this.isOverResetButton(mx, my)) {
      this.resetAll();
      return;
    }

    const frag = this.getFragmentAt(mx, my);
    if (frag && !frag.isPlaced && !frag.isSnapping && !frag.isResetting) {
      frag.isDragging = true;
      this.draggedFragmentId = frag.id;
      this.dragOffsetX = mx - frag.x;
      this.dragOffsetY = my - frag.y;
      frag.velocityX = 0;
      frag.velocityY = 0;
      frag.inertiaFrames = 0;
    }
  }

  mouseReleased(mx: number, my: number, button: number): void {
    if (button !== this.p.LEFT) return;
    if (this.draggedFragmentId === null) return;

    const frag = this.fragments.find(f => f.id === this.draggedFragmentId);
    if (frag) {
      frag.isDragging = false;
      const prevX = frag.x;
      const prevY = frag.y;
      frag.x = mx - this.dragOffsetX;
      frag.y = my - this.dragOffsetY;
      frag.velocityX = (frag.x - prevX) * 0.3;
      frag.velocityY = (frag.y - prevY) * 0.3;
      frag.inertiaFrames = 18;
    }
    this.draggedFragmentId = null;
  }

  private resetFragment(frag: FragmentState): void {
    frag.isDragging = false;
    frag.isSnapping = false;
    frag.isResetting = true;
    frag.resetProgress = 0;
    frag.resetFromX = frag.x;
    frag.resetFromY = frag.y;
    frag.velocityX = 0;
    frag.velocityY = 0;
    frag.inertiaFrames = 0;
    this.anim.clearTrail(frag.id);
  }

  resetAll(): void {
    for (const frag of this.fragments) {
      this.anim.clearTrail(frag.id);
    }
    this.generateFragments();
  }

  private updateCursor(): void {
    const canvas = this.p.canvas;
    if (this.draggedFragmentId !== null) {
      canvas.style.cursor = 'grabbing';
      return;
    }
    const mx = this.p.mouseX;
    const my = this.p.mouseY;
    if (this.isOverResetButton(mx, my)) {
      canvas.style.cursor = 'pointer';
      return;
    }
    const frag = this.getFragmentAt(mx, my);
    if (frag) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }
  }
}

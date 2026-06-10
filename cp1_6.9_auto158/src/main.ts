import p5 from 'p5';
import { StarField } from './StarField';
import { Player } from './Player';

interface TrailPoint {
  x: number;
  y: number;
  life: number;
}

interface ScoreNote {
  stringIndex: number;
  completed: boolean;
  pulseTimer: number;
}

class Game {
  private p: p5;
  private starField!: StarField;
  private player!: Player;

  private centerX: number = 0;
  private centerY: number = 0;
  private discRadius: number = 300;

  private discRotation: number = 0;
  private discRotationSpeed: number = (Math.PI * 2) / 20;

  private level: number = 1;
  private starStreaks: number = 0;

  private sequence: number[] = [];
  private currentNoteIndex: number = 0;

  private trailPoints: TrailPoint[] = [];
  private movingPoint: { x: number; y: number } | null = null;
  private movingTarget: number = -1;
  private movingFrom: number = -1;

  private scorePulseWave: { index: number; life: number } | null = null;
  private litSegments: number = 0;
  private segmentAnim: { index: number; progress: number }[] = [];

  private victoryActive: boolean = false;
  private victoryTimer: number = 0;
  private constellationAlpha: number = 0;

  private stringColors: [number, number, number][] = [];
  private levelRotationOffset: number = 0;

  private indicatorLights: number = 0;
  private indicatorBurst: number = 0;

  private lastTime: number = 0;
  private noteShake: { index: number; timer: number } | null = null;

  constructor(p: p5) {
    this.p = p;
  }

  public setup(): void {
    const p = this.p;
    p.frameRate(60);
    this.resize();
    this.starField = new StarField(p, this.centerX, this.centerY);
    this.player = new Player(p, this.centerX, this.centerY, this.discRadius);
    this.player.setOnPluckCallback((idx) => this.onStringPlucked(idx));
    this.generateColors();
    this.player.initStrings(this.stringColors, this.levelRotationOffset);
    this.generateSequence();
  }

  private resize(): void {
    const p = this.p;
    this.centerX = p.width / 2;
    this.centerY = p.height / 2;
    const w = p.width - 160;
    const h = p.height;
    this.discRadius = Math.min(w * 0.45, h * 0.4);
  }

  private generateColors(): void {
    const palettes: [number, number, number][][] = [
      [[136, 170, 255], [170, 136, 255], [221, 136, 255], [255, 170, 204], [255, 204, 136], [255, 221, 136], [204, 255, 170], [136, 255, 204]],
      [[136, 204, 255], [170, 170, 255], [204, 136, 255], [255, 136, 221], [255, 170, 170], [255, 204, 136], [221, 255, 136], [136, 255, 221]],
      [[170, 187, 255], [153, 153, 255], [204, 153, 255], [255, 153, 255], [255, 170, 187], [255, 204, 153], [204, 255, 153], [153, 255, 204]]
    ];
    const pal = palettes[Math.floor(this.p.random(palettes.length))];
    this.stringColors = pal.map(c => [...c] as [number, number, number]);
    this.levelRotationOffset = this.p.random(-0.3, 0.3);
  }

  private generateSequence(): void {
    this.sequence = [];
    const used = new Set<number>();
    while (this.sequence.length < 8) {
      const idx = Math.floor(this.p.random(8));
      if (!used.has(idx)) {
        used.add(idx);
        this.sequence.push(idx);
      }
    }
    this.currentNoteIndex = 0;
    this.litSegments = 0;
    this.segmentAnim = [];
    this.trailPoints = [];
    this.movingPoint = null;
    this.movingTarget = -1;
    this.victoryActive = false;
    this.victoryTimer = 0;
    this.constellationAlpha = 0;
    this.indicatorLights = 0;
    this.indicatorBurst = 0;
    this.scorePulseWave = null;
    this.noteShake = null;
  }

  public onStringPlucked(index: number): void {
    if (this.victoryActive) return;
    const expected = this.sequence[this.currentNoteIndex];
    if (index === expected) {
      this.player.setStringCorrect(index);
      const anchor = this.player.getAnchor(index);
      this.player.spawnAnchorHalo(anchor.x, anchor.y);
      this.scorePulseWave = { index: this.currentNoteIndex, life: 0.5 };
      this.segmentAnim.push({ index: this.litSegments, progress: 0 });
      this.litSegments++;
      this.indicatorLights++;
      if (this.indicatorLights >= 12) {
        this.indicatorBurst = 0.5;
        this.indicatorLights = 0;
      }
      this.currentNoteIndex++;
      if (this.currentNoteIndex < this.sequence.length) {
        const fromAnchor = this.player.getAnchor(index);
        const toIdx = this.sequence[this.currentNoteIndex];
        const toAnchor = this.player.getAnchor(toIdx);
        this.movingPoint = { x: fromAnchor.x, y: fromAnchor.y };
        this.movingFrom = index;
        this.movingTarget = toIdx;
      }
      if (this.currentNoteIndex >= this.sequence.length) {
        this.triggerVictory();
      }
    } else {
      this.player.setStringError(index);
      this.noteShake = { index: this.currentNoteIndex, timer: 0.3 };
    }
  }

  private triggerVictory(): void {
    this.victoryActive = true;
    this.victoryTimer = 2;
    this.player.spawnVictoryParticles();
    this.starField.setFastTwinkle(true);
    this.discRotationSpeed = (Math.PI * 2) / 10;
  }

  private nextLevel(): void {
    this.level++;
    this.starStreaks += 8;
    this.generateColors();
    this.player.initStrings(this.stringColors, this.levelRotationOffset);
    this.generateSequence();
    this.starField.setFastTwinkle(false);
    this.discRotationSpeed = (Math.PI * 2) / 20;
  }

  public draw(): void {
    const p = this.p;
    const now = p.millis();
    const dt = this.lastTime === 0 ? 1 / 60 : Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.resize();
    this.starField.setCenter(this.centerX, this.centerY);
    this.player.updatePosition(this.centerX, this.centerY, this.discRadius, this.levelRotationOffset + this.discRotation);

    this.drawBackground();
    this.starField.update(now);
    this.starField.draw(now);

    this.discRotation += this.discRotationSpeed * dt;

    this.update(dt);
    this.drawStarDisc();
    this.drawConstellationOutline();
    this.player.draw();
    this.drawAnchors();
    this.drawTrailAndMovingPoint();
    this.drawStarStreaks();
    this.drawScore();
    this.drawUI();
  }

  private update(dt: number): void {
    this.player.update(dt);

    if (this.movingPoint && this.movingTarget >= 0) {
      const target = this.player.getAnchor(this.movingTarget);
      const dx = target.x - this.movingPoint.x;
      const dy = target.y - this.movingPoint.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 5;
      if (dist <= speed) {
        this.movingPoint.x = target.x;
        this.movingPoint.y = target.y;
        this.trailPoints.push({ x: target.x, y: target.y, life: 0.5 });
        this.movingPoint = null;
        this.movingTarget = -1;
      } else {
        this.movingPoint.x += (dx / dist) * speed;
        this.movingPoint.y += (dy / dist) * speed;
        if (Math.random() < 0.5) {
          this.trailPoints.push({ x: this.movingPoint.x, y: this.movingPoint.y, life: 0.5 });
        }
      }
    }
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      this.trailPoints[i].life -= dt;
      if (this.trailPoints[i].life <= 0) this.trailPoints.splice(i, 1);
    }

    for (const sa of this.segmentAnim) {
      sa.progress = Math.min(1, sa.progress + dt / 0.5);
    }

    if (this.scorePulseWave) {
      this.scorePulseWave.life -= dt;
      if (this.scorePulseWave.life <= 0) this.scorePulseWave = null;
    }

    if (this.noteShake) {
      this.noteShake.timer -= dt;
      if (this.noteShake.timer <= 0) this.noteShake = null;
    }

    if (this.indicatorBurst > 0) {
      this.indicatorBurst -= dt;
    }

    if (this.victoryActive) {
      this.victoryTimer -= dt;
      this.constellationAlpha = Math.min(1, this.constellationAlpha + dt / 1.5);
      if (this.victoryTimer <= 0) {
        this.nextLevel();
      }
    }
  }

  private drawBackground(): void {
    const p = this.p;
    const c1 = p.color(10, 5, 26);
    const c2 = p.color(7, 16, 24);
    p.noFill();
    for (let r = p.width + p.height; r > 0; r -= 10) {
      const t = r / (p.width + p.height);
      const c = p.lerpColor(c2, c1, t);
      p.stroke(c);
      p.strokeWeight(10);
      p.ellipse(this.centerX, this.centerY, r, r * (p.height / p.width));
    }
  }

  private drawStarDisc(): void {
    const p = this.p;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.discRadius;

    p.push();
    p.translate(cx, cy);
    p.rotate(this.discRotation + this.levelRotationOffset);

    p.push();
    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = 'rgba(136,170,255,0.8)';
    p.stroke(136, 170, 255, 180);
    p.strokeWeight(2);
    p.noFill();
    p.ellipse(0, 0, r * 2, r * 2);
    p.pop();

    p.push();
    p.noStroke();
    p.fill(200, 210, 230, 15);
    p.ellipse(0, 0, r * 1.9, r * 1.9);
    p.fill(180, 195, 220, 10);
    p.ellipse(0, 0, r * 1.6, r * 1.6);
    p.pop();

    p.push();
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = 'rgba(170,204,255,0.6)';
    p.stroke(170, 204, 255, 140);
    p.strokeWeight(1.5);
    p.noFill();
    for (let i = 0; i < 8; i++) {
      const a1 = (i / 8) * p.TWO_PI - p.PI / 2;
      const a2 = ((i + 1) / 8) * p.TWO_PI - p.PI / 2;
      const x1 = Math.cos(a1) * r;
      const y1 = Math.sin(a1) * r;
      const x2 = Math.cos(a2) * r;
      const y2 = Math.sin(a2) * r;
      const mid = (a1 + a2) / 2;
      const cr = Math.cos(mid) * r * 0.82;
      const cy2 = Math.sin(mid) * r * 0.82;
      p.beginShape();
      p.vertex(x1, y1);
      p.quadraticVertex(cr, cy2, x2, y2);
      p.endShape();
    }
    p.pop();

    for (let i = 0; i < this.segmentAnim.length; i++) {
      const sa = this.segmentAnim[i];
      const a1 = (i / 8) * p.TWO_PI - p.PI / 2;
      const a2 = ((i + 1) / 8) * p.TWO_PI - p.PI / 2;
      const t = sa.progress;
      p.push();
      p.drawingContext.shadowBlur = 6;
      p.drawingContext.shadowColor = 'rgba(255,204,136,0.9)';
      p.noFill();
      p.stroke(255, 204, 136, Math.floor(220 * t));
      p.strokeWeight(2.5);
      const mid = (a1 + a2) / 2;
      const x1 = Math.cos(a1) * (r + 12);
      const y1 = Math.sin(a1) * (r + 12);
      const x2 = Math.cos(a1 + (a2 - a1) * t) * (r + 12);
      const y2 = Math.sin(a1 + (a2 - a1) * t) * (r + 12);
      const midT = a1 + (a2 - a1) * t * 0.5;
      const cr = Math.cos(midT) * (r + 12) * 0.98;
      const cy2 = Math.sin(midT) * (r + 12) * 0.98;
      p.beginShape();
      p.vertex(x1, y1);
      if (t > 0.5) {
        const midA = (a1 + a2) / 2;
        const mx = Math.cos(mid) * (r + 12) * 0.98;
        const my = Math.sin(mid) * (r + 12) * 0.98;
        p.quadraticVertex(mx, my, x2, y2);
      } else {
        p.quadraticVertex(cr, cy2, x2, y2);
      }
      p.endShape();
      p.pop();
    }

    p.pop();
  }

  private drawConstellationOutline(): void {
    if (this.constellationAlpha <= 0) return;
    const p = this.p;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.discRadius * 0.95;
    const alpha = Math.floor(255 * this.constellationAlpha);

    p.push();
    p.translate(cx, cy);
    p.rotate(this.discRotation + this.levelRotationOffset);
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'rgba(255,221,170,0.9)';
    p.stroke(255, 221, 170, alpha);
    p.strokeWeight(2);
    p.noFill();

    for (let i = 0; i < 8; i++) {
      const a1 = (i / 8) * p.TWO_PI - p.PI / 2;
      for (let j = i + 1; j < 8; j++) {
        if ((j - i) % 3 === 0 || (j - i) === 1) {
          const a2 = (j / 8) * p.TWO_PI - p.PI / 2;
          const x1 = Math.cos(a1) * r;
          const y1 = Math.sin(a1) * r;
          const x2 = Math.cos(a2) * r;
          const y2 = Math.sin(a2) * r;
          p.line(x1, y1, x2, y2);
        }
      }
    }

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * p.TWO_PI - p.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      p.noStroke();
      p.fill(255, 221, 170, alpha);
      p.ellipse(x, y, 8, 8);
    }
    p.pop();
  }

  private drawAnchors(): void {
    const p = this.p;
    for (let i = 0; i < 8; i++) {
      const a = this.player.getAnchor(i);
      const col = this.stringColors[i];
      p.push();
      p.drawingContext.shadowBlur = 12;
      p.drawingContext.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.8)`;
      p.noStroke();
      p.fill(col[0], col[1], col[2], 220);
      p.ellipse(a.x, a.y, 8, 8);
      p.fill(255, 255, 255, 200);
      p.ellipse(a.x, a.y, 3, 3);
      p.pop();
    }
  }

  private drawTrailAndMovingPoint(): void {
    const p = this.p;
    for (const tp of this.trailPoints) {
      const alpha = Math.floor(255 * (tp.life / 0.5));
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = `rgba(255,221,136,${tp.life / 0.5})`;
      p.fill(255, 221, 136, alpha);
      p.ellipse(tp.x, tp.y, 4, 4);
      p.pop();
    }
    if (this.movingPoint) {
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = 'rgba(255,221,136,1)';
      p.fill(255, 235, 160);
      p.ellipse(this.movingPoint.x, this.movingPoint.y, 8, 8);
      p.fill(255);
      p.ellipse(this.movingPoint.x, this.movingPoint.y, 4, 4);
      p.pop();
    }
  }

  private drawStarStreaks(): void {
  }

  private drawScore(): void {
    const p = this.p;
    const scoreY = this.centerY - this.discRadius - 70;
    const noteSpacing = 44;
    const totalW = this.sequence.length * noteSpacing;
    const startX = this.centerX - totalW / 2 + noteSpacing / 2;

    p.push();
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'rgba(136,170,255,0.3)';
    p.noStroke();
    p.fill(20, 15, 40, 120);
    p.rect(this.centerX - totalW / 2 - 15, scoreY - 22, totalW + 30, 44, 8);
    p.stroke(100, 130, 200, 80);
    p.strokeWeight(1);
    p.noFill();
    p.rect(this.centerX - totalW / 2 - 15, scoreY - 22, totalW + 30, 44, 8);
    p.pop();

    for (let i = 0; i < this.sequence.length; i++) {
      const strIdx = this.sequence[i];
      const col = this.stringColors[strIdx];
      let x = startX + i * noteSpacing;
      let y = scoreY;

      let shakeX = 0;
      if (this.noteShake && this.noteShake.index === i) {
        shakeX = Math.sin(p.millis() * 0.05) * 3;
      }
      x += shakeX;

      const completed = i < this.currentNoteIndex;
      const isCurrent = i === this.currentNoteIndex && !this.victoryActive;

      let alpha = 255;
      if (!completed && !isCurrent) {
        alpha = 150;
      }
      if (this.noteShake && this.noteShake.index === i) {
        alpha = 100;
      }

      if (isCurrent) {
        const twinkle = 0.5 + 0.5 * Math.sin(p.millis() * 0.001 * (p.TWO_PI) / 0.8);
        alpha = Math.floor((0.3 + 0.7 * twinkle) * 255);
      }

      let drawCol = col;
      if (completed) {
        drawCol = [255, 215, 100] as [number, number, number];
      }

      p.push();
      const glow = completed ? 18 : 10;
      p.drawingContext.shadowBlur = glow;
      p.drawingContext.shadowColor = `rgba(${drawCol[0]},${drawCol[1]},${drawCol[2]},0.9)`;
      p.noStroke();
      if (this.noteShake && this.noteShake.index === i) {
        p.fill(100, 100, 100, 120);
      } else {
        p.fill(drawCol[0], drawCol[1], drawCol[2], alpha);
      }
      p.ellipse(x, y, 18, 18);
      p.fill(255, 255, 255, Math.floor(alpha * 0.6));
      p.ellipse(x, y, 6, 6);
      p.pop();

      if (this.scorePulseWave && this.scorePulseWave.index === i) {
        const t = 1 - this.scorePulseWave.life / 0.5;
        const r = 10 + t * totalW;
        const a = Math.floor(180 * (1 - t));
        p.push();
        p.drawingContext.shadowBlur = 10;
        p.drawingContext.shadowColor = 'rgba(255,221,136,0.6)';
        p.noFill();
        p.stroke(255, 221, 136, a);
        p.strokeWeight(2);
        p.ellipse(x, y, r * 2, r * 2);
        p.pop();
      }
    }
  }

  private drawUI(): void {
    const p = this.p;
    const leftX = 80;
    const rightX = p.width - 80;

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(28);
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'rgba(170,204,255,0.8)';
    p.fill(170, 204, 255);
    p.text('关卡', leftX, this.centerY - 120);
    p.textSize(48);
    p.fill(255);
    p.text(this.level.toString(), leftX, this.centerY - 70);
    p.pop();

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(18);
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = 'rgba(255,221,136,0.8)';
    p.fill(255, 221, 136, 220);
    p.text('星纹', leftX, this.centerY);
    p.pop();

    const totalStars = this.starStreaks;
    const cols = 4;
    const starSize = 10;
    const gap = 14;
    const rows = Math.ceil(Math.max(1, totalStars) / cols);
    const startY = this.centerY + 40;
    let count = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (count >= totalStars && totalStars > 0) break;
        const sx = leftX - (cols * gap) / 2 + c * gap + gap / 2;
        const sy = startY + r * gap;
        p.push();
        p.noStroke();
        p.drawingContext.shadowBlur = 6;
        p.drawingContext.shadowColor = 'rgba(255,221,136,0.9)';
        p.fill(255, 221, 136, 220);
        this.drawStarShape(sx, sy, starSize * 0.5, 4);
        p.pop();
        count++;
      }
    }

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(18);
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = 'rgba(170,136,255,0.8)';
    p.fill(200, 170, 255, 220);
    p.text('共鸣', rightX, this.centerY - 120);
    p.pop();

    const lightR = 6;
    const lightGap = lightR * 2 + 4;
    const ringCount = 12;
    const ringRadius = 38;
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * p.TWO_PI - p.PI / 2;
      const lx = rightX + Math.cos(angle) * ringRadius;
      const ly = this.centerY - 50 + Math.sin(angle) * ringRadius;
      const lit = i < this.indicatorLights;
      const colT = i / (ringCount - 1);
      const r = Math.floor(p.lerp(170, 255, colT));
      const g = Math.floor(p.lerp(136, 136, colT));
      const b = Math.floor(p.lerp(255, 170, colT));
      p.push();
      if (lit) {
        p.drawingContext.shadowBlur = 12;
        p.drawingContext.shadowColor = `rgba(${r},${g},${b},1)`;
        p.noStroke();
        p.fill(r, g, b, 255);
      } else {
        p.noFill();
        p.stroke(r, g, b, 80);
        p.strokeWeight(1.5);
      }
      p.ellipse(lx, ly, lightR * 2, lightR * 2);
      p.pop();
    }

    if (this.indicatorBurst > 0) {
      const t = 1 - this.indicatorBurst / 0.5;
      const alpha = Math.floor(200 * (1 - t));
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 30;
      p.drawingContext.shadowColor = 'rgba(255,200,200,0.9)';
      const colors: [number, number, number][] = [[255, 136, 170], [170, 136, 255], [136, 170, 255], [255, 204, 136]];
      for (let i = 0; i < 4; i++) {
        const col = colors[i];
        const rr = (ringRadius + 10 + t * 60) * (0.8 + i * 0.15);
        p.fill(col[0], col[1], col[2], Math.floor(alpha * (1 - i * 0.2)));
        p.ellipse(rightX, this.centerY - 50, rr * 2, rr * 2);
      }
      p.pop();
    }

    p.push();
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(13);
    p.noStroke();
    p.fill(180, 200, 255, 150);
    p.text('按顺序拨动琴弦', this.centerX, this.centerY + this.discRadius + 60);
    p.pop();
  }

  private drawStarShape(cx: number, cy: number, r: number, points: number): void {
    const p = this.p;
    p.beginShape();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i / (points * 2)) * p.TWO_PI - p.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(angle) * rad;
      const y = cy + Math.sin(angle) * rad;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  public handleMousePressed(): void {
    const p = this.p;
    this.player.handleMousePressed(p.mouseX, p.mouseY);
  }

  public handleMouseDragged(): void {
    const p = this.p;
    this.player.handleMouseDragged(p.mouseX, p.mouseY);
  }

  public handleMouseReleased(): void {
    this.player.handleMouseReleased();
  }

  public handleMouseMoved(): void {
    const p = this.p;
    this.player.handleMouseMoved(p.mouseX, p.mouseY);
  }

  public handleWindowResized(): void {
    const p = this.p;
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    this.resize();
  }
}

const sketch = (p: p5) => {
  let game: Game;

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    game = new Game(p);
    game.setup();
  };

  p.draw = () => {
    game.draw();
  };

  p.mousePressed = () => {
    game.handleMousePressed();
  };

  p.mouseDragged = () => {
    game.handleMouseDragged();
  };

  p.mouseReleased = () => {
    game.handleMouseReleased();
  };

  p.mouseMoved = () => {
    game.handleMouseMoved();
  };

  p.windowResized = () => {
    game.handleWindowResized();
  };
};

new p5(sketch, document.getElementById('app')!);

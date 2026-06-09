import p5 from 'p5';

export interface StringState {
  index: number;
  color: [number, number, number];
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

interface LightWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: [number, number, number];
}

export interface AnchorHalo {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

class StringLine {
  p: p5;
  index: number;
  anchor1: { x: number; y: number };
  anchor2: { x: number; y: number };
  baseColor: [number, number, number];
  currentColor: [number, number, number];
  hoverColor: [number, number, number] = [255, 170, 255];
  glowColor: [number, number, number] = [255, 221, 136];
  errorColor: [number, number, number] = [255, 51, 51];

  baseArcHeight: number;
  currentArcHeight: number;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;
  targetArcHeight: number;

  isHovered: boolean = false;
  isDragging: boolean = false;
  isCorrect: boolean = false;
  isError: boolean = false;
  errorTimer: number = 0;
  errorShakeTimer: number = 0;

  hoverProgress: number = 0;

  springVel: number = 0;
  springTarget: number = 0;
  springActive: boolean = false;

  constructor(p: p5, index: number, a1: { x: number; y: number }, a2: { x: number; y: number }, color: [number, number, number]) {
    this.p = p;
    this.index = index;
    this.anchor1 = a1;
    this.anchor2 = a2;
    this.baseColor = color;
    this.currentColor = [...color];
    this.baseArcHeight = p.random(10, 25);
    this.currentArcHeight = this.baseArcHeight;
    this.targetArcHeight = this.baseArcHeight;
  }

  setAnchors(a1: { x: number; y: number }, a2: { x: number; y: number }): void {
    this.anchor1 = a1;
    this.anchor2 = a2;
  }

  midpoint(): { x: number; y: number } {
    return {
      x: (this.anchor1.x + this.anchor2.x) / 2,
      y: (this.anchor1.y + this.anchor2.y) / 2
    };
  }

  controlPoint(): { x: number; y: number } {
    const mid = this.midpoint();
    const dx = this.anchor2.x - this.anchor1.x;
    const dy = this.anchor2.y - this.anchor1.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const nx = -dy / len;
    const ny = dx / len;
    return {
      x: mid.x + nx * (this.currentArcHeight + this.dragOffsetX * 0 + this.dragOffsetY * 0) + this.dragOffsetX,
      y: mid.y + ny * (this.currentArcHeight + this.dragOffsetX * 0 + this.dragOffsetY * 0) + this.dragOffsetY
    };
  }

  getPointOnCurve(t: number): { x: number; y: number } {
    const cp = this.controlPoint();
    const mt = 1 - t;
    return {
      x: mt * mt * this.anchor1.x + 2 * mt * t * cp.x + t * t * this.anchor2.x,
      y: mt * mt * this.anchor1.y + 2 * mt * t * cp.y + t * t * this.anchor2.y
    };
  }

  distanceToPoint(px: number, py: number): number {
    let minDist = Infinity;
    for (let t = 0; t <= 1; t += 0.05) {
      const pt = this.getPointOnCurve(t);
      const d = Math.sqrt((px - pt.x) ** 2 + (py - pt.y) ** 2);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  triggerError(): void {
    this.isError = true;
    this.errorTimer = 0.3;
    this.errorShakeTimer = 0.3;
  }

  setCorrect(): void {
    this.isCorrect = true;
  }

  update(dt: number): void {
    const p = this.p;

    if (this.isHovered) {
      this.hoverProgress = Math.min(1, this.hoverProgress + dt / 0.3);
    } else {
      this.hoverProgress = Math.max(0, this.hoverProgress - dt / 0.3);
    }

    if (this.isError) {
      this.errorTimer -= dt;
      this.errorShakeTimer -= dt;
      if (this.errorTimer <= 0) {
        this.isError = false;
      }
    }

    if (this.isDragging) {
      this.springActive = false;
    } else if (this.springActive) {
      const k = 60;
      const damping = 6;
      const displacement = this.currentArcHeight - this.springTarget + this.dragOffsetX * 0 + this.dragOffsetY * 0;
      const displacementY = this.dragOffsetY;
      const displacementX = this.dragOffsetX;
      this.springVel = this.springVel - k * displacement * dt - damping * this.springVel * dt;
      this.currentArcHeight += this.springVel * dt;
      this.dragOffsetX -= (this.dragOffsetX) * Math.min(1, dt * 8);
      this.dragOffsetY -= (this.dragOffsetY) * Math.min(1, dt * 8);
      if (Math.abs(this.currentArcHeight - this.springTarget) < 0.5 && Math.abs(this.springVel) < 0.5 && Math.abs(this.dragOffsetX) < 0.5 && Math.abs(this.dragOffsetY) < 0.5) {
        this.currentArcHeight = this.springTarget;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.springActive = false;
        this.springVel = 0;
      }
    }

    for (let i = 0; i < 3; i++) {
      const t = i / 2;
      if (this.isHovered) {
        this.currentColor[i] = p.lerp(this.baseColor[i], this.hoverColor[i], this.hoverProgress);
      } else if (this.isError) {
        const flash = Math.floor(this.errorTimer / 0.15) % 2 === 0 ? 1 : 0;
        this.currentColor[i] = p.lerp(this.baseColor[i], this.errorColor[i], flash);
      } else if (this.isCorrect) {
        this.currentColor[i] = p.lerp(this.baseColor[i], this.glowColor[i], 0.8);
      } else {
        this.currentColor[i] = this.baseColor[i];
      }
    }
  }

  draw(): void {
    const p = this.p;
    let shakeX = 0, shakeY = 0;
    if (this.isError && this.errorShakeTimer > 0) {
      const freq = 12;
      const amp = 5;
      shakeX = Math.sin(p.millis() * 0.001 * freq * p.TWO_PI) * amp;
      shakeY = Math.cos(p.millis() * 0.001 * freq * p.TWO_PI) * amp * 0.3;
    }

    const cp = this.controlPoint();

    p.push();
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = `rgba(${this.currentColor[0]},${this.currentColor[1]},${this.currentColor[2]},0.8)`;
    p.stroke(this.currentColor[0], this.currentColor[1], this.currentColor[2], 220);
    p.strokeWeight(2.5);
    p.noFill();
    p.translate(shakeX, shakeY);
    p.beginShape();
    p.vertex(this.anchor1.x, this.anchor1.y);
    p.quadraticVertex(cp.x, cp.y, this.anchor2.x, this.anchor2.y);
    p.endShape();
    p.pop();
  }
}

export class Player {
  private p: p5;
  public strings: StringLine[] = [];
  public particles: Particle[] = [];
  public lightWaves: LightWave[] = [];
  public anchorHalos: AnchorHalo[] = [];
  private centerX: number;
  private centerY: number;
  private discRadius: number;
  private draggingString: StringLine | null = null;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;
  private audioCtx: AudioContext | null = null;
  private onPluckCallback: ((index: number) => void) | null = null;

  constructor(p: p5, centerX: number, centerY: number, discRadius: number) {
    this.p = p;
    this.centerX = centerX;
    this.centerY = centerY;
    this.discRadius = discRadius;
  }

  public setOnPluckCallback(cb: (index: number) => void): void {
    this.onPluckCallback = cb;
  }

  public initStrings(colors: [number, number, number][], rotationOffset: number = 0): void {
    this.strings = [];
    const anchors: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = rotationOffset + (i / 8) * this.p.TWO_PI - this.p.PI / 2;
      anchors.push({
        x: this.centerX + Math.cos(angle) * this.discRadius,
        y: this.centerY + Math.sin(angle) * this.discRadius
      });
    }
    for (let i = 0; i < 8; i++) {
      const j = (i + 1) % 8;
      const s = new StringLine(this.p, i, anchors[i], anchors[j], colors[i]);
      this.strings.push(s);
    }
  }

  public updatePosition(centerX: number, centerY: number, discRadius: number, rotationOffset: number = 0): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.discRadius = discRadius;
    const anchors: { x: number; y: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = rotationOffset + (i / 8) * this.p.TWO_PI - this.p.PI / 2;
      anchors.push({
        x: this.centerX + Math.cos(angle) * this.discRadius,
        y: this.centerY + Math.sin(angle) * this.discRadius
      });
    }
    for (let i = 0; i < 8; i++) {
      this.strings[i].setAnchors(anchors[i], anchors[(i + 1) % 8]);
    }
  }

  public getAnchor(index: number): { x: number; y: number } {
    return this.strings[index].anchor1;
  }

  private ensureAudio(): void {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {}
    }
  }

  private playTone(freq: number, duration: number = 0.4): void {
    this.ensureAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  public spawnPluckParticles(str: StringLine): void {
    const mid = str.midpoint();
    const [cr, cg, cb] = str.currentColor;
    for (let i = 0; i < 30; i++) {
      const angle = this.p.random(this.p.TWO_PI);
      const speed = this.p.random(2, 6);
      this.particles.push({
        x: mid.x,
        y: mid.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.5,
        maxLife: 1.5,
        size: this.p.random(2, 5),
        r: this.p.lerp(cr, 255, this.p.random(0.3, 1)),
        g: this.p.lerp(cg, 255, this.p.random(0.3, 1)),
        b: this.p.lerp(cb, 255, this.p.random(0.3, 1))
      });
    }
    this.lightWaves.push({
      x: mid.x,
      y: mid.y,
      radius: 5,
      maxRadius: 200,
      life: 1,
      maxLife: 1,
      color: [...str.currentColor]
    });
  }

  public spawnAnchorHalo(x: number, y: number): void {
    this.anchorHalos.push({
      x, y,
      radius: 5,
      maxRadius: 60,
      life: 0.4,
      maxLife: 0.4
    });
  }

  public spawnVictoryParticles(): void {
    const colors: [number, number, number][] = [
      [255, 136, 170],
      [136, 255, 170],
      [136, 170, 255],
      [255, 204, 136]
    ];
    for (let i = 0; i < 80; i++) {
      const angle = this.p.random(this.p.TWO_PI);
      const speed = this.p.random(3, 8);
      const col = colors[Math.floor(this.p.random(colors.length))];
      this.particles.push({
        x: this.centerX,
        y: this.centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 2,
        maxLife: 2,
        size: this.p.random(1, 6),
        r: col[0],
        g: col[1],
        b: col[2]
      });
    }
  }

  public handleMousePressed(mx: number, my: number): void {
    this.prevMouseX = mx;
    this.prevMouseY = my;
    for (const s of this.strings) {
      if (s.distanceToPoint(mx, my) < 15) {
        this.draggingString = s;
        s.isDragging = true;
        const dx = mx - s.midpoint().x;
        const dy = my - s.midpoint().y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const max = 80;
        const clamped = Math.min(dist, max);
        if (dist > 0) {
          s.dragOffsetX = (dx / dist) * clamped;
          s.dragOffsetY = (dy / dist) * clamped;
        }
        break;
      }
    }
  }

  public handleMouseDragged(mx: number, my: number): void {
    if (this.draggingString) {
      const s = this.draggingString;
      const mid = s.midpoint();
      let dx = mx - mid.x;
      let dy = my - mid.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const max = 80;
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      s.dragOffsetX = dx;
      s.dragOffsetY = dy;
    }
    this.prevMouseX = mx;
    this.prevMouseY = my;
  }

  public handleMouseReleased(): void {
    if (this.draggingString) {
      const s = this.draggingString;
      s.isDragging = false;
      s.springActive = true;
      s.springTarget = s.baseArcHeight;
      s.springVel = 0;
      const freq = 220 + s.index * 55;
      this.playTone(freq);
      this.spawnPluckParticles(s);
      if (this.onPluckCallback) {
        this.onPluckCallback(s.index);
      }
      this.draggingString = null;
    }
  }

  public handleMouseMoved(mx: number, my: number): void {
    for (const s of this.strings) {
      s.isHovered = s.distanceToPoint(mx, my) < 18;
    }
  }

  public setStringCorrect(index: number): void {
    if (this.strings[index]) {
      this.strings[index].setCorrect();
    }
  }

  public setStringError(index: number): void {
    if (this.strings[index]) {
      this.strings[index].triggerError();
    }
  }

  public update(dt: number): void {
    for (const s of this.strings) {
      s.update(dt);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.lightWaves.length - 1; i >= 0; i--) {
      const w = this.lightWaves[i];
      w.radius += 3;
      w.life -= dt;
      if (w.life <= 0 || w.radius >= w.maxRadius) this.lightWaves.splice(i, 1);
    }
    for (let i = this.anchorHalos.length - 1; i >= 0; i--) {
      const h = this.anchorHalos[i];
      h.radius = h.maxRadius * (1 - h.life / h.maxLife);
      h.life -= dt;
      if (h.life <= 0) this.anchorHalos.splice(i, 1);
    }
  }

  public draw(): void {
    const p = this.p;
    for (const w of this.lightWaves) {
      const alpha = Math.floor(255 * (w.life / w.maxLife) * 0.6);
      p.push();
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = `rgba(${w.color[0]},${w.color[1]},${w.color[2]},0.5)`;
      p.noFill();
      p.stroke(w.color[0], w.color[1], w.color[2], alpha);
      p.strokeWeight(2);
      p.ellipse(w.x, w.y, w.radius * 2, w.radius * 2);
      p.pop();
    }
    for (const s of this.strings) {
      s.draw();
    }
    for (const h of this.anchorHalos) {
      const alpha = Math.floor(255 * (h.life / h.maxLife));
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 20;
      p.drawingContext.shadowColor = 'rgba(255,170,136,0.8)';
      for (let r = 0; r < 3; r++) {
        const rr = h.radius * (0.6 + r * 0.2);
        const aa = alpha * (1 - r * 0.3);
        p.fill(255, 170, 136, Math.floor(aa * 0.4));
        p.ellipse(h.x, h.y, rr * 2, rr * 2);
      }
      p.pop();
    }
    for (const pt of this.particles) {
      const alpha = Math.floor(255 * (pt.life / pt.maxLife));
      p.push();
      p.noStroke();
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = `rgba(${pt.r},${pt.g},${pt.b},0.8)`;
      p.fill(pt.r, pt.g, pt.b, alpha);
      p.ellipse(pt.x, pt.y, pt.size, pt.size);
      p.pop();
    }
  }
}

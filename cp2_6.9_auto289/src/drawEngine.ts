const ANCHOR_COUNT = 12;
const TRACK_RADIUS = 120;
const ANCHOR_RADIUS = 8;
const NOTE_SIZE = 12;
const MAX_NOTES = 48;
const PARTICLE_POOL_SIZE = 200;

interface Vec2 {
  x: number;
  y: number;
}

interface Anchor {
  index: number;
  position: Vec2;
  color: string;
  activated: boolean;
  pulseProgress: number;
  pulseEnergy: number;
  shockwaves: Shockwave[];
  glowProgress: number;
  glowDuration: number;
  glowActive: boolean;
}

interface Shockwave {
  progress: number;
  color: string;
  active: boolean;
}

interface CustomNote {
  id: number;
  currentPos: Vec2;
  startPos: Vec2;
  targetAnchor: number | null;
  targetPos: Vec2 | null;
  flightProgress: number;
  flightDuration: number;
  flightActive: boolean;
  morphProgress: number;
  morphPeriod: number;
  color: string;
  fillColor: string;
  attached: boolean;
  attachedAnchor: number | null;
  curveOffset: Vec2;
  active: boolean;
  age: number;
}

interface ResonanceLine {
  fromAnchor: number;
  toAnchor: number;
  progress: number;
  delayProgress: number;
  delay: number;
  duration: number;
  active: boolean;
}

interface Particle {
  position: Vec2;
  velocity: Vec2;
  color: string;
  life: number;
  maxLife: number;
  size: number;
  active: boolean;
}

interface EchoVortex {
  position: Vec2;
  angles: number[];
  speeds: number[];
}

interface DragState {
  dragging: boolean;
  startPos: Vec2;
  currentPos: Vec2;
  trailPoints: Vec2[];
}

interface EchoEye {
  active: boolean;
  fadeInProgress: number;
  displayProgress: number;
  fadeOutProgress: number;
  colors: string[];
}

interface GenerateSequence {
  active: boolean;
  phase: number;
  phaseProgress: number;
  trackRotation: number;
  lightIndex: number;
  lightProgress: number;
  echoEye: EchoEye;
  activatedAnchors: number[];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function bounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function getAnchorColor(index: number): string {
  const hue = (index / ANCHOR_COUNT) * 360;
  return `hsl(${hue}, 75%, 60%)`;
}

function getComplementaryColor(index: number): string {
  const hue = ((index / ANCHOR_COUNT) * 360 + 180) % 360;
  return `hsl(${hue}, 75%, 60%)`;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.match(/^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/);
  if (m) {
    return hslToRgb(parseInt(m[1]) / 360, parseInt(m[2]) / 100, parseInt(m[3]) / 100);
  }
  return [255, 255, 255];
}

function mixColors(color1: string, color2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(color1);
  const [r2, g2, b2] = hexToRgb(color2);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export class DrawEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private canvasSize: Vec2 = { x: 0, y: 0 };
  private center: Vec2 = { x: 0, y: 0 };
  private anchors: Anchor[] = [];
  private notes: CustomNote[] = [];
  private particles: Particle[] = [];
  private resonanceLines: ResonanceLine[] = [];
  private vortexes: EchoVortex[] = [];
  private dragState: DragState = { dragging: false, startPos: { x: 0, y: 0 }, currentPos: { x: 0, y: 0 }, trailPoints: [] };
  private echoIntensity: number = 0.5;
  private noteIdCounter: number = 0;
  private animationId: number = 0;
  private lastTime: number = 0;
  private generateSequence: GenerateSequence = {
    active: false,
    phase: 0,
    phaseProgress: 0,
    trackRotation: 0,
    lightIndex: 0,
    lightProgress: 0,
    echoEye: { active: false, fadeInProgress: 0, displayProgress: 0, fadeOutProgress: 0, colors: [] },
    activatedAnchors: [],
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.initAnchors();
    this.initParticles();
    this.initVortexes();
    this.resize();
  }

  private initAnchors(): void {
    for (let i = 0; i < ANCHOR_COUNT; i++) {
      this.anchors.push({
        index: i,
        position: { x: 0, y: 0 },
        color: getAnchorColor(i),
        activated: false,
        pulseProgress: 1,
        pulseEnergy: 0,
        shockwaves: [],
        glowProgress: 0,
        glowDuration: 0.5,
        glowActive: false,
      });
    }
    this.updateAnchorPositions();
  }

  private updateAnchorPositions(): void {
    for (let i = 0; i < ANCHOR_COUNT; i++) {
      const angle = (i / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
      this.anchors[i].position.x = this.center.x + Math.cos(angle) * TRACK_RADIUS;
      this.anchors[i].position.y = this.center.y + Math.sin(angle) * TRACK_RADIUS;
    }
  }

  private initParticles(): void {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.particles.push({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        color: '#ffffff',
        life: 0,
        maxLife: 1,
        size: 2,
        active: false,
      });
    }
  }

  private initVortexes(): void {
    const corners = [
      { x: 60, y: 60 },
      { x: 0, y: 60 },
      { x: 60, y: 0 },
      { x: 0, y: 0 },
    ];
    for (let i = 0; i < 4; i++) {
      const speeds: number[] = [];
      const angles: number[] = [];
      for (let j = 0; j < 3; j++) {
        speeds.push(0.5 + Math.random() * 1.0);
        angles.push(Math.random() * Math.PI * 2);
      }
      this.vortexes.push({ position: corners[i], angles, speeds });
    }
  }

  public resize(): void {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;

    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    const targetRatio = 16 / 9;

    let canvasW: number, canvasH: number;
    if (w / h > targetRatio) {
      canvasH = h;
      canvasW = canvasH * targetRatio;
    } else {
      canvasW = w;
      canvasH = canvasW / targetRatio;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = canvasW * dpr;
    this.canvas.height = canvasH * dpr;
    this.canvas.style.width = canvasW + 'px';
    this.canvas.style.height = canvasH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.canvasSize.x = canvasW;
    this.canvasSize.y = canvasH;
    this.width = canvasW;
    this.height = canvasH;
    this.center.x = canvasW / 2;
    this.center.y = canvasH / 2;

    this.updateAnchorPositions();

    const cornerOffsets = [
      { x: 60, y: 60 },
      { x: canvasW - 60, y: 60 },
      { x: 60, y: canvasH - 60 },
      { x: canvasW - 60, y: canvasH - 60 },
    ];
    for (let i = 0; i < 4; i++) {
      this.vortexes[i].position = cornerOffsets[i];
    }
  }

  public setEchoIntensity(v: number): void {
    this.echoIntensity = Math.max(0, Math.min(1, v));
  }

  public getActivatedCount(): number {
    return this.anchors.filter((a) => a.activated).length;
  }

  public getActivatedAnchorIndices(): number[] {
    return this.anchors.filter((a) => a.activated).map((a) => a.index);
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public stop(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  private loop = (time: number): void => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt, time);
    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  public handleBeat(anchorIndex: number, energy: number): void {
    const anchor = this.anchors[anchorIndex];
    if (!anchor || !anchor.activated) return;

    anchor.pulseProgress = 0;
    anchor.pulseEnergy = energy;

    let shock: Shockwave | undefined = anchor.shockwaves.find((s) => !s.active);
    if (!shock) {
      shock = { progress: 1, color: anchor.color, active: false };
      anchor.shockwaves.push(shock);
    }
    shock.progress = 0;
    shock.color = anchor.color;
    shock.active = true;

    this.spawnParticles(anchor.position, anchor.color, Math.floor(5 + energy * 10));
    this.checkResonanceLines(anchorIndex);
  }

  private checkResonanceLines(triggeredIndex: number): void {
    const activated = this.anchors.filter((a) => a.activated && a.index !== triggeredIndex);
    for (const a of activated) {
      const diff = Math.abs(a.index - triggeredIndex);
      const wrappedDiff = Math.min(diff, ANCHOR_COUNT - diff);
      if (wrappedDiff >= 1 && wrappedDiff <= 2) {
        let line = this.resonanceLines.find(
          (l) =>
            l.active &&
            ((l.fromAnchor === triggeredIndex && l.toAnchor === a.index) ||
              (l.fromAnchor === a.index && l.toAnchor === triggeredIndex))
        );
        if (!line) {
          line = {
            fromAnchor: triggeredIndex,
            toAnchor: a.index,
            progress: 0,
            delayProgress: 0,
            delay: 0.2,
            duration: 0.3,
            active: false,
          };
          this.resonanceLines.push(line);
        }
        line.fromAnchor = triggeredIndex;
        line.toAnchor = a.index;
        line.progress = 0;
        line.delayProgress = 0;
        line.active = true;
      }
    }
  }

  private spawnParticles(pos: Vec2, color: string, count: number): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active) {
        p.active = true;
        p.position.x = pos.x;
        p.position.y = pos.y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        p.velocity.x = Math.cos(angle) * speed;
        p.velocity.y = Math.sin(angle) * speed;
        p.color = color;
        p.maxLife = 0.5 + Math.random() * 0.5;
        p.life = p.maxLife;
        p.size = 2 + Math.random() * 3;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public onPointerDown(x: number, y: number): void {
    if (this.generateSequence.active) return;
    const pos = this.screenToCanvas(x, y);
    this.dragState.dragging = true;
    this.dragState.startPos = { ...pos };
    this.dragState.currentPos = { ...pos };
    this.dragState.trailPoints = [{ ...pos }];
  }

  public onPointerMove(x: number, y: number): void {
    if (!this.dragState.dragging) return;
    const pos = this.screenToCanvas(x, y);
    this.dragState.currentPos = pos;
    if (this.dragState.trailPoints.length === 0 ||
        Math.hypot(pos.x - this.dragState.trailPoints[this.dragState.trailPoints.length - 1].x,
                   pos.y - this.dragState.trailPoints[this.dragState.trailPoints.length - 1].y) > 3) {
      this.dragState.trailPoints.push({ ...pos });
      if (this.dragState.trailPoints.length > 30) this.dragState.trailPoints.shift();
    }
  }

  public onPointerUp(x: number, y: number): void {
    if (!this.dragState.dragging) return;
    const pos = this.screenToCanvas(x, y);
    this.dragState.dragging = false;
    this.createNote(pos);
    this.dragState.trailPoints = [];
  }

  private screenToCanvas(sx: number, sy: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: sx - rect.left, y: sy - rect.top };
  }

  private findNearestAnchor(pos: Vec2): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < ANCHOR_COUNT; i++) {
      const d = Math.hypot(pos.x - this.anchors[i].position.x, pos.y - this.anchors[i].position.y);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private createNote(pos: Vec2): void {
    if (this.notes.filter((n) => n.active).length >= MAX_NOTES) {
      const oldest = this.notes.filter((n) => n.active).sort((a, b) => a.age - b.age)[0];
      if (oldest) {
        oldest.active = false;
        if (oldest.attachedAnchor !== null) {
          const stillAttached = this.notes.some(
            (n) => n.active && n.attachedAnchor === oldest.attachedAnchor && n.id !== oldest.id
          );
          if (!stillAttached) {
            this.anchors[oldest.attachedAnchor].activated = false;
          }
        }
      }
    }

    const nearestIdx = this.findNearestAnchor(pos);
    const complementColor = getComplementaryColor(nearestIdx);

    let note: CustomNote | undefined = this.notes.find((n) => !n.active);
    if (!note) {
      note = {
        id: 0,
        currentPos: { x: 0, y: 0 },
        startPos: { x: 0, y: 0 },
        targetAnchor: null,
        targetPos: null,
        flightProgress: 0,
        flightDuration: 0.8,
        flightActive: false,
        morphProgress: 0,
        morphPeriod: 1.5,
        color: '#ffffff',
        fillColor: '#ffffff',
        attached: false,
        attachedAnchor: null,
        curveOffset: { x: 0, y: 0 },
        active: false,
        age: 0,
      };
      this.notes.push(note);
    }

    note.id = this.noteIdCounter++;
    note.currentPos = { ...pos };
    note.startPos = { ...pos };
    note.targetAnchor = nearestIdx;
    note.targetPos = { ...this.anchors[nearestIdx].position };
    note.flightProgress = 0;
    note.flightDuration = 0.8;
    note.flightActive = true;
    note.morphProgress = 0;
    note.morphPeriod = 1.5;
    note.color = complementColor;
    note.fillColor = complementColor;
    note.attached = false;
    note.attachedAnchor = null;
    note.curveOffset = {
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
    };
    note.active = true;
    note.age = performance.now();

    this.anchors[nearestIdx].activated = true;
  }

  public resetAll(): void {
    for (const n of this.notes) n.active = false;
    for (const a of this.anchors) {
      a.activated = false;
      a.pulseProgress = 1;
      a.shockwaves = [];
      a.glowActive = false;
      a.glowProgress = 0;
    }
    for (const l of this.resonanceLines) l.active = false;
    for (const p of this.particles) p.active = false;
    this.generateSequence.active = false;
    this.generateSequence.phase = 0;
    this.generateSequence.echoEye.active = false;
  }

  public triggerGenerateSequence(onComplete?: () => void): void {
    if (this.generateSequence.active) return;
    const activated = this.getActivatedAnchorIndices();
    if (activated.length === 0) return;

    this.generateSequence.active = true;
    this.generateSequence.phase = 0;
    this.generateSequence.phaseProgress = 0;
    this.generateSequence.trackRotation = 0;
    this.generateSequence.lightIndex = 0;
    this.generateSequence.lightProgress = 0;
    this.generateSequence.activatedAnchors = activated;
    this.generateSequence.echoEye = {
      active: false,
      fadeInProgress: 0,
      displayProgress: 0,
      fadeOutProgress: 0,
      colors: activated.map((i) => this.anchors[i].color),
    };

    const seq = this.generateSequence;
    const totalPhases = 4;
    let phaseDurations = [2, 0.5 + activated.length * 0.7, 0.5, 5];
    const origSeq = this.generateSequence;

    const completeHandler = () => {
      origSeq.active = false;
      origSeq.echoEye.active = false;
      if (onComplete) onComplete();
    };

    (this as any)._seqComplete = completeHandler;
  }

  private update(dt: number, now: number): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        this.vortexes[i].angles[j] += (this.vortexes[i].speeds[j] * Math.PI / 180);
      }
    }

    for (const a of this.anchors) {
      if (a.pulseProgress < 1) a.pulseProgress = Math.min(1, a.pulseProgress + dt / 0.4);
      if (a.glowActive) {
        a.glowProgress += dt / a.glowDuration;
        if (a.glowProgress >= 1) {
          a.glowActive = false;
          a.glowProgress = 0;
        }
      }
      for (const s of a.shockwaves) {
        if (s.active) {
          s.progress = Math.min(1, s.progress + dt / 0.4);
          if (s.progress >= 1) s.active = false;
        }
      }
    }

    for (const n of this.notes) {
      if (!n.active) continue;
      if (n.flightActive && n.targetPos) {
        n.flightProgress += dt / n.flightDuration;
        if (n.flightProgress >= 1) {
          n.flightProgress = 1;
          n.flightActive = false;
          n.attached = true;
          n.attachedAnchor = n.targetAnchor;
          if (n.targetAnchor !== null) n.fillColor = this.anchors[n.targetAnchor].color;
        } else {
          const t = easeInOut(n.flightProgress);
          const sx = n.startPos.x, sy = n.startPos.y;
          const ex = n.targetPos.x, ey = n.targetPos.y;
          const cx = (sx + ex) / 2 + n.curveOffset.x;
          const cy = (sy + ey) / 2 + n.curveOffset.y;
          n.currentPos.x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * ex;
          n.currentPos.y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ey;
        }
      }
      n.morphProgress += dt / n.morphPeriod;
      if (n.morphProgress > 2) n.morphProgress -= 2;
    }

    for (const l of this.resonanceLines) {
      if (!l.active) continue;
      if (l.delayProgress < 1) {
        l.delayProgress = Math.min(1, l.delayProgress + dt / l.delay);
      } else {
        l.progress = Math.min(1, l.progress + dt / l.duration);
        if (l.progress >= 1) l.active = false;
      }
    }

    for (const p of this.particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.velocity.x *= 0.96;
      p.velocity.y *= 0.96;
    }

    if (this.generateSequence.active) {
      this.updateSequence(dt);
    }
  }

  private updateSequence(dt: number): void {
    const seq = this.generateSequence;
    seq.phaseProgress += dt;

    if (seq.phase === 0) {
      const duration = 2;
      const t = Math.min(1, seq.phaseProgress / duration);
      seq.trackRotation = easeOut(t) * Math.PI * 6;
      if (t >= 1) {
        seq.phase = 1;
        seq.phaseProgress = 0;
        seq.lightIndex = 0;
        seq.lightProgress = 0;
      }
    } else if (seq.phase === 1) {
      const activated = seq.activatedAnchors;
      const perNote = 0.7;
      if (seq.lightIndex < activated.length) {
        const anchorIdx = activated[seq.lightIndex];
        const anchor = this.anchors[anchorIdx];
        if (!anchor.glowActive) {
          anchor.glowActive = true;
          anchor.glowProgress = 0;
          this.spawnParticles(anchor.position, anchor.color, 15);
        }
        seq.lightProgress += dt;
        if (seq.lightProgress >= perNote) {
          seq.lightProgress = 0;
          seq.lightIndex++;
        }
      } else {
        seq.phase = 2;
        seq.phaseProgress = 0;
      }
    } else if (seq.phase === 2) {
      const duration = 0.5;
      const t = Math.min(1, seq.phaseProgress / duration);
      seq.echoEye.active = true;
      seq.echoEye.fadeInProgress = t;
      if (t >= 1) {
        seq.phase = 3;
        seq.phaseProgress = 0;
      }
    } else if (seq.phase === 3) {
      const duration = 5;
      const t = Math.min(1, seq.phaseProgress / duration);
      seq.echoEye.displayProgress = t;
      if (t < 1) {
        seq.echoEye.fadeInProgress = 1;
        seq.echoEye.fadeOutProgress = 0;
      } else if (t >= 1) {
        seq.echoEye.fadeInProgress = 1;
        seq.phase = 4;
        seq.phaseProgress = 0;
      }
    } else if (seq.phase === 4) {
      const duration = 1;
      const t = Math.min(1, seq.phaseProgress / duration);
      seq.echoEye.fadeOutProgress = t;
      if (t >= 1) {
        seq.active = false;
        seq.echoEye.active = false;
        if (typeof (this as any)._seqComplete === 'function') {
          const cb = (this as any)._seqComplete;
          delete (this as any)._seqComplete;
          cb();
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0B0E1A';
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderVortexes();
    this.renderResonanceLines();
    this.renderTrack();
    this.renderNotes();
    this.renderAnchors();
    this.renderShockwaves();
    this.renderParticles();
    this.renderDragLine();
    if (this.generateSequence.echoEye.active) {
      this.renderEchoEye();
    }
  }

  private renderVortexes(): void {
    const ctx = this.ctx;
    for (const v of this.vortexes) {
      for (let j = 0; j < 3; j++) {
        const radius = 15 + j * 20;
        ctx.save();
        ctx.translate(v.position.x, v.position.y);
        ctx.rotate(v.angles[j]);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 1.5);
        ctx.strokeStyle = 'rgba(32, 32, 64, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private renderTrack(): void {
    const ctx = this.ctx;
    const seqRot = this.generateSequence.active ? this.generateSequence.trackRotation : 0;

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(seqRot);
    ctx.beginPath();
    ctx.arc(0, 0, TRACK_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = '#404060';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private renderAnchors(): void {
    const ctx = this.ctx;
    const seqRot = this.generateSequence.active ? this.generateSequence.trackRotation : 0;

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(seqRot);

    for (let i = 0; i < ANCHOR_COUNT; i++) {
      const a = this.anchors[i];
      const angle = (i / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * TRACK_RADIUS;
      const y = Math.sin(angle) * TRACK_RADIUS;

      let radius = ANCHOR_RADIUS;
      let glowAlpha = 0.3;
      let glowRadius = 24;

      if (a.pulseProgress < 1) {
        if (a.pulseProgress < 0.1 / 0.4) {
          const pt = a.pulseProgress / (0.1 / 0.4);
          radius = ANCHOR_RADIUS + (14 - ANCHOR_RADIUS) * pt;
        } else {
          const pt = (a.pulseProgress - 0.1 / 0.4) / (0.3 / 0.4);
          radius = 14 - (14 - ANCHOR_RADIUS) * bounce(pt);
        }
      }

      if (a.glowActive) {
        const gt = a.glowProgress;
        radius = ANCHOR_RADIUS + (20 - ANCHOR_RADIUS) * Math.sin(gt * Math.PI);
        glowAlpha = 0.3 + 0.4 * Math.sin(gt * Math.PI);
        glowRadius = 32;
      }

      if (a.activated) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        gradient.addColorStop(0, a.color + Math.floor(glowAlpha * 255).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, a.color + '00');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(64, 64, 96, 0.3)';
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = a.activated ? a.color : '#2A2A4C';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (a.activated) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  private renderShockwaves(): void {
    const ctx = this.ctx;
    const seqRot = this.generateSequence.active ? this.generateSequence.trackRotation : 0;
    const intensity = 0.5 + this.echoIntensity * 0.5;
    const maxR = 60 * intensity;

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(seqRot);

    for (let i = 0; i < ANCHOR_COUNT; i++) {
      const a = this.anchors[i];
      const angle = (i / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
      const ax = Math.cos(angle) * TRACK_RADIUS;
      const ay = Math.sin(angle) * TRACK_RADIUS;

      for (const s of a.shockwaves) {
        if (!s.active) continue;
        const t = s.progress;
        const r = 14 + (maxR - 14) * t;
        const lineW = 3 * (1 - t);
        const alpha = 0.6 * (1 - t);
        const [rr, gg, bb] = hexToRgb(s.color);
        ctx.beginPath();
        ctx.arc(ax, ay, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rr},${gg},${bb},${alpha})`;
        ctx.lineWidth = lineW;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private renderResonanceLines(): void {
    const ctx = this.ctx;
    const seqRot = this.generateSequence.active ? this.generateSequence.trackRotation : 0;
    const intensity = 0.3 + this.echoIntensity * 0.7;

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(seqRot);

    for (const l of this.resonanceLines) {
      if (!l.active) continue;
      if (l.delayProgress < 1) continue;

      const fromAng = (l.fromAnchor / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
      const toAng = (l.toAnchor / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
      const fx = Math.cos(fromAng) * TRACK_RADIUS;
      const fy = Math.sin(fromAng) * TRACK_RADIUS;
      const tx = Math.cos(toAng) * TRACK_RADIUS;
      const ty = Math.sin(toAng) * TRACK_RADIUS;

      const fc = this.anchors[l.fromAnchor].color;
      const tc = this.anchors[l.toAnchor].color;
      const mixed = mixColors(fc, tc, 0.5);

      const t = l.progress;
      const ex = fx + (tx - fx) * t;
      const ey = fy + (ty - fy) * t;
      const [rr, gg, bb] = hexToRgb(mixed);

      ctx.save();
      ctx.shadowBlur = 15 * intensity;
      ctx.shadowColor = mixed;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = `rgba(${rr},${gg},${bb},${0.8 * intensity * (1 - Math.abs(t - 0.5) * 0.5)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private renderNotes(): void {
    const ctx = this.ctx;
    const seqRot = this.generateSequence.active ? this.generateSequence.trackRotation : 0;

    for (const n of this.notes) {
      if (!n.active) continue;

      let drawX = n.currentPos.x;
      let drawY = n.currentPos.y;

      if (n.attached && n.attachedAnchor !== null) {
        const i = n.attachedAnchor;
        const angle = (i / ANCHOR_COUNT) * Math.PI * 2 - Math.PI / 2;
        drawX = this.center.x + Math.cos(angle + seqRot) * TRACK_RADIUS;
        drawY = this.center.y + Math.sin(angle + seqRot) * TRACK_RADIUS;
      }

      const morphT = n.morphProgress;
      const morphCycle = morphT > 1 ? 2 - morphT : morphT;
      const morphEased = easeInOut(morphCycle);

      const side = NOTE_SIZE;
      const shadowSize = side * 1.5;

      ctx.save();
      ctx.translate(drawX, drawY);

      const [rr, gg, bb] = hexToRgb(n.fillColor);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.25)`;
      ctx.beginPath();
      ctx.arc(0, 0, shadowSize, 0, Math.PI * 2);
      ctx.fill();

      if (morphEased < 0.5) {
        const sides = 6;
        const r = side;
        const hexT = morphEased * 2;
        ctx.beginPath();
        for (let i = 0; i <= sides; i++) {
          const ang = (i / sides) * Math.PI * 2 - Math.PI / 2;
          const lerpR = r + (side * 0.3 - r) * 0 + r * (1 - Math.cos((i / sides) * Math.PI * 2)) * 0;
          const px = Math.cos(ang) * side;
          const py = Math.sin(ang) * side;
          const cx = Math.cos(ang) * (side + side * 0.05 * hexT);
          const cy = Math.sin(ang) * (side + side * 0.05 * hexT);
          const fx = px + (cx - px) * hexT;
          const fy = py + (cy - py) * hexT;
          if (i === 0) ctx.moveTo(fx, fy);
          else ctx.lineTo(fx, fy);
        }
        ctx.closePath();
      } else {
        const circleT = (morphEased - 0.5) * 2;
        ctx.beginPath();
        const sides = 6;
        for (let i = 0; i <= 36; i++) {
          const ang = (i / 36) * Math.PI * 2;
          const baseR = side;
          const wobble = Math.cos(ang * sides - Math.PI / 2) * side * 0.08;
          const r = baseR + wobble * (1 - circleT);
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      }

      ctx.fillStyle = n.fillColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      const [rr, gg, bb] = hexToRgb(p.color);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},${alpha})`;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderDragLine(): void {
    if (!this.dragState.dragging) return;
    const ctx = this.ctx;
    const pts = this.dragState.trailPoints;
    if (pts.length < 2) return;

    ctx.save();
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      const alpha = t * 0.8;
      ctx.beginPath();
      ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
      ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = `rgba(224, 224, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderEchoEye(): void {
    const ctx = this.ctx;
    const eye = this.generateSequence.echoEye;
    const colors = eye.colors;
    if (colors.length === 0) return;

    let alpha = 1;
    if (eye.fadeInProgress < 1) {
      alpha = easeInOut(eye.fadeInProgress);
    } else if (eye.fadeOutProgress > 0) {
      alpha = 1 - easeInOut(eye.fadeOutProgress);
    }

    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.globalAlpha = alpha;

    for (let i = 0; i < 10; i++) {
      const radius = 20 + i * 20;
      const colorIdx = i % colors.length;
      const nextIdx = (i + 1) % colors.length;
      const color = mixColors(colors[colorIdx], colors[nextIdx], 0.5);
      const [rr, gg, bb] = hexToRgb(color);

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.arc(0, 0, radius - 4, 0, Math.PI * 2, true);
      ctx.fillStyle = `rgba(${rr},${gg},${bb},0.7)`;
      ctx.fill();
    }
    ctx.restore();
  }
}

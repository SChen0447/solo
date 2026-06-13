import { random, randomInt, clamp, degToRad, distance } from './utils';
import { SceneRenderer } from './scene';

export interface Puppet {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isDragging: boolean;
  leftArmAngle: number;
  rightArmAngle: number;
  leftLegAngle: number;
  rightLegAngle: number;
  armSwingPhase: number;
  legSwingPhase: number;
  color: string;
  outlineColor: string;
  actionPlaying: boolean;
  actionProgress: number;
}

export interface AudienceMember {
  x: number;
  y: number;
  baseDiameter: number;
  diameter: number;
  baseColor: string;
  currentColor: string;
  targetColor: string;
  reactionTime: number;
  isCheering: boolean;
  isBooing: boolean;
  shakePhase: number;
  brightness: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export type ReactionCallback = (type: 'cheer' | 'boo') => void;

export class ShadowPlay {
  private width: number;
  private height: number;
  private puppetsCanvas: HTMLCanvasElement;
  private puppetsCtx: CanvasRenderingContext2D;
  private audienceCanvas: HTMLCanvasElement;
  private audienceCtx: CanvasRenderingContext2D;
  private smokeCanvas: HTMLCanvasElement;
  private smokeCtx: CanvasRenderingContext2D;
  private scene: SceneRenderer;
  public puppets: Puppet[] = [];
  public audience: AudienceMember[] = [];
  public smokeParticles: SmokeParticle[] = [];
  private activePuppetId: number | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseMoveSpeed: number = 0;
  private onReaction: ReactionCallback | null = null;
  private audioContext: AudioContext | null = null;
  private time: number = 0;

  constructor(width: number, height: number, scene: SceneRenderer) {
    this.width = width;
    this.height = height;
    this.scene = scene;

    this.puppetsCanvas = document.getElementById('puppets-layer') as HTMLCanvasElement;
    this.audienceCanvas = document.getElementById('audience-layer') as HTMLCanvasElement;
    this.smokeCanvas = document.getElementById('smoke-layer') as HTMLCanvasElement;

    this.resizeCanvases();

    this.puppetsCtx = this.puppetsCanvas.getContext('2d')!;
    this.audienceCtx = this.audienceCanvas.getContext('2d')!;
    this.smokeCtx = this.smokeCanvas.getContext('2d')!;

    this.createPuppets();
    this.createAudience();
    this.createSmokeParticles();
    this.bindMouseEvents();
  }

  public setReactionCallback(cb: ReactionCallback): void {
    this.onReaction = cb;
  }

  private resizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;
    const setupCanvas = (canvas: HTMLCanvasElement, w: number, h: number) => {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
    };
    setupCanvas(this.puppetsCanvas, this.width, this.height);
    setupCanvas(this.audienceCanvas, this.width, 60);
    setupCanvas(this.smokeCanvas, this.width, this.height);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.resizeCanvases();

    const scaleX = width / this.puppets[0]?.x * 0.5 || 1;
    const scaleY = height / this.puppets[0]?.y * 0.5 || 1;
    this.puppets.forEach((p, i) => {
      p.x = width * (0.3 + i * 0.4);
      p.y = height * 0.45;
      void scaleX;
      void scaleY;
    });

    this.createAudience();
  }

  private createPuppets(): void {
    const puppetColors = [
      { color: '#3a3a3a', outline: '#111111' },
      { color: '#4a3a2a', outline: '#1a0f08' }
    ];

    for (let i = 0; i < 2; i++) {
      this.puppets.push({
        id: i,
        x: this.width * (0.3 + i * 0.4),
        y: this.height * 0.45,
        width: 120,
        height: 180,
        vx: 0,
        vy: 0,
        isDragging: false,
        leftArmAngle: degToRad(20),
        rightArmAngle: degToRad(-20),
        leftLegAngle: degToRad(-5),
        rightLegAngle: degToRad(5),
        armSwingPhase: random(0, Math.PI * 2),
        legSwingPhase: random(0, Math.PI * 2),
        color: puppetColors[i].color,
        outlineColor: puppetColors[i].outline,
        actionPlaying: false,
        actionProgress: 0
      });
    }
  }

  private createAudience(): void {
    this.audience = [];
    const count = 30;
    const spacing = this.width / (count + 1);
    for (let i = 0; i < count; i++) {
      this.audience.push({
        x: spacing * (i + 1),
        y: 40,
        baseDiameter: 10,
        diameter: 10,
        baseColor: '#5a3a22',
        currentColor: '#5a3a22',
        targetColor: '#5a3a22',
        reactionTime: 0,
        isCheering: false,
        isBooing: false,
        shakePhase: 0,
        brightness: 1
      });
    }
  }

  private createSmokeParticles(): void {
    this.smokeParticles = [];
    for (let i = 0; i < 20; i++) {
      this.smokeParticles.push(this.createSingleSmoke(true));
    }
  }

  private createSingleSmoke(initial: boolean = false): SmokeParticle {
    return {
      x: random(this.width * 0.2, this.width * 0.8),
      y: initial ? random(this.height * 0.3, this.height * 0.7) : this.height * 0.7,
      vx: random(-0.3, 0.3),
      vy: random(-1.5, -0.5),
      size: random(5, 20),
      alpha: random(0.1, 0.3),
      life: initial ? random(0, 5000) : 0,
      maxLife: random(5000, 10000)
    };
  }

  private bindMouseEvents(): void {
    const canvas = this.puppetsCanvas;

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      this.lastMouseX = mx;
      this.lastMouseY = my;
      this.mouseMoveSpeed = 0;

      for (let i = this.puppets.length - 1; i >= 0; i--) {
        const p = this.puppets[i];
        if (
          mx >= p.x - p.width / 2 - 20 &&
          mx <= p.x + p.width / 2 + 20 &&
          my >= p.y - p.height / 2 &&
          my <= p.y + p.height / 2 + 40
        ) {
          const clickDist = distance(mx, my, p.x, p.y);
          if (clickDist < 50 && !p.isDragging && !this.activePuppetId) {
            this.triggerPuppetAction(p);
          }

          p.isDragging = true;
          this.activePuppetId = p.id;
          this.dragOffsetX = mx - p.x;
          this.dragOffsetY = my - p.y;
          canvas.style.cursor = 'grabbing';
          break;
        }
      }
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const dx = mx - this.lastMouseX;
      const dy = my - this.lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      this.mouseMoveSpeed = this.mouseMoveSpeed * 0.7 + dist * 0.3;
      this.lastMouseX = mx;
      this.lastMouseY = my;

      if (this.activePuppetId !== null) {
        const puppet = this.puppets.find((p) => p.id === this.activePuppetId);
        if (puppet) {
          puppet.x = clamp(mx - this.dragOffsetX, puppet.width / 2 + 50, this.width - puppet.width / 2 - 50);
          puppet.y = clamp(my - this.dragOffsetY, puppet.height / 2 + 150, this.height - puppet.height / 2 - 120);
          puppet.vx = dx;
          puppet.vy = dy;

          if (this.mouseMoveSpeed > 2 && Math.random() < 0.03) {
            this.triggerRandomAudienceReaction();
          }
        }
      } else {
        let hovering = false;
        for (const p of this.puppets) {
          if (
            mx >= p.x - p.width / 2 - 20 &&
            mx <= p.x + p.width / 2 + 20 &&
            my >= p.y - p.height / 2 &&
            my <= p.y + p.height / 2 + 40
          ) {
            hovering = true;
            break;
          }
        }
        canvas.style.cursor = hovering ? 'grab' : 'default';
      }
    });

    const endDrag = () => {
      if (this.activePuppetId !== null) {
        const puppet = this.puppets.find((p) => p.id === this.activePuppetId);
        if (puppet) {
          puppet.isDragging = false;
        }
        this.activePuppetId = null;
        canvas.style.cursor = 'default';
      }
    };

    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('mouseleave', endDrag);
  }

  private triggerPuppetAction(puppet: Puppet): void {
    if (puppet.actionPlaying) return;
    puppet.actionPlaying = true;
    puppet.actionProgress = 0;
    this.triggerRandomAudienceReaction();
  }

  private triggerRandomAudienceReaction(): void {
    const reactionCount = randomInt(3, 8);
    const audienceCopy = [...this.audience].sort(() => Math.random() - 0.5);
    const selected = audienceCopy.slice(0, reactionCount);

    selected.forEach((member) => {
      const isCheer = Math.random() < 0.65;
      if (isCheer) {
        member.isCheering = true;
        member.isBooing = false;
        member.targetColor = '#44cc66';
        member.brightness = 1.5;
        member.reactionTime = 0;
        this.playCheerSound();
        this.scene.setCandleTargetColor('#ffaa66', 2000);
        setTimeout(() => {
          this.scene.setCandleTargetColor(this.scene.candle.baseColor, 2000);
        }, 2000);
        if (this.onReaction) this.onReaction('cheer');
      } else {
        member.isBooing = true;
        member.isCheering = false;
        member.targetColor = '#cc4444';
        member.brightness = 0.8;
        member.shakePhase = 0;
        member.reactionTime = 0;
        this.playBooSound();
        this.scene.setCandleTargetColor('#6666ff', 2000);
        setTimeout(() => {
          this.scene.setCandleTargetColor(this.scene.candle.baseColor, 2000);
        }, 2000);
        if (this.onReaction) this.onReaction('boo');
      }
    });
  }

  private ensureAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        this.audioContext = null;
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playCheerSound(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 440 + i * 60;
      osc.frequency.setValueAtTime(baseFreq, now + i * 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + i * 0.08 + 0.15);
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    }
  }

  private playBooSound(): void {
    this.ensureAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const baseFreq = 180 - i * 20;
      osc.frequency.setValueAtTime(baseFreq, now + i * 0.12);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + i * 0.12 + 0.3);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + i * 0.12 + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    }
  }

  public update(dt: number): void {
    this.time += dt;
    const damping = 0.9;
    const speedThreshold = 0.5;
    const maxSwingAngle = degToRad(30);

    for (const puppet of this.puppets) {
      if (!puppet.isDragging) {
        puppet.x += puppet.vx;
        puppet.y += puppet.vy;
        puppet.vx *= damping;
        puppet.vy *= damping;

        puppet.x = clamp(puppet.x, puppet.width / 2 + 50, this.width - puppet.width / 2 - 50);
        puppet.y = clamp(puppet.y, puppet.height / 2 + 150, this.height - puppet.height / 2 - 120);

        if (Math.abs(puppet.vx) < speedThreshold) puppet.vx = 0;
        if (Math.abs(puppet.vy) < speedThreshold) puppet.vy = 0;
      }

      const speed = Math.sqrt(puppet.vx * puppet.vx + puppet.vy * puppet.vy);
      const swingIntensity = clamp(speed / 15, 0, 1);

      puppet.armSwingPhase += dt * 0.008 * (1 + swingIntensity * 3);
      puppet.legSwingPhase += dt * 0.008 * (1 + swingIntensity * 3);

      const baseArm = degToRad(15);
      const baseLeg = degToRad(5);
      const swingArm = maxSwingAngle * swingIntensity;
      const swingLeg = maxSwingAngle * 0.7 * swingIntensity;

      if (puppet.actionPlaying) {
        puppet.actionProgress = Math.min(1, puppet.actionProgress + dt / 600);
        const t = puppet.actionProgress;
        const actionWave = Math.sin(t * Math.PI * 3);

        puppet.leftArmAngle = baseArm + (maxSwingAngle * 1.5) * actionWave;
        puppet.rightArmAngle = -baseArm - (maxSwingAngle * 1.5) * actionWave;
        puppet.leftLegAngle = -baseLeg + (maxSwingAngle * 0.8) * actionWave * -1;
        puppet.rightLegAngle = baseLeg + (maxSwingAngle * 0.8) * actionWave * -1;

        if (puppet.actionProgress >= 1) {
          puppet.actionPlaying = false;
          puppet.actionProgress = 0;
        }
      } else {
        puppet.leftArmAngle = baseArm + Math.sin(puppet.armSwingPhase) * swingArm;
        puppet.rightArmAngle = -baseArm + Math.sin(puppet.armSwingPhase + Math.PI) * swingArm;
        puppet.leftLegAngle = -baseLeg + Math.sin(puppet.legSwingPhase + Math.PI) * swingLeg;
        puppet.rightLegAngle = baseLeg + Math.sin(puppet.legSwingPhase) * swingLeg;
      }
    }

    for (const member of this.audience) {
      if (member.isCheering || member.isBooing) {
        member.reactionTime += dt;
        const dur = 1500;
        const t = clamp(member.reactionTime / dur, 0, 1);
        const easeT = 1 - Math.pow(1 - t, 2);

        const lerpColor = (a: string, b: string, tt: number) => {
          const parse = (h: string) => [
            parseInt(h.slice(1, 3), 16),
            parseInt(h.slice(3, 5), 16),
            parseInt(h.slice(5, 7), 16)
          ];
          const [ar, ag, ab] = parse(a);
          const [br, bg, bb] = parse(b);
          const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
          return `#${toHex(ar + (br - ar) * tt)}${toHex(ag + (bg - ag) * tt)}${toHex(ab + (bb - ab) * tt)}`;
        };

        if (t < 0.5) {
          member.currentColor = lerpColor(member.baseColor, member.targetColor, easeT * 2);
        } else {
          member.currentColor = lerpColor(member.targetColor, member.baseColor, (t - 0.5) * 2);
        }

        if (member.isCheering) {
          member.diameter = member.baseDiameter * (1 + 0.4 * Math.sin(t * Math.PI));
        } else if (member.isBooing) {
          member.shakePhase += dt * 0.03;
          member.diameter = member.baseDiameter * (0.7 + 0.2 * Math.sin(member.shakePhase));
        }

        if (t >= 1) {
          member.isCheering = false;
          member.isBooing = false;
          member.currentColor = member.baseColor;
          member.diameter = member.baseDiameter;
          member.brightness = 1;
        }
      }
    }

    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      const speedFactor = 0.5 + (this.time % 1000) / 2000;
      p.x += p.vx * (0.5 + speedFactor);
      p.y += p.vy * (0.5 + speedFactor);
      p.life += dt;

      const lifeT = p.life / p.maxLife;
      p.alpha = 0.1 + 0.2 * Math.sin(lifeT * Math.PI);
      p.size += 0.02;

      if (p.life >= p.maxLife || p.y < -50) {
        this.smokeParticles[i] = this.createSingleSmoke(false);
      }
    }
  }

  public drawPuppets(): void {
    const ctx = this.puppetsCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const puppet of this.puppets) {
      this.drawSinglePuppet(ctx, puppet);
    }
  }

  private drawSinglePuppet(ctx: CanvasRenderingContext2D, p: Puppet): void {
    ctx.save();
    ctx.translate(p.x, p.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.beginPath();
    ctx.ellipse(0, p.height / 2 + 15, p.width * 0.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const float = Math.sin(this.time * 0.002 + p.id) * 2;
    ctx.translate(0, float);

    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = p.color;

    const bodyTopY = -p.height / 2 + 35;
    const bodyBottomY = p.height / 2 - 40;
    const bodyTopWidth = 28;
    const bodyBottomWidth = 45;

    ctx.beginPath();
    ctx.moveTo(-bodyTopWidth, bodyTopY);
    ctx.lineTo(bodyTopWidth, bodyTopY);
    ctx.lineTo(bodyBottomWidth, bodyBottomY);
    ctx.lineTo(-bodyBottomWidth, bodyBottomY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const headRadius = 22;
    const headY = bodyTopY - 15;
    ctx.beginPath();
    ctx.arc(0, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-7, headY - 2, 2, 0, Math.PI * 2);
    ctx.arc(7, headY - 2, 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, headY + 5, 6, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    const armLength = 55;
    const armWidth = 8;
    const shoulderY = bodyTopY + 5;

    ctx.save();
    ctx.translate(-bodyTopWidth, shoulderY);
    ctx.rotate(p.leftArmAngle);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-armWidth / 2, 0, armWidth, armLength, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(bodyTopWidth, shoulderY);
    ctx.rotate(p.rightArmAngle);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-armWidth / 2, 0, armWidth, armLength, 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const legLength = 55;
    const legWidth = 10;
    const hipY = bodyBottomY - 2;

    ctx.save();
    ctx.translate(-bodyBottomWidth * 0.45, hipY);
    ctx.rotate(p.leftLegAngle);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-legWidth / 2, 0, legWidth, legLength, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.outlineColor;
    ctx.fillRect(-legWidth / 2 - 3, legLength - 4, legWidth + 6, 8);
    ctx.restore();

    ctx.save();
    ctx.translate(bodyBottomWidth * 0.45, hipY);
    ctx.rotate(p.rightLegAngle);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.outlineColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-legWidth / 2, 0, legWidth, legLength, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = p.outlineColor;
    ctx.fillRect(-legWidth / 2 - 3, legLength - 4, legWidth + 6, 8);
    ctx.restore();

    ctx.restore();
  }

  public drawAudience(): void {
    const ctx = this.audienceCtx;
    const w = this.width;
    const h = 60;
    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, 'rgba(30, 18, 10, 0.85)');
    bgGrad.addColorStop(1, 'rgba(20, 12, 6, 0.95)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(80, 50, 30, 0.6)';
    ctx.fillRect(0, 0, w, 8);

    for (const member of this.audience) {
      const dx = member.isBooing ? Math.sin(member.shakePhase) * 2 : 0;

      ctx.save();
      ctx.shadowColor = member.isCheering ? 'rgba(68, 204, 102, 0.6)' : member.isBooing ? 'rgba(204, 68, 68, 0.6)' : 'transparent';
      ctx.shadowBlur = member.isCheering ? 15 : member.isBooing ? 8 : 0;

      ctx.fillStyle = member.currentColor;
      ctx.beginPath();
      ctx.arc(member.x + dx, member.y, member.diameter / 2, Math.PI, 0, false);
      ctx.fill();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(member.x - 8 + dx, member.y - 1, 16, 12);

      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(100, 70, 40, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 12 + i * 10);
      ctx.lineTo(w, 12 + i * 10);
      ctx.stroke();
    }
  }

  public drawSmoke(): void {
    const ctx = this.smokeCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    for (const p of this.smokeParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, 'rgba(150, 150, 150, 0.8)');
      grad.addColorStop(0.5, 'rgba(130, 130, 130, 0.4)');
      grad.addColorStop(1, 'rgba(100, 100, 100, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public draw(): void {
    this.drawSmoke();
    this.drawPuppets();
    this.drawAudience();
  }
}

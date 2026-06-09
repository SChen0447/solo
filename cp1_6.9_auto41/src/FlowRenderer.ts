import type { ParsedSentence } from './TextParser';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetVx: number;
  targetVy: number;
  size: number;
  targetSize: number;
  color: { r: number; g: number; b: number };
  targetColor: { r: number; g: number; b: number };
  alpha: number;
  trail: { x: number; y: number }[];
  trailLength: number;
  angle: number;
}

interface CameraState {
  rotX: number;
  rotY: number;
  zoom: number;
  targetRotX: number;
  targetRotY: number;
  targetZoom: number;
}

type BgmStyle = 'forest' | 'stars' | 'city' | 'ocean';

type SentenceCallback = (index: number) => void;

export class FlowRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private sentences: ParsedSentence[] = [];
  private currentIndex: number = 0;
  private isPlaying: boolean = false;
  private speed: 0.5 | 1 | 2 = 1;
  private animationId: number | null = null;
  private sentenceStartTime: number = 0;
  private sentenceDuration: number = 4000;
  private transitionProgress: number = 1;
  private transitionDuration: number = 500;
  private lastTimestamp: number = 0;
  private fpsHistory: number[] = [];

  private camera: CameraState = {
    rotX: 0, rotY: 0, zoom: 1,
    targetRotX: 0, targetRotY: 0, targetZoom: 1
  };

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private audioContext: AudioContext | null = null;
  private bgmOscillators: OscillatorNode[] = [];
  private bgmGains: GainNode[] = [];
  private currentBgmStyle: BgmStyle = 'forest';

  private onSentenceChange: SentenceCallback | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.initParticles(220);
    this.bindEvents();
  }

  private resize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  };

  private bindEvents(): void {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
  }

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.stopBgm();
    if (this.audioContext) {
      this.audioContext.close();
    }
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.camera.targetRotY += dx * 0.5;
    this.camera.targetRotX += dy * 0.5;
    this.camera.targetRotY = Math.max(-45, Math.min(45, this.camera.targetRotY));
    this.camera.targetRotX = Math.max(-30, Math.min(30, this.camera.targetRotX));
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    this.camera.targetZoom = Math.max(0.8, Math.min(3, this.camera.targetZoom + delta));
  };

  private onDoubleClick = (): void => {
    this.camera.targetRotX = 0;
    this.camera.targetRotY = 0;
    this.camera.targetZoom = 1;
  };

  private touchStartX = 0;
  private touchStartY = 0;

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - this.touchStartX;
    const dy = e.touches[0].clientY - this.touchStartY;
    this.camera.targetRotY += dx * 0.5;
    this.camera.targetRotX += dy * 0.5;
    this.camera.targetRotY = Math.max(-45, Math.min(45, this.camera.targetRotY));
    this.camera.targetRotX = Math.max(-30, Math.min(30, this.camera.targetRotX));
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private initParticles(count: number): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle(0));
    }
  }

  private createParticle(sentiment: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * 1.5;
    const color = this.sentimentToColor(sentiment);
    return {
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetVx: Math.cos(angle) * speed,
      targetVy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      targetSize: 2 + Math.random() * 4,
      color: { ...color },
      targetColor: { ...color },
      alpha: 0.6 + Math.random() * 0.4,
      trail: [],
      trailLength: 5 + Math.floor(Math.random() * 6),
      angle: angle
    };
  }

  private sentimentToColor(sentiment: number): { r: number; g: number; b: number } {
    if (sentiment >= 0) {
      const t = sentiment;
      return {
        r: Math.round(255),
        g: Math.round(180 + t * 40),
        b: Math.round(50 - t * 30)
      };
    } else {
      const t = -sentiment;
      return {
        r: Math.round(60 - t * 30),
        g: Math.round(100 + t * 50),
        b: Math.round(200 + t * 55)
      };
    }
  }

  private lerpColor(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number) {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t)
    };
  }

  setSentences(sentences: ParsedSentence[]): void {
    this.sentences = sentences;
    this.currentIndex = 0;
    if (sentences.length > 0) {
      this.updateParticleTargets(sentences[0].sentiment);
      this.chooseBgmStyle();
    }
  }

  private updateParticleTargets(sentiment: number): void {
    for (const p of this.particles) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      p.targetVx = Math.cos(angle) * speed;
      p.targetVy = Math.sin(angle) * speed;
      p.targetSize = 2 + Math.random() * 4;
      p.targetColor = this.sentimentToColor(sentiment + (Math.random() - 0.5) * 0.3);
    }
    this.transitionProgress = 0;
  }

  setOnSentenceChange(callback: SentenceCallback): void {
    this.onSentenceChange = callback;
  }

  play(): void {
    if (this.sentences.length === 0) return;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
    this.sentenceStartTime = performance.now();
    this.startBgm();
    if (!this.animationId) {
      this.lastTimestamp = performance.now();
      this.loop(this.lastTimestamp);
    }
  }

  pause(): void {
    this.isPlaying = false;
  }

  togglePlay(): boolean {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  next(): void {
    if (this.currentIndex < this.sentences.length - 1) {
      this.goTo(this.currentIndex + 1);
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.goTo(this.currentIndex - 1);
    }
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.sentences.length) return;
    this.currentIndex = index;
    this.sentenceStartTime = performance.now();
    this.updateParticleTargets(this.sentences[index].sentiment);
    this.playTransitionSound();
    if (this.onSentenceChange) {
      this.onSentenceChange(index);
    }
  }

  setSpeed(speed: 0.5 | 1 | 2): void {
    this.speed = speed;
    this.sentenceDuration = 4000 / speed;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getTotalSentences(): number {
    return this.sentences.length;
  }

  isPlayingState(): boolean {
    return this.isPlaying;
  }

  stop(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (timestamp: number): void => {
    const dt = Math.min(50, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    this.fpsHistory.push(1000 / dt);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();

    this.updateCamera();
    this.updateTransitions(dt);
    this.updateParticles(dt);

    if (this.isPlaying) {
      const elapsed = timestamp - this.sentenceStartTime;
      if (elapsed >= this.sentenceDuration) {
        if (this.currentIndex < this.sentences.length - 1) {
          this.next();
        } else {
          this.pause();
        }
      }
    }

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private updateCamera(): void {
    this.camera.rotX += (this.camera.targetRotX - this.camera.rotX) * 0.1;
    this.camera.rotY += (this.camera.targetRotY - this.camera.rotY) * 0.1;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * 0.1;
  }

  private updateTransitions(dt: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / this.transitionDuration);
    }
  }

  private updateParticles(dt: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxDist = Math.max(rect.width, rect.height) * 0.6;
    const t = this.transitionProgress;

    for (const p of this.particles) {
      p.vx += (p.targetVx - p.vx) * 0.05 * t;
      p.vy += (p.targetVy - p.vy) * 0.05 * t;
      p.size += (p.targetSize - p.size) * 0.05 * t;
      const newColor = this.lerpColor(p.color, p.targetColor, 0.05 * t);
      p.color.r = newColor.r;
      p.color.g = newColor.g;
      p.color.b = newColor.b;

      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > p.trailLength) {
        p.trail.pop();
      }

      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      const distFromCenter = Math.sqrt((p.x - centerX + centerX) ** 2 + (p.y - centerY + centerY) ** 2);
      const absDist = Math.sqrt(p.x * p.x + p.y * p.y);
      if (absDist > maxDist) {
        const resetAngle = Math.random() * Math.PI * 2;
        const resetSpeed = 0.5 + Math.random() * 1.5;
        p.x = (Math.random() - 0.5) * 40;
        p.y = (Math.random() - 0.5) * 40;
        p.targetVx = Math.cos(resetAngle) * resetSpeed;
        p.targetVy = Math.sin(resetAngle) * resetSpeed;
        p.trail = [];
      }
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    this.ctx.fillStyle = 'rgba(11, 14, 26, 0.25)';
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    const radX = (this.camera.rotX * Math.PI) / 180;
    const radY = (this.camera.rotY * Math.PI) / 180;

    for (const p of this.particles) {
      for (let i = 0; i < p.trail.length; i++) {
        const tp = p.trail[i];
        const { x: sx, y: sy } = this.rotate3D(tp.x, tp.y, 0, radX, radY);
        const alpha = p.alpha * (1 - i / p.trail.length) * 0.4;
        this.ctx.fillStyle = `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, p.size * (1 - i / p.trail.length) * 0.7, 0, Math.PI * 2);
        this.ctx.fill();
      }

      const { x: px, y: py } = this.rotate3D(p.x, p.y, 0, radX, radY);
      const gradient = this.ctx.createRadialGradient(px, py, 0, px, py, p.size * 2);
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`);
      gradient.addColorStop(0.5, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(px, py, p.size * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private rotate3D(x: number, y: number, z: number, radX: number, radY: number): { x: number; y: number } {
    let x1 = x * Math.cos(radY) - z * Math.sin(radY);
    let z1 = x * Math.sin(radY) + z * Math.cos(radY);
    let y1 = y * Math.cos(radX) - z1 * Math.sin(radX);
    let z2 = y * Math.sin(radX) + z1 * Math.cos(radX);
    const perspective = 800;
    const scale = perspective / (perspective + z2);
    return { x: x1 * scale, y: y1 * scale };
  }

  private initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  private chooseBgmStyle(): void {
    const avg = this.sentences.reduce((s, x) => s + x.sentiment, 0) / Math.max(1, this.sentences.length);
    if (avg > 0.3) this.currentBgmStyle = 'forest';
    else if (avg > 0) this.currentBgmStyle = 'stars';
    else if (avg > -0.3) this.currentBgmStyle = 'city';
    else this.currentBgmStyle = 'ocean';
  }

  private startBgm(): void {
    if (!this.audioContext) return;
    this.stopBgm();

    const ctx = this.audioContext;
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.04;
    masterGain.connect(ctx.destination);

    const freqs = this.getBgmFrequencies(this.currentBgmStyle);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(0.3 / (i + 1), ctx.currentTime + 1.5);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.1 + i * 0.07;
      lfoGain.gain.value = freq * 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start();
      lfo.start();
      this.bgmOscillators.push(osc, lfo);
      this.bgmGains.push(gain, lfoGain);
    });
  }

  private getBgmFrequencies(style: BgmStyle): number[] {
    switch (style) {
      case 'forest': return [261.63, 329.63, 392.0, 523.25];
      case 'stars': return [293.66, 349.23, 440.0, 587.33];
      case 'city': return [220.0, 277.18, 329.63, 440.0];
      case 'ocean': return [196.0, 246.94, 293.66, 392.0];
    }
  }

  private stopBgm(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    this.bgmGains.forEach(g => {
      try { g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); } catch (_) {}
    });
    setTimeout(() => {
      this.bgmOscillators.forEach(o => { try { o.stop(); } catch (_) {} });
      this.bgmOscillators = [];
      this.bgmGains = [];
    }, 350);
  }

  private playTransitionSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.22);
  }

  playKeyframeSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  }

  getAverageFps(): number {
    if (this.fpsHistory.length === 0) return 60;
    return this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
  }

  startRenderLoop(): void {
    if (!this.animationId) {
      this.lastTimestamp = performance.now();
      this.loop(this.lastTimestamp);
    }
  }
}

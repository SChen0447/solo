import { RecordPlayer } from './record';
import { RippleManager } from './wave';
import { FlowerManager } from './flower';
import { UIManager } from './ui';

const DEFAULT_BPM = 120;
const BEAT_INTERVAL = 60000 / DEFAULT_BPM;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  private record: RecordPlayer;
  private ripples: RippleManager;
  private flowers: FlowerManager;
  private ui: UIManager;

  private audioCtx: AudioContext | null = null;
  private isAudioInitialized: boolean = false;
  private nextBeatTime: number = 0;
  private beatCount: number = 0;
  private lastFrameTime: number = 0;
  private isPlaying: boolean = false;

  private activeHit: { type: string; index: number } | null = null;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;

    this.record = new RecordPlayer(0, 0, 200);
    this.ripples = new RippleManager();
    this.flowers = new FlowerManager();
    this.ui = new UIManager();

    this.setupCanvas();
    this.setupCallbacks();
    this.setupEvents();

    document.body.classList.add('loaded');

    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private setupCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * this.dpr;
    this.canvas.height = h * this.dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.updateLayout(w, h);
  }

  private updateLayout(w: number, h: number) {
    const isMobile = w < 768;
    const scale = isMobile
      ? Math.min((w - 40) / 400, (h * 0.5) / 400, 1)
      : Math.min((w * 0.5) / 400, (h - 80) / 400, 1.2);

    const recordRadius = 200 * scale;
    const cx = isMobile ? w / 2 : w * 0.38;
    const cy = isMobile ? h * 0.38 : h / 2;

    this.record.reposition(cx, cy, recordRadius);
    this.ui.layout(w, h, cx, cy, recordRadius, isMobile);
  }

  private setupCallbacks() {
    this.ui.setCallbacks(
      () => this.togglePlay(),
      (v) => this.ripples.setSpeedMultiplier(v),
      (v) => this.flowers.setDensity(v)
    );
  }

  private async initAudio() {
    if (this.isAudioInitialized) return;
    this.audioCtx = new AudioContext();
    this.isAudioInitialized = true;
  }

  private togglePlay() {
    this.initAudio();
    this.isPlaying = !this.isPlaying;
    this.record.setPlaying(this.isPlaying);
    this.ui.setPlayState(this.isPlaying);

    if (this.isPlaying) {
      this.nextBeatTime = performance.now();
      this.playClickSound();
    }
  }

  private playClickSound() {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.02, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    noise.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.1, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noise.connect(ng);
    ng.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.02);
  }

  private playBeatSound(isKick: boolean) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (isKick) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else {
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      noise.buffer = buf;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.05);
    }
  }

  private checkBeat(now: number) {
    if (!this.isPlaying) return;

    while (this.nextBeatTime <= now) {
      this.nextBeatTime += BEAT_INTERVAL;
      this.beatCount++;

      const scratchFactor = this.record.getScratchFactor();
      if (Math.abs(scratchFactor) < 0.5) {
        this.ripples.addRipple(this.record.radius);
      }

      this.playBeatSound(this.beatCount % 2 === 0);
    }
  }

  private setupEvents() {
    const getPos = (e: MouseEvent | Touch) => ({
      x: e.clientX,
      y: e.clientY
    });

    const onDown = (x: number, y: number) => {
      if (this.record.hitTestTonearm(x, y)) {
        this.record.startDrag(x, y);
        this.activeHit = { type: 'tonearm', index: 0 };
        return;
      }

      const hit = this.ui.hitTest(x, y);
      if (hit) {
        this.activeHit = hit;
        if (hit.type === 'switch') {
          this.ui.handleSwitchClick();
        } else if (hit.type === 'slider') {
          this.ui.startSliderDrag(hit.index, x);
        }
      }
    };

    const onMove = (x: number, y: number) => {
      if (!this.activeHit) return;

      if (this.activeHit.type === 'tonearm') {
        this.record.moveDrag(x, y);
      } else if (this.activeHit.type === 'slider') {
        this.ui.moveSliderDrag(this.activeHit.index, x);
      }
    };

    const onUp = () => {
      if (this.activeHit?.type === 'tonearm') {
        this.record.endDrag();
      } else if (this.activeHit?.type === 'slider') {
        this.ui.endSliderDrag(this.activeHit.index);
      }
      this.activeHit = null;
    };

    this.canvas.addEventListener('mousedown', (e) => {
      const p = getPos(e);
      onDown(p.x, p.y);
    });

    window.addEventListener('mousemove', (e) => {
      const p = getPos(e);
      onMove(p.x, p.y);
    });

    window.addEventListener('mouseup', () => {
      onUp();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      onDown(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      onUp();
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.setupCanvas();
    });
  }

  private loop = (timestamp: number) => {
    const dt = Math.min(timestamp - this.lastFrameTime, 50);
    this.lastFrameTime = timestamp;

    this.checkBeat(timestamp);

    this.record.update(dt);
    this.ripples.update(dt);
    this.flowers.update(dt);
    if (this.isPlaying) {
      this.flowers.trySpawn(dt, this.record.cx, this.record.cy, this.record.radius);
    }
    this.ui.update(dt);

    this.render();

    requestAnimationFrame(this.loop);
  };

  private render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    this.record.draw(ctx);

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.record.cx, this.record.cy, this.record.radius, 0, Math.PI * 2);
    ctx.clip();

    this.ripples.draw(ctx, this.record.cx, this.record.cy);
    this.flowers.draw(ctx);

    ctx.restore();

    this.ui.draw(ctx);
  }
}

new App();

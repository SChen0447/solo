import { LineAnimator, type Particle, type AnimatorState } from './LineAnimator';
import { Renderer } from './Renderer';

const EXPLOSION_DURATION = 0.5;

interface UIControls {
  playBtn: HTMLButtonElement;
  ampSlider: HTMLInputElement;
  freqSlider: HTMLInputElement;
  hueSlider: HTMLInputElement;
  ampValue: HTMLSpanElement;
  freqValue: HTMLSpanElement;
  hueValue: HTMLSpanElement;
  appContainer: HTMLElement;
}

export class AppManager {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private animator: LineAnimator;
  private controls: UIControls;
  private state: AnimatorState;
  private particles: Particle[] = [];
  private rafId: number | null = null;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement, controls: UIControls) {
    this.canvas = canvas;
    this.controls = controls;
    this.renderer = new Renderer(canvas);
    this.animator = new LineAnimator();

    this.state = {
      isPlaying: false,
      amplitude: parseFloat(controls.ampSlider.value),
      frequency: parseFloat(controls.freqSlider.value),
      colorCycle: parseFloat(controls.hueSlider.value),
      time: 0,
      deltaTime: 0,
      explosionProgress: 0,
      isExploding: false,
    };

    this.bindEvents();
    this.handleResize();
  }

  private bindEvents(): void {
    this.controls.playBtn.addEventListener('click', this.togglePlay.bind(this));

    this.controls.ampSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.state.amplitude = val;
      this.controls.ampValue.textContent = String(Math.round(val));
    });

    this.controls.freqSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.state.frequency = val;
      this.controls.freqValue.textContent = val.toFixed(2);
    });

    this.controls.hueSlider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      this.state.colorCycle = val;
      this.controls.hueValue.textContent = val.toFixed(1);
    });

    this.controls.appContainer.addEventListener('click', this.handleCanvasClick.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleCanvasClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    if (
      target === this.controls.playBtn ||
      target.closest('#controls') ||
      target.closest('#playBtn')
    ) {
      return;
    }
    this.triggerExplosion();
  }

  private triggerExplosion(): void {
    this.state.isExploding = true;
    this.state.explosionProgress = 0;
    this.animator.triggerExplosion();
    this.particles = this.animator.createParticles(
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    this.renderer.clearTrail();
  }

  private handleResize(): void {
    this.renderer.resize();
  }

  private togglePlay(): void {
    this.state.isPlaying = !this.state.isPlaying;
    if (this.state.isPlaying) {
      this.controls.playBtn.classList.add('playing');
      this.controls.playBtn.setAttribute('aria-label', '暂停');
    } else {
      this.controls.playBtn.classList.remove('playing');
      this.controls.playBtn.setAttribute('aria-label', '播放');
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.state.deltaTime = dt;

    if (this.state.isPlaying) {
      this.state.time += dt;
    }

    if (this.state.isExploding) {
      this.state.explosionProgress += dt / EXPLOSION_DURATION;
      if (this.state.explosionProgress >= 1) {
        this.state.isExploding = false;
        this.state.explosionProgress = 0;
        this.animator.reset();
      }
    }

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.animator.update(this.state, w, h);
    this.particles = this.animator.updateParticles(this.particles, dt);
    const frames = this.animator.generateFrames(this.state, w, h);

    if (this.state.isPlaying || this.state.isExploding) {
      this.renderer.pushToTrail(frames);
    }

    this.renderer.render(frames, this.particles);

    this.rafId = requestAnimationFrame(this.loop);
  };
}

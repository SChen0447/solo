import { RadioUI } from './RadioUI';
import { ParticleSystem } from './ParticleSystem';
import { CardManager } from './CardManager';
import type { RadioState } from './types';

const CANVAS_ASPECT_RATIO = 4 / 3;
const MIN_CANVAS_WIDTH = 640;
const MIN_CANVAS_HEIGHT = 480;
const KNOB_MIN_ANGLE = 0;
const KNOB_MAX_ANGLE = 270;
const FREQ_MIN = 88;
const FREQ_MAX = 108;
const FREQ_SNAP_THRESHOLD = 1.0;
const KNOB_EASE_SPEED = 0.15;

const SNAP_FREQUENCIES = [88, 92, 96, 100, 104, 108];

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private radioUI: RadioUI;
  private particleSystem: ParticleSystem;
  private cardManager: CardManager;

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private dpr: number = 1;

  private radioState: RadioState = {
    knobAngle: 45,
    targetKnobAngle: 45,
    frequency: 93.2,
    isDragging: false,
  };

  private lastTime: number = 0;
  private lastFrequency: number = 93.2;
  private isPlaying: boolean = false;
  private dragStartAngle: number = 0;
  private dragStartKnobAngle: number = 0;
  private frequencyChanged: boolean = false;
  private lastFreqChangeTime: number = 0;

  constructor() {
    this.canvas = document.getElementById('radio-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to get 2D context');
    }
    this.ctx = ctx;

    this.radioUI = new RadioUI(this.ctx);
    this.particleSystem = new ParticleSystem(this.ctx);
    this.cardManager = new CardManager(this.ctx);

    this.setupCanvas();
    this.bindEvents();
    this.updateFrequencyFromAngle(this.radioState.knobAngle);
    this.lastFrequency = this.radioState.frequency;
    this.isPlaying = true;

    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  private setupCanvas(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    let targetWidth = containerWidth;
    let targetHeight = targetWidth / CANVAS_ASPECT_RATIO;

    if (targetHeight > containerHeight) {
      targetHeight = containerHeight;
      targetWidth = targetHeight * CANVAS_ASPECT_RATIO;
    }

    targetWidth = Math.max(MIN_CANVAS_WIDTH, targetWidth);
    targetHeight = Math.max(MIN_CANVAS_HEIGHT, targetHeight);

    if (targetWidth > containerWidth) {
      targetWidth = containerWidth;
      targetHeight = targetWidth / CANVAS_ASPECT_RATIO;
    }
    if (targetHeight > containerHeight) {
      targetHeight = containerHeight;
      targetWidth = targetHeight * CANVAS_ASPECT_RATIO;
    }

    this.canvasWidth = targetWidth;
    this.canvasHeight = targetHeight;

    this.canvas.style.width = `${targetWidth}px`;
    this.canvas.style.height = `${targetHeight}px`;

    this.canvas.width = Math.floor(targetWidth * this.dpr);
    this.canvas.height = Math.floor(targetHeight * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.radioUI.resize(targetWidth, targetHeight);
    this.cardManager.resize(targetWidth, targetHeight, this.radioUI.getScale());
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handlePointerDown);
    this.canvas.addEventListener('mousemove', this.handlePointerMove);
    this.canvas.addEventListener('mouseup', this.handlePointerUp);
    this.canvas.addEventListener('mouseleave', this.handlePointerUp);

    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvasWidth / rect.width),
      y: (clientY - rect.top) * (this.canvasHeight / rect.height),
    };
  }

  private handlePointerDown = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    if (this.cardManager.handleClick(x, y, performance.now())) {
      return;
    }

    this.cardManager.handleAlbumMouseDown(x, y);

    if (this.radioUI.hitTestKnob(x, y)) {
      this.radioState.isDragging = true;
      this.dragStartAngle = this.radioUI.angleFromPointer(x, y);
      this.dragStartKnobAngle = this.radioState.targetKnobAngle;
      this.frequencyChanged = false;
    }
  };

  private handlePointerMove = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    this.cardManager.handleAlbumMouseMove(x);

    if (!this.radioState.isDragging) return;

    const currentAngle = this.radioUI.angleFromPointer(x, y);
    let angleDelta = currentAngle - this.dragStartAngle;

    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    let newAngle = this.dragStartKnobAngle + angleDelta;
    newAngle = Math.max(KNOB_MIN_ANGLE, Math.min(KNOB_MAX_ANGLE, newAngle));

    this.radioState.targetKnobAngle = newAngle;
    this.updateFrequencyFromAngle(newAngle);

    const freqDiff = Math.abs(this.radioState.frequency - this.lastFrequency);
    if (freqDiff > 0.5) {
      this.frequencyChanged = true;
      this.lastFrequency = this.radioState.frequency;
    }
  };

  private handlePointerUp = (): void => {
    this.cardManager.handleAlbumMouseUp();

    if (!this.radioState.isDragging) return;
    this.radioState.isDragging = false;

    this.snapToNearestFrequency();

    if (this.frequencyChanged) {
      this.triggerFrequencyEffects();
      this.frequencyChanged = false;
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);

    if (this.cardManager.handleClick(x, y, performance.now())) {
      return;
    }

    this.cardManager.handleAlbumMouseDown(x, y);

    if (this.radioUI.hitTestKnob(x, y)) {
      this.radioState.isDragging = true;
      this.dragStartAngle = this.radioUI.angleFromPointer(x, y);
      this.dragStartKnobAngle = this.radioState.targetKnobAngle;
      this.frequencyChanged = false;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);

    this.cardManager.handleAlbumMouseMove(x);

    if (!this.radioState.isDragging) return;

    const currentAngle = this.radioUI.angleFromPointer(x, y);
    let angleDelta = currentAngle - this.dragStartAngle;

    if (angleDelta > 180) angleDelta -= 360;
    if (angleDelta < -180) angleDelta += 360;

    let newAngle = this.dragStartKnobAngle + angleDelta;
    newAngle = Math.max(KNOB_MIN_ANGLE, Math.min(KNOB_MAX_ANGLE, newAngle));

    this.radioState.targetKnobAngle = newAngle;
    this.updateFrequencyFromAngle(newAngle);

    const freqDiff = Math.abs(this.radioState.frequency - this.lastFrequency);
    if (freqDiff > 0.5) {
      this.frequencyChanged = true;
      this.lastFrequency = this.radioState.frequency;
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    e.preventDefault();
    this.cardManager.handleAlbumMouseUp();

    if (!this.radioState.isDragging) return;
    this.radioState.isDragging = false;

    this.snapToNearestFrequency();

    if (this.frequencyChanged) {
      this.triggerFrequencyEffects();
      this.frequencyChanged = false;
    }
  };

  private updateFrequencyFromAngle(angle: number): void {
    const t = (angle - KNOB_MIN_ANGLE) / (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
    this.radioState.frequency = FREQ_MIN + t * (FREQ_MAX - FREQ_MIN);
  }

  private updateAngleFromFrequency(freq: number): void {
    const t = (freq - FREQ_MIN) / (FREQ_MAX - FREQ_MIN);
    this.radioState.targetKnobAngle = KNOB_MIN_ANGLE + t * (KNOB_MAX_ANGLE - KNOB_MIN_ANGLE);
  }

  private snapToNearestFrequency(): void {
    let nearestFreq = this.radioState.frequency;
    let minDiff = Infinity;

    for (const freq of SNAP_FREQUENCIES) {
      const diff = Math.abs(freq - this.radioState.frequency);
      if (diff < minDiff) {
        minDiff = diff;
        nearestFreq = freq;
      }
    }

    if (minDiff <= FREQ_SNAP_THRESHOLD) {
      this.radioState.frequency = nearestFreq;
      this.updateAngleFromFrequency(nearestFreq);
    }
  }

  private triggerFrequencyEffects(): void {
    this.particleSystem.burst(this.radioUI.getKnobCenter(), this.radioUI.getScale());
    this.cardManager.resetBurstCounter();
    this.lastFreqChangeTime = performance.now();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private update(deltaTime: number, time: number): void {
    if (!this.radioState.isDragging) {
      const angleDiff = this.radioState.targetKnobAngle - this.radioState.knobAngle;
      this.radioState.knobAngle += angleDiff * KNOB_EASE_SPEED;
    } else {
      this.radioState.knobAngle = this.radioState.targetKnobAngle;
    }

    this.radioUI.update(deltaTime, time, this.isPlaying);
    this.particleSystem.update(deltaTime);
    this.cardManager.update(deltaTime, time);

    this.cardManager.tryDropCard(
      time,
      this.particleSystem.getActiveParticles(),
      this.radioUI.getScale()
    );
  }

  private drawBackground(time: number): void {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h) * 0.8);
    bgGrad.addColorStop(0, '#2c3e50');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    const vignetteGrad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
    vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vignetteGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.globalAlpha = 0.02 + 0.01 * Math.sin(time / 2000);
    for (let i = 0; i < 50; i++) {
      const x = (i * 97 + time * 0.01) % w;
      const y = (i * 73) % h;
      const r = 1 + (i % 3);
      ctx.fillStyle = '#f5deb3';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private render(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawBackground(time);
    this.particleSystem.render();
    this.radioUI.render(this.radioState, time);
    this.cardManager.render();
  }

  private loop = (timestamp: number): void => {
    const deltaTime = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update(deltaTime, timestamp);
    this.render(timestamp);

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (err) {
    console.error('Failed to initialize app:', err);
  }
});

import { computeDayCycle, formatTime, type DayCycleParams, type DayCycleResult } from './dayCycle';
import { renderScene, CANVAS_WIDTH, CANVAS_HEIGHT } from './rendering';
import { Controls, type ControlState } from './controls';

interface AppState {
  time: number;
  speed: number;
  ambientIntensity: number;
  isPlaying: boolean;
}

class DayCycleApp {
  private appRoot: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private controls!: Controls;
  private state: AppState;
  private lastTimestamp: number = 0;
  private rafId: number = 0;
  private animating: boolean = false;
  private presetAnimation: {
    active: boolean;
    startTime: number;
    duration: number;
    fromTime: number;
    toTime: number;
  } | null = null;

  constructor() {
    this.appRoot = document.getElementById('app')!;
    this.state = {
      time: 8,
      speed: 1,
      ambientIntensity: 1.0,
      isPlaying: false,
    };
    this.initLayout();
    this.initCanvas();
    this.initControls();
    this.startRenderLoop();
  }

  private initLayout(): void {
    this.appRoot.innerHTML = `
      <div class="app-container">
        <div class="canvas-wrapper">
          <canvas id="sceneCanvas" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}"></canvas>
        </div>
        <div class="controls-wrapper" id="controlsContainer"></div>
      </div>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
          width: 100%;
          min-height: 100vh;
          background: #0a0a1a;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          color: #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .app-container {
          width: 1100px;
          display: flex;
          gap: 20px;
          padding: 20px;
          align-items: flex-start;
        }

        .canvas-wrapper {
          flex: 0 0 65%;
          max-width: ${CANVAS_WIDTH + 8}px;
          padding: 4px;
          background: #111122;
          border: 2px solid #333;
          border-radius: 8px;
          box-shadow:
            inset 0 2px 8px rgba(0, 0, 0, 0.6),
            0 4px 20px rgba(0, 0, 0, 0.5);
        }

        #sceneCanvas {
          display: block;
          width: 100%;
          height: auto;
          image-rendering: pixelated;
          image-rendering: crisp-edges;
          border-radius: 4px;
        }

        .controls-wrapper {
          flex: 0 0 calc(35% - 20px);
          display: flex;
          justify-content: center;
        }
      </style>
    `;
  }

  private initCanvas(): void {
    this.canvas = this.appRoot.querySelector('#sceneCanvas') as HTMLCanvasElement;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  private initControls(): void {
    const container = this.appRoot.querySelector('#controlsContainer') as HTMLElement;
    const initialState: ControlState = {
      time: this.state.time,
      speed: this.state.speed,
      ambientIntensity: this.state.ambientIntensity,
      isPlaying: this.state.isPlaying,
    };
    this.controls = new Controls(container, initialState);

    this.controls.subscribe('timeChange', ((val: number) => {
      this.state.time = val;
    }) as (v: number | boolean | ControlState) => void);

    this.controls.subscribe('speedChange', ((val: number) => {
      this.state.speed = val;
    }) as (v: number | boolean | ControlState) => void);

    this.controls.subscribe('ambientChange', ((val: number) => {
      this.state.ambientIntensity = val;
    }) as (v: number | boolean | ControlState) => void);

    this.controls.subscribe('playToggle', ((val: boolean) => {
      this.state.isPlaying = val;
    }) as (v: number | boolean | ControlState) => void);

    this.controls.subscribe('presetJump', ((val: number) => {
      this.startPresetAnimation(val);
    }) as (v: number | boolean | ControlState) => void);

    this.controls.subscribe('saveScreenshot', (() => {
      this.saveScreenshot();
    }) as (v: number | boolean | ControlState) => void);
  }

  private startPresetAnimation(targetTime: number): void {
    let fromTime = this.state.time;
    let toTime = targetTime;
    const directDiff = Math.abs(toTime - fromTime);
    const wrapDiff = 24 - directDiff;
    if (wrapDiff < directDiff) {
      if (fromTime < toTime) {
        fromTime += 24;
      } else {
        toTime += 24;
      }
    }
    this.presetAnimation = {
      active: true,
      startTime: performance.now(),
      duration: 800,
      fromTime,
      toTime,
    };
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private updatePresetAnimation(now: number): void {
    if (!this.presetAnimation || !this.presetAnimation.active) return;
    const elapsed = now - this.presetAnimation.startTime;
    const progress = Math.min(1, elapsed / this.presetAnimation.duration);
    const eased = this.easeInOut(progress);
    let currentTime = this.presetAnimation.fromTime + (this.presetAnimation.toTime - this.presetAnimation.fromTime) * eased;
    currentTime = ((currentTime % 24) + 24) % 24;
    this.state.time = currentTime;
    this.controls.setTime(currentTime, false);
    if (progress >= 1) {
      this.presetAnimation = null;
    }
  }

  private updateTime(deltaMs: number): void {
    if (this.presetAnimation?.active) return;
    if (!this.state.isPlaying) return;
    const hoursPerSecond = this.state.speed * 0.5;
    const deltaHours = (deltaMs / 1000) * hoursPerSecond;
    let newTime = this.state.time + deltaHours;
    newTime = ((newTime % 24) + 24) % 24;
    this.state.time = newTime;
    this.controls.setTime(newTime, false);
  }

  private getCycleResult(): DayCycleResult {
    const params: DayCycleParams = {
      time: this.state.time,
      ambientIntensity: this.state.ambientIntensity,
    };
    return computeDayCycle(params);
  }

  private render(): void {
    const cycle = this.getCycleResult();
    renderScene(this.ctx, cycle);
  }

  private startRenderLoop(): void {
    this.animating = true;
    this.lastTimestamp = performance.now();
    const loop = (now: number) => {
      if (!this.animating) return;
      const delta = Math.min(now - this.lastTimestamp, 50);
      this.lastTimestamp = now;
      this.updatePresetAnimation(now);
      this.updateTime(delta);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private saveScreenshot(): void {
    const dataUrl = this.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `daycycle_${formatTime(this.state.time).replace(':', '-')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  public destroy(): void {
    this.animating = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DayCycleApp();
});

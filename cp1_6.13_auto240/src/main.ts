import { gsap, Power2 } from 'gsap';
import { Renderer, RendererState } from './renderer';
import { InteractionManager, InteractionData } from './interaction';

class App {
  private renderer: Renderer;
  private interaction: InteractionManager;
  private lastTime: number = 0;
  private rafId: number = 0;
  private isRunning: boolean = false;
  private releaseAngle: number = -Math.PI / 2;
  private releaseVelocity: number = 0;
  private particleEmitTimer: number = 0;
  private tweenTarget: { angle: number } = { angle: -Math.PI / 2 };
  private activeTween: gsap.core.Tween | null = null;

  constructor() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('未找到 canvas 元素');

    this.renderer = new Renderer(canvas);

    this.interaction = new InteractionManager(
      canvas,
      () => this.renderer.getCenter(),
      () => this.renderer.getDialRadius(),
      (data) => this.onInteraction(data)
    );

    this.bindResize();
    this.start();
  }

  private bindResize(): void {
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        this.renderer.resize();
      }, 100);
    });
  }

  private onInteraction(data: InteractionData): void {
    const state: Partial<RendererState> = {
      pointerAngle: data.pointerAngle,
      pointerAngularVelocity: data.angularVelocity,
      isDragging: data.isDragging,
      isHovering: data.isHovering
    };

    if (data.isDragging) {
      if (this.activeTween) {
        this.activeTween.kill();
        this.activeTween = null;
      }
      this.renderer.setState(state);
    } else {
      this.releaseAngle = data.pointerAngle;
      this.releaseVelocity = data.angularVelocity;
      this.renderer.setState(state);
      this.startReleaseTween();
    }

    this.renderer.setState(state);
  }

  private startReleaseTween(): void {
    if (this.activeTween) {
      this.activeTween.kill();
    }
    this.tweenTarget.angle = this.releaseAngle;
    const inertiaDecay = Math.min(Math.abs(this.releaseVelocity) * 0.08, 0.4);
    const endAngle = this.releaseAngle + (this.releaseVelocity > 0 ? inertiaDecay : -inertiaDecay);

    this.activeTween = gsap.to(this.tweenTarget, {
      angle: endAngle,
      duration: 0.5,
      ease: Power2.easeOut,
      onUpdate: () => {
        const currentAngle = this.interaction.getAngle();
        let delta = this.tweenTarget.angle - currentAngle;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        const newAngle = currentAngle + delta;
        this.interaction.setAngle(newAngle);
        this.renderer.setState({ pointerAngle: newAngle, pointerAngularVelocity: delta * 60 });
        this.particleEmitTimer = 0;
      },
      onComplete: () => {
        this.renderer.setState({ pointerAngularVelocity: 0 });
        this.interaction.setAngle(endAngle);
        this.activeTween = null;
      }
    });
  }

  private start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  private stop(): void {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    let dt = (now - this.lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    this.lastTime = now;

    const state = this.renderer.getState();
    const coreSpeed = state.pointerAngularVelocity / 3;
    const newCoreRot = state.coreRotation + coreSpeed * dt;
    this.renderer.setState({ coreRotation: newCoreRot });

    this.particleEmitTimer += dt;
    const absV = Math.abs(state.pointerAngularVelocity);
    const isTweening = this.activeTween !== null;

    if (state.isDragging || isTweening) {
      const emitInterval = 1 / 60;
      while (this.particleEmitTimer >= emitInterval) {
        this.particleEmitTimer -= emitInterval;
        const v = state.isDragging ? absV : Math.max(absV, 0.5);
        this.renderer.spawnParticles(v);
      }
    } else {
      this.particleEmitTimer = 0;
    }

    this.renderer.render(dt);

    this.rafId = requestAnimationFrame(this.loop);
  };

  public destroy(): void {
    this.stop();
    this.interaction.destroy();
    if (this.activeTween) {
      this.activeTween.kill();
    }
  }
}

function bootstrap(): void {
  try {
    new App();
  } catch (err) {
    console.error('应用初始化失败:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

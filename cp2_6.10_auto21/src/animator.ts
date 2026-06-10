import type { AnimationConfig } from './presets';

const keyframesMap: Record<string, string> = {
  fadeIn: `@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  fadeOut: `@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  slideInLeft: `@keyframes slideInLeft {
  from { transform: translateX(-100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
  slideInRight: `@keyframes slideInRight {
  from { transform: translateX(100px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}`,
  slideInUp: `@keyframes slideInUp {
  from { transform: translateY(100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  slideInDown: `@keyframes slideInDown {
  from { transform: translateY(-100px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}`,
  bounce: `@keyframes bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-40px); }
  60% { transform: translateY(-20px); }
}`,
  rotate: `@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}`,
  scale: `@keyframes scale {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}`,
  shake: `@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}`,
  pulse: `@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}`,
  heartbeat: `@keyframes heartbeat {
  0% { transform: scale(1); }
  14% { transform: scale(1.15); }
  28% { transform: scale(1); }
  42% { transform: scale(1.15); }
  70% { transform: scale(1); }
}`,
  float: `@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-25px); }
  100% { transform: translateY(0); }
}`,
  gradientShift: `@keyframes gradientShift {
  0% { 
    background-position: 0% 50%;
    transform: translateX(0);
  }
  50% { 
    background-position: 100% 50%;
    transform: translateX(30px);
  }
  100% { 
    background-position: 0% 50%;
    transform: translateX(0);
  }
}`
};

export class Animator {
  private targetElement: HTMLElement | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private config: AnimationConfig;
  private speed: number = 1;
  private isPlaying: boolean = false;
  private animationName: string = '';

  constructor(targetElement: HTMLElement, initialConfig: AnimationConfig) {
    this.targetElement = targetElement;
    this.config = { ...initialConfig };
    this.setupStyleElement();
  }

  private setupStyleElement(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'dynamic-animation-styles';
    document.head.appendChild(this.styleElement);
  }

  updateConfig(newConfig: Partial<AnimationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.applyAnimation();
  }

  getConfig(): AnimationConfig {
    return { ...this.config };
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.isPlaying) {
      this.applyAnimation();
    }
  }

  getSpeed(): number {
    return this.speed;
  }

  start(): void {
    this.isPlaying = true;
    this.applyAnimation();
  }

  stop(): void {
    this.isPlaying = false;
    if (this.targetElement) {
      this.targetElement.style.animationPlayState = 'paused';
    }
  }

  reset(): void {
    if (this.targetElement) {
      this.targetElement.style.animation = 'none';
      this.targetElement.offsetHeight;
      if (this.isPlaying) {
        this.applyAnimation();
      }
    }
  }

  private applyAnimation(): void {
    if (!this.targetElement || !this.styleElement) return;

    this.animationName = this.config.type;
    const keyframesCSS = this.getKeyframesCSS();
    this.styleElement.textContent = keyframesCSS;

    const adjustedDuration = this.config.duration / this.speed;
    const adjustedDelay = this.config.delay / this.speed;

    this.targetElement.style.animation = [
      this.animationName,
      `${adjustedDuration}s`,
      this.config.easing,
      `${adjustedDelay}s`,
      this.config.iterationCount,
      this.config.direction,
      this.config.fillMode
    ].join(' ');

    this.targetElement.style.animationPlayState = this.isPlaying ? 'running' : 'paused';
  }

  getKeyframesCSS(): string {
    return keyframesMap[this.config.type] || keyframesMap.fadeIn;
  }

  getAnimationCSS(): string {
    return `.animated-element {
  animation: ${this.config.type} ${this.config.duration}s ${this.config.easing} ${this.config.delay}s ${this.config.iterationCount} ${this.config.direction} ${this.config.fillMode};
}`;
  }

  getFullCSS(): string {
    return `${this.getKeyframesCSS()}\n\n${this.getAnimationCSS()}`;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  destroy(): void {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
    if (this.targetElement) {
      this.targetElement.style.animation = 'none';
      this.targetElement = null;
    }
  }

  static getAvailableTypes(): string[] {
    return Object.keys(keyframesMap);
  }
}

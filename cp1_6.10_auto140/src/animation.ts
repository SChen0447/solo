export interface AnimationState {
  isPlaying: boolean;
  cancel: () => void;
}

interface AnimatedEmoji {
  element: HTMLElement;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  peakHeight: number;
  onComplete?: () => void;
}

export class AnimationManager {
  private activeAnimations: Set<AnimatedEmoji> = new Set();
  private animationFrameId: number | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public playParabolicEmoji(
    emoji: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    duration: number = 500,
    onComplete?: () => void
  ): AnimationState {
    const element = document.createElement('div');
    element.className = 'emoji-container';
    element.textContent = emoji;
    element.style.left = `${startX}px`;
    element.style.top = `${startY}px`;
    element.style.opacity = '1';
    this.container.appendChild(element);

    const animation: AnimatedEmoji = {
      element,
      startTime: performance.now(),
      duration,
      startX,
      startY,
      endX,
      endY,
      peakHeight: Math.min(Math.abs(endY - startY) + 100, 200),
      onComplete
    };

    this.activeAnimations.add(animation);
    this.startLoop();

    return {
      isPlaying: true,
      cancel: () => this.cancelAnimation(animation)
    };
  }

  private startLoop(): void {
    if (this.animationFrameId !== null) return;

    const tick = (): void => {
      const now = performance.now();
      const toRemove: AnimatedEmoji[] = [];

      for (const anim of this.activeAnimations) {
        const elapsed = now - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        const x = this.lerp(anim.startX, anim.endX, progress);
        const parabolicT = progress * 2 - 1;
        const y = this.lerp(anim.startY, anim.endY, progress)
          - anim.peakHeight * (1 - parabolicT * parabolicT);

        anim.element.style.left = `${x}px`;
        anim.element.style.top = `${y}px`;
        anim.element.style.opacity = `${1 - progress}`;

        if (progress >= 1) {
          toRemove.push(anim);
        }
      }

      for (const anim of toRemove) {
        this.removeAnimation(anim);
      }

      if (this.activeAnimations.size > 0) {
        this.animationFrameId = requestAnimationFrame(tick);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private cancelAnimation(anim: AnimatedEmoji): void {
    if (this.activeAnimations.has(anim)) {
      this.removeAnimation(anim);
    }
  }

  private removeAnimation(anim: AnimatedEmoji): void {
    this.activeAnimations.delete(anim);
    if (anim.element.parentNode) {
      anim.element.parentNode.removeChild(anim.element);
    }
    if (anim.onComplete) {
      anim.onComplete();
    }
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    for (const anim of this.activeAnimations) {
      if (anim.element.parentNode) {
        anim.element.parentNode.removeChild(anim.element);
      }
    }
    this.activeAnimations.clear();
  }
}

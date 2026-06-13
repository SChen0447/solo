import { SceneRenderer } from './scene';
import { ShadowPlay } from './shadowPlay';

class GameApp {
  private scene: SceneRenderer;
  private shadowPlay: ShadowPlay;
  private lastTime: number = 0;
  private rafId: number = 0;

  constructor() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.scene = new SceneRenderer(width, height);
    this.shadowPlay = new ShadowPlay(width, height, this.scene);

    this.shadowPlay.setReactionCallback((type: 'cheer' | 'boo') => {
      console.log(`观众反应: ${type === 'cheer' ? '喝彩' : '嘘声'}`);
    });

    window.addEventListener('resize', this.handleResize.bind(this));

    this.lastTime = performance.now();
    this.startLoop();
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.scene.resize(width, height);
    this.shadowPlay.resize(width, height);
  }

  private startLoop(): void {
    const loop = (currentTime: number) => {
      const dt = Math.min(currentTime - this.lastTime, 50);
      this.lastTime = currentTime;

      this.scene.update(dt);
      this.shadowPlay.update(dt);

      this.scene.draw();
      this.shadowPlay.draw();

      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});

import { SceneManager } from './sceneManager';
import { LightSculpture } from './lightSculpture';
import { AudioManager } from './audioManager';

class App {
  private sceneManager: SceneManager;
  private lightSculpture: LightSculpture;
  private audioManager: AudioManager;
  private clock = { lastTime: performance.now() };
  private audioInitialized = false;

  constructor() {
    this.sceneManager = new SceneManager();
    this.audioManager = new AudioManager();
    this.lightSculpture = new LightSculpture(this.sceneManager, this.audioManager);

    this.sceneManager.onMouseClick(() => {
      if (!this.audioInitialized) {
        this.audioManager.init().then(() => {
          this.audioInitialized = true;
        });
      }
    });

    this.sceneManager.onKeyPress((key: string) => {
      if (key === ' ' && !this.audioInitialized) {
        this.audioManager.init().then(() => {
          this.audioInitialized = true;
        });
      }
    });

    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const now = performance.now();
    const delta = Math.min((now - this.clock.lastTime) / 1000, 0.05);
    this.clock.lastTime = now;

    this.lightSculpture.update(delta);
    this.sceneManager.render();
  };
}

new App();

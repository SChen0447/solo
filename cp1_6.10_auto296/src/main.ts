import { SceneManager } from './scene';
import { InteractionManager } from './interaction';

class EmotionPhotonsApp {
  private sceneManager: SceneManager;
  private interactionManager: InteractionManager;

  constructor() {
    this.interactionManager = new InteractionManager();
    this.sceneManager = new SceneManager(
      'canvas-container',
      this.interactionManager.getCurrentEmotion()
    );

    this.interactionManager.onEmotionChange((emotion) => {
      this.sceneManager.setEmotion(emotion);
    });

    this.sceneManager.start();
  }

  public dispose(): void {
    this.sceneManager.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new EmotionPhotonsApp();

  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
});

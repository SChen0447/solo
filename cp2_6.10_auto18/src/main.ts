import { SceneManager } from './sceneManager';
import { AudioAnalyzer } from './audioAnalyzer';
import { UIController } from './uiController';

let sceneManager: SceneManager;
let audioAnalyzer: AudioAnalyzer;
let uiController: UIController;
let lastTime: number = 0;
let isInitialized: boolean = false;

async function init(): Promise<void> {
  const container = document.getElementById('canvas-container')!;

  sceneManager = new SceneManager(container);
  audioAnalyzer = new AudioAnalyzer();
  uiController = new UIController({
    onTrackChange: async (trackId: number) => {
      if (!isInitialized) {
        await audioAnalyzer.init();
        isInitialized = true;
      }
      audioAnalyzer.resume();
      sceneManager.resetAnimations();
      audioAnalyzer.playTrack(trackId);
    },
  });

  sceneManager.setOnGeometryClick((typeIndex: number) => {
    if (!isInitialized) {
      audioAnalyzer.init().then(() => {
        isInitialized = true;
        audioAnalyzer.resume();
        audioAnalyzer.playClickSound(typeIndex);
      });
    } else {
      audioAnalyzer.resume();
      audioAnalyzer.playClickSound(typeIndex);
    }
  });

  const firstInteraction = async () => {
    if (!isInitialized) {
      await audioAnalyzer.init();
      isInitialized = true;
    }
    audioAnalyzer.resume();
    audioAnalyzer.playTrack(0);
    document.removeEventListener('click', firstInteraction);
    document.removeEventListener('keydown', firstInteraction);
  };
  document.addEventListener('click', firstInteraction, { once: true });
  document.addEventListener('keydown', firstInteraction, { once: true });

  lastTime = performance.now();
  animate();
}

function animate(): void {
  requestAnimationFrame(animate);
  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;

  const frequencyData = audioAnalyzer.getFrequencyData();
  sceneManager.update(deltaTime, frequencyData);
  uiController.updateSpectrumBars(frequencyData);
}

init().catch((err) => {
  console.error('Initialization failed:', err);
});

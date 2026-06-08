import { ParticleSystem, FireworksConfig } from './system';
import { UIManager } from './ui';

const defaultConfig: FireworksConfig = {
  launchAngle: 90,
  explosionRadius: 150,
  particleCount: 200,
  particleLifetime: 2.5,
  startColor: '#00ff9d',
  endColor: '#ff00aa'
};

let canvas: HTMLCanvasElement;
let particleSystem: ParticleSystem;
let uiManager: UIManager;

let lastTime: number = 0;
let fps: number = 60;
let frameCount: number = 0;
let fpsUpdateTime: number = 0;

let previewTimer: number | null = null;
let replayIndex: number = -1;
let replayTimer: number | null = null;
let isReplaying: boolean = false;

function init(): void {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  particleSystem = new ParticleSystem(canvas, defaultConfig);

  uiManager = new UIManager(defaultConfig, {
    onConfigChange: handleConfigChange,
    onLaunch: handleLaunch,
    onPreview: handlePreview,
    onSave: handleSave,
    onReplay: handleReplay
  });

  particleSystem.onExplosion(handleExplosion);

  requestAnimationFrame(gameLoop);
}

function resizeCanvas(): void {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent || !canvas) return;

  const rect = mainContent.getBoundingClientRect();
  const statusBarHeight = 50;
  const padding = 20;

  canvas.width = rect.width - padding * 2;
  canvas.height = rect.height - statusBarHeight - padding * 2;

  if (particleSystem) {
    particleSystem.updateCenter();
  }
}

function handleConfigChange(config: FireworksConfig): void {
  particleSystem.setConfig(config);
}

function handleLaunch(): void {
  if (isReplaying) {
    stopReplay();
  }
  if (uiManager.isPreviewActive()) {
    stopPreview();
  }
  particleSystem.launch();
}

function handlePreview(): void {
  if (isReplaying) {
    stopReplay();
  }
  if (uiManager.isPreviewActive()) {
    startPreviewLoop();
  }
}

function startPreviewLoop(): void {
  if (previewTimer !== null) {
    clearInterval(previewTimer);
  }

  previewTimer = window.setInterval(() => {
    if (particleSystem.isIdle() && uiManager.isPreviewActive()) {
      particleSystem.launch();
    }
  }, 1500);
}

function stopPreview(): void {
  if (previewTimer !== null) {
    clearInterval(previewTimer);
    previewTimer = null;
  }
  uiManager.stopPreview();
}

function handleSave(): void {
  console.log('Style saved:', particleSystem.getConfig());
}

function handleReplay(): void {
  if (isReplaying) {
    stopReplay();
    return;
  }

  const styles = uiManager.getSavedStyles();
  if (styles.length === 0) {
    return;
  }

  if (uiManager.isPreviewActive()) {
    stopPreview();
  }

  isReplaying = true;
  replayIndex = -1;
  playNextReplayStyle();
}

function playNextReplayStyle(): void {
  const styles = uiManager.getSavedStyles();
  replayIndex++;

  if (replayIndex >= styles.length) {
    stopReplay();
    return;
  }

  const config = styles[replayIndex];
  uiManager.setConfig(config);
  particleSystem.setConfig(config);

  setTimeout(() => {
    particleSystem.launch();
  }, 100);

  replayTimer = window.setTimeout(() => {
    playNextReplayStyle();
  }, 2000);
}

function stopReplay(): void {
  isReplaying = false;
  replayIndex = -1;
  if (replayTimer !== null) {
    clearTimeout(replayTimer);
    replayTimer = null;
  }
}

function handleExplosion(): void {
  uiManager.showFlash();
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  frameCount++;
  if (timestamp - fpsUpdateTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    fpsUpdateTime = timestamp;
  }

  particleSystem.update(dt);
  particleSystem.draw();

  uiManager.updateStatus(fps, particleSystem.getParticleCount(), particleSystem.getSparkCount());

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', init);

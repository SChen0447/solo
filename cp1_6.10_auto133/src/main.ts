import { BubbleWallManager } from './bubbleWallManager';
import { AudioEngine } from './audioEngine';

function init(): void {
  const canvas = document.getElementById('bubbleCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #bubbleCanvas not found');
    return;
  }

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioContext = new AudioCtx();
  const audioEngine = new AudioEngine(audioContext);

  const manager = new BubbleWallManager(canvas, audioEngine);
  manager.start();

  const unlockAudio = (): void => {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };

  window.addEventListener('click', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('touchstart', unlockAudio);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

import p5 from 'p5';
import { Brush } from './brush';
import { Playback } from './playback';

const sketch = (p: p5) => {
  let brush: Brush;
  let playback: Playback;
  let canvasContainer: HTMLElement | null;
  let isDrawing: boolean = false;

  const PAPER_COLOR = '#f5e6ca';

  const colorButtons = document.querySelectorAll('.color-btn') as NodeListOf<HTMLButtonElement>;
  const sizeSlider = document.getElementById('sizeSlider') as HTMLInputElement;
  const sizeValue = document.getElementById('sizeValue') as HTMLElement;
  const playbackBtn = document.getElementById('playbackBtn') as HTMLButtonElement;
  const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
  const progressBar = document.getElementById('progressBar') as HTMLElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;
  const playbackMessage = document.getElementById('playbackMessage') as HTMLElement;

  p.setup = () => {
    canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) return;

    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;

    const canvas = p.createCanvas(width, height);
    canvas.parent(canvasContainer);

    brush = new Brush(p);
    playback = new Playback(p, brush);

    p.frameRate(60);
    p.pixelDensity(1);

    setupEventListeners();
  };

  p.draw = () => {
    p.background(PAPER_COLOR);

    if (playback.getIsPlaying()) {
      playback.update();
      playback.draw();
    } else {
      brush.draw();
    }
  };

  p.mousePressed = () => {
    if (playback.getIsPlaying()) return;
    if (!isMouseOnCanvas()) return;
    if (p.mouseButton !== p.LEFT) return;

    isDrawing = true;
    brush.startStroke(p.mouseX, p.mouseY);
    hidePlaybackMessage();
  };

  p.mouseDragged = () => {
    if (!isDrawing) return;
    if (playback.getIsPlaying()) return;

    brush.moveTo(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    if (!isDrawing) return;

    isDrawing = false;
    brush.endStroke();
    updatePlaybackButtonState();
  };

  p.windowResized = () => {
    if (!canvasContainer) return;

    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    p.resizeCanvas(width, height);
  };

  const isMouseOnCanvas = (): boolean => {
    if (!canvasContainer) return false;
    const rect = canvasContainer.getBoundingClientRect();
    return (
      p.mouseX >= 0 &&
      p.mouseX <= rect.width &&
      p.mouseY >= 0 &&
      p.mouseY <= rect.height
    );
  };

  const setupEventListeners = (): void => {
    colorButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.dataset.color;
        if (!color) return;

        colorButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        brush.setColor(color);
      });
    });

    sizeSlider.addEventListener('input', () => {
      const size = parseInt(sizeSlider.value, 10);
      brush.setBaseSize(size);
      sizeValue.textContent = `${size}px`;
    });

    playbackBtn.addEventListener('click', () => {
      if (playback.getIsPlaying()) {
        stopPlayback();
      } else {
        startPlayback();
      }
    });

    undoBtn.addEventListener('click', () => {
      if (playback.getIsPlaying()) return;
      brush.undoLastStroke();
      updatePlaybackButtonState();
    });

    clearBtn.addEventListener('click', () => {
      if (playback.getIsPlaying()) return;
      if (confirm('确定要清空画布吗？此操作不可撤销。')) {
        brush.clearAll();
        updatePlaybackButtonState();
      }
    });
  };

  const startPlayback = (): void => {
    if (!brush.hasHistory()) return;

    const started = playback.start(
      (progress: number) => {
        progressFill.style.width = `${progress * 100}%`;
      },
      () => {
        stopPlayback();
        showPlaybackMessage('播放完毕');
      }
    );

    if (started) {
      progressBar.classList.add('active');
      playbackBtn.textContent = '停止';
      setControlsEnabled(false);
    }
  };

  const stopPlayback = (): void => {
    playback.stop();
    progressBar.classList.remove('active');
    progressFill.style.width = '0%';
    playbackBtn.textContent = '回放';
    setControlsEnabled(true);
    updatePlaybackButtonState();
  };

  const showPlaybackMessage = (msg: string): void => {
    playbackMessage.textContent = msg;
    playbackMessage.classList.add('show');

    setTimeout(() => {
      hidePlaybackMessage();
    }, 2000);
  };

  const hidePlaybackMessage = (): void => {
    playbackMessage.classList.remove('show');
  };

  const setControlsEnabled = (enabled: boolean): void => {
    colorButtons.forEach((btn) => {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    });

    sizeSlider.disabled = !enabled;
    sizeSlider.style.opacity = enabled ? '1' : '0.5';

    undoBtn.disabled = !enabled;
    undoBtn.style.opacity = enabled ? '1' : '0.5';
    undoBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';

    clearBtn.disabled = !enabled;
    clearBtn.style.opacity = enabled ? '1' : '0.5';
    clearBtn.style.cursor = enabled ? 'pointer' : 'not-allowed';
  };

  const updatePlaybackButtonState = (): void => {
    if (brush.hasHistory()) {
      playbackBtn.disabled = false;
      playbackBtn.style.opacity = '1';
      playbackBtn.style.cursor = 'pointer';
    } else {
      playbackBtn.disabled = true;
      playbackBtn.style.opacity = '0.5';
      playbackBtn.style.cursor = 'not-allowed';
    }
  };
};

new p5(sketch);

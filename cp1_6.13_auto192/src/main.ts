import $ from 'jquery';
import { gsap } from 'gsap';
import { ParticleSystem } from './particleSystem';
import { AudioManager, BeatPreset } from './audioManager';
import { BeatData } from './particle';

interface PointerState {
  isDown: boolean;
  isDragging: boolean;
  lastX: number;
  lastY: number;
  x: number;
  y: number;
  dragStartX: number;
  dragStartY: number;
  dragDistance: number;
  lastMoveTime: number;
  dragSpeed: number;
}

interface FPSTracker {
  frames: number[];
  average: number;
}

(function main(): void {
  const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
  const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    console.error('Canvas 2D context not supported');
    return;
  }

  const particleSystem = new ParticleSystem();
  const audioManager = new AudioManager();

  const pointer: PointerState = {
    isDown: false,
    isDragging: false,
    lastX: 0,
    lastY: 0,
    x: 0,
    y: 0,
    dragStartX: 0,
    dragStartY: 0,
    dragDistance: 0,
    lastMoveTime: 0,
    dragSpeed: 0
  };

  const fps: FPSTracker = { frames: [], average: 60 };
  const FPS_WINDOW = 30;

  let lastFrameTime = performance.now();
  let pendingBeatEvent: BeatData | null = null;
  let lastBeatProcessTime = 0;

  let config = {
    volume: 50,
    particleSize: 10,
    particleDensity: 25
  };

  let panelHideTimeout: ReturnType<typeof setTimeout> | null = null;
  const $controlPanel = $('#control-panel');
  const $fpsIndicator = $('#fps-indicator');
  const $particleCount = $('#particle-count');

  function resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearBackground(): void {
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  function trackFPS(now: number): void {
    fps.frames.push(now);
    while (fps.frames.length > FPS_WINDOW) {
      fps.frames.shift();
    }
    if (fps.frames.length >= 2) {
      const total = (fps.frames[fps.frames.length - 1] - fps.frames[0]) / 1000;
      fps.average = (fps.frames.length - 1) / Math.max(0.001, total);
    }
    if (fps.average < 45) {
      particleSystem.setDensityScale(0.5);
    } else if (fps.average > 58) {
      particleSystem.setDensityScale(1);
    }
    if ($fpsIndicator.length) {
      $fpsIndicator.text(fps.average.toFixed(0) + ' FPS');
    }
    if ($particleCount.length) {
      $particleCount.text(particleSystem.count + ' / 1200');
    }
  }

  function onBeat(data: BeatData): void {
    pendingBeatEvent = data;
    particleSystem.processBeat(data);
  }

  function mainLoop(now: number): void {
    requestAnimationFrame(mainLoop);

    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    trackFPS(now);
    clearBackground();

    const beatSnapshot = audioManager.getLatestBeatSnapshot();
    const effectiveBeat: BeatData | null = pendingBeatEvent
      ? pendingBeatEvent
      : (beatSnapshot.intensity > 0.08 ? beatSnapshot : null);

    if (pendingBeatEvent && now - lastBeatProcessTime > 300) {
      pendingBeatEvent = null;
    }
    if (pendingBeatEvent) {
      lastBeatProcessTime = now;
    }

    particleSystem.update(dt, effectiveBeat);
    particleSystem.draw(ctx);

    if (pointer.isDown && pointer.isDragging) {
      const dx = pointer.x - pointer.lastX;
      const dy = pointer.y - pointer.lastY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= 4) {
        particleSystem.stream({
          fromX: pointer.lastX,
          fromY: pointer.lastY,
          toX: pointer.x,
          toY: pointer.y,
          dragSpeed: pointer.dragSpeed,
          baseSize: config.particleSize
        });
        pointer.lastX = pointer.x;
        pointer.lastY = pointer.y;
      }
    }
  }

  function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  function onPointerDown(clientX: number, clientY: number): void {
    const coords = getCanvasCoords(clientX, clientY);
    pointer.isDown = true;
    pointer.isDragging = false;
    pointer.dragStartX = coords.x;
    pointer.dragStartY = coords.y;
    pointer.dragDistance = 0;
    pointer.lastX = coords.x;
    pointer.lastY = coords.y;
    pointer.x = coords.x;
    pointer.y = coords.y;
    pointer.lastMoveTime = performance.now();
    pointer.dragSpeed = 0;

    particleSystem.burst({
      x: coords.x,
      y: coords.y,
      baseSize: config.particleSize,
      colorMode: 'random'
    });

    try {
      if (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) {
        const dummy = new AudioManager();
        dummy.setVolume(config.volume);
      }
    } catch { }
  }

  function onPointerMove(clientX: number, clientY: number): void {
    const coords = getCanvasCoords(clientX, clientY);
    const now = performance.now();
    const dtMove = Math.max(1, now - pointer.lastMoveTime) / 1000;

    if (pointer.isDown) {
      const dx = coords.x - pointer.dragStartX;
      const dy = coords.y - pointer.dragStartY;
      pointer.dragDistance = Math.sqrt(dx * dx + dy * dy);

      if (pointer.dragDistance > 6) {
        pointer.isDragging = true;
      }

      const moveDx = coords.x - pointer.x;
      const moveDy = coords.y - pointer.y;
      const moveDist = Math.sqrt(moveDx * moveDx + moveDy * moveDy);
      pointer.dragSpeed = moveDist / dtMove;
    }

    pointer.x = coords.x;
    pointer.y = coords.y;
    pointer.lastMoveTime = now;
  }

  function onPointerUp(): void {
    pointer.isDown = false;
    pointer.isDragging = false;
    pointer.dragDistance = 0;
    pointer.dragSpeed = 0;
  }

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    e.preventDefault();
    onPointerDown(e.clientX, e.clientY);
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    onPointerMove(e.clientX, e.clientY);
  });

  window.addEventListener('mouseup', onPointerUp);

  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      onPointerDown(t.clientX, t.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      onPointerMove(t.clientX, t.clientY);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e: TouchEvent) => {
    e.preventDefault();
    onPointerUp();
  });

  canvas.addEventListener('touchcancel', onPointerUp);

  function showPanel(): void {
    if (panelHideTimeout) {
      clearTimeout(panelHideTimeout);
      panelHideTimeout = null;
    }
    if (!$controlPanel.hasClass('visible')) {
      $controlPanel.addClass('visible');
    }
  }

  function scheduleHidePanel(): void {
    if (panelHideTimeout) clearTimeout(panelHideTimeout);
    panelHideTimeout = setTimeout(() => {
      $controlPanel.removeClass('visible');
    }, 1000);
  }

  $controlPanel.on('mouseenter', () => {
    showPanel();
  });

  $controlPanel.on('mouseleave', () => {
    scheduleHidePanel();
  });

  let idleHideTimer: ReturnType<typeof setTimeout> | null = null;
  function resetIdleTimer(): void {
    showPanel();
    if (idleHideTimer) clearTimeout(idleHideTimer);
    idleHideTimer = setTimeout(() => {
      scheduleHidePanel();
    }, 2000);
  }

  window.addEventListener('mousemove', (e: MouseEvent) => {
    const panelRect: DOMRect | null = $controlPanel[0]?.getBoundingClientRect() ?? null;
    if (panelRect) {
      const inPanel = e.clientX >= panelRect.left - 40
        && e.clientX <= panelRect.right + 40
        && e.clientY >= panelRect.top - 40
        && e.clientY <= panelRect.bottom + 40;
      if (inPanel) {
        resetIdleTimer();
      }
    }
  });

  $controlPanel.on('click', '.beat-btn', function (this: HTMLElement) {
    const $btn = $(this);
    const preset = $btn.data('beat') as BeatPreset;
    const currentPreset = audioManager.currentPreset;

    $('.beat-btn').removeClass('active');

    if (currentPreset === preset) {
      audioManager.stop();
    } else {
      $btn.addClass('active');
      gsap.fromTo($btn[0],
        { scale: 0.9 },
        { scale: 1, duration: 0.25, ease: 'back.out(2)' }
      );
      audioManager.startPresetBeat(preset);
    }
  });

  $('#audio-file').on('change', async function (this: HTMLInputElement) {
    const file = this.files?.[0];
    if (!file) return;

    $('.beat-btn').removeClass('active');

    try {
      $('#upload-label').text('加载中...');
      await audioManager.loadFile(file);
      $('#upload-label').text(file.name.length > 18 ? file.name.slice(0, 16) + '...' : file.name);
    } catch (err) {
      $('#upload-label').text('上传失败，重试');
      console.error('Audio load error:', err);
    }
  });

  $('#volume-slider').on('input', function (this: HTMLInputElement) {
    const v = parseInt(this.value, 10);
    config.volume = v;
    $('#volume-value').text(String(v));
    audioManager.setVolume(v);
  });

  $('#size-slider').on('input', function (this: HTMLInputElement) {
    const v = parseInt(this.value, 10);
    config.particleSize = v;
    $('#size-value').text(String(v));
    particleSystem.setGlobalSizeScale(v / 10);
  });

  $('#density-slider').on('input', function (this: HTMLInputElement) {
    const v = parseInt(this.value, 10);
    config.particleDensity = v;
    $('#density-value').text(String(v));
    particleSystem.setGlobalDensity(v);
  });

  $('button, .upload-btn, input[type="range"]').on('mousedown', function () {
    gsap.to(this, { scale: 0.95, duration: 0.08, ease: 'power2.out' });
  }).on('mouseup mouseleave', function () {
    gsap.to(this, { scale: 1, duration: 0.2, ease: 'power2.out' });
  });

  audioManager.onBeat(onBeat);
  audioManager.setVolume(config.volume);
  particleSystem.setGlobalDensity(config.particleDensity);

  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', resizeCanvas);
  resizeCanvas();

  showPanel();
  resetIdleTimer();

  requestAnimationFrame((t: number) => {
    lastFrameTime = t;
    mainLoop(t);
  });
})();

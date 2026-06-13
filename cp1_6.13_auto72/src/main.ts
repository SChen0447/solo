import { ParticleController } from './particle';
import { AudioEngine } from './audio';
import { CanvasRenderer } from './renderer';

type EventType = 'pourStart' | 'pourEnd' | 'pourTick' | 'complete';

interface EventBus {
  on(event: EventType, callback: (...args: unknown[]) => void): void;
  emit(event: EventType, ...args: unknown[]): void;
}

class SimpleEventBus implements EventBus {
  private listeners: Map<EventType, Array<(...args: unknown[]) => void>> = new Map();

  on(event: EventType, callback: (...args: unknown[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: EventType, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(...args);
      }
    }
  }
}

const eventBus: EventBus = new SimpleEventBus();

let canvas: HTMLCanvasElement;
let renderer: CanvasRenderer;
let particleController: ParticleController;
let audioEngine: AudioEngine;

let canvasWidth = 800;
let canvasHeight = 600;

let potAngle = 0;
let targetPotAngle = 0;
let potShakeOffset = 0;
let isShaking = false;
let shakePhase = 0;

let isPouring = false;
let isLongPress = false;
let keyPressStartTime = 0;
let pourDuration = 0;

let liquidHeight = 0;
const maxLiquidHeight = 95;
let fillCount = 0;
const maxFills = 8;
let isCompleted = false;
let liquidRiseSpeed = 0;
let liquidDamping = false;
let dampingTimer = 0;

let glowRadius = 0;
let glowOpacity = 0;
let glowActive = false;
let glowTimer = 0;

let badgeVisible = false;
let badgeTimer = 0;
let badgeElement: HTMLElement | null = null;
let titleElement: HTMLElement | null = null;

let lastTime = 0;
let animationId = 0;

let activeKey: string | null = null;

function init(): void {
  canvas = document.getElementById('canvas') as HTMLCanvasElement;
  badgeElement = document.getElementById('badge');
  titleElement = document.getElementById('title');

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  renderer = new CanvasRenderer(canvas);
  particleController = new ParticleController();
  audioEngine = new AudioEngine();

  resize();
  window.addEventListener('resize', resize);

  particleController.setCanvasSize(canvasWidth, canvasHeight);
  particleController.setLiquidHeight(liquidHeight);

  setupEventListeners();
  setupEventBusHandlers();

  lastTime = performance.now();
  animate(lastTime);
}

function resize(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const minWidth = 800;
  const viewportWidth = Math.max(window.innerWidth, minWidth);
  const viewportHeight = window.innerHeight;

  canvasWidth = viewportWidth;
  canvasHeight = viewportHeight;

  renderer.resize(canvasWidth, canvasHeight);

  if (particleController) {
    particleController.setCanvasSize(canvasWidth, canvasHeight);
  }
}

function setupEventListeners(): void {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);

  canvas.addEventListener('click', async () => {
    if (audioEngine) {
      await audioEngine.init();
      audioEngine.resume();
    }
  });
}

function setupEventBusHandlers(): void {
  eventBus.on('pourStart', () => {
    particleController.startPouring();
  });

  eventBus.on('pourEnd', () => {
    particleController.stopPouring();
  });

  eventBus.on('complete', () => {
    triggerCompletion();
  });
}

function handleKeyDown(e: KeyboardEvent): void {
  if (!e.key.match(/^[a-zA-Z]$/)) return;
  if (isCompleted) return;

  if (activeKey !== null && activeKey !== e.key) return;

  if (activeKey === null) {
    activeKey = e.key;
    isPouring = true;
    keyPressStartTime = performance.now();
    pourDuration = 0;
    isLongPress = false;
    targetPotAngle = 15;

    audioEngine.init().then(() => {
      audioEngine.resume();
    });

    eventBus.emit('pourStart');
    flashTitle();
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  if (e.key !== activeKey) return;

  const pressDuration = performance.now() - keyPressStartTime;
  activeKey = null;
  isPouring = false;
  isShaking = false;
  targetPotAngle = 0;

  if (pressDuration < 500) {
    addLiquidFill();
    particleController.spawnSteam();
  } else {
    if (fillCount < maxFills) {
      addLiquidFill();
    }
    particleController.spawnSteam();
  }

  audioEngine.stopFlow();
  eventBus.emit('pourEnd');

  liquidDamping = true;
  dampingTimer = 0;
  lastPourEndTime = performance.now();
}

function addLiquidFill(): void {
  if (fillCount >= maxFills) return;

  fillCount++;
  const targetHeight = (fillCount / maxFills) * maxLiquidHeight;
  liquidRiseSpeed = (targetHeight - liquidHeight) / 30;

  if (fillCount >= maxFills) {
    fillCount = maxFills;
    liquidHeight = maxLiquidHeight;
    particleController.setLiquidHeight(liquidHeight);
    eventBus.emit('complete');
  }
}

function flashTitle(): void {
  if (!titleElement) return;
  titleElement.classList.add('shine');
  setTimeout(() => {
    titleElement?.classList.remove('shine');
  }, 300);
}

function triggerCompletion(): void {
  isCompleted = true;
  isPouring = false;
  targetPotAngle = 0;

  glowActive = true;
  glowRadius = 10;
  glowOpacity = 0.5;
  glowTimer = 0;

  setTimeout(() => {
    audioEngine.playCompletionChime();
  }, 200);

  setTimeout(() => {
    showBadge();
  }, 1000);
}

function showBadge(): void {
  if (!badgeElement) return;
  badgeVisible = true;
  badgeTimer = 0;
  badgeElement.classList.add('show');
}

function hideBadge(): void {
  if (!badgeElement) return;
  badgeVisible = false;
  badgeElement.classList.remove('show');
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function animate(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  update(deltaTime, currentTime);
  render(currentTime);

  animationId = requestAnimationFrame(animate);
}

function update(dt: number, currentTime: number): void {
  if (isPouring) {
    pourDuration = currentTime - keyPressStartTime;

    if (pourDuration >= 1000 && !isLongPress) {
      isLongPress = true;
      isShaking = true;
      audioEngine.startFlow(0.5);
    }

    if (isLongPress) {
      liquidRiseSpeed = 0.15;
      liquidHeight = Math.min(maxLiquidHeight, liquidHeight + liquidRiseSpeed);
      particleController.setLiquidHeight(liquidHeight);

      if (liquidHeight >= maxLiquidHeight && fillCount < maxFills) {
        fillCount = maxFills;
        eventBus.emit('complete');
      }
    }

    if (pourDuration >= 500 && pourDuration < 1000) {
      audioEngine.startFlow(0.4);
    } else if (pourDuration < 500) {
      if (Math.floor(pourDuration / 100) !== Math.floor((pourDuration - dt) / 100)) {
        audioEngine.playDrip(0.3);
      }
    }
  }

  if (liquidDamping) {
    dampingTimer += dt;
    const dampFactor = 1 - Math.min(1, dampingTimer / 300);
    liquidHeight = Math.min(maxLiquidHeight, liquidHeight + liquidRiseSpeed * dampFactor);
    particleController.setLiquidHeight(liquidHeight);

    if (dampingTimer >= 300) {
      liquidDamping = false;
      liquidRiseSpeed = 0;
    }
  }

  if (!isPouring && fillCount < maxFills) {
    const targetHeight = (fillCount / maxFills) * maxLiquidHeight;
    if (Math.abs(liquidHeight - targetHeight) > 0.1) {
      liquidHeight += (targetHeight - liquidHeight) * 0.1;
      particleController.setLiquidHeight(liquidHeight);
    }
  }

  const angleDiff = targetPotAngle - potAngle;
  potAngle += angleDiff * 0.15;

  if (isShaking) {
    shakePhase += dt * 0.0314;
    potShakeOffset = Math.sin(shakePhase) * 1;
  } else {
    potShakeOffset *= 0.9;
  }

  particleController.update(dt, potAngle);

  if (glowActive) {
    glowTimer += dt;
    const progress = Math.min(1, glowTimer / 1500);
    glowRadius = 10 + progress * 50;
    glowOpacity = 0.5 * (1 - progress);

    if (progress >= 1) {
      glowActive = false;
      glowRadius = 0;
      glowOpacity = 0;
    }
  }

  if (badgeVisible) {
    badgeTimer += dt;
    if (badgeTimer >= 5000) {
      hideBadge();
    }
  }
}

function render(currentTime: number): void {
  const particleState = particleController.getState();

  renderer.render(particleState, {
    potAngle,
    potShakeOffset,
    liquidHeight,
    liquidMaxHeight: maxLiquidHeight,
    isPouring,
    glowRadius,
    glowOpacity,
    time: currentTime / 1000
  });
}

window.addEventListener('DOMContentLoaded', init);

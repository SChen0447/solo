import { InputHandler } from './input';
import { ParticleSystem, LightSource, colorTempToRGB, RGB } from './particles';
import { Player } from './player';

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 500;
const PLAYER_START_X = 50;
const DEFAULT_TEMP = 5500;
const DEFAULT_BRIGHTNESS = 1.0;
const WARNING_THRESHOLD = 0.85;
const WARNING_DURATION = 3000;
const FPS_CHECK_INTERVAL = 2000;

interface ControlPoints {
  x: number;
  y: number;
}

function generateTerrainControlPoints(): ControlPoints[] {
  const points: ControlPoints[] = [];
  const numPoints = 5;
  for (let i = 0; i < numPoints; i++) {
    points.push({
      x: (i / (numPoints - 1)) * CANVAS_WIDTH,
      y: 300 + Math.random() * 100,
    });
  }
  return points;
}

function createTerrainFunction(controlPoints: ControlPoints[]): (x: number) => number {
  return (x: number): number => {
    if (x <= controlPoints[0].x) return controlPoints[0].y;
    if (x >= controlPoints[controlPoints.length - 1].x) {
      return controlPoints[controlPoints.length - 1].y;
    }

    for (let i = 0; i < controlPoints.length - 1; i++) {
      const p0 = controlPoints[i];
      const p1 = controlPoints[i + 1];
      if (x >= p0.x && x <= p1.x) {
        const t = (x - p0.x) / (p1.x - p0.x);
        return quadraticBezier(p0.y, (p0.y + p1.y) / 2 - 20, p1.y, t);
      }
    }
    return controlPoints[controlPoints.length - 1].y;
  };
}

function quadraticBezier(p0: number, p1: number, p2: number, t: number): number {
  const oneMinusT = 1 - t;
  return oneMinusT * oneMinusT * p0 + 2 * oneMinusT * t * p1 + t * t * p2;
}

function rgbToString(rgb: RGB, alpha: number = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getLightLabel(temp: number): string {
  if (temp <= 3000) return '暖光';
  if (temp <= 4500) return '暖白光';
  if (temp <= 6000) return '自然光';
  if (temp <= 7000) return '冷白光';
  return '冷光';
}

function main(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d')!;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const tempSlider = document.getElementById('temp-slider') as HTMLInputElement;
  const brightnessSlider = document.getElementById('brightness-slider') as HTMLInputElement;
  const tempValue = document.getElementById('temp-value') as HTMLSpanElement;
  const brightnessValue = document.getElementById('brightness-value') as HTMLSpanElement;
  const lightPreview = document.getElementById('light-preview') as HTMLDivElement;
  const lightInfo = document.getElementById('light-info') as HTMLDivElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const warningBar = document.getElementById('warning-bar') as HTMLDivElement;

  const light: LightSource = {
    x: 50,
    y: 50,
    colorTemp: DEFAULT_TEMP,
    brightness: DEFAULT_BRIGHTNESS,
  };

  let controlPoints = generateTerrainControlPoints();
  let terrainFunc = createTerrainFunction(controlPoints);

  const input = new InputHandler();
  const particleSystem = new ParticleSystem();
  const player = new Player(PLAYER_START_X, CANVAS_WIDTH, terrainFunc, particleSystem);

  let warningVisible = false;
  let warningTimer: number | null = null;

  let lastTime = performance.now();
  let fpsAccumulator = 0;
  let fpsFrameCount = 0;
  let lastFpsCheck = performance.now();
  let currentFps = 60;

  function updateLightUI(): void {
    tempValue.textContent = String(light.colorTemp);
    brightnessValue.textContent = light.brightness.toFixed(1);
    const lightColor = colorTempToRGB(light.colorTemp);
    const colorStr = rgbToString(lightColor);
    lightPreview.style.backgroundColor = colorStr;
    lightPreview.style.color = colorStr;
    lightInfo.textContent = getLightLabel(light.colorTemp);
  }

  function showWarning(): void {
    if (warningVisible) return;
    warningVisible = true;
    warningBar.classList.add('visible');

    if (warningTimer !== null) {
      window.clearTimeout(warningTimer);
    }
    warningTimer = window.setTimeout(() => {
      warningVisible = false;
      warningBar.classList.remove('visible');
      warningTimer = null;
    }, WARNING_DURATION);
  }

  function resetGame(): void {
    particleSystem.clear();
    controlPoints = generateTerrainControlPoints();
    terrainFunc = createTerrainFunction(controlPoints);
    (player as any).terrainFunc = terrainFunc;
    player.reset(PLAYER_START_X);
    light.colorTemp = DEFAULT_TEMP;
    light.brightness = DEFAULT_BRIGHTNESS;
    tempSlider.value = String(DEFAULT_TEMP);
    brightnessSlider.value = String(DEFAULT_BRIGHTNESS);
    updateLightUI();

    warningVisible = false;
    warningBar.classList.remove('visible');
    if (warningTimer !== null) {
      window.clearTimeout(warningTimer);
      warningTimer = null;
    }
  }

  tempSlider.addEventListener('input', () => {
    light.colorTemp = Number(tempSlider.value);
    updateLightUI();
  });

  brightnessSlider.addEventListener('input', () => {
    light.brightness = Number(brightnessSlider.value);
    updateLightUI();
  });

  resetBtn.addEventListener('click', resetGame);

  updateLightUI();

  function drawBackground(): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#2d5a3e');
    gradient.addColorStop(1, '#1a3b2b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  function drawTerrain(): void {
    ctx.save();
    ctx.strokeStyle = '#feca57';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, terrainFunc(0));
    for (let x = 0; x <= CANVAS_WIDTH; x += 2) {
      ctx.lineTo(x, terrainFunc(x));
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawLightIndicator(): void {
    const lightColor = colorTempToRGB(light.colorTemp);
    const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 30);
    gradient.addColorStop(0, rgbToString(lightColor, 0.6 * light.brightness));
    gradient.addColorStop(1, rgbToString(lightColor, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(light.x, light.y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgbToString(lightColor, light.brightness);
    ctx.beginPath();
    ctx.arc(light.x, light.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function gameLoop(now: number): void {
    const deltaTime = Math.min(now - lastTime, 50);
    lastTime = now;

    fpsAccumulator += deltaTime;
    fpsFrameCount++;
    if (now - lastFpsCheck >= FPS_CHECK_INTERVAL) {
      currentFps = (fpsFrameCount / fpsAccumulator) * 1000;
      fpsAccumulator = 0;
      fpsFrameCount = 0;
      lastFpsCheck = now;
      particleSystem.throttleIfNeeded(currentFps);
    }

    player.update(input, deltaTime);
    particleSystem.update(deltaTime);
    input.update();

    if (particleSystem.count >= particleSystem.capacity * WARNING_THRESHOLD) {
      showWarning();
    }

    drawBackground();
    drawTerrain();
    drawLightIndicator();
    particleSystem.render(ctx, light);
    player.render(ctx);

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame((time) => {
    lastTime = time;
    gameLoop(time);
  });
}

document.addEventListener('DOMContentLoaded', main);

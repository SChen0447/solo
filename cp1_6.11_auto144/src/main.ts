import { ParticleSystem, ParticleSystemParams } from './particleSystem';
import { Renderer } from './renderer';

interface SliderBindings {
  hueShift: HTMLInputElement;
  saturation: HTMLInputElement;
  density: HTMLInputElement;
  swirl: HTMLInputElement;
  diverge: HTMLInputElement;
}

interface ValueBindings {
  hueShift: HTMLSpanElement;
  saturation: HTMLSpanElement;
  density: HTMLSpanElement;
  swirl: HTMLSpanElement;
  diverge: HTMLSpanElement;
}

const defaultParams: ParticleSystemParams = {
  density: 6000,
  swirl: 1.2,
  diverge: 0.4,
  hueShift: 0,
  saturation: 75,
};

const state = {
  system: null as ParticleSystem | null,
  renderer: null as Renderer | null,
  lastTime: 0,
  fps: 0,
  frameCount: 0,
  fpsTimer: 0,
  isDragging: false,
  lastTrailX: 0,
  lastTrailY: 0,
  trailAccumulator: 0,
};

const sliders: Partial<SliderBindings> = {};
const values: Partial<ValueBindings> = {};

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function bindSliders(): void {
  const ids: (keyof SliderBindings)[] = ['hueShift', 'saturation', 'density', 'swirl', 'diverge'];
  for (const id of ids) {
    sliders[id] = $('hueShift'.replace('hueShift', id)) as HTMLInputElement;
    values[id] = $(id + 'Val') as HTMLSpanElement;
  }
  sliders.hueShift = $('hueShift') as HTMLInputElement;
  sliders.saturation = $('saturation') as HTMLInputElement;
  sliders.density = $('density') as HTMLInputElement;
  sliders.swirl = $('swirl') as HTMLInputElement;
  sliders.diverge = $('diverge') as HTMLInputElement;

  values.hueShift = $('hueShiftVal') as HTMLSpanElement;
  values.saturation = $('saturationVal') as HTMLSpanElement;
  values.density = $('densityVal') as HTMLSpanElement;
  values.swirl = $('swirlVal') as HTMLSpanElement;
  values.diverge = $('divergeVal') as HTMLSpanElement;

  updateValueDisplays();
  updateSliderAccents();

  sliders.hueShift?.addEventListener('input', onSliderChange);
  sliders.saturation?.addEventListener('input', onSliderChange);
  sliders.density?.addEventListener('input', onSliderChange);
  sliders.swirl?.addEventListener('input', onSliderChange);
  sliders.diverge?.addEventListener('input', onSliderChange);
}

function updateValueDisplays(): void {
  const hs = Number(sliders.hueShift?.value || 0);
  const sa = Number(sliders.saturation?.value || 0);
  const de = Number(sliders.density?.value || 0);
  const sw = Number(sliders.swirl?.value || 0);
  const di = Number(sliders.diverge?.value || 0);

  if (values.hueShift) values.hueShift.textContent = `${hs}°`;
  if (values.saturation) values.saturation.textContent = `${sa}%`;
  if (values.density) values.density.textContent = `${de}`;
  if (values.swirl) values.swirl.textContent = `${sw.toFixed(2)}`;
  if (values.diverge) values.diverge.textContent = `${di.toFixed(2)}`;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function updateSliderAccents(): void {
  const hue = Number(sliders.hueShift?.value || 0);
  const sat = Math.min(100, Number(sliders.saturation?.value || 75));
  const [r, g, b] = hslToRgb(hue, Math.max(50, sat), 65);
  const accent = `rgb(${r},${g},${b})`;
  document.documentElement.style.setProperty('--slider-accent', accent);

  const inputs = document.querySelectorAll<HTMLInputElement>('input[type="range"]');
  inputs.forEach((input) => {
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    input.style.background = `linear-gradient(to right, ${accent} 0%, ${accent} ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)`;
  });
}

let pendingParams: Partial<ParticleSystemParams> | null = null;
let paramCooldown = 0;

function onSliderChange(e: Event): void {
  updateValueDisplays();
  updateSliderAccents();

  pendingParams = collectParamsFromUI();
  paramCooldown = 0.05;
}

function collectParamsFromUI(): Partial<ParticleSystemParams> {
  return {
    hueShift: Number(sliders.hueShift?.value || 0),
    saturation: Number(sliders.saturation?.value || 0),
    density: Number(sliders.density?.value || 6000),
    swirl: Number(sliders.swirl?.value || 0),
    diverge: Number(sliders.diverge?.value || 0),
  };
}

function bindMouseEvents(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      onMouseDown({ clientX: t.clientX, clientY: t.clientY, button: 0 } as MouseEvent);
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      onMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => onMouseUp());
}

function getCanvasPos(e: { clientX: number; clientY: number }, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== undefined && e.button !== 0) return;
  const canvas = $('mainCanvas') as HTMLCanvasElement;
  const pos = getCanvasPos(e, canvas);
  state.isDragging = true;
  state.lastTrailX = pos.x;
  state.lastTrailY = pos.y;
  state.trailAccumulator = 0;
  emitTrailPoint(pos.x, pos.y);
}

function onMouseMove(e: { clientX: number; clientY: number }): void {
  if (!state.isDragging) return;
  const canvas = $('mainCanvas') as HTMLCanvasElement;
  const pos = getCanvasPos(e, canvas);

  const dx = pos.x - state.lastTrailX;
  const dy = pos.y - state.lastTrailY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  state.trailAccumulator += dist;
  const step = 8;
  while (state.trailAccumulator >= step) {
    const t = 1 - state.trailAccumulator / dist;
    const ix = state.lastTrailX + dx * t;
    const iy = state.lastTrailY + dy * t;
    emitTrailPoint(ix, iy);
    state.trailAccumulator -= step;
  }

  state.lastTrailX = pos.x;
  state.lastTrailY = pos.y;
  emitTrailPoint(pos.x, pos.y);
}

function onMouseUp(): void {
  state.isDragging = false;
}

function emitTrailPoint(sx: number, sy: number): void {
  if (!state.system || !state.renderer) return;
  const { cameraZ, fov } = state.renderer.getCameraParams();
  const { cx, cy } = state.renderer.getCenter();
  state.system.addTrailPoint(sx, sy, cameraZ, fov, cx, cy);
}

function bindWheel(canvas: HTMLCanvasElement): void {
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    if (sliders.swirl) {
      const cur = Number(sliders.swirl.value);
      const next = Math.max(Number(sliders.swirl.min), Math.min(Number(sliders.swirl.max), cur + delta * 10));
      sliders.swirl.value = String(Number(next.toFixed(2)));
      onSliderChange({ target: sliders.swirl } as unknown as Event);
    }
  }, { passive: false });
}

function loop(time: number): void {
  const now = time * 0.001;
  let dt = state.lastTime === 0 ? 0.016 : now - state.lastTime;
  state.lastTime = now;
  if (dt > 0.1) dt = 0.1;

  state.frameCount++;
  state.fpsTimer += dt;
  if (state.fpsTimer >= 1) {
    state.fps = state.frameCount;
    state.frameCount = 0;
    state.fpsTimer = 0;
  }

  if (paramCooldown > 0) {
    paramCooldown -= dt;
    if (paramCooldown <= 0 && pendingParams && state.system) {
      state.system.setParams(pendingParams);
      pendingParams = null;
    }
  }

  if (state.system) state.system.update(dt);
  if (state.renderer) state.renderer.render(dt, state.isDragging);

  requestAnimationFrame(loop);
}

function bootstrap(): void {
  const mainCanvas = $('mainCanvas') as HTMLCanvasElement;
  const previewCanvas = $('previewCanvas') as HTMLCanvasElement;
  if (!mainCanvas || !previewCanvas) return;

  const initial: ParticleSystemParams = { ...defaultParams };
  state.system = new ParticleSystem(initial);
  state.renderer = new Renderer(mainCanvas, previewCanvas, state.system);

  bindSliders();
  bindMouseEvents(mainCanvas);
  bindWheel(mainCanvas);
  window.addEventListener('resize', () => {
    state.renderer?.resize();
  });

  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

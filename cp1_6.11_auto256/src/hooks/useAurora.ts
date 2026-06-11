import { useRef, useCallback } from 'react';

export interface FallingParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  life: number;
  maxLife: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  isTwinkling: boolean;
}

export interface AuroraLayer {
  height: number;
  yOffset: number;
  opacity: number;
  speed: number;
}

export interface StripData {
  x: number;
  topY: number;
  bottomY: number;
  jaggedOffsets: Float32Array;
  foldOffset: number;
  hasFracture: boolean;
  fractureY: number;
  fractureHeight: number;
  colorR: number;
  colorG: number;
  colorB: number;
}

const STRIP_COUNT = 120;
const STRIP_WIDTH = 6;
const VERTICAL_SAMPLES = 50;
const MAX_FALLING_PARTICLES = 500;
const MAX_TOTAL_PARTICLES = 1500;

const AURORA_LAYERS: AuroraLayer[] = [
  { height: 400, yOffset: 0.1, opacity: 0.7, speed: 1.0 },
  { height: 250, yOffset: 0.25, opacity: 0.5, speed: 1.3 },
  { height: 150, yOffset: 0.4, opacity: 0.35, speed: 1.6 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

const COLOR_GREEN_START = hexToRgb('#00ff66');
const COLOR_GREEN_END = hexToRgb('#66ff99');
const COLOR_PURPLE_START = hexToRgb('#4a00e0');
const COLOR_PURPLE_END = hexToRgb('#8e2de2');
const COLOR_PINK_START = hexToRgb('#ff0066');
const COLOR_PINK_END = hexToRgb('#ff33aa');

function getAuroraColor(geoIndex: number, t: number): [number, number, number] {
  if (geoIndex <= 3) {
    const r = lerp(COLOR_GREEN_START[0], COLOR_GREEN_END[0], t);
    const g = lerp(COLOR_GREEN_START[1], COLOR_GREEN_END[1], t);
    const b = lerp(COLOR_GREEN_START[2], COLOR_GREEN_END[2], t);
    return [Math.floor(r), Math.floor(g), Math.floor(b)];
  } else if (geoIndex <= 6) {
    const mix = (geoIndex - 3) / 3;
    const gr = lerp(COLOR_GREEN_START[0], COLOR_GREEN_END[0], t);
    const gg = lerp(COLOR_GREEN_START[1], COLOR_GREEN_END[1], t);
    const gb = lerp(COLOR_GREEN_START[2], COLOR_GREEN_END[2], t);
    const pr = lerp(COLOR_PURPLE_START[0], COLOR_PURPLE_END[0], t);
    const pg = lerp(COLOR_PURPLE_START[1], COLOR_PURPLE_END[1], t);
    const pb = lerp(COLOR_PURPLE_START[2], COLOR_PURPLE_END[2], t);
    return [
      Math.floor(lerp(gr, pr, mix)),
      Math.floor(lerp(gg, pg, mix)),
      Math.floor(lerp(gb, pb, mix)),
    ];
  } else {
    const purpleMix = 1 - (geoIndex - 6) / 4;
    const pinkMix = (geoIndex - 6) / 4;
    const pr = lerp(COLOR_PURPLE_START[0], COLOR_PURPLE_END[0], t);
    const pg = lerp(COLOR_PURPLE_START[1], COLOR_PURPLE_END[1], t);
    const pb = lerp(COLOR_PURPLE_START[2], COLOR_PURPLE_END[2], t);
    const pkr = lerp(COLOR_PINK_START[0], COLOR_PINK_END[0], t);
    const pkg = lerp(COLOR_PINK_START[1], COLOR_PINK_END[1], t);
    const pkb = lerp(COLOR_PINK_START[2], COLOR_PINK_END[2], t);
    const baseR = lerp(COLOR_GREEN_START[0], COLOR_GREEN_END[0], t);
    const baseG = lerp(COLOR_GREEN_START[1], COLOR_GREEN_END[1], t);
    const baseB = lerp(COLOR_GREEN_START[2], COLOR_GREEN_END[2], t);
    const mixPurple = Math.min(purpleMix, 0.6);
    const midR = lerp(baseR, pr, mixPurple);
    const midG = lerp(baseG, pg, mixPurple);
    const midB = lerp(baseB, pb, mixPurple);
    return [
      Math.floor(lerp(midR, pkr, pinkMix)),
      Math.floor(lerp(midG, pkg, pinkMix)),
      Math.floor(lerp(midB, pkb, pinkMix)),
    ];
  }
}

function generateStars(w: number, h: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < 300; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random() * 2,
      baseAlpha: 0.3 + Math.random() * 0.5,
      twinkleSpeed: 0,
      twinklePhase: 0,
      isTwinkling: false,
    });
  }
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 1 + Math.random() * 2,
      baseAlpha: 0.3,
      twinkleSpeed: (2 * Math.PI) / (2 + Math.random() * 4),
      twinklePhase: Math.random() * Math.PI * 2,
      isTwinkling: true,
    });
  }
  return stars;
}

export function useAurora() {
  const fallingParticlesRef = useRef<FallingParticle[]>([]);
  const starsRef = useRef<Star[]>([]);
  const foldSeedsRef = useRef<Float32Array>(new Float32Array(STRIP_COUNT));
  const fractureSeedsRef = useRef<Float32Array>(new Float32Array(STRIP_COUNT));
  const initializedRef = useRef(false);

  const initStars = useCallback((w: number, h: number) => {
    starsRef.current = generateStars(w, h);
    if (!initializedRef.current) {
      for (let i = 0; i < STRIP_COUNT; i++) {
        foldSeedsRef.current[i] = Math.random() * Math.PI * 2;
        fractureSeedsRef.current[i] = Math.random();
      }
      initializedRef.current = true;
    }
  }, []);

  const computeStrips = useCallback(
    (
      layerIndex: number,
      canvasWidth: number,
      canvasHeight: number,
      time: number,
      geoIndex: number,
      solarWind: number,
    ): StripData[] => {
      const layer = AURORA_LAYERS[layerIndex];
      const strips: StripData[] = [];
      const curtainWidth = STRIP_COUNT * STRIP_WIDTH;
      const startX = (canvasWidth - curtainWidth) / 2;
      const baseTopY = canvasHeight * layer.yOffset;

      const swingAmplitude = lerp(5, 30, (solarWind - 1) / 99);
      const swingFreq = lerp(0.2, 1.0, (solarWind - 1) / 99);
      const breathAmplitude = lerp(5, 15, layerIndex === 0 ? 1 : layerIndex === 1 ? 0.6 : 0.3);
      const breathPeriod = lerp(3, 8, Math.random());
      const foldDensity = Math.floor(geoIndex / 10 * STRIP_COUNT / 10);

      for (let i = 0; i < STRIP_COUNT; i++) {
        const t = i / STRIP_COUNT;
        const [colorR, colorG, colorB] = getAuroraColor(geoIndex, t);

        const x = startX + i * STRIP_WIDTH;
        const swingOffset = Math.sin(time * swingFreq * Math.PI * 2 + i * 0.05) * swingAmplitude;
        const breathOffset = Math.sin(time / breathPeriod * Math.PI * 2 + i * 0.03) * breathAmplitude;

        const topY = baseTopY + breathOffset + swingOffset;
        const bottomY = topY + layer.height;

        const jaggedOffsets = new Float32Array(VERTICAL_SAMPLES);
        for (let j = 0; j < VERTICAL_SAMPLES; j++) {
          const jt = j / VERTICAL_SAMPLES;
          const sine1 = Math.sin(time * 0.7 * layer.speed + i * 0.08 + jt * 3) * 4;
          const sine2 = Math.sin(time * 1.3 * layer.speed + i * 0.12 + jt * 5) * 2;
          const sine3 = Math.sin(time * 0.3 * layer.speed + i * 0.2 + jt * 8) * 1.5;
          const noise = (Math.sin(i * 17.3 + j * 23.7 + time * 0.5) * 0.5 + 0.5) * 2 - 1;
          jaggedOffsets[j] = sine1 + sine2 + sine3 + noise;
        }

        const isFoldStrip = i % Math.max(1, Math.floor(STRIP_COUNT / (foldDensity + 1))) === 0;
        const foldOffset = isFoldStrip
          ? Math.sin(foldSeedsRef.current[i] + time * 0.5) * 8
          : 0;

        const fractureProbability = geoIndex > 3 ? (geoIndex - 3) / 14 : 0;
        const hasFracture = fractureSeedsRef.current[i] < fractureProbability;
        const fractureY = layer.height * (0.3 + fractureSeedsRef.current[i] * 0.4);
        const fractureHeight = lerp(5, 20, fractureSeedsRef.current[i]);

        strips.push({
          x: x + foldOffset,
          topY,
          bottomY,
          jaggedOffsets,
          foldOffset,
          hasFracture,
          fractureY,
          fractureHeight,
          colorR,
          colorG,
          colorB,
        });
      }
      return strips;
    },
    [],
  );

  const spawnFallingParticles = useCallback(
    (
      strips: StripData[],
      geoIndex: number,
      solarWind: number,
      canvasHeight: number,
    ): void => {
      if (geoIndex <= 5) return;

      const count = 1 + Math.floor(Math.random() * 3);
      const currentParticles = fallingParticlesRef.current;
      if (currentParticles.length >= MAX_FALLING_PARTICLES) return;

      for (let i = 0; i < count; i++) {
        if (currentParticles.length >= MAX_FALLING_PARTICLES) break;

        const stripIdx = Math.floor(Math.random() * strips.length);
        const strip = strips[stripIdx];
        if (!strip) continue;

        const spawnY = strip.topY + Math.random() * (strip.bottomY - strip.topY) * 0.6;
        const horizontalDrift = (Math.random() - 0.5) * 100;
        const fallSpeed = lerp(50, 200, (solarWind - 1) / 99);
        const size = 3 + Math.random() * 3;
        const trailLength = 15 + Math.random() * 15;
        const maxLife = trailLength / fallSpeed;

        const particle: FallingParticle = {
          x: strip.x + STRIP_WIDTH / 2,
          y: spawnY,
          vx: horizontalDrift * 0.5,
          vy: fallSpeed,
          color: `rgb(${strip.colorR},${strip.colorG},${strip.colorB})`,
          size,
          trail: [],
          life: maxLife,
          maxLife,
        };

        currentParticles.push(particle);
      }
    },
    [],
  );

  const updateFallingParticles = useCallback(
    (dt: number, canvasHeight: number): FallingParticle[] => {
      const particles = fallingParticlesRef.current;
      const alive: FallingParticle[] = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life -= dt;
        if (p.life <= 0 || p.y > canvasHeight + 50) continue;

        const dtSec = dt;
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;
        p.vy += 20 * dtSec;
        p.vx *= 0.999;

        p.trail.push({ x: p.x, y: p.y, alpha: Math.min(1, p.life / (p.maxLife * 0.5)) });
        if (p.trail.length > 20) {
          p.trail.shift();
        }

        alive.push(p);
      }

      fallingParticlesRef.current = alive;
      return alive;
    },
    [],
  );

  const getParticleCount = useCallback((): number => {
    return fallingParticlesRef.current.length + STRIP_COUNT * VERTICAL_SAMPLES * AURORA_LAYERS.length;
  }, []);

  const resetParticles = useCallback((): void => {
    fallingParticlesRef.current = [];
  }, []);

  return {
    initStars,
    starsRef,
    computeStrips,
    spawnFallingParticles,
    updateFallingParticles,
    getParticleCount,
    resetParticles,
    AURORA_LAYERS,
    STRIP_COUNT,
    STRIP_WIDTH,
    VERTICAL_SAMPLES,
    MAX_TOTAL_PARTICLES,
  };
}

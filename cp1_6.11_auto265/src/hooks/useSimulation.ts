import { useRef, useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  EnvironmentParams,
  Shrimp,
  BacteriaPatch,
  SmokeParticle,
  ExchangeParticle,
  SimulationStats,
  ENV_DEFAULTS,
  OPTIMAL_ZONE,
  SHRIMP_CONFIG,
  PATCH_CONFIG,
  VENT_CONFIG,
  EXCHANGE_CONFIG,
  BACTERIA_COLORS,
  clamp,
  distance,
  randomRange,
  lerpColor,
  rgbToHex,
} from '../utils/constants';

interface SimulationState {
  shrimps: Shrimp[];
  patches: BacteriaPatch[];
  smokeParticles: SmokeParticle[];
  exchangeParticles: ExchangeParticle[];
  stats: SimulationStats;
  ventX: number;
  ventY: number;
  canvasWidth: number;
  canvasHeight: number;
}

export function useSimulation(
  canvasWidth: number,
  canvasHeight: number,
  envParams: EnvironmentParams
) {
  const stateRef = useRef<SimulationState | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [stats, setStats] = useState<SimulationStats>({
    shrimpCount: SHRIMP_CONFIG.count,
    bacteriaCoverage: 0,
    symbiosisCount: 0,
    bacteriaWithShrimp: 0,
  });
  const symbiosisCountRef = useRef<number>(0);
  const smokeAccumulatorRef = useRef<number>(0);

  const initSimulation = useCallback(() => {
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;

    const patches: BacteriaPatch[] = [];
    for (let i = 0; i < PATCH_CONFIG.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = randomRange(60, PATCH_CONFIG.spreadRadius);
      const colorIndex = Math.floor(Math.random() * BACTERIA_COLORS.length);
      const color = BACTERIA_COLORS[colorIndex];
      const baseRadius = randomRange(PATCH_CONFIG.minRadius, PATCH_CONFIG.maxRadius);
      
      patches.push({
        id: uuidv4(),
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        radius: baseRadius,
        baseRadius: baseRadius,
        color: rgbToHex(color.r, color.g, color.b),
        colorRGB: { ...color },
        glowIntensity: randomRange(PATCH_CONFIG.glowMin, PATCH_CONFIG.glowMax),
        growthRate: 0,
        hue: (colorIndex / BACTERIA_COLORS.length) * 360,
      });
    }

    const shrimps: Shrimp[] = [];
    for (let i = 0; i < SHRIMP_CONFIG.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = randomRange(100, Math.min(canvasWidth, canvasHeight) * 0.4);
      
      shrimps.push({
        id: uuidv4(),
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        angle: Math.random() * Math.PI * 2,
        speed: SHRIMP_CONFIG.baseSpeed,
        baseSpeed: SHRIMP_CONFIG.baseSpeed,
        bodyLength: SHRIMP_CONFIG.bodyLength,
        bodyWidth: SHRIMP_CONFIG.bodyWidth,
        color: '#f8bbd0',
        colorPhase: Math.random() * Math.PI * 2,
        glowIntensity: 0.5,
        bacteriaColor: null,
        bacteriaColorRGB: null,
        bacteriaSize: 0,
        maxBacteriaSize: SHRIMP_CONFIG.bodyWidth * SHRIMP_CONFIG.maxBacteriaMultiplier,
        isMarked: false,
        trail: [],
        onPatchTime: 0,
        currentPatchId: null,
        hasBacteria: false,
        antennaPhase: Math.random() * Math.PI * 2,
      });
    }

    stateRef.current = {
      shrimps,
      patches,
      smokeParticles: [],
      exchangeParticles: [],
      stats: {
        shrimpCount: SHRIMP_CONFIG.count,
        bacteriaCoverage: 0,
        symbiosisCount: 0,
        bacteriaWithShrimp: 0,
      },
      ventX: centerX,
      ventY: centerY,
      canvasWidth,
      canvasHeight,
    };

    symbiosisCountRef.current = 0;
  }, [canvasWidth, canvasHeight]);

  const getTemperatureAt = useCallback((x: number, y: number): number => {
    if (!stateRef.current) return envParams.temperature;
    
    const dist = distance(x, y, stateRef.current.ventX, stateRef.current.ventY);
    const maxDist = 300;
    const tempFactor = Math.max(0, 1 - dist / maxDist);
    
    const baseTemp = 10;
    const ventTemp = envParams.temperature;
    
    return baseTemp + (ventTemp - baseTemp) * tempFactor;
  }, [envParams.temperature]);

  const getPhAt = useCallback((x: number, y: number): number => {
    if (!stateRef.current) return envParams.ph;
    
    const dist = distance(x, y, stateRef.current.ventX, stateRef.current.ventY);
    const maxDist = 250;
    const phFactor = Math.max(0, 1 - dist / maxDist);
    
    const basePh = 7.5;
    const ventPh = envParams.ph;
    
    return basePh + (ventPh - basePh) * phFactor;
  }, [envParams.ph]);

  const getSulfideAt = useCallback((x: number, y: number): number => {
    if (!stateRef.current) return envParams.sulfide;
    
    const dist = distance(x, y, stateRef.current.ventX, stateRef.current.ventY);
    const maxDist = 200;
    const sulfideFactor = Math.max(0, 1 - dist / maxDist);
    
    const baseSulfide = 0.05;
    const ventSulfide = envParams.sulfide;
    
    return baseSulfide + (ventSulfide - baseSulfide) * sulfideFactor;
  }, [envParams.sulfide]);

  const calculateFitness = useCallback((temp: number, ph: number): number => {
    const tempOptimal = (OPTIMAL_ZONE.temperature.min + OPTIMAL_ZONE.temperature.max) / 2;
    const tempRange = (OPTIMAL_ZONE.temperature.max - OPTIMAL_ZONE.temperature.min) / 2;
    const tempDiff = Math.abs(temp - tempOptimal);
    const tempFitness = Math.max(0, 1 - tempDiff / (tempRange * 1.5));
    
    const phOptimal = (OPTIMAL_ZONE.ph.min + OPTIMAL_ZONE.ph.max) / 2;
    const phRange = (OPTIMAL_ZONE.ph.max - OPTIMAL_ZONE.ph.min) / 2;
    const phDiff = Math.abs(ph - phOptimal);
    const phFitness = Math.max(0, 1 - phDiff / (phRange * 1.5));
    
    return tempFitness * 0.6 + phFitness * 0.4;
  }, []);

  const updateShrimp = useCallback((shrimp: Shrimp, deltaTime: number) => {
    if (!stateRef.current) return;
    
    const temp = getTemperatureAt(shrimp.x, shrimp.y);
    const ph = getPhAt(shrimp.x, shrimp.y);
    const fitness = calculateFitness(temp, ph);
    
    if (fitness < 0.8) {
      const ventX = stateRef.current.ventX;
      const ventY = stateRef.current.ventY;
      const toVentAngle = Math.atan2(ventY - shrimp.y, ventX - shrimp.x);
      
      let angleDiff = toVentAngle - shrimp.angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      const turnAmount = SHRIMP_CONFIG.turnSpeed * (1 - fitness) * 3;
      shrimp.angle += clamp(angleDiff, -turnAmount, turnAmount);
    }
    
    if (Math.random() < SHRIMP_CONFIG.randomTurnChance) {
      shrimp.angle += (Math.random() - 0.5) * 0.3;
    }
    
    const speedMultiplier = shrimp.hasBacteria ? SHRIMP_CONFIG.speedBoost : 1;
    shrimp.speed = shrimp.baseSpeed * speedMultiplier * (0.8 + fitness * 0.4);
    
    shrimp.x += Math.cos(shrimp.angle) * shrimp.speed * deltaTime * 0.06;
    shrimp.y += Math.sin(shrimp.angle) * shrimp.speed * deltaTime * 0.06;
    
    const margin = 20;
    if (shrimp.x < margin) {
      shrimp.x = margin;
      shrimp.angle = Math.PI - shrimp.angle + (Math.random() - 0.5) * 0.2;
    }
    if (shrimp.x > stateRef.current.canvasWidth - margin) {
      shrimp.x = stateRef.current.canvasWidth - margin;
      shrimp.angle = Math.PI - shrimp.angle + (Math.random() - 0.5) * 0.2;
    }
    if (shrimp.y < margin) {
      shrimp.y = margin;
      shrimp.angle = -shrimp.angle + (Math.random() - 0.5) * 0.2;
    }
    if (shrimp.y > stateRef.current.canvasHeight - margin) {
      shrimp.y = stateRef.current.canvasHeight - margin;
      shrimp.angle = -shrimp.angle + (Math.random() - 0.5) * 0.2;
    }
    
    shrimp.colorPhase += deltaTime * 0.003;
    shrimp.antennaPhase += deltaTime * 0.005;
    
    shrimp.glowIntensity = 0.3 + Math.sin(shrimp.colorPhase) * 0.2;
    if (shrimp.hasBacteria) {
      shrimp.glowIntensity *= SHRIMP_CONFIG.glowBoost;
    }
    
    if (shrimp.isMarked) {
      shrimp.trail.push({ x: shrimp.x, y: shrimp.y, age: 0 });
      if (shrimp.trail.length > SHRIMP_CONFIG.trailMaxLength) {
        shrimp.trail.shift();
      }
      shrimp.trail.forEach(t => t.age++);
    }
    
    let onPatch = false;
    for (const patch of stateRef.current.patches) {
      const dist = distance(shrimp.x, shrimp.y, patch.x, patch.y);
      if (dist < patch.radius) {
        onPatch = true;
        shrimp.currentPatchId = patch.id;
        shrimp.onPatchTime += deltaTime;
        
        if (shrimp.onPatchTime >= SHRIMP_CONFIG.bacteriaGrowTime && !shrimp.hasBacteria) {
          shrimp.hasBacteria = true;
          shrimp.bacteriaColor = patch.color;
          shrimp.bacteriaColorRGB = { ...patch.colorRGB };
          shrimp.bacteriaSize = shrimp.maxBacteriaSize * 0.3;
        } else if (shrimp.hasBacteria && shrimp.bacteriaSize < shrimp.maxBacteriaSize) {
          shrimp.bacteriaSize = Math.min(
            shrimp.maxBacteriaSize,
            shrimp.bacteriaSize + deltaTime * 0.005
          );
        }
        break;
      }
    }
    
    if (!onPatch) {
      shrimp.currentPatchId = null;
      shrimp.onPatchTime = Math.max(0, shrimp.onPatchTime - deltaTime * 0.5);
    }
  }, [getTemperatureAt, getPhAt, calculateFitness]);

  const updatePatches = useCallback((deltaTime: number) => {
    if (!stateRef.current) return;
    
    for (const patch of stateRef.current.patches) {
      const temp = getTemperatureAt(patch.x, patch.y);
      const ph = getPhAt(patch.x, patch.y);
      const sulfide = getSulfideAt(patch.x, patch.y);
      
      const tempOptimal = 55;
      const tempRange = 25;
      const tempFactor = Math.max(0, 1 - Math.abs(temp - tempOptimal) / tempRange);
      
      const phOptimal = 5.0;
      const phRange = 2.0;
      const phFactor = Math.max(0, 1 - Math.abs(ph - phOptimal) / phRange);
      
      const sulfideFactor = Math.min(1, sulfide / 3.0);
      
      const growth = (tempFactor * 0.4 + phFactor * 0.3 + sulfideFactor * 0.3);
      patch.growthRate = growth;
      
      const targetRadius = patch.baseRadius * (0.5 + growth * 1.2);
      patch.radius += (targetRadius - patch.radius) * deltaTime * 0.001;
      patch.radius = Math.max(PATCH_CONFIG.minRadius * 0.5, Math.min(PATCH_CONFIG.maxRadius * 1.5, patch.radius));
      
      patch.glowIntensity = PATCH_CONFIG.glowMin + growth * (PATCH_CONFIG.glowMax - PATCH_CONFIG.glowMin);
    }
  }, [getTemperatureAt, getPhAt, getSulfideAt]);

  const updateSmoke = useCallback((deltaTime: number) => {
    if (!stateRef.current) return;
    
    const { ventX, ventY } = stateRef.current;
    
    const temp = envParams.temperature;
    const sulfide = envParams.sulfide;
    
    const smokeRate = VENT_CONFIG.smokeRate * (0.5 + (sulfide / 5) * 1.5);
    smokeAccumulatorRef.current += smokeRate * deltaTime * 0.06;
    
    while (smokeAccumulatorRef.current >= 1) {
      smokeAccumulatorRef.current -= 1;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = VENT_CONFIG.smokeSpeed * (0.5 + Math.random());
      
      const highTempFactor = clamp((temp - 50) / 45, 0, 1);
      const highSulfideFactor = clamp((sulfide - 2) / 3, 0, 1);
      
      const r = Math.round(255 * (1 - highTempFactor * 0.5) + 92 * highTempFactor * 0.5);
      const g = Math.round(255 * (1 - highTempFactor * 0.6) + 138 * highTempFactor * 0.6);
      const b = Math.round(255 * (1 - highTempFactor * 0.3) + 138 * highTempFactor * 0.7);
      
      const grayAmount = highSulfideFactor * 0.4;
      const gray = (r + g + b) / 3;
      const finalR = Math.round(r * (1 - grayAmount) + gray * grayAmount);
      const finalG = Math.round(g * (1 - grayAmount) + gray * grayAmount);
      const finalB = Math.round(b * (1 - grayAmount) + gray * grayAmount);
      
      stateRef.current.smokeParticles.push({
        id: uuidv4(),
        x: ventX + Math.cos(angle) * 15,
        y: ventY - 30 + Math.sin(angle) * 10,
        vx: Math.cos(angle) * 0.3 + (Math.random() - 0.5) * 0.5,
        vy: -speed,
        life: 0,
        maxLife: VENT_CONFIG.smokeMaxLife * (0.8 + Math.random() * 0.4),
        size: VENT_CONFIG.smokeStartSize,
        color: { r: finalR, g: finalG, b: finalB },
      });
    }
    
    stateRef.current.smokeParticles = stateRef.current.smokeParticles.filter(p => {
      p.life += deltaTime * 0.06;
      p.x += p.vx;
      p.y += p.vy;
      p.vy *= 0.99;
      p.size += 0.15;
      
      return p.life < p.maxLife;
    });
  }, [envParams.temperature, envParams.sulfide]);

  const checkShrimpCollisions = useCallback(() => {
    if (!stateRef.current) return;
    
    const shrimps = stateRef.current.shrimps;
    
    for (let i = 0; i < shrimps.length; i++) {
      for (let j = i + 1; j < shrimps.length; j++) {
        const a = shrimps[i];
        const b = shrimps[j];
        
        const dist = distance(a.x, a.y, b.x, b.y);
        const collisionDist = a.bodyWidth + b.bodyWidth + (a.hasBacteria ? a.bacteriaSize : 0) + (b.hasBacteria ? b.bacteriaSize : 0);
        
        if (dist < collisionDist && a.hasBacteria && b.hasBacteria && a.bacteriaColor !== b.bacteriaColor) {
          if (a.bacteriaColorRGB && b.bacteriaColorRGB) {
            const mixedColor = lerpColor(a.bacteriaColorRGB, b.bacteriaColorRGB, 0.5);
            const mixedHex = rgbToHex(mixedColor.r, mixedColor.g, mixedColor.b);
            
            const exchangeId = uuidv4();
            const particles = [];
            for (let k = 0; k < EXCHANGE_CONFIG.particleCount; k++) {
              const angle = (k / EXCHANGE_CONFIG.particleCount) * Math.PI * 2;
              particles.push({
                angle,
                distance: 0,
                speed: randomRange(0.5, 1.5),
                size: randomRange(2, 5),
                color: k % 2 === 0 ? a.bacteriaColor! : b.bacteriaColor!,
              });
            }
            
            stateRef.current.exchangeParticles.push({
              id: exchangeId,
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              radius: 0,
              maxRadius: EXCHANGE_CONFIG.maxRadius,
              color: mixedHex,
              life: 0,
              maxLife: EXCHANGE_CONFIG.duration,
              particles,
            });
            
            a.bacteriaColorRGB = { ...mixedColor };
            a.bacteriaColor = mixedHex;
            b.bacteriaColorRGB = { ...mixedColor };
            b.bacteriaColor = mixedHex;
            
            symbiosisCountRef.current++;
          }
        }
      }
    }
  }, []);

  const updateExchangeParticles = useCallback((deltaTime: number) => {
    if (!stateRef.current) return;
    
    stateRef.current.exchangeParticles = stateRef.current.exchangeParticles.filter(p => {
      p.life += deltaTime;
      const progress = p.life / p.maxLife;
      p.radius = p.maxRadius * Math.sin(progress * Math.PI);
      
      p.particles.forEach(particle => {
        particle.distance += particle.speed * deltaTime * 0.05;
      });
      
      return p.life < p.maxLife;
    });
  }, []);

  const updateStats = useCallback(() => {
    if (!stateRef.current) return;
    
    const shrimps = stateRef.current.shrimps;
    const patches = stateRef.current.patches;
    
    const bacteriaWithShrimp = shrimps.filter(s => s.hasBacteria).length;
    
    let totalPatchArea = 0;
    for (const patch of patches) {
      totalPatchArea += Math.PI * patch.radius * patch.radius;
    }
    const canvasArea = stateRef.current.canvasWidth * stateRef.current.canvasHeight;
    const coverage = Math.min(100, (totalPatchArea / canvasArea) * 100);
    
    const newStats: SimulationStats = {
      shrimpCount: shrimps.length,
      bacteriaCoverage: parseFloat(coverage.toFixed(1)),
      symbiosisCount: symbiosisCountRef.current,
      bacteriaWithShrimp,
    };
    
    stateRef.current.stats = newStats;
    setStats(newStats);
  }, []);

  const gameLoop = useCallback((timestamp: number) => {
    if (!stateRef.current) return;
    
    const deltaTime = Math.min(timestamp - lastTimeRef.current, 50);
    lastTimeRef.current = timestamp;
    
    for (const shrimp of stateRef.current.shrimps) {
      updateShrimp(shrimp, deltaTime);
    }
    
    updatePatches(deltaTime);
    updateSmoke(deltaTime);
    checkShrimpCollisions();
    updateExchangeParticles(deltaTime);
    updateStats();
    
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [updateShrimp, updatePatches, updateSmoke, checkShrimpCollisions, updateExchangeParticles, updateStats]);

  const toggleMarkShrimp = useCallback((shrimpId: string) => {
    if (!stateRef.current) return;
    
    const shrimp = stateRef.current.shrimps.find(s => s.id === shrimpId);
    if (shrimp) {
      shrimp.isMarked = !shrimp.isMarked;
      if (!shrimp.isMarked) {
        shrimp.trail = [];
      }
    }
  }, []);

  const getShrimpAtPosition = useCallback((x: number, y: number): Shrimp | null => {
    if (!stateRef.current) return null;
    
    let closest: Shrimp | null = null;
    let closestDist = Infinity;
    
    for (const shrimp of stateRef.current.shrimps) {
      const dist = distance(x, y, shrimp.x, shrimp.y);
      const hitRadius = shrimp.bodyLength / 2 + shrimp.bacteriaSize + 5;
      
      if (dist < hitRadius && dist < closestDist) {
        closest = shrimp;
        closestDist = dist;
      }
    }
    
    return closest;
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  useEffect(() => {
    initSimulation();
    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initSimulation, gameLoop]);

  useEffect(() => {
    if (stateRef.current) {
      stateRef.current.canvasWidth = canvasWidth;
      stateRef.current.canvasHeight = canvasHeight;
      stateRef.current.ventX = canvasWidth / 2;
      stateRef.current.ventY = canvasHeight / 2;
    }
  }, [canvasWidth, canvasHeight]);

  return {
    stats,
    getState,
    toggleMarkShrimp,
    getShrimpAtPosition,
  };
}

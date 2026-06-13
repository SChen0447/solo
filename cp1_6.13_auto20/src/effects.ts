import type { Particle } from './particle';

export interface IMouseState {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  speed: number;
  smoothedSpeed: number;
  clickX: number;
  clickY: number;
  explosionTime: number;
}

const VORTEX_RADIUS = 180;
const VORTEX_RADIUS_SQ = VORTEX_RADIUS * VORTEX_RADIUS;
const ATTRACT_STRENGTH = 0.4;
const TANGENT_STRENGTH = 0.8;
const EXPLOSION_DURATION = 1.5;
const EXPLOSION_STRENGTH = 15;
const EXPLOSION_RADIUS = 400;
const EXPLOSION_RADIUS_SQ = EXPLOSION_RADIUS * EXPLOSION_RADIUS;

export function createMouseState(): IMouseState {
  return {
    x: -9999,
    y: -9999,
    prevX: -9999,
    prevY: -9999,
    speed: 0,
    smoothedSpeed: 0,
    clickX: 0,
    clickY: 0,
    explosionTime: 0,
  };
}

export function updateMouseSpeed(mouse: IMouseState, dt: number): void {
  if (mouse.prevX > -9000 && mouse.prevY > -9000 && mouse.x > -9000 && mouse.y > -9000) {
    const dx = mouse.x - mouse.prevX;
    const dy = mouse.y - mouse.prevY;
    mouse.speed = Math.sqrt(dx * dx + dy * dy) / Math.max(dt, 0.001) / 100;
    mouse.speed = Math.min(mouse.speed, 5);
  } else {
    mouse.speed = 0;
  }
  
  mouse.smoothedSpeed += (mouse.speed - mouse.smoothedSpeed) * 0.15;
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
}

export function applyVortexEffect(
  particle: Particle,
  mouse: IMouseState,
  dt: number
): void {
  if (mouse.x < -9000 || mouse.y < -9000) return;

  const dx = particle.x - mouse.x;
  const dy = particle.y - mouse.y;
  const distSq = dx * dx + dy * dy;

  if (distSq < VORTEX_RADIUS_SQ) {
    const dist = Math.sqrt(distSq) + 0.001;
    const normX = dx / dist;
    const normY = dy / dist;
    
    const falloff = 1 - dist / VORTEX_RADIUS;
    const falloffSq = falloff * falloff;
    
    const attractForce = ATTRACT_STRENGTH * falloffSq * dt * 60;
    particle.vx -= normX * attractForce;
    particle.vy -= normY * attractForce;
    
    const speedFactor = Math.max(mouse.smoothedSpeed, 0.3);
    const tangentForce = TANGENT_STRENGTH * falloff * speedFactor * dt * 60;
    particle.vx += -normY * tangentForce;
    particle.vy += normX * tangentForce;
  }
}

export function triggerExplosion(
  mouse: IMouseState,
  x: number,
  y: number
): void {
  mouse.clickX = x;
  mouse.clickY = y;
  mouse.explosionTime = EXPLOSION_DURATION;
}

export function applyExplosionEffect(
  particle: Particle,
  mouse: IMouseState,
  dt: number
): void {
  if (mouse.explosionTime <= 0) return;

  const progress = 1 - mouse.explosionTime / EXPLOSION_DURATION;
  
  const dx = particle.x - mouse.clickX;
  const dy = particle.y - mouse.clickY;
  const distSq = dx * dx + dy * dy;

  if (distSq < EXPLOSION_RADIUS_SQ) {
    const dist = Math.sqrt(distSq) + 0.001;
    const normX = dx / dist;
    const normY = dy / dist;
    
    const radiusFalloff = 1 - dist / EXPLOSION_RADIUS;
    
    if (progress < 0.3) {
      const timeFalloff = 1 - progress / 0.3;
      const force = EXPLOSION_STRENGTH * radiusFalloff * timeFalloff * dt * 60;
      particle.vx += normX * force;
      particle.vy += normY * force;
    }
    
    if (particle.explosionPhase < 0.1) {
      particle.explosionPhase = EXPLOSION_DURATION;
    }
  }
}

export function drawExplosionGlow(
  ctx: CanvasRenderingContext2D,
  mouse: IMouseState
): void {
  if (mouse.explosionTime <= 0) return;

  const progress = 1 - mouse.explosionTime / EXPLOSION_DURATION;
  const alpha = (1 - progress) * 0.6;
  const radius = 50 + progress * EXPLOSION_RADIUS * 0.8;

  const gradient = ctx.createRadialGradient(
    mouse.clickX, mouse.clickY, 0,
    mouse.clickX, mouse.clickY, radius
  );
  
  gradient.addColorStop(0, `rgba(251, 191, 36, ${alpha})`);
  gradient.addColorStop(0.3, `rgba(249, 115, 22, ${alpha * 0.6})`);
  gradient.addColorStop(0.6, `rgba(239, 68, 68, ${alpha * 0.3})`);
  gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.arc(mouse.clickX, mouse.clickY, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function drawVortexGlow(
  ctx: CanvasRenderingContext2D,
  mouse: IMouseState
): void {
  if (mouse.x < -9000 || mouse.y < -9000) return;
  if (mouse.smoothedSpeed < 0.1) return;

  const alpha = Math.min(mouse.smoothedSpeed * 0.1, 0.25);
  const radius = VORTEX_RADIUS * (0.8 + mouse.smoothedSpeed * 0.1);

  const gradient = ctx.createRadialGradient(
    mouse.x, mouse.y, 0,
    mouse.x, mouse.y, radius
  );
  
  gradient.addColorStop(0, `rgba(147, 51, 234, ${alpha * 0.3})`);
  gradient.addColorStop(0.4, `rgba(6, 182, 212, ${alpha * 0.2})`);
  gradient.addColorStop(0.7, `rgba(236, 72, 153, ${alpha * 0.1})`);
  gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

  ctx.globalCompositeOperation = 'screen';
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

export function updateExplosionTime(mouse: IMouseState, dt: number): void {
  if (mouse.explosionTime > 0) {
    mouse.explosionTime -= dt;
    if (mouse.explosionTime < 0) mouse.explosionTime = 0;
  }
}

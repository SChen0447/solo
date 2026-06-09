import { PARTICLE_PALETTE } from './types';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export function createWelcomeAnimation(container: HTMLElement, onComplete: () => void): void {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  resize();
  window.addEventListener('resize', resize);

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  const circleDuration = 2000;
  const circleStart = performance.now();
  const maxRadius = 200;
  const minRadius = 10;

  const particles: Particle[] = [];
  let particlesSpawned = false;

  function spawnParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 2,
        color: PARTICLE_PALETTE[Math.floor(Math.random() * PARTICLE_PALETTE.length)],
        alpha: 1,
        life: 0,
        maxLife: 1200 + Math.random() * 600
      });
    }
  }

  let animationId: number;

  function animate(currentTime: number): void {
    const elapsed = currentTime - circleStart;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (elapsed < circleDuration) {
      const progress = elapsed / circleDuration;
      const eased = easeOutExpo(progress);
      const radius = minRadius + (maxRadius - minRadius) * eased;

      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      gradient.addColorStop(0, '#F4D03F');
      gradient.addColorStop(1, '#E74C3C');

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 1 - eased * 0.8;
      ctx.fill();
      ctx.globalAlpha = 1;

      if (progress > 0.6 && !particlesSpawned) {
        spawnParticles(80);
        particlesSpawned = true;
      }
    }

    let allParticlesDead = true;
    for (const p of particles) {
      p.life += 16;
      if (p.life < p.maxLife) {
        allParticlesDead = false;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.alpha = 1 - p.life / p.maxLife;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    if (elapsed >= circleDuration && (particles.length === 0 || allParticlesDead)) {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      canvas.remove();
      onComplete();
      return;
    }

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function fadeIn(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      setTimeout(resolve, duration);
    });
  });
}

export function fadeOut(element: HTMLElement, duration: number = 300): Promise<void> {
  return new Promise((resolve) => {
    element.style.opacity = '1';
    element.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      element.style.opacity = '0';
      setTimeout(() => {
        element.style.display = 'none';
        resolve();
      }, duration);
    });
  });
}

export function pulseAnimation(element: HTMLElement): void {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = 'pulse-highlight 0.3s ease-in-out 3';
}

export function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, baseRadius: number = 30, glowRadius: number = 40): void {
  const gradient = ctx.createRadialGradient(x, y, baseRadius, x, y, glowRadius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'transparent');
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.6;
  ctx.fill();
  ctx.globalAlpha = 1;
}

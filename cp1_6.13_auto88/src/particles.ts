export interface TeaParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  angle: number;
  wobble: number;
  wobbleSpeed: number;
  color: string;
  vortexX: number;
  vortexY: number;
  inVortex: boolean;
  vortexProgress: number;
  originalX: number;
  originalY: number;
}

export interface ParticleState {
  particles: TeaParticle[];
  maxParticles: number;
  vortexActive: boolean;
  vortexX: number;
  vortexY: number;
  vortexTimer: number;
  vortexDuration: number;
}

const TEA_COLORS = [
  '#2d4a2d',
  '#3d5a3d',
  '#4a6b4a',
  '#8b7355',
  '#a08060',
  '#6b8e23',
  '#556b2f',
];

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function createParticleState(maxParticles: number = 100): ParticleState {
  return {
    particles: [],
    maxParticles,
    vortexActive: false,
    vortexX: 0,
    vortexY: 0,
    vortexTimer: 0,
    vortexDuration: 3000,
  };
}

function createParticle(canvasWidth: number, canvasHeight: number): TeaParticle {
  const size = 3 + Math.random() * 2;
  const color = TEA_COLORS[Math.floor(Math.random() * TEA_COLORS.length)];
  const x = Math.random() * canvasWidth;
  const y = -20 - Math.random() * canvasHeight * 0.3;
  return {
    x,
    y,
    originalX: x,
    originalY: y,
    size,
    speed: (40 + Math.random() * 40) / 60,
    angle: (Math.random() - 0.5) * 0.2,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.02 + Math.random() * 0.03,
    color,
    vortexX: 0,
    vortexY: 0,
    inVortex: false,
    vortexProgress: 0,
  };
}

export function spawnParticles(
  state: ParticleState,
  canvasWidth: number,
  canvasHeight: number,
  count: number = 2
): void {
  for (let i = 0; i < count && state.particles.length < state.maxParticles; i++) {
    state.particles.push(createParticle(canvasWidth, canvasHeight));
  }
}

export function startVortex(
  state: ParticleState,
  x: number,
  y: number
): void {
  state.vortexActive = true;
  state.vortexX = x;
  state.vortexY = y;
  state.vortexTimer = 0;
  
  for (const p of state.particles) {
    p.vortexX = x;
    p.vortexY = y;
    p.inVortex = true;
    p.vortexProgress = 0;
    p.originalX = p.x;
    p.originalY = p.y;
  }
}

export function updateParticles(
  state: ParticleState,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const dt = deltaTime / 16.67;

  if (state.vortexActive) {
    state.vortexTimer += deltaTime;
    if (state.vortexTimer >= state.vortexDuration) {
      state.vortexActive = false;
      for (const p of state.particles) {
        p.inVortex = false;
      }
    }
  }

  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];

    if (p.inVortex && state.vortexActive) {
      p.vortexProgress += dt * 0.015;
      const progress = Math.min(p.vortexProgress, 1);
      const eased = easeInOut(progress);
      
      const dx = state.vortexX - p.x;
      const dy = state.vortexY - p.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist > 5) {
        const targetAngle = Math.atan2(dy, dx) + 0.15 * dt;
        const targetDist = 30 + Math.sin(p.vortexProgress * 10) * 10;
        p.x += (state.vortexX + Math.cos(targetAngle) * targetDist - p.x) * 0.1 * dt;
        p.y += (state.vortexY + Math.sin(targetAngle) * targetDist - p.y) * 0.1 * dt;
      } else {
        const angle = Math.atan2(p.y - state.vortexY, p.x - state.vortexX) + 0.2 * dt;
        p.x = state.vortexX + Math.cos(angle) * (20 + Math.sin(p.vortexProgress * 8) * 8);
        p.y = state.vortexY + Math.sin(angle) * (20 + Math.sin(p.vortexProgress * 8) * 8);
      }
      
      p.angle += 0.05 * dt;
    } else {
      p.wobble += p.wobbleSpeed * dt;
      p.x += Math.sin(p.wobble) * 0.5 * dt;
      p.y += p.speed * dt;
      p.angle += (Math.random() - 0.5) * 0.01 * dt;
    }

    if (p.y > canvasHeight + 50 || p.x < -50 || p.x > canvasWidth + 50) {
      state.particles.splice(i, 1);
    }
  }

  if (Math.random() < 0.05) {
    spawnParticles(state, canvasWidth, canvasHeight, 1);
  }
}

export function renderParticles(
  ctx: CanvasRenderingContext2D,
  state: ParticleState
): void {
  ctx.save();
  
  for (const p of state.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(-p.size * 0.8, 0);
    ctx.lineTo(p.size * 0.8, 0);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
    
    ctx.restore();
  }
  
  if (state.vortexActive) {
    const progress = state.vortexTimer / state.vortexDuration;
    const alpha = progress < 0.8 ? 0.3 : 0.3 * (1 - (progress - 0.8) / 0.2);
    
    ctx.globalAlpha = alpha * 0.3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const r = 30 + i * 20 + Math.sin(Date.now() / 200 + i) * 5;
      ctx.arc(state.vortexX, state.vortexY, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 80, 50, 0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

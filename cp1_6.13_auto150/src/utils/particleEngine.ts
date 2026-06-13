import { CharParticleGroup, ParticleOffset } from './textToParticles';
import { ColorTheme, ThemeColor, THEMES, getParticleColor, lerpColor } from './themeColors';

export type AnimState = 'idle' | 'dragging' | 'returning' | 'exploding' | 'gathering' | 'spiraling';

export interface Particle {
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  size: number;
  color: ThemeColor;
  targetColor: ThemeColor;
  colorDelay: number;
  colorTransitionStart: number;
  animState: AnimState;
  animStartTime: number;
  animStartX: number;
  animStartY: number;
  groupIndex: number;
  particleIndex: number;
}

export interface CharGroup {
  char: string;
  x: number;
  y: number;
  particles: Particle[];
  animState: AnimState;
  animStartTime: number;
  dragOffsetX: number;
  dragOffsetY: number;
}

const RETURN_DURATION = 1500;
const EXPLODE_DURATION = 1000;
const GATHER_DURATION = 2000;
const SPIRAL_DURATION = 1000;
const COLOR_TRANSITION_DURATION = 2000;
const MAX_COLOR_DELAY = 500;
const CONNECTION_DISTANCE = 80;
const EXPLODE_RADIUS = 150;
const HOVER_LINE_ALPHA = 0.7;
const NORMAL_LINE_ALPHA = 0.3;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function createCharGroups(
  charData: CharParticleGroup[],
  themeName: string,
  isSpiral: boolean = false
): CharGroup[] {
  const theme = THEMES.find((t) => t.name === themeName) || THEMES[0];

  return charData.map((cd, gi) => {
    const totalP = cd.particles.length;
    const particles: Particle[] = cd.particles.map((p, pi) => {
      const targetColor = getParticleColor(theme, pi, totalP);
      const startColor: ThemeColor = { r: 255, g: 255, b: 255 };

      const spiralX = isSpiral ? randomRange(-300, 300) : cd.x + p.x;
      const spiralY = isSpiral ? randomRange(-200, 200) : cd.y + p.y;

      return {
        offsetX: p.x,
        offsetY: p.y,
        currentX: isSpiral ? spiralX : cd.x + p.x,
        currentY: isSpiral ? spiralY : cd.y + p.y,
        size: randomRange(2, 4),
        color: startColor,
        targetColor,
        colorDelay: Math.random() * MAX_COLOR_DELAY,
        colorTransitionStart: 0,
        animState: isSpiral ? 'spiraling' : 'idle',
        animStartTime: isSpiral ? performance.now() + Math.random() * 200 : 0,
        animStartX: isSpiral ? spiralX : cd.x + p.x,
        animStartY: isSpiral ? spiralY : cd.y + p.y,
        groupIndex: gi,
        particleIndex: pi,
      };
    });

    return {
      char: cd.char,
      x: cd.x,
      y: cd.y,
      particles,
      animState: isSpiral ? 'spiraling' : 'idle',
      animStartTime: isSpiral ? performance.now() : 0,
      dragOffsetX: 0,
      dragOffsetY: 0,
    };
  });
}

export function updateParticlePositions(
  groups: CharGroup[],
  now: number,
  mouseX: number,
  mouseY: number,
  isMouseOnCanvas: boolean
): void {
  for (const group of groups) {
    const targetGX = group.x;
    const targetGY = group.y;

    for (const p of group.particles) {
      const targetX = targetGX + p.offsetX;
      const targetY = targetGY + p.offsetY;

      switch (p.animState) {
        case 'idle': {
          p.currentX = targetX;
          p.currentY = targetY;
          break;
        }
        case 'dragging': {
          break;
        }
        case 'returning': {
          const elapsed = now - p.animStartTime;
          const progress = Math.min(elapsed / RETURN_DURATION, 1);
          const eased = easeOut(progress);
          const dx = targetX - p.animStartX;
          const dy = targetY - p.animStartY;
          const baseX = p.animStartX + dx * eased;
          const baseY = p.animStartY + dy * eased;
          const sineAmp = 15 * (1 - eased);
          const sineFreq = 6;
          p.currentX = baseX + Math.sin(progress * Math.PI * sineFreq) * sineAmp;
          p.currentY = baseY + Math.cos(progress * Math.PI * sineFreq * 0.7) * sineAmp * 0.5;

          if (progress >= 1) {
            p.animState = 'idle';
            p.currentX = targetX;
            p.currentY = targetY;
          }
          break;
        }
        case 'exploding': {
          const elapsed = now - p.animStartTime;
          const progress = Math.min(elapsed / EXPLODE_DURATION, 1);
          const eased = easeOut(progress);
          p.currentX = p.animStartX + (p.animStartX - targetX + (p.animStartX - targetX === 0 ? randomRange(-1, 1) : 0)) * eased * (EXPLODE_RADIUS / Math.max(1, Math.abs(p.animStartX - targetX + p.offsetY)));
          p.currentY = p.animStartY + (p.animStartY - targetY + (p.animStartY - targetY === 0 ? randomRange(-1, 1) : 0)) * eased * (EXPLODE_RADIUS / Math.max(1, Math.abs(p.animStartY - targetY + p.offsetX)));

          if (progress >= 1) {
            p.animState = 'gathering';
            p.animStartTime = now;
            p.animStartX = p.currentX;
            p.animStartY = p.currentY;
          }
          break;
        }
        case 'gathering': {
          const elapsed = now - p.animStartTime;
          const progress = Math.min(elapsed / GATHER_DURATION, 1);
          const eased = easeInOut(progress);
          p.currentX = p.animStartX + (targetX - p.animStartX) * eased;
          p.currentY = p.animStartY + (targetY - p.animStartY) * eased;

          if (progress >= 1) {
            p.animState = 'idle';
            p.currentX = targetX;
            p.currentY = targetY;
          }
          break;
        }
        case 'spiraling': {
          const elapsed = now - p.animStartTime;
          const progress = Math.min(elapsed / SPIRAL_DURATION, 1);
          const eased = easeInOut(progress);

          const angle = progress * Math.PI * 4;
          const radiusFactor = (1 - eased) * 50 * (0.5 + Math.random() * 0.5);
          const spiralOffX = Math.cos(angle + p.particleIndex * 0.1) * radiusFactor;
          const spiralOffY = Math.sin(angle + p.particleIndex * 0.1) * radiusFactor;

          p.currentX = p.animStartX + (targetX - p.animStartX) * eased + spiralOffX * (1 - eased);
          p.currentY = p.animStartY + (targetY - p.animStartY) * eased + spiralOffY * (1 - eased);

          if (progress >= 1) {
            p.animState = 'idle';
            p.currentX = targetX;
            p.currentY = targetY;
          }
          break;
        }
      }
    }
  }
}

export function updateColorTransitions(
  groups: CharGroup[],
  now: number,
  transitionStartTime: number
): void {
  for (const group of groups) {
    for (const p of group.particles) {
      const effectiveStart = transitionStartTime + p.colorDelay;
      if (now < effectiveStart) return;

      const elapsed = now - effectiveStart;
      const progress = Math.min(elapsed / COLOR_TRANSITION_DURATION, 1);
      p.color = lerpColor(p.color, p.targetColor, progress * 0.15);
    }
  }
}

export function explodeGroup(group: CharGroup, now: number): void {
  const cx = group.x;
  const cy = group.y;

  for (const p of group.particles) {
    const targetX = cx + p.offsetX;
    const targetY = cy + p.offsetY;
    const dx = p.currentX - targetX;
    const dy = p.currentY - targetY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const dirX = dx / dist;
    const dirY = dy / dist;

    p.animState = 'exploding';
    p.animStartTime = now;
    p.animStartX = p.currentX;
    p.animStartY = p.currentY;
    p.offsetX = p.offsetX;
    p.offsetY = p.offsetY;

    (p as any)._explodeDirX = dirX + (Math.random() - 0.5) * 0.5;
    (p as any)._explodeDirY = dirY + (Math.random() - 0.5) * 0.5;
    (p as any)._explodeBaseX = p.currentX;
    (p as any)._explodeBaseY = p.currentY;
    (p as any)._explodeTargetX = targetX;
    (p as any)._explodeTargetY = targetY;
  }

  group.animState = 'exploding';
  group.animStartTime = now;
}

export function applyExplodeDirections(groups: CharGroup[], now: number): void {
  for (const group of groups) {
    if (group.animState !== 'exploding') continue;

    for (const p of group.particles) {
      if (p.animState !== 'exploding') continue;

      const elapsed = now - p.animStartTime;
      const progress = Math.min(elapsed / EXPLODE_DURATION, 1);
      const eased = easeOut(progress);

      const dirX = (p as any)._explodeDirX || 0;
      const dirY = (p as any)._explodeDirY || 0;

      p.currentX = (p as any)._explodeBaseX + dirX * EXPLODE_RADIUS * eased;
      p.currentY = (p as any)._explodeBaseY + dirY * EXPLODE_RADIUS * eased;

      if (progress >= 1) {
        p.animState = 'gathering';
        p.animStartTime = now;
        p.animStartX = p.currentX;
        p.animStartY = p.currentY;
      }
    }

    const allGatheringOrDone = group.particles.every(
      (p) => p.animState !== 'exploding'
    );
    if (allGatheringOrDone) {
      group.animState = 'gathering';
    }

    const allIdle = group.particles.every((p) => p.animState === 'idle');
    if (allIdle && group.animState === 'gathering') {
      group.animState = 'idle';
    }
  }
}

export function startReturnAnimation(group: CharGroup, now: number): void {
  for (const p of group.particles) {
    p.animState = 'returning';
    p.animStartTime = now;
    p.animStartX = p.currentX;
    p.animStartY = p.currentY;
  }
  group.animState = 'returning';
}

export function changeTheme(
  groups: CharGroup[],
  newThemeName: string,
  now: number
): void {
  const theme = THEMES.find((t) => t.name === newThemeName);
  if (!theme) return;

  for (const group of groups) {
    const totalP = group.particles.length;
    for (const p of group.particles) {
      p.targetColor = getParticleColor(theme, p.particleIndex, totalP);
      p.colorDelay = Math.random() * MAX_COLOR_DELAY;
      p.colorTransitionStart = now;
    }
  }
}

export function renderCanvas(
  ctx: CanvasRenderingContext2D,
  groups: CharGroup[],
  now: number,
  mouseX: number,
  mouseY: number,
  isMouseOnCanvas: boolean,
  scaleFactor: number = 1
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const connDist = CONNECTION_DISTANCE * scaleFactor;

  const allParticles: { x: number; y: number; color: ThemeColor; groupIdx: number }[] = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    for (const p of g.particles) {
      allParticles.push({
        x: p.currentX,
        y: p.currentY,
        color: p.color,
        groupIdx: gi,
      });
    }
  }

  ctx.lineWidth = 1 * scaleFactor;
  for (let i = 0; i < allParticles.length; i++) {
    const a = allParticles[i];
    for (let j = i + 1; j < allParticles.length; j++) {
      const b = allParticles[j];
      if (a.groupIdx !== b.groupIdx) continue;

      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = dx * dx + dy * dy;

      if (dist < connDist * connDist) {
        const isHovered =
          isMouseOnCanvas &&
          (Math.abs(a.x - mouseX) < 20 * scaleFactor ||
            Math.abs(b.x - mouseX) < 20 * scaleFactor) &&
          (Math.abs(a.y - mouseY) < 20 * scaleFactor ||
            Math.abs(b.y - mouseY) < 20 * scaleFactor);

        const alpha = isHovered ? HOVER_LINE_ALPHA : NORMAL_LINE_ALPHA;
        const c = a.color;
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const group of groups) {
    for (const p of group.particles) {
      const c = p.color;
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.beginPath();
      ctx.arc(p.currentX, p.currentY, p.size * scaleFactor * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function exportToPNG(
  groups: CharGroup[],
  themeName: string
): string {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 1920;
  exportCanvas.height = 1080;
  const ctx = exportCanvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 1920, 1080);

  const scaleX = 1920 / (ctx.canvas.width * 0.9);
  const scaleY = 1080 / (ctx.canvas.height * 0.7);

  ctx.lineWidth = 1;
  const connDist = CONNECTION_DISTANCE;

  const allParticles: { x: number; y: number; color: ThemeColor; groupIdx: number }[] = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    for (const p of g.particles) {
      allParticles.push({
        x: p.currentX,
        y: p.currentY,
        color: p.color,
        groupIdx: gi,
      });
    }
  }

  for (let i = 0; i < allParticles.length; i++) {
    const a = allParticles[i];
    for (let j = i + 1; j < allParticles.length; j++) {
      const b = allParticles[j];
      if (a.groupIdx !== b.groupIdx) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = dx * dx + dy * dy;
      if (dist < connDist * connDist) {
        const c = a.color;
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.3)`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  for (const group of groups) {
    for (const p of group.particles) {
      const c = p.color;
      ctx.fillStyle = `rgb(${c.r},${c.g},${c.b})`;
      ctx.beginPath();
      ctx.arc(p.currentX, p.currentY, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return exportCanvas.toDataURL('image/png');
}

export function findGroupAtPosition(
  groups: CharGroup[],
  x: number,
  y: number
): number {
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    for (const p of g.particles) {
      const dx = p.currentX - x;
      const dy = p.currentY - y;
      if (dx * dx + dy * dy < 400) {
        return i;
      }
    }
  }
  return -1;
}

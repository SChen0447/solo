import {
  CONSTELLATIONS,
  Star,
  generateBackgroundStars,
  generateConstellationStars,
  AnimationState,
  easeOut
} from './constellation';

export interface AstrolabeState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  discRadius: number;
  pointerAngle: number;
  targetAngle: number;
  discRotation: number;
  isDragging: boolean;
  backgroundStars: Star[];
  canvasWidth: number;
  canvasHeight: number;
  flashPhase: number;
  flashConstellationId: number | null;
  mobile: boolean;
}

export function createAstrolabe(canvas: HTMLCanvasElement): AstrolabeState {
  const rect = canvas.getBoundingClientRect();
  const width = canvas.width;
  const height = canvas.height;
  const mobile = window.innerWidth < 768;
  const discRadius = mobile ? 140 : 200;

  CONSTELLATIONS.forEach((c, i) => {
    c.stars = generateConstellationStars(i, width / 2, height / 2, discRadius * 0.9);
    c.explored = false;
    c.discoveredAt = null;
  });

  return {
    canvas,
    ctx: canvas.getContext('2d')!,
    centerX: width / 2,
    centerY: height / 2 - 30,
    discRadius,
    pointerAngle: -90,
    targetAngle: -90,
    discRotation: 0,
    isDragging: false,
    backgroundStars: generateBackgroundStars(200, width, height),
    canvasWidth: width,
    canvasHeight: height,
    flashPhase: 0,
    flashConstellationId: null,
    mobile
  };
}

export function regenerateBackgroundStars(state: AstrolabeState): void {
  const count = 150 + Math.floor(Math.random() * 100);
  state.backgroundStars = generateBackgroundStars(count, state.canvasWidth, state.canvasHeight);
}

export function drawBackground(state: AstrolabeState, time: number): void {
  const { ctx, canvasWidth, canvasHeight, backgroundStars } = state;

  const grad = ctx.createRadialGradient(
    canvasWidth / 2, canvasHeight / 2, 0,
    canvasWidth / 2, canvasHeight / 2, canvasWidth * 0.7
  );
  grad.addColorStop(0, '#1b263b');
  grad.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  for (const star of backgroundStars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 0.002 + star.twinklePhase);
    const alpha = star.brightness * twinkle;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }
}

export function drawDisc(state: AstrolabeState, time: number, highlightedId: number | null): void {
  const { ctx, centerX, centerY, discRadius, discRotation, flashPhase } = state;

  ctx.save();
  ctx.translate(centerX, centerY);

  for (let r = discRadius + 30; r > discRadius; r -= 2) {
    const alpha = ((r - discRadius) / 30) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(168, 118, 58, ${alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const outerGrad = ctx.createRadialGradient(0, 0, discRadius - 10, 0, 0, discRadius + 10);
  outerGrad.addColorStop(0, '#8b5a2b');
  outerGrad.addColorStop(0.5, '#a8763a');
  outerGrad.addColorStop(1, '#6b4423');
  ctx.beginPath();
  ctx.arc(0, 0, discRadius, 0, Math.PI * 2);
  ctx.fillStyle = outerGrad;
  ctx.fill();

  const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, discRadius - 15);
  innerGrad.addColorStop(0, '#1b263b');
  innerGrad.addColorStop(0.7, '#0d1b2a');
  innerGrad.addColorStop(1, '#1b263b');
  ctx.beginPath();
  ctx.arc(0, 0, discRadius - 15, 0, Math.PI * 2);
  ctx.fillStyle = innerGrad;
  ctx.fill();

  ctx.save();
  ctx.rotate(discRotation);

  const twelveRingGrad = ctx.createRadialGradient(0, 0, discRadius * 0.85, 0, 0, discRadius * 0.95);
  twelveRingGrad.addColorStop(0, '#6b4423');
  twelveRingGrad.addColorStop(0.5, '#a8763a');
  twelveRingGrad.addColorStop(1, '#6b4423');
  ctx.beginPath();
  ctx.arc(0, 0, discRadius * 0.9, 0, Math.PI * 2);
  ctx.strokeStyle = twelveRingGrad;
  ctx.lineWidth = 3;
  ctx.stroke();

  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isHighlighted = highlightedId === i;

    const flashAlpha = state.flashConstellationId === i ? Math.abs(Math.sin(flashPhase * Math.PI)) : 0;
    const baseColor = isHighlighted ? '#ffd700' : '#a8763a';
    const flashColor = flashAlpha > 0 ? `rgba(255, 215, 0, ${flashAlpha})` : null;

    const startX = Math.cos(angle) * discRadius * 0.8;
    const startY = Math.sin(angle) * discRadius * 0.8;
    const endX = Math.cos(angle) * discRadius * 0.95;
    const endY = Math.sin(angle) * discRadius * 0.95;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = isHighlighted ? 3 : 2;
    ctx.strokeStyle = flashColor || baseColor;
    if (isHighlighted) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    const textAngle = angle;
    const textR = discRadius * 0.68;
    const textX = Math.cos(textAngle) * textR;
    const textY = Math.sin(textAngle) * textR;

    ctx.save();
    ctx.translate(textX, textY);
    ctx.rotate(textAngle + Math.PI / 2);
    ctx.font = `${isHighlighted ? 20 : 16}px "Ma Shan Zheng", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = flashColor || baseColor;
    if (isHighlighted) {
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
    }
    ctx.fillText(CONSTELLATIONS[i].ancientText, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    const numAngle = angle;
    const numR = discRadius * 0.55;
    const numX = Math.cos(numAngle) * numR;
    const numY = Math.sin(numAngle) * numR;

    ctx.save();
    ctx.translate(numX, numY);
    ctx.rotate(numAngle + Math.PI / 2);
    ctx.font = `${isHighlighted ? 12 : 10}px "Noto Serif SC", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isHighlighted ? 'rgba(255, 215, 0, 0.6)' : 'rgba(168, 118, 58, 0.5)';
    ctx.fillText(CONSTELLATIONS[i].name.charAt(0) + CONSTELLATIONS[i].name.slice(-1), 0, 0);
    ctx.restore();
  }

  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
    const startX = Math.cos(angle) * discRadius * 0.87;
    const startY = Math.sin(angle) * discRadius * 0.87;
    const endX = Math.cos(angle) * discRadius * 0.95;
    const endY = Math.sin(angle) * discRadius * 0.95;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(168, 118, 58, 0.4)';
    ctx.stroke();
  }

  ctx.restore();

  const innerDecorGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, discRadius * 0.25);
  innerDecorGrad.addColorStop(0, '#a8763a');
  innerDecorGrad.addColorStop(0.7, '#8b5a2b');
  innerDecorGrad.addColorStop(1, '#6b4423');
  ctx.beginPath();
  ctx.arc(0, 0, discRadius * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = innerDecorGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, discRadius * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1b2a';
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * discRadius * 0.15;
    const y = Math.sin(angle) * discRadius * 0.15;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  const centerGrad = ctx.createRadialGradient(0, -2, 0, 0, 0, 6);
  centerGrad.addColorStop(0, '#ffd700');
  centerGrad.addColorStop(1, '#a8763a');
  ctx.fillStyle = centerGrad;
  ctx.fill();
  ctx.strokeStyle = '#6b4423';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

export function drawPointer(state: AstrolabeState): void {
  const { ctx, centerX, centerY, pointerAngle, discRadius } = state;
  const pointerLength = state.mobile ? 130 : 200;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate((pointerAngle * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(-12, -8);
  ctx.lineTo(pointerLength * 0.7, -2);
  ctx.lineTo(pointerLength, 0);
  ctx.lineTo(pointerLength * 0.7, 2);
  ctx.lineTo(-12, 8);
  ctx.closePath();

  const pointerGrad = ctx.createLinearGradient(0, -8, 0, 8);
  pointerGrad.addColorStop(0, '#c0c0c0');
  pointerGrad.addColorStop(0.3, '#e8e8e8');
  pointerGrad.addColorStop(0.5, '#ffffff');
  pointerGrad.addColorStop(0.7, '#e8e8e8');
  pointerGrad.addColorStop(1, '#808080');
  ctx.fillStyle = pointerGrad;
  ctx.fill();
  ctx.strokeStyle = '#606060';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pointerLength, 0, state.mobile ? 6 : 8, 0, Math.PI * 2);
  const rubyGrad = ctx.createRadialGradient(pointerLength - 2, -2, 0, pointerLength, 0, state.mobile ? 6 : 8);
  rubyGrad.addColorStop(0, '#ff6b6b');
  rubyGrad.addColorStop(0.4, '#e63946');
  rubyGrad.addColorStop(0.7, '#c1121f');
  rubyGrad.addColorStop(1, '#780000');
  ctx.fillStyle = rubyGrad;
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pointerLength - 3, -3, 2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fill();

  ctx.restore();
}

export function drawConstellations(
  state: AstrolabeState,
  animState: AnimationState,
  time: number
): { x: number; y: number; id: number; idx: number; radius: number }[] {
  const { ctx, centerX, centerY } = state;
  const allStars: { x: number; y: number; id: number; idx: number; radius: number }[] = [];

  for (let i = 0; i < CONSTELLATIONS.length; i++) {
    const constellation = CONSTELLATIONS[i];
    const cState = animState.constellationStates.get(i);

    if (!cState) continue;

    const opacity = cState.dimmed ? 0.5 : 1;
    ctx.save();
    ctx.globalAlpha = opacity;

    const appearOffset = (1 - easeOut(cState.appearProgress)) * 60;

    for (let j = 0; j < constellation.stars.length; j++) {
      const star = constellation.stars[j];
      const scale = 0.2 + 0.8 * easeOut(cState.appearProgress);
      const dx = star.x - centerX;
      const dy = star.y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normX = dx / dist;
      const normY = dy / dist;
      const displayX = star.x - normX * appearOffset;
      const displayY = star.y - normY * appearOffset;
      const displayRadius = star.radius * scale;

      if (displayRadius > 0.5) {
        ctx.beginPath();
        ctx.arc(displayX, displayY, displayRadius + 1.5, 0, Math.PI * 2);
        const glowGrad = ctx.createRadialGradient(displayX, displayY, 0, displayX, displayY, displayRadius + 1.5);
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
        glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(displayX, displayY, displayRadius, 0, Math.PI * 2);
        const twinkle = 0.7 + 0.3 * Math.sin(time * 0.003 + i * 0.5 + j);
        ctx.fillStyle = cState.dimmed
          ? `rgba(255, 215, 0, ${0.5 * twinkle})`
          : `rgba(255, 215, 0, ${twinkle})`;
        ctx.fill();
      }

      if (!star.explored && cState.appearProgress >= 1) {
        allStars.push({
          x: displayX,
          y: displayY,
          id: i,
          idx: j,
          radius: displayRadius + 5
        });
      }
    }

    if (cState.lineProgress > 0) {
      const maxLines = Math.floor(constellation.connections.length * cState.lineProgress);
      const lineFrac = (constellation.connections.length * cState.lineProgress) - maxLines;

      ctx.lineWidth = 1;
      ctx.strokeStyle = cState.dimmed ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.6)';

      for (let c = 0; c < maxLines; c++) {
        const [a, b] = constellation.connections[c];
        if (a < constellation.stars.length && b < constellation.stars.length) {
          const sA = constellation.stars[a];
          const sB = constellation.stars[b];
          ctx.beginPath();
          ctx.moveTo(sA.x, sA.y);
          ctx.lineTo(sB.x, sB.y);
          ctx.stroke();
        }
      }

      if (maxLines < constellation.connections.length && lineFrac > 0) {
        const [a, b] = constellation.connections[maxLines];
        if (a < constellation.stars.length && b < constellation.stars.length) {
          const sA = constellation.stars[a];
          const sB = constellation.stars[b];
          const midX = sA.x + (sB.x - sA.x) * lineFrac;
          const midY = sA.y + (sB.y - sA.y) * lineFrac;
          ctx.beginPath();
          ctx.moveTo(sA.x, sA.y);
          ctx.lineTo(midX, midY);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }

  return allStars;
}

export function drawRipples(state: AstrolabeState, animState: AnimationState): void {
  const { ctx } = state;

  for (const ripple of animState.ripples) {
    ctx.beginPath();
    ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(ripple.x, ripple.y, 0, ripple.x, ripple.y, ripple.radius);
    grad.addColorStop(0, `rgba(255, 215, 0, 0)`);
    grad.addColorStop(0.5, `rgba(255, 215, 0, ${ripple.alpha * 0.5})`);
    grad.addColorStop(1, `rgba(255, 215, 0, 0)`);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

export function drawMeteors(state: AstrolabeState, animState: AnimationState): void {
  const { ctx } = state;

  for (const meteor of animState.meteors) {
    if (meteor.trail.length > 1) {
      for (let i = 1; i < meteor.trail.length; i++) {
        const t = i / meteor.trail.length;
        const prev = meteor.trail[i - 1];
        const curr = meteor.trail[i];
        const r = Math.floor(255 * (1 - t) + 255 * t);
        const g = Math.floor(215 * (1 - t) + 102 * t);
        const b = Math.floor(0 * (1 - t) + 0 * t);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${t})`;
        ctx.lineWidth = t * 2;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, 3, 0, Math.PI * 2);
    const meteorGrad = ctx.createRadialGradient(meteor.x, meteor.y, 0, meteor.x, meteor.y, 6);
    meteorGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    meteorGrad.addColorStop(0.3, 'rgba(255, 215, 0, 0.8)');
    meteorGrad.addColorStop(1, 'rgba(255, 102, 0, 0)');
    ctx.fillStyle = meteorGrad;
    ctx.fill();
  }
}

export function updateAstrolabe(state: AstrolabeState, dt: number): void {
  const diff = state.targetAngle - state.pointerAngle;
  state.pointerAngle += diff * Math.min(dt * 5, 1);
  state.discRotation = -((state.pointerAngle + 90) * Math.PI) / 180;

  if (state.flashConstellationId !== null) {
    state.flashPhase += dt * 4;
    if (state.flashPhase >= 3) {
      state.flashPhase = 0;
      state.flashConstellationId = null;
    }
  }
}

export function getConstellationIndexAtAngle(angle: number): number {
  let normalized = ((angle + 90) % 360 + 360) % 360;
  return Math.floor(normalized / 30);
}

export function resizeAstrolabe(state: AstrolabeState, width: number, height: number): void {
  state.canvas.width = width;
  state.canvas.height = height;
  state.canvasWidth = width;
  state.canvasHeight = height;
  state.mobile = window.innerWidth < 768;
  state.discRadius = state.mobile ? 140 : 200;
  state.centerX = width / 2;
  state.centerY = height / 2 - 30;
  state.backgroundStars = generateBackgroundStars(200, width, height);

  CONSTELLATIONS.forEach((c, i) => {
    c.stars = generateConstellationStars(i, state.centerX, state.centerY, state.discRadius * 0.9);
  });
}

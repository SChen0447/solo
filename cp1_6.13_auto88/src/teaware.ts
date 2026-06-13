export type TeawareId = 'teapot' | 'teacup' | 'hecha' | 'chasen';

export interface Teaware {
  id: TeawareId;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  targetScale: number;
  hover: boolean;
  highlightPos: number;
  glowPhase: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  progress: number;
}

export interface WaterStream {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  active: boolean;
  duration: number;
  elapsed: number;
}

export interface TeawareState {
  teawares: Teaware[];
  ripples: Ripple[];
  waterStream: WaterStream | null;
  step: number;
  stepNames: string[];
  stepCompleted: boolean[];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createTeawareState(canvasWidth: number, canvasHeight: number): TeawareState {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const offsetX = canvasWidth * 0.18;
  const offsetY = canvasHeight * 0.15;

  return {
    teawares: [
      {
        id: 'teapot',
        x: centerX - offsetX,
        y: centerY - offsetY,
        width: 120,
        height: 100,
        scale: 1,
        targetScale: 1,
        hover: false,
        highlightPos: 0,
        glowPhase: 0,
      },
      {
        id: 'teacup',
        x: centerX + offsetX,
        y: centerY - offsetY,
        width: 100,
        height: 80,
        scale: 1,
        targetScale: 1,
        hover: false,
        highlightPos: 0.5,
        glowPhase: Math.PI / 2,
      },
      {
        id: 'hecha',
        x: centerX - offsetX,
        y: centerY + offsetY,
        width: 110,
        height: 60,
        scale: 1,
        targetScale: 1,
        hover: false,
        highlightPos: 0.25,
        glowPhase: Math.PI,
      },
      {
        id: 'chasen',
        x: centerX + offsetX,
        y: centerY + offsetY,
        width: 80,
        height: 120,
        scale: 1,
        targetScale: 1,
        hover: false,
        highlightPos: 0.75,
        glowPhase: Math.PI * 1.5,
      },
    ],
    ripples: [],
    waterStream: null,
    step: 0,
    stepNames: ['温器', '投茶', '注水', '出汤', '分杯'],
    stepCompleted: [false, false, false, false, false],
  };
}

export function updateLayout(
  state: TeawareState,
  canvasWidth: number,
  canvasHeight: number
): void {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const offsetX = canvasWidth * 0.18;
  const offsetY = canvasHeight * 0.15;

  const positions: Record<TeawareId, { x: number; y: number }> = {
    teapot: { x: centerX - offsetX, y: centerY - offsetY },
    teacup: { x: centerX + offsetX, y: centerY - offsetY },
    hecha: { x: centerX - offsetX, y: centerY + offsetY },
    chasen: { x: centerX + offsetX, y: centerY + offsetY },
  };

  for (const t of state.teawares) {
    const pos = positions[t.id];
    t.x = pos.x;
    t.y = pos.y;
  }
}

export function getTeawareAt(
  state: TeawareState,
  x: number,
  y: number
): Teaware | null {
  for (const t of state.teawares) {
    const halfW = (t.width * t.scale) / 2;
    const halfH = (t.height * t.scale) / 2;
    if (x >= t.x - halfW && x <= t.x + halfW && y >= t.y - halfH && y <= t.y + halfH) {
      return t;
    }
  }
  return null;
}

export function setHover(
  state: TeawareState,
  teaware: Teaware | null
): void {
  for (const t of state.teawares) {
    t.hover = t === teaware;
    t.targetScale = t.hover ? 1.05 : 1;
  }
}

export function startWaterStream(
  state: TeawareState,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): void {
  state.waterStream = {
    startX: fromX,
    startY: fromY,
    endX: toX,
    endY: toY,
    progress: 0,
    active: true,
    duration: 1500,
    elapsed: 0,
  };
}

export function addRipple(
  state: TeawareState,
  x: number,
  y: number,
  maxRadius: number = 80
): void {
  state.ripples.push({
    x,
    y,
    radius: 5,
    maxRadius,
    opacity: 0.6,
    progress: 0,
  });
}

export function handleTeawareClick(
  state: TeawareState,
  teaware: Teaware
): { action: string; x: number; y: number } | null {
  if (state.step === 0 && !state.stepCompleted[0]) {
    state.stepCompleted[0] = true;
    state.step = 1;
    return null;
  }

  if (teaware.id === 'hecha' && state.step === 1 && !state.stepCompleted[1]) {
    state.stepCompleted[1] = true;
    state.step = 2;
    return { action: 'dropTea', x: teaware.x, y: teaware.y };
  }

  if (teaware.id === 'teapot' && state.step === 2 && !state.stepCompleted[2]) {
    state.stepCompleted[2] = true;
    state.step = 3;
    const teacup = state.teawares.find(t => t.id === 'teacup');
    if (teacup) {
      startWaterStream(state, teaware.x + 50, teaware.y, teacup.x, teacup.y + 10);
      setTimeout(() => {
        addRipple(state, teacup.x, teacup.y + 10, 100);
      }, 1500);
    }
    return { action: 'pourWater', x: teaware.x, y: teaware.y };
  }

  if (teaware.id === 'chasen' && state.step === 3 && !state.stepCompleted[3]) {
    state.stepCompleted[3] = true;
    state.step = 4;
    return { action: 'vortex', x: teaware.x, y: teaware.y };
  }

  if (teaware.id === 'teacup' && state.step === 4 && !state.stepCompleted[4]) {
    state.stepCompleted[4] = true;
    state.step = 5;
    addRipple(state, teaware.x, teaware.y + 10, 60);
    return { action: 'serve', x: teaware.x, y: teaware.y };
  }

  return null;
}

export function updateTeawares(
  state: TeawareState,
  deltaTime: number
): void {
  const dt = deltaTime / 16.67;

  for (const t of state.teawares) {
    const scaleDiff = t.targetScale - t.scale;
    t.scale += scaleDiff * 0.15 * dt;
    
    t.glowPhase += deltaTime / 1000 * Math.PI;
    
    if (t.hover) {
      t.highlightPos = (t.highlightPos + deltaTime / 1000) % 1;
    }
  }

  if (state.waterStream && state.waterStream.active) {
    state.waterStream.elapsed += deltaTime;
    state.waterStream.progress = Math.min(state.waterStream.elapsed / state.waterStream.duration, 1);
    
    if (state.waterStream.progress >= 1) {
      state.waterStream.active = false;
    }
  }

  for (let i = state.ripples.length - 1; i >= 0; i--) {
    const r = state.ripples[i];
    r.progress += deltaTime / 2000;
    r.radius = lerp(5, r.maxRadius, easeInOut(r.progress));
    r.opacity = 0.6 * (1 - easeInOut(r.progress));
    
    if (r.progress >= 1) {
      state.ripples.splice(i, 1);
    }
  }
}

function drawTeapot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  highlightPos: number
): void {
  ctx.save();
  
  ctx.beginPath();
  ctx.ellipse(x, y + h * 0.2, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
  const bodyGradient = ctx.createRadialGradient(
    x - w * 0.1, y, 0,
    x, y + h * 0.2, w * 0.4
  );
  bodyGradient.addColorStop(0, '#5a4a3a');
  bodyGradient.addColorStop(0.5, '#3a2a1a');
  bodyGradient.addColorStop(1, '#1a0a00');
  ctx.fillStyle = bodyGradient;
  ctx.fill();
  ctx.strokeStyle = '#0a0500';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.1, w * 0.2, h * 0.08, 0, 0, Math.PI * 2);
  const lidGradient = ctx.createRadialGradient(
    x - w * 0.05, y - h * 0.12, 0,
    x, y - h * 0.1, w * 0.2
  );
  lidGradient.addColorStop(0, '#6a5a4a');
  lidGradient.addColorStop(0.5, '#4a3a2a');
  lidGradient.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = lidGradient;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - h * 0.15, w * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#5a4a3a';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y);
  ctx.quadraticCurveTo(x - w * 0.5, y - h * 0.1, x - w * 0.45, y + h * 0.1);
  ctx.quadraticCurveTo(x - w * 0.4, y + h * 0.25, x - w * 0.3, y + h * 0.25);
  const handleGradient = ctx.createLinearGradient(
    x - w * 0.5, y,
    x - w * 0.3, y + h * 0.25
  );
  handleGradient.addColorStop(0, '#5a4a3a');
  handleGradient.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = handleGradient;
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, y - h * 0.05);
  ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.1, x + w * 0.55, y);
  ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.05, x + w * 0.35, y + h * 0.05);
  const spoutGradient = ctx.createLinearGradient(
    x + w * 0.3, y - h * 0.05,
    x + w * 0.55, y
  );
  spoutGradient.addColorStop(0, '#5a4a3a');
  spoutGradient.addColorStop(1, '#2a1a0a');
  ctx.fillStyle = spoutGradient;
  ctx.fill();
  ctx.stroke();

  const highlightX = x - w * 0.2 + highlightPos * w * 0.4;
  ctx.beginPath();
  ctx.ellipse(highlightX, y, w * 0.08, h * 0.15, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 240, 220, 0.25)';
  ctx.fill();

  ctx.restore();
}

function drawTeacup(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  highlightPos: number
): void {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y - h * 0.3);
  ctx.quadraticCurveTo(x - w * 0.35, y + h * 0.4, x - w * 0.25, y + h * 0.5);
  ctx.lineTo(x + w * 0.25, y + h * 0.5);
  ctx.quadraticCurveTo(x + w * 0.35, y + h * 0.4, x + w * 0.4, y - h * 0.3);
  ctx.closePath();
  
  const cupGradient = ctx.createLinearGradient(
    x - w * 0.4, y - h * 0.3,
    x + w * 0.4, y + h * 0.5
  );
  cupGradient.addColorStop(0, '#f5f0e8');
  cupGradient.addColorStop(0.5, '#e8e0d0');
  cupGradient.addColorStop(1, '#d0c8b8');
  ctx.fillStyle = cupGradient;
  ctx.fill();
  ctx.strokeStyle = '#a09080';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.3, w * 0.4, h * 0.08, 0, 0, Math.PI * 2);
  const teaGradient = ctx.createRadialGradient(
    x, y - h * 0.3, 0,
    x, y - h * 0.3, w * 0.4
  );
  teaGradient.addColorStop(0, '#6a4a2a');
  teaGradient.addColorStop(0.7, '#4a2a0a');
  teaGradient.addColorStop(1, '#2a1a00');
  ctx.fillStyle = teaGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.3, w * 0.4, h * 0.08, 0, 0, Math.PI * 2);
  ctx.strokeStyle = '#c0b8a8';
  ctx.lineWidth = 2;
  ctx.stroke();

  const highlightX = x - w * 0.2 + highlightPos * w * 0.4;
  ctx.beginPath();
  ctx.ellipse(highlightX, y, w * 0.06, h * 0.2, -0.1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();

  ctx.restore();
}

function drawHecha(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  highlightPos: number
): void {
  ctx.save();

  ctx.beginPath();
  ctx.moveTo(x - w * 0.5, y + h * 0.3);
  ctx.quadraticCurveTo(x - w * 0.55, y - h * 0.2, x - w * 0.3, y - h * 0.3);
  ctx.lineTo(x + w * 0.3, y - h * 0.3);
  ctx.quadraticCurveTo(x + w * 0.55, y - h * 0.2, x + w * 0.5, y + h * 0.3);
  ctx.closePath();
  
  const scoopGradient = ctx.createLinearGradient(
    x - w * 0.5, y - h * 0.3,
    x + w * 0.5, y + h * 0.3
  );
  scoopGradient.addColorStop(0, '#8b7355');
  scoopGradient.addColorStop(0.5, '#6b5a45');
  scoopGradient.addColorStop(1, '#4a3a25');
  ctx.fillStyle = scoopGradient;
  ctx.fill();
  ctx.strokeStyle = '#3a2a15';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x, y - h * 0.1, w * 0.35, h * 0.2, 0, 0.1, Math.PI - 0.1);
  const innerGradient = ctx.createRadialGradient(
    x - w * 0.1, y - h * 0.15, 0,
    x, y - h * 0.1, w * 0.35
  );
  innerGradient.addColorStop(0, '#5a4a35');
  innerGradient.addColorStop(1, '#2a1a05');
  ctx.fillStyle = innerGradient;
  ctx.fill();

  for (let i = 0; i < 8; i++) {
    const tx = x - w * 0.25 + (i % 4) * w * 0.12 + Math.random() * 5;
    const ty = y - h * 0.15 + Math.floor(i / 4) * h * 0.1 + Math.random() * 5;
    ctx.beginPath();
    ctx.ellipse(tx, ty, 4, 2, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? '#3d5a3d' : '#8b7355';
    ctx.fill();
  }

  const handleLen = w * 0.3;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.1);
  ctx.lineTo(x + w * 0.5 + handleLen, y);
  ctx.lineTo(x + w * 0.5 + handleLen, y + h * 0.15);
  ctx.lineTo(x + w * 0.5, y + h * 0.3);
  ctx.closePath();
  const handleGradient = ctx.createLinearGradient(
    x + w * 0.5, y,
    x + w * 0.5 + handleLen, y + h * 0.15
  );
  handleGradient.addColorStop(0, '#6b5a45');
  handleGradient.addColorStop(1, '#4a3a25');
  ctx.fillStyle = handleGradient;
  ctx.fill();
  ctx.stroke();

  const highlightX = x - w * 0.3 + highlightPos * w * 0.6;
  ctx.beginPath();
  ctx.ellipse(highlightX, y - h * 0.05, w * 0.05, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 240, 220, 0.25)';
  ctx.fill();

  ctx.restore();
}

function drawChasen(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  highlightPos: number
): void {
  ctx.save();

  const handleW = w * 0.3;
  const handleH = h * 0.4;
  
  ctx.beginPath();
  ctx.roundRect(x - handleW / 2, y + h * 0.1, handleW, handleH, 5);
  const handleGradient = ctx.createLinearGradient(
    x - handleW / 2, y + h * 0.1,
    x + handleW / 2, y + h * 0.1 + handleH
  );
  handleGradient.addColorStop(0, '#8b7355');
  handleGradient.addColorStop(0.5, '#6b5a45');
  handleGradient.addColorStop(1, '#4a3a25');
  ctx.fillStyle = handleGradient;
  ctx.fill();
  ctx.strokeStyle = '#3a2a15';
  ctx.lineWidth = 1;
  ctx.stroke();

  const headH = h * 0.5;
  const topY = y - h * 0.4;
  
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y + h * 0.1);
  ctx.quadraticCurveTo(x - w * 0.45, topY + headH * 0.2, x - w * 0.35, topY);
  ctx.lineTo(x + w * 0.35, topY);
  ctx.quadraticCurveTo(x + w * 0.45, topY + headH * 0.2, x + w * 0.4, y + h * 0.1);
  ctx.closePath();
  
  const headGradient = ctx.createLinearGradient(
    x - w * 0.4, topY,
    x + w * 0.4, y + h * 0.1
  );
  headGradient.addColorStop(0, '#a08060');
  headGradient.addColorStop(0.5, '#8b7355');
  headGradient.addColorStop(1, '#6b5a45');
  ctx.fillStyle = headGradient;
  ctx.fill();
  ctx.strokeStyle = '#3a2a15';
  ctx.lineWidth = 1;
  ctx.stroke();

  const tineCount = 16;
  for (let i = 0; i < tineCount; i++) {
    const t = i / (tineCount - 1);
    const startX = x - w * 0.35 + t * w * 0.7;
    const startY = topY + 5;
    const endX = startX + (t - 0.5) * w * 0.15;
    const endY = topY - h * 0.15;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(
      startX + (t - 0.5) * w * 0.1,
      (startY + endY) / 2,
      endX,
      endY
    );
    ctx.strokeStyle = '#7a6345';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(endX, endY, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#5a4325';
    ctx.fill();
  }

  const tieY = topY + headH * 0.3;
  ctx.beginPath();
  ctx.roundRect(x - w * 0.38, tieY - 3, w * 0.76, 6, 2);
  ctx.fillStyle = '#c9a86c';
  ctx.fill();
  ctx.strokeStyle = '#8a6830';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  const highlightX = x - w * 0.2 + highlightPos * w * 0.4;
  ctx.beginPath();
  ctx.ellipse(highlightX, y, w * 0.04, h * 0.15, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 240, 220, 0.3)';
  ctx.fill();

  ctx.restore();
}

export function renderTeawares(
  ctx: CanvasRenderingContext2D,
  state: TeawareState
): void {
  for (const t of state.teawares) {
    const glowIntensity = 0.3 + 0.2 * Math.sin(t.glowPhase);
    const glowColor = `rgba(255, ${200 + 55 * Math.sin(t.glowPhase)}, 150, ${glowIntensity * 0.4})`;
    
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 + 10 * Math.sin(t.glowPhase);
    ctx.restore();

    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.scale(t.scale, t.scale);
    ctx.translate(-t.x, -t.y);

    switch (t.id) {
      case 'teapot':
        drawTeapot(ctx, t.x, t.y, t.width, t.height, t.highlightPos);
        break;
      case 'teacup':
        drawTeacup(ctx, t.x, t.y, t.width, t.height, t.highlightPos);
        break;
      case 'hecha':
        drawHecha(ctx, t.x, t.y, t.width, t.height, t.highlightPos);
        break;
      case 'chasen':
        drawChasen(ctx, t.x, t.y, t.width, t.height, t.highlightPos);
        break;
    }

    ctx.restore();
  }
}

export function renderWaterStream(
  ctx: CanvasRenderingContext2D,
  state: TeawareState
): void {
  if (!state.waterStream || !state.waterStream.active) return;

  const ws = state.waterStream;
  const eased = easeInOut(ws.progress);
  
  const currentEndX = lerp(ws.startX, ws.endX, eased);
  const currentEndY = lerp(ws.startY, ws.endY, eased);

  ctx.save();
  
  ctx.beginPath();
  ctx.moveTo(ws.startX, ws.startY);
  
  const midX = (ws.startX + currentEndX) / 2;
  const midY = (ws.startY + currentEndY) / 2 + 30 * Math.sin(eased * Math.PI);
  ctx.quadraticCurveTo(midX, midY, currentEndX, currentEndY);
  
  const streamGradient = ctx.createLinearGradient(
    ws.startX, ws.startY,
    currentEndX, currentEndY
  );
  streamGradient.addColorStop(0, 'rgba(200, 230, 255, 0.7)');
  streamGradient.addColorStop(0.5, 'rgba(180, 220, 255, 0.5)');
  streamGradient.addColorStop(1, 'rgba(150, 200, 255, 0.3)');
  
  ctx.strokeStyle = streamGradient;
  ctx.lineWidth = 8 * (1 - eased * 0.3);
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (eased > 0.3 && eased < 0.9) {
    for (let i = 0; i < 3; i++) {
      const dropT = eased - 0.1 - i * 0.15;
      if (dropT > 0 && dropT < 1) {
        const dropX = lerp(ws.startX, ws.endX, dropT);
        const dropY = lerp(ws.startY, ws.endY, dropT) + 20 * Math.sin(dropT * Math.PI);
        ctx.beginPath();
        ctx.arc(dropX, dropY, 2 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(180, 220, 255, 0.6)';
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

export function renderRipples(
  ctx: CanvasRenderingContext2D,
  state: TeawareState
): void {
  for (const r of state.ripples) {
    ctx.save();
    
    for (let i = 0; i < 3; i++) {
      const rippleRadius = r.radius - i * 15;
      if (rippleRadius < 0) continue;
      
      ctx.beginPath();
      ctx.arc(r.x, r.y, rippleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 200, 255, ${r.opacity * (1 - i * 0.3)})`;
      ctx.lineWidth = 2 - i * 0.5;
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

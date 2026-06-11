import React, { useRef, useEffect, useCallback } from 'react';
import type { RingLevel, Particle, ClickEffect, VinePath } from '../hooks/useGameState';

interface GameCanvasProps {
  levels: RingLevel[];
  currentLevelIndex: number;
  particles: Particle[];
  clickEffects: ClickEffect[];
  dragging: {
    nodeId: string;
    levelIndex: number;
    currentX: number;
    currentY: number;
  } | null;
  onStartDrag: (nodeId: string, levelIndex: number, x: number, y: number) => void;
  onUpdateDrag: (x: number, y: number) => void;
  onEndDrag: () => void;
  width: number;
  height: number;
}

const BG_COLOR_TOP = '#4caf50';
const BG_COLOR_BOTTOM = '#5d4037';
const RING_COLOR_LIGHT = '#d7ccc8';
const RING_COLOR_DARK = '#3e2723';
const NODE_COLOR = '#4fc3f7';
const NODE_GLOW = '#81d4fa';
const VINE_COLOR_START = '#66bb6a';
const VINE_COLOR_END = '#a5d6a7';
const CROWN_GREEN = '#4caf50';
const CROWN_GOLD = '#ffd54f';

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerpColor(a: string, b: string, t: number): string {
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
  const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${rg},${rb})`;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, BG_COLOR_TOP);
  grad.addColorStop(1, BG_COLOR_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(27,59,27,0.6)';
  ctx.fillRect(0, 0, w, h);
}

function drawTreeRings(
  ctx: CanvasRenderingContext2D,
  level: RingLevel,
  cx: number,
  cy: number
) {
  const radius = level.diameter / 2;
  const ringCount = level.ringCount;

  for (let i = ringCount; i >= 1; i--) {
    const ringRadius = (i / ringCount) * radius;
    const t = i / ringCount;
    const ringWidth = 8 + t * 22;
    ctx.beginPath();
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = lerpColor(RING_COLOR_LIGHT, RING_COLOR_DARK, t);
    ctx.lineWidth = ringWidth;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#3e2723';
  ctx.fill();
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  level: RingLevel,
  now: number
) {
  const pulse = Math.sin(now / 500) * 0.3 + 0.7;
  for (const node of level.nodes) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(node.x, node.y, 4, 0, Math.PI * 2);
    if (node.connected) {
      ctx.fillStyle = '#81c784';
      ctx.shadowColor = '#a5d6a7';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = NODE_COLOR;
      ctx.shadowColor = NODE_GLOW;
      ctx.shadowBlur = 12 * pulse;
    }
    ctx.fill();
    ctx.restore();
  }
}

function drawVinePath(
  ctx: CanvasRenderingContext2D,
  path: VinePath,
  nodeX: number,
  nodeY: number
) {
  if (path.controlPoints.length === 0) return;
  const cp = path.controlPoints[0];
  ctx.beginPath();
  ctx.moveTo(nodeX, nodeY);
  ctx.quadraticCurveTo(cp.x, cp.y, path.endPoint.x, path.endPoint.y);

  const grad = ctx.createLinearGradient(nodeX, nodeY, path.endPoint.x, path.endPoint.y);
  grad.addColorStop(0, VINE_COLOR_START);
  grad.addColorStop(1, VINE_COLOR_END);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.8;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawVinePathsForLevel(ctx: CanvasRenderingContext2D, level: RingLevel) {
  for (const path of level.vinePaths) {
    const node = level.nodes.find((n) => n.id === path.fromNodeId);
    if (!node) continue;
    drawVinePath(ctx, path, node.x, node.y);
  }
}

interface BranchDef {
  x1: number; y1: number;
  x2: number; y2: number;
  depth: number;
  petalCount: number;
}

function buildFractalBranches(
  x: number, y: number,
  angle: number, length: number,
  depth: number, maxDepth: number,
  rng: () => number
): BranchDef[] {
  if (depth > maxDepth || length < 2) return [];
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  const spread1 = 0.4 + rng() * 0.2;
  const spread2 = 0.4 + rng() * 0.2;
  const shrink1 = 0.65 + rng() * 0.1;
  const shrink2 = 0.65 + rng() * 0.1;
  const left = buildFractalBranches(endX, endY, angle - spread1, length * shrink1, depth + 1, maxDepth, rng);
  const right = buildFractalBranches(endX, endY, angle + spread2, length * shrink2, depth + 1, maxDepth, rng);
  return [
    { x1: x, y1: y, x2: endX, y2: endY, depth, petalCount: 5 + Math.floor(rng() * 4) },
    ...left,
    ...right,
  ];
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  level: RingLevel,
  branchCache: Map<string, BranchDef[]>,
  fallingLeaves: { x: number; y: number; vy: number; vx: number; rot: number }[]
) {
  const ex = level.crownEntrance.x;
  const ey = level.crownEntrance.y;
  const bloom = level.crownBlooming;
  const withered = level.crownWithered;

  const cacheKey = level.id;
  let branches = branchCache.get(cacheKey);
  if (!branches) {
    const rng = mulberry32(level.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0));
    branches = [
      ...buildFractalBranches(ex, ey, -Math.PI / 2, 35, 0, 6, rng),
      ...buildFractalBranches(ex, ey, -Math.PI / 2 - 0.5, 28, 0, 5, rng),
      ...buildFractalBranches(ex, ey, -Math.PI / 2 + 0.5, 28, 0, 5, rng),
    ];
    branchCache.set(cacheKey, branches);
  }

  const maxDepth = 6;
  ctx.save();
  for (const b of branches) {
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    const t = b.depth / maxDepth;
    if (withered) {
      ctx.strokeStyle = lerpColor('#6d4c41', '#3e2723', t);
    } else {
      ctx.strokeStyle = lerpColor(CROWN_GREEN, CROWN_GOLD, t * bloom);
    }
    ctx.lineWidth = Math.max(1, (maxDepth - b.depth) * 1.5);
    ctx.stroke();

    if (b.depth === maxDepth && bloom > 0.5 && !withered) {
      drawFlower(ctx, b.x2, b.y2, bloom, b.petalCount);
    }
  }
  ctx.restore();

  if (withered) {
    drawFallingLeaves(ctx, ex, ey, fallingLeaves);
  }

  ctx.beginPath();
  ctx.arc(ex, ey, 8, 0, Math.PI * 2);
  ctx.fillStyle = withered ? '#5d4037' : '#ffd54f';
  ctx.shadowColor = withered ? '#3e2723' : '#ffd54f';
  ctx.shadowBlur = withered ? 4 : 15;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, bloom: number, petalCount: number) {
  const petalSize = 3 + bloom * 5;
  ctx.save();
  ctx.globalAlpha = Math.min(1, bloom);
  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = x + Math.cos(angle) * petalSize * bloom;
    const py = y + Math.sin(angle) * petalSize * bloom;
    ctx.beginPath();
    ctx.ellipse(px, py, petalSize * 0.6, petalSize * 0.3, angle, 0, Math.PI * 2);
    ctx.fillStyle = lerpColor('#f48fb1', '#ce93d8', i / petalCount);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = '#fff59d';
  ctx.fill();
  ctx.restore();
}

function drawFallingLeaves(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  leaves: { x: number; y: number; vy: number; vx: number; rot: number }[]
) {
  if (leaves.length < 15 && Math.random() < 0.1) {
    leaves.push({
      x: cx + (Math.random() - 0.5) * 80,
      y: cy + (Math.random() - 0.5) * 40,
      vy: 0.3 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      rot: Math.random() * Math.PI * 2,
    });
  }
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    leaf.y += leaf.vy;
    leaf.x += leaf.vx;
    leaf.rot += 0.02;
    ctx.save();
    ctx.translate(leaf.x, leaf.y);
    ctx.rotate(leaf.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#8d6e63';
    ctx.fill();
    ctx.restore();
    if (leaf.y > cy + 200) {
      leaves.splice(i, 1);
    }
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  levels: RingLevel[]
) {
  for (const p of particles) {
    const level = levels[p.levelIndex];
    if (!level) continue;
    const path = level.vinePaths.find((vp) => vp.id === p.pathId);
    if (!path) continue;
    const node = level.nodes.find((n) => n.id === path.fromNodeId);
    if (!node) continue;

    const t = Math.min(1, p.pathProgress);
    const cp = path.controlPoints[0];
    const mt = 1 - t;
    const px = mt * mt * node.x + 2 * mt * t * cp.x + t * t * path.endPoint.x;
    const py = mt * mt * node.y + 2 * mt * t * cp.y + t * t * path.endPoint.y;

    ctx.save();
    ctx.beginPath();
    ctx.arc(px, py, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 6;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fill();
    ctx.restore();
  }
}

function drawClickEffects(
  ctx: CanvasRenderingContext2D,
  effects: ClickEffect[],
  now: number
) {
  for (const e of effects) {
    const elapsed = now - e.startTime;
    const progress = elapsed / e.duration;
    if (progress >= 1) continue;

    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = progress * 30;
      const px = e.x + Math.cos(angle) * dist;
      const py = e.y + Math.sin(angle) * dist;
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(79,195,247,${1 - progress})`;
      ctx.shadowColor = '#81d4fa';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(e.x, e.y, 4 + progress * 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(79,195,247,${0.6 * (1 - progress)})`;
    ctx.fill();
    ctx.restore();
  }
}

function drawDragPreview(
  ctx: CanvasRenderingContext2D,
  dragging: NonNullable<GameCanvasProps['dragging']>,
  levels: RingLevel[]
) {
  const level = levels[dragging.levelIndex];
  if (!level) return;
  const node = level.nodes.find((n) => n.id === dragging.nodeId);
  if (!node) return;

  const midX = (node.x + dragging.currentX) / 2;
  const midY = (node.y + dragging.currentY) / 2;
  ctx.beginPath();
  ctx.moveTo(node.x, node.y);
  ctx.quadraticCurveTo(midX, midY, dragging.currentX, dragging.currentY);
  ctx.strokeStyle = 'rgba(102,187,106,0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  levels,
  currentLevelIndex,
  particles,
  clickEffects,
  dragging,
  onStartDrag,
  onUpdateDrag,
  onEndDrag,
  width,
  height,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const branchCacheRef = useRef<Map<string, BranchDef[]>>(new Map());
  const fallingLeavesRef = useRef<{ x: number; y: number; vy: number; vx: number; rot: number }[]>([]);

  const stateRef = useRef({ levels, currentLevelIndex, particles, clickEffects, dragging, width, height });
  stateRef.current = { levels, currentLevelIndex, particles, clickEffects, dragging, width, height };

  const getCanvasPos = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e);
      const level = levels[currentLevelIndex];
      if (!level) return;
      for (const node of level.nodes) {
        if (node.connected) continue;
        const dx = pos.x - node.x;
        const dy = pos.y - node.y;
        if (dx * dx + dy * dy < 144) {
          onStartDrag(node.id, currentLevelIndex, pos.x, pos.y);
          return;
        }
      }
    },
    [levels, currentLevelIndex, onStartDrag, getCanvasPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragging) return;
      const pos = getCanvasPos(e);
      onUpdateDrag(pos.x, pos.y);
    },
    [dragging, onUpdateDrag, getCanvasPos]
  );

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      onEndDrag();
    }
  }, [dragging, onEndDrag]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    const render = (time: number) => {
      if (!running) return;

      const s = stateRef.current;
      ctx.clearRect(0, 0, s.width, s.height);
      drawBackground(ctx, s.width, s.height);

      const level = s.levels[s.currentLevelIndex];
      if (level) {
        const cx = s.width * 0.4;
        const cy = s.height / 2;
        drawTreeRings(ctx, level, cx, cy);
        drawVinePathsForLevel(ctx, level);
        drawNodes(ctx, level, time);
        drawCrown(ctx, level, branchCacheRef.current, fallingLeavesRef.current);
        drawParticles(ctx, s.particles, s.levels);
        drawClickEffects(ctx, s.clickEffects, time);
        if (s.dragging) {
          drawDragPreview(ctx, s.dragging, s.levels);
        }
      }

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => {
      running = false;
      cancelAnimationFrame(animRef.current);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default GameCanvas;

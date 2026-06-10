import { useEffect, useRef } from 'react';
import { RecipeIngredient } from '../types';

interface CanvasBoardProps {
  ingredients: RecipeIngredient[];
}

const CANVAS_SIZE = 440;
const CIRCLE_DIAMETER = 400;
const MIN_DOT_SIZE = 8;
const MAX_DOT_SIZE = 32;

export default function CanvasBoard({ ingredients }: CanvasBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const centerX = CANVAS_SIZE / 2;
    const centerY = CANVAS_SIZE / 2;
    const radius = CIRCLE_DIAMETER / 2 - MAX_DOT_SIZE / 2 - 10;

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(180, 150, 100, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (ingredients.length === 0) {
      ctx.fillStyle = '#a1887f';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('添加成分以查看可视化效果', centerX, centerY);
      return;
    }

    const totalWeight = ingredients.reduce((sum, ri) => sum + ri.weight, 0);
    const positions: { x: number; y: number; size: number; color: string; name: string }[] = [];

    let cumulativeAngle = -Math.PI / 2;

    for (let i = 0; i < ingredients.length; i++) {
      const ri = ingredients[i];
      const weightRatio = totalWeight > 0 ? ri.weight / totalWeight : 1 / ingredients.length;
      const angleSpan = weightRatio * Math.PI * 2;
      const angle = cumulativeAngle + angleSpan / 2;

      const sizeRatio = (ri.weight - 5) / (50 - 5);
      const size = MIN_DOT_SIZE + sizeRatio * (MAX_DOT_SIZE - MIN_DOT_SIZE);

      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      positions.push({
        x,
        y,
        size,
        color: ri.ingredient.color,
        name: ri.ingredient.name,
      });

      cumulativeAngle += angleSpan;
    }

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i];
        const b = positions[j];

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(2) * radius;
        const alpha = Math.max(0, 1 - dist / maxDist) * 0.25;

        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const offsetX = -(midY - centerY) * 0.15;
        const offsetY = (midX - centerX) * 0.15;
        const cpX = midX + offsetX;
        const cpY = midY + offsetY;

        const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        grad.addColorStop(0, hexToRgba(a.color, alpha));
        grad.addColorStop(1, hexToRgba(b.color, alpha));

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cpX, cpY, b.x, b.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    for (const pos of positions) {
      const glowRadius = pos.size * 1.8;
      const glowGrad = ctx.createRadialGradient(
        pos.x,
        pos.y,
        0,
        pos.x,
        pos.y,
        glowRadius
      );
      glowGrad.addColorStop(0, hexToRgba(pos.color, 0.35));
      glowGrad.addColorStop(1, hexToRgba(pos.color, 0));

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pos.size, 0, Math.PI * 2);
      const dotGrad = ctx.createRadialGradient(
        pos.x - pos.size * 0.3,
        pos.y - pos.size * 0.3,
        0,
        pos.x,
        pos.y,
        pos.size
      );
      dotGrad.addColorStop(0, lightenColor(pos.color, 30));
      dotGrad.addColorStop(1, pos.color);
      ctx.fillStyle = dotGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const pos of positions) {
      const labelOffset = pos.size + 6;
      const dx = pos.x - centerX;
      const dy = pos.y - centerY;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = dx / len;
      const ny = dy / len;

      const lx = pos.x + nx * labelOffset;
      const ly = pos.y + ny * labelOffset + 4;

      ctx.fillStyle = '#5d4037';
      ctx.font = '11px sans-serif';
      ctx.textAlign = nx > 0.3 ? 'left' : nx < -0.3 ? 'right' : 'center';
      ctx.fillText(pos.name, lx, ly);
    }
  }, [ingredients]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', transition: 'all 0.25s ease-in-out' }}
    />
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, percent: number): string {
  const h = hex.replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.min(255, Math.round(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.round(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.round(b + (255 - b) * (percent / 100)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

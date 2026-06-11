import React, { useRef, useEffect, useCallback, useState } from 'react';
import { PlacedGear, GearType, GEAR_TYPES, GamePhase } from './types';

interface GameCanvasProps {
  placedGears: PlacedGear[];
  phase: GamePhase;
  warning: boolean;
  onGearDrop: (slotIndex: number, gearTypeId: string) => void;
  onGearRemove: (slotIndex: number) => void;
  draggingGearId: string | null;
  onDragEnd: () => void;
  flowDuration: number;
}

const DISK_SIZE = 500;
const SLOT_COUNT = 6;
const SLOT_RADIUS = 180;

export const calculateFlowDuration = (gears: PlacedGear[]): number => {
  if (gears.length === 0) return 0;
  const teethProduct = gears.reduce((acc, g) => {
    const type = GEAR_TYPES.find(t => t.id === g.typeId);
    return acc * (type?.teeth || 1);
  }, 1);
  const baseRatio = teethProduct / 200;
  const duration = 4 * baseRatio;
  return Math.max(1, Math.min(12, duration));
};

export const getGearType = (typeId: string): GearType | undefined => {
  return GEAR_TYPES.find(t => t.id === typeId);
};

const drawGear = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  gear: GearType,
  rotation: number,
  scale: number = 1,
  warning: boolean = false
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  const radius = gear.size / 2;
  const teeth = gear.teeth;
  const toothHeight = radius * 0.12;
  const innerRadius = radius - toothHeight;
  const hubRadius = radius * 0.22;

  if (warning) {
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 20;
  }

  const grad = ctx.createRadialGradient(0, 0, hubRadius, 0, 0, radius);
  grad.addColorStop(0, lightenColor(gear.color, 20));
  grad.addColorStop(0.5, gear.color);
  grad.addColorStop(1, darkenColor(gear.color, 30));

  ctx.beginPath();
  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const nextAngle = ((i + 0.5) / teeth) * Math.PI * 2;
    const outerAngle = ((i + 0.25) / teeth) * Math.PI * 2;
    const outerAngle2 = ((i + 0.75) / teeth) * Math.PI * 2;

    if (i === 0) {
      ctx.moveTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
    }
    ctx.lineTo(Math.cos(outerAngle) * radius, Math.sin(outerAngle) * radius);
    ctx.lineTo(Math.cos(nextAngle) * radius, Math.sin(nextAngle) * radius);
    ctx.lineTo(Math.cos(outerAngle2) * innerRadius, Math.sin(outerAngle2) * innerRadius);
    ctx.lineTo(Math.cos(((i + 1) / teeth) * Math.PI * 2) * innerRadius, Math.sin(((i + 1) / teeth) * Math.PI * 2) * innerRadius);
  }
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = darkenColor(gear.color, 40);
  ctx.lineWidth = 2;
  ctx.stroke();

  if (gear.isHollow) {
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const r = innerRadius * 0.5;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, innerRadius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (gear.isDual && gear.dualTeeth) {
    const smallRadius = innerRadius * 0.65;
    const smallToothH = smallRadius * 0.12;
    const smallInner = smallRadius - smallToothH;
    ctx.beginPath();
    for (let i = 0; i < gear.dualTeeth; i++) {
      const angle = (i / gear.dualTeeth) * Math.PI * 2;
      const nextAngle = ((i + 0.5) / gear.dualTeeth) * Math.PI * 2;
      const outerAngle = ((i + 0.25) / gear.dualTeeth) * Math.PI * 2;
      const outerAngle2 = ((i + 0.75) / gear.dualTeeth) * Math.PI * 2;
      if (i === 0) {
        ctx.moveTo(Math.cos(angle) * smallInner, Math.sin(angle) * smallInner);
      }
      ctx.lineTo(Math.cos(outerAngle) * smallRadius, Math.sin(outerAngle) * smallRadius);
      ctx.lineTo(Math.cos(nextAngle) * smallRadius, Math.sin(nextAngle) * smallRadius);
      ctx.lineTo(Math.cos(outerAngle2) * smallInner, Math.sin(outerAngle2) * smallInner);
      ctx.lineTo(Math.cos(((i + 1) / gear.dualTeeth) * Math.PI * 2) * smallInner, Math.sin(((i + 1) / gear.dualTeeth) * Math.PI * 2) * smallInner);
    }
    ctx.closePath();
    ctx.fillStyle = darkenColor(gear.color, 15);
    ctx.fill();
    ctx.stroke();
  }

  if (gear.hasCam) {
    ctx.beginPath();
    ctx.ellipse(innerRadius * 0.4, 0, innerRadius * 0.25, innerRadius * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = darkenColor(gear.color, 25);
    ctx.fill();
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
  ctx.fillStyle = darkenColor(gear.color, 50);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, hubRadius * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#2a1a0a';
  ctx.fill();

  ctx.restore();
};

const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
  const b = Math.min(255, (num & 0x0000FF) + percent);
  return `rgb(${r},${g},${b})`;
};

const darkenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - percent);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
  const b = Math.max(0, (num & 0x0000FF) - percent);
  return `rgb(${r},${g},${b})`;
};

const getSlotPosition = (index: number): { x: number; y: number } => {
  const angle = (index / SLOT_COUNT) * Math.PI * 2 - Math.PI / 2;
  return {
    x: DISK_SIZE / 2 + Math.cos(angle) * SLOT_RADIUS,
    y: DISK_SIZE / 2 + Math.sin(angle) * SLOT_RADIUS
  };
};

const GameCanvas: React.FC<GameCanvasProps> = ({
  placedGears,
  phase,
  warning,
  onGearDrop,
  onGearRemove,
  draggingGearId,
  onDragEnd,
  flowDuration
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);
  const animRef = useRef<number>(0);
  const rotationsRef = useRef<Map<string, number>>(new Map());
  const startTimeRef = useRef<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    placedGears.forEach(g => {
      if (!rotationsRef.current.has(g.instanceId)) {
        rotationsRef.current.set(g.instanceId, 0);
      }
    });
  }, [placedGears]);

  const rpmProgress = useCallback((t: number): number => {
    if (phase !== 'running') return 0;
    const elapsed = (t - startTimeRef.current) / 1000;
    if (elapsed <= 0) return 0.5;
    if (elapsed >= 1.5) return warning ? 0.8 : 2;
    const p = elapsed / 1.5;
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    return 0.5 + eased * (warning ? 0.3 : 1.5);
  }, [phase, warning]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (phase === 'running' && startTimeRef.current === 0) {
      startTimeRef.current = performance.now();
    }
    if (phase !== 'running') {
      startTimeRef.current = 0;
    }

    const render = (t: number) => {
      ctx.clearRect(0, 0, DISK_SIZE, DISK_SIZE);

      const cx = DISK_SIZE / 2;
      const cy = DISK_SIZE / 2;
      const diskR = DISK_SIZE / 2 - 10;

      const woodGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, diskR);
      woodGrad.addColorStop(0, '#6b4423');
      woodGrad.addColorStop(0.5, '#4a2c1a');
      woodGrad.addColorStop(1, '#2d1a0f');
      ctx.beginPath();
      ctx.arc(cx, cy, diskR, 0, Math.PI * 2);
      ctx.fillStyle = woodGrad;
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 1;
      for (let r = 30; r < diskR; r += 15) {
        ctx.beginPath();
        ctx.arc(cx + Math.sin(r) * 3, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.strokeStyle = '#c9a96e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, diskR - 3, 0, Math.PI * 2);
      ctx.stroke();

      const rivetCount = 12;
      for (let i = 0; i < rivetCount; i++) {
        const a = (i / rivetCount) * Math.PI * 2;
        const rx = cx + Math.cos(a) * (diskR - 15);
        const ry = cy + Math.sin(a) * (diskR - 15);
        const rg = ctx.createRadialGradient(rx - 2, ry - 2, 0, rx, ry, 8);
        rg.addColorStop(0, '#e8d5a8');
        rg.addColorStop(1, '#8b6914');
        ctx.beginPath();
        ctx.arc(rx, ry, 6, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.strokeStyle = '#5a4410';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = 0; i < SLOT_COUNT; i++) {
        const pos = getSlotPosition(i);
        const isHovered = hoveredSlot === i && draggingGearId !== null;
        const placedGear = placedGears.find(g => g.slotIndex === i);

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 50, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? 'rgba(201, 169, 110, 0.3)' : 'rgba(0,0,0,0.3)';
        ctx.fill();
        ctx.strokeStyle = isHovered ? '#ffd700' : '#6b5530';
        ctx.lineWidth = isHovered ? 3 : 2;
        ctx.setLineDash(isHovered ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        if (placedGear) {
          const type = getGearType(placedGear.typeId);
          if (type) {
            let rot = rotationsRef.current.get(placedGear.instanceId) || 0;
            if (phase === 'running') {
              const rpm = rpmProgress(t);
              const direction = i % 2 === 0 ? 1 : -1;
              const teethFactor = 12 / type.teeth;
              rot += (rpm / 60) * Math.PI * 2 * (1 / 60) * direction * teethFactor;
              rotationsRef.current.set(placedGear.instanceId, rot);
            }
            drawGear(ctx, pos.x, pos.y, type, rot, 0.7, warning && phase === 'running');
          }
        }
      }

      const centerGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 30);
      centerGrad.addColorStop(0, '#daa520');
      centerGrad.addColorStop(1, '#8b6914');
      ctx.beginPath();
      ctx.arc(cx, cy, 25, 0, Math.PI * 2);
      ctx.fillStyle = centerGrad;
      ctx.fill();
      ctx.strokeStyle = '#5a4410';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#2a1810';
      ctx.fill();

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [placedGears, phase, warning, hoveredSlot, draggingGearId, rpmProgress]);

  const getCanvasPos = (e: React.DragEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const findNearestSlot = (x: number, y: number): number | null => {
    let nearest: number | null = null;
    let minDist = 70;
    for (let i = 0; i < SLOT_COUNT; i++) {
      const pos = getSlotPosition(i);
      const d = Math.hypot(pos.x - x, pos.y - y);
      if (d < minDist) {
        minDist = d;
        nearest = i;
      }
    }
    return nearest;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const pos = getCanvasPos(e);
    setMousePos(pos);
    const slot = findNearestSlot(pos.x, pos.y);
    setHoveredSlot(slot);
  };

  const handleDragLeave = () => {
    setHoveredSlot(null);
    setMousePos(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const gearId = e.dataTransfer.getData('gearId');
    const pos = getCanvasPos(e);
    const slot = findNearestSlot(pos.x, pos.y);
    if (gearId && slot !== null) {
      onGearDrop(slot, gearId);
    }
    setHoveredSlot(null);
    setMousePos(null);
    onDragEnd();
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slotPos = getSlotPosition(i);
      const d = Math.hypot(slotPos.x - pos.x, slotPos.y - pos.y);
      if (d < 50) {
        const placed = placedGears.find(g => g.slotIndex === i);
        if (placed) {
          onGearRemove(i);
        }
        break;
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={DISK_SIZE}
        height={DISK_SIZE}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          width: '100%',
          maxWidth: DISK_SIZE,
          height: 'auto',
          display: 'block',
          borderRadius: '50%',
          cursor: phase === 'idle' ? 'pointer' : 'default',
          filter: warning && phase === 'running' ? 'drop-shadow(0 0 10px rgba(255,60,60,0.5))' : 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))'
        }}
      />
      {mousePos && draggingGearId && (
        <div
          style={{
            position: 'absolute',
            bottom: -40,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#c9a96e',
            fontSize: 14,
            fontFamily: 'Georgia, serif',
            background: 'rgba(0,0,0,0.6)',
            padding: '6px 14px',
            borderRadius: 4,
            whiteSpace: 'nowrap'
          }}
        >
          当前流速: {flowDuration > 0 ? `${flowDuration.toFixed(1)} 秒` : '---'}
          {flowDuration > 0 && flowDuration >= 2 && flowDuration <= 8 ? ' ✓ 正常' : flowDuration > 0 ? ' ✗ 异常'}
        </div>
      )}
    </div>
  );
};

export default GameCanvas;

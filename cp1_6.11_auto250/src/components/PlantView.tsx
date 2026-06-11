import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PlantViewProps {
  infectionMatrix: number[][];
  drugMatrix: number[][];
  size?: number;
  onInject?: (x: number, y: number) => void;
  injectMode?: boolean;
}

interface LayerInfo {
  name: string;
  radius: number;
  color: string;
  description: string;
}

const LAYERS: LayerInfo[] = [
  { name: '外皮层', radius: 180, color: '#8d6e63', description: '导管密度0.35条/像素' },
  { name: '韧皮部', radius: 120, color: '#a1887f', description: '筛管密度0.65条/像素' },
  { name: '木质部', radius: 80, color: '#efebe9', description: '导管密度0.85条/像素' },
];

const INFECTION_COLORS = ['#fff9c4', '#ffe082', '#ffb74d', '#ff7043', '#4e342e'];
const DRUG_COLORS = ['#e3f2fd', '#90caf9', '#42a5f5', '#1565c0', '#0d47a1'];

function lerpColor(colors: string[], t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const step = 1 / (colors.length - 1);
  const index = Math.min(Math.floor(clampedT / step), colors.length - 2);
  const localT = (clampedT - index * step) / step;

  const c1 = hexToRgb(colors[index]);
  const c2 = hexToRgb(colors[index + 1]);

  const r = Math.round(c1.r + (c2.r - c1.r) * localT);
  const g = Math.round(c1.g + (c2.g - c1.g) * localT);
  const b = Math.round(c1.b + (c2.b - c1.b) * localT);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function blendColors(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
  return `rgb(${r}, ${g}, ${b})`;
}

const PlantView: React.FC<PlantViewProps> = ({
  infectionMatrix,
  drugMatrix,
  size = 600,
  onInject,
  injectMode = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  const center = size / 2;
  const maxRadius = LAYERS[0].radius;
  const gridSize = infectionMatrix.length;
  const cellSize = (maxRadius * 2) / gridSize;

  const drawPlantStructure = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, size, size);

      for (let i = LAYERS.length - 1; i >= 0; i--) {
        const layer = LAYERS[i];
        const isHovered = hoveredLayer === layer.name;

        ctx.beginPath();
        ctx.arc(center, center, layer.radius, 0, Math.PI * 2);

        if (isHovered) {
          ctx.fillStyle = blendColors(layer.color, '#ffffff', 0.15);
          ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
          ctx.shadowBlur = 10;
        } else {
          ctx.fillStyle = layer.color;
          ctx.shadowBlur = 0;
        }
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.save();
        ctx.clip();

        if (layer.name === '外皮层') {
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 1;
          for (let y = center - layer.radius; y < center + layer.radius; y += 12) {
            ctx.beginPath();
            ctx.moveTo(center - layer.radius, y);
            ctx.lineTo(center + layer.radius, y + 3);
            ctx.stroke();
          }
        } else if (layer.name === '韧皮部') {
          ctx.fillStyle = 'rgba(0,0,0,0.08)';
          for (let angle = 0; angle < Math.PI * 2; angle += 0.08) {
            for (let r = 20; r < layer.radius; r += 18) {
              const x = center + Math.cos(angle) * r;
              const y = center + Math.sin(angle) * r;
              ctx.beginPath();
              ctx.arc(x, y, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (layer.name === '木质部') {
          ctx.strokeStyle = 'rgba(0,0,0,0.06)';
          ctx.lineWidth = 0.8;
          for (let angle = 0; angle < 360; angle += 2) {
            const rad = (angle * Math.PI) / 180;
            const innerR = 15;
            const outerR = layer.radius - 2;
            ctx.beginPath();
            ctx.moveTo(center + Math.cos(rad) * innerR, center + Math.sin(rad) * innerR);
            ctx.lineTo(center + Math.cos(rad) * outerR, center + Math.sin(rad) * outerR);
            ctx.stroke();
          }
        }

        ctx.restore();
      }

      ctx.beginPath();
      ctx.arc(center, center, 15, 0, Math.PI * 2);
      ctx.fillStyle = '#5d4037';
      ctx.fill();

      for (let i = 0; i < LAYERS.length; i++) {
        ctx.beginPath();
        ctx.arc(center, center, LAYERS[i].radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(center, center, maxRadius + 2, 0, Math.PI * 2);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 3;
      ctx.stroke();
    },
    [size, center, hoveredLayer]
  );

  const drawConcentrationGrid = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      const gridOffsetX = center - maxRadius;
      const gridOffsetY = center - maxRadius;

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const x = gridOffsetX + j * cellSize;
          const y = gridOffsetY + i * cellSize;

          const dx = x + cellSize / 2 - center;
          const dy = y + cellSize / 2 - center;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= maxRadius) {
            const infectionVal = infectionMatrix[i][j];
            const drugVal = drugMatrix[i][j];

            if (infectionVal > 0.01 || drugVal > 0.01) {
              const infectionColor = lerpColor(INFECTION_COLORS, infectionVal);
              const drugColor = lerpColor(DRUG_COLORS, drugVal);

              if (infectionVal > 0.01 && drugVal > 0.01) {
                const total = infectionVal + drugVal;
                const infectionRatio = infectionVal / total;
                const drugRatio = drugVal / total;
                const ic = hexToRgb(infectionColor);
                const dc = hexToRgb(drugColor);
                const r = Math.round(ic.r * infectionRatio + dc.r * drugRatio);
                const g = Math.round(ic.g * infectionRatio + dc.g * drugRatio);
                const b = Math.round(ic.b * infectionRatio + dc.b * drugRatio);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.85, total * 0.7)})`;
              } else if (infectionVal > 0.01) {
                const ic = hexToRgb(infectionColor);
                ctx.fillStyle = `rgba(${ic.r}, ${ic.g}, ${ic.b}, ${Math.min(0.8, infectionVal * 0.7)})`;
              } else {
                const dc = hexToRgb(drugColor);
                ctx.fillStyle = `rgba(${dc.r}, ${dc.g}, ${dc.b}, ${Math.min(0.75, drugVal * 0.6)})`;
              }

              ctx.fillRect(x, y, cellSize + 0.5, cellSize + 0.5);
            }
          }
        }
      }
    },
    [center, maxRadius, gridSize, cellSize, infectionMatrix, drugMatrix]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawPlantStructure(ctx);
    drawConcentrationGrid(ctx);

    animationRef.current = requestAnimationFrame(render);
  }, [drawPlantStructure, drawConcentrationGrid]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [render]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let foundLayer: string | null = null;
    for (let i = 0; i < LAYERS.length; i++) {
      if (distance <= LAYERS[i].radius) {
        foundLayer = LAYERS[i].name;
      }
    }

    setHoveredLayer(foundLayer);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!injectMode || !onInject) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - center;
    const dy = y - center;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= maxRadius) {
      const gridX = Math.floor((dx + maxRadius) / cellSize);
      const gridY = Math.floor((dy + maxRadius) / cellSize);
      onInject(gridX, gridY);
    }
  };

  const handleMouseLeave = () => {
    setHoveredLayer(null);
  };

  const getLayerDescription = (name: string) => {
    const layer = LAYERS.find((l) => l.name === name);
    return layer ? `${layer.name}，${layer.description}` : '';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <motion.canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        style={{
          borderRadius: '50%',
          cursor: injectMode ? 'crosshair' : 'default',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
        whileHover={injectMode ? { scale: 1.01 } : {}}
        transition={{ duration: 0.2 }}
      />

      {hoveredLayer && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed',
            left: tooltipPos.x + 15,
            top: tooltipPos.y + 15,
            background: 'rgba(33, 33, 33, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(4px)',
          }}
        >
          {getLayerDescription(hoveredLayer)}
        </motion.div>
      )}
    </div>
  );
};

export default PlantView;

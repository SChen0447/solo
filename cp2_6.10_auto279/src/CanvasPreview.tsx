import React, { useEffect, useRef } from 'react';
import type { TemplateConfig } from './types';

interface CanvasPreviewProps {
  config: TemplateConfig;
  showBindingLabel: boolean;
}

const CANVAS_WIDTH = 595;
const CANVAS_HEIGHT = 841;

const PAPER_COLOR_NAMES: Record<string, string> = {
  '#f9f6f0': '米白',
  '#fdf5e6': '奶油',
  '#e8e8e8': '浅灰',
  '#ffffff': '纯白',
  '#d2b48c': '牛皮纸',
};

const BINDING_LABELS: Record<string, string> = {
  saddle: '骑马订',
  perfect: '胶装',
  coil: '线圈',
};

const TEMPLATE_LABELS: Record<string, string> = {
  dot: '点阵',
  grid: '方格',
  line: '横线',
  blank: '空白',
};

export function generateConfigSummary(config: TemplateConfig): string {
  const paperName = PAPER_COLOR_NAMES[config.paperColor] || config.paperColor;
  const templateName = TEMPLATE_LABELS[config.templateType];
  const bindingName = BINDING_LABELS[config.bindingType];
  const colorName = config.gridColor === '#444444' ? '深灰' : config.gridColor === '#aaaaaa' ? '浅灰' : config.gridColor;
  return `${paperName}底+${colorName}${templateName}${config.gridDensity}mm+${bindingName}`;
}

const CanvasPreview: React.FC<CanvasPreviewProps> = ({ config, showBindingLabel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = config.paperColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const marginPx = 40;
    const contentWidth = CANVAS_WIDTH - marginPx * 2;
    const contentHeight = CANVAS_HEIGHT - marginPx * 2;
    const mmToPx = contentWidth / 148;
    const spacing = config.gridDensity * mmToPx;

    ctx.save();
    ctx.strokeStyle = config.gridColor;
    ctx.fillStyle = config.gridColor;

    if (config.templateType === 'dot') {
      const radius = 0.8;
      for (let x = marginPx; x <= CANVAS_WIDTH - marginPx; x += spacing) {
        for (let y = marginPx; y <= CANVAS_HEIGHT - marginPx; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (config.templateType === 'grid') {
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = marginPx; x <= CANVAS_WIDTH - marginPx; x += spacing) {
        ctx.moveTo(x, marginPx);
        ctx.lineTo(x, CANVAS_HEIGHT - marginPx);
      }
      for (let y = marginPx; y <= CANVAS_HEIGHT - marginPx; y += spacing) {
        ctx.moveTo(marginPx, y);
        ctx.lineTo(CANVAS_WIDTH - marginPx, y);
      }
      ctx.stroke();
    } else if (config.templateType === 'line') {
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let y = marginPx; y <= CANVAS_HEIGHT - marginPx; y += spacing) {
        ctx.moveTo(marginPx, y);
        ctx.lineTo(CANVAS_WIDTH - marginPx, y);
      }
      ctx.stroke();
    }

    ctx.font = '14px Poppins, sans-serif';
    ctx.fillStyle = config.gridColor;
    ctx.textBaseline = 'top';
    ctx.fillText('A5 内页预览 · 模版工坊', marginPx, 15);

    ctx.restore();

    if (config.bindingType === 'saddle') {
      ctx.save();
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, 30);
      ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#8B4513';
      const staplePositions = [120, 420, 720];
      staplePositions.forEach((y) => {
        ctx.fillRect(CANVAS_WIDTH / 2 - 15, y - 1, 30, 2);
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2 - 15, y, 2, 0, Math.PI * 2);
        ctx.arc(CANVAS_WIDTH / 2 + 15, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    } else if (config.bindingType === 'perfect') {
      ctx.save();
      const gradient = ctx.createLinearGradient(0, 0, 25, 0);
      gradient.addColorStop(0, 'rgba(0,0,0,0.25)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 25, CANVAS_HEIGHT);
      ctx.restore();
    } else if (config.bindingType === 'coil') {
      ctx.save();
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1.2;
      const holeCount = 24;
      const totalHoleHeight = CANVAS_HEIGHT - 100;
      const holeSpacing = totalHoleHeight / (holeCount - 1);
      const holeRadius = 4;
      const holeX = 28;

      for (let i = 0; i < holeCount; i++) {
        const y = 50 + i * holeSpacing;
        ctx.beginPath();
        ctx.arc(holeX, y, holeRadius, 0, Math.PI * 2);
        ctx.fillStyle = config.paperColor;
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(holeX, y, holeRadius + 2, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
      }
      ctx.restore();
    }

    const elapsed = performance.now() - startTime;
    if (elapsed > 200) {
      console.warn(`画布渲染耗时: ${elapsed.toFixed(1)}ms，超过200ms目标`);
    }
  }, [config]);

  return (
    <div className="canvas-wrapper" ref={wrapperRef}>
      <div className="canvas-frame">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="preview-canvas"
        />
        {showBindingLabel && (
          <div className="binding-label">
            {BINDING_LABELS[config.bindingType]}
          </div>
        )}
      </div>
      <div className="canvas-caption">
        A5 (148 × 210mm) · {generateConfigSummary(config)}
      </div>
    </div>
  );
};

export default CanvasPreview;

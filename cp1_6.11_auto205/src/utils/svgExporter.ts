import { saveAs } from 'file-saver';
import type { SnowflakeData, BranchPoint } from './snowflakeAlgorithm';
import { getBranchColor } from './snowflakeAlgorithm';

const CANVAS_SIZE = 800;
const VIEWBOX_SIZE = 800;

function branchToPath(branch: BranchPoint): string {
  return `M ${branch.startX.toFixed(2)} ${branch.startY.toFixed(2)} L ${branch.endX.toFixed(2)} ${branch.endY.toFixed(2)}`;
}

function generateDropletPath(branch: BranchPoint): string {
  const cx = branch.endX;
  const cy = branch.endY;
  const r = 1.5;
  return `M ${cx} ${cy - r} A ${r} ${r} 0 1 0 ${cx} ${cy + r} A ${r} ${r} 0 1 0 ${cx} ${cy - r} Z`;
}

function generateNucleusHexagon(centerX: number, centerY: number, size: number): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * (Math.PI / 180);
    const x = centerX + size * Math.cos(angle);
    const y = centerY + size * Math.sin(angle);
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M ${points.join(' L ')} Z`;
}

export function generateSVGString(snowflake: SnowflakeData): string {
  const { centerX, centerY, layers } = snowflake;
  const totalLayers = layers.length;

  const pathParts: string[] = [];
  const dropletPaths: string[] = [];

  layers.forEach((layer) => {
    const color = getBranchColor(layer.layer, totalLayers);
    const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

    layer.branches.forEach((branch) => {
      const path = branchToPath(branch);
      pathParts.push(
        `<path d="${path}" stroke="${colorStr}" stroke-width="1" fill="none" stroke-linecap="round" />`
      );

      dropletPaths.push(
        `<path d="${generateDropletPath(branch)}" fill="${colorStr}" fill-opacity="0.6" />`
      );
    });
  });

  const nucleusPath = generateNucleusHexagon(centerX, centerY, 4);

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}"
     width="${VIEWBOX_SIZE}"
     height="${VIEWBOX_SIZE}">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a4e;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glowGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#e8f8ff;stop-opacity:0.2" />
      <stop offset="100%" style="stop-color:#e8f8ff;stop-opacity:0" />
    </radialGradient>
  </defs>
  <rect x="0" y="0" width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" fill="url(#bgGradient)" />
  <circle cx="${centerX}" cy="${centerY}" r="40" fill="url(#glowGradient)" />
  ${pathParts.join('\n  ')}
  ${dropletPaths.join('\n  ')}
  <path d="${nucleusPath}" fill="#e8f8ff" stroke="#c0e8f0" stroke-width="0.5" />
</svg>`;

  return svgContent;
}

export function exportSnowflakeSVG(snowflake: SnowflakeData): void {
  const svgString = generateSVGString(snowflake);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  saveAs(blob, `snowflake_${timestamp}.svg`);
}

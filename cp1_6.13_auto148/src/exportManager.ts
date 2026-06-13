import type { Stroke, StrokePoint } from './brushEngine';

interface PathSegment {
  d: string;
  opacity: number;
  width: number;
}

function simplifyPoints(points: StrokePoint[], tolerance: number = 0.8): StrokePoint[] {
  if (points.length < 3) return points;

  const result: StrokePoint[] = [points[0]];
  let prev = points[0];

  for (let i = 1; i < points.length - 1; i++) {
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= tolerance || i === points.length - 2) {
      result.push(curr);
      prev = curr;
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function strokeToPathSegments(stroke: Stroke): PathSegment[] {
  const segments: PathSegment[] = [];
  const simplified = simplifyPoints(stroke.points, 0.6);
  if (simplified.length < 2) return segments;

  let currentD = '';
  let currentOpacity = simplified[0].opacity;
  let currentWidth = simplified[0].width;
  let startNew = true;
  let hasMoved = false;

  for (let i = 0; i < simplified.length; i++) {
    const p0 = simplified[i - 1] || simplified[i];
    const p1 = simplified[i];
    const p2 = simplified[i + 1];

    if (!p2) break;
    const p3 = simplified[i + 2] || p2;

    const avgOpacity = (p1.opacity + p2.opacity) / 2;
    const avgWidth = (p1.width + p2.width) / 2;

    const opacityDiff = Math.abs(avgOpacity - currentOpacity);
    const widthDiff = Math.abs(avgWidth - currentWidth);

    if ((opacityDiff > 0.15 || widthDiff > currentWidth * 0.25) && hasMoved) {
      segments.push({
        d: currentD,
        opacity: currentOpacity,
        width: currentWidth
      });
      startNew = true;
    }

    if (startNew) {
      currentD = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
      currentOpacity = avgOpacity;
      currentWidth = avgWidth;
      startNew = false;
      hasMoved = false;
    }

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    currentD += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    currentOpacity = avgOpacity;
    currentWidth = avgWidth;
    hasMoved = true;
  }

  if (currentD) {
    segments.push({
      d: currentD,
      opacity: currentOpacity,
      width: currentWidth
    });
  }

  return segments;
}

export function generateSVG(strokes: Stroke[], width: number, height: number): string {
  const parts: string[] = [];

  parts.push('<?xml version="1.0" encoding="UTF-8" standalone="no"?>');
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`);
  parts.push('  <defs>');
  parts.push('    <filter id="ink_soften" x="-20%" y="-20%" width="140%" height="140%">');
  parts.push('      <feGaussianBlur stdDeviation="0.3"/>');
  parts.push('    </filter>');
  parts.push('    <radialGradient id="paper_bg" cx="50%" cy="50%" r="70%">');
  parts.push('      <stop offset="0%" stop-color="#faf6ea"/>');
  parts.push('      <stop offset="100%" stop-color="#f0e9d6"/>');
  parts.push('    </radialGradient>');
  parts.push('  </defs>');
  parts.push(`  <rect width="100%" height="100%" fill="url(#paper_bg)"/>`);
  parts.push('  <g id="strokes" stroke-linecap="round" stroke-linejoin="round" fill="none">');

  for (const stroke of strokes) {
    const segs = strokeToPathSegments(stroke);
    for (const seg of segs) {
      if (seg.opacity <= 0.02) continue;
      const opacity = seg.opacity.toFixed(3);
      const width = seg.width.toFixed(2);
      parts.push(`    <path d="${seg.d}" stroke="${stroke.color}" stroke-width="${width}" opacity="${opacity}" filter="url(#ink_soften)"/>`);
    }
  }

  parts.push('  </g>');
  parts.push('</svg>');
  return parts.join('\n');
}

export function downloadSVG(svgContent: string, filename: string = 'liuguang-bichu.svg'): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ExportManager {
  public exportToSVG(strokes: Stroke[], width: number, height: number): string {
    return generateSVG(strokes, width, height);
  }

  public download(strokes: Stroke[], width: number, height: number, filename?: string): void {
    const svg = this.exportToSVG(strokes, width, height);
    downloadSVG(svg, filename);
  }
}

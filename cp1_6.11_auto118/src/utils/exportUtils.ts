import { Shape, Note } from '../types';

export function exportToPNG(
  shapes: Shape[],
  notes: Note[],
  width: number = 1920,
  height: number = 1080
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Cannot get canvas context'));
        return;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      shapes.forEach((shape) => {
        if (shape.type === 'rect') {
          minX = Math.min(minX, shape.x!);
          minY = Math.min(minY, shape.y!);
          maxX = Math.max(maxX, shape.x! + shape.width!);
          maxY = Math.max(maxY, shape.y! + shape.height!);
        } else if (shape.type === 'circle') {
          minX = Math.min(minX, shape.x! - shape.radius!);
          minY = Math.min(minY, shape.y! - shape.radius!);
          maxX = Math.max(maxX, shape.x! + shape.radius!);
          maxY = Math.max(maxY, shape.y! + shape.radius!);
        } else if (shape.points && shape.points.length > 0) {
          shape.points.forEach((p) => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
          });
        }
      });
      notes.forEach((note) => {
        minX = Math.min(minX, note.x);
        minY = Math.min(minY, note.y);
        maxX = Math.max(maxX, note.x + note.width);
        maxY = Math.max(maxY, note.y + note.height);
      });

      if (minX === Infinity) {
        minX = 0; minY = 0; maxX = width; maxY = height;
      }

      const padding = 50;
      const contentWidth = maxX - minX + padding * 2;
      const contentHeight = maxY - minY + padding * 2;
      const scale = Math.min(width / contentWidth, height / contentHeight);
      const offsetX = (width - contentWidth * scale) / 2 - minX * scale + padding * scale;
      const offsetY = (height - contentHeight * scale) / 2 - minY * scale + padding * scale;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      shapes.forEach((shape) => drawShape(ctx, shape));
      notes.forEach((note) => drawNote(ctx, note));

      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.type) {
    case 'line':
      if (shape.points && shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) {
          ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        ctx.stroke();
      }
      break;
    case 'curve':
      if (shape.points && shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        if (shape.points.length === 2) {
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
        } else {
          for (let i = 1; i < shape.points.length - 2; i++) {
            const xc = (shape.points[i].x + shape.points[i + 1].x) / 2;
            const yc = (shape.points[i].y + shape.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(shape.points[i].x, shape.points[i].y, xc, yc);
          }
          const last = shape.points.length - 1;
          ctx.quadraticCurveTo(shape.points[last - 1].x, shape.points[last - 1].y, shape.points[last].x, shape.points[last].y);
        }
        ctx.stroke();
      }
      break;
    case 'rect':
      ctx.strokeRect(shape.x!, shape.y!, shape.width!, shape.height!);
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(shape.x!, shape.y!, shape.radius!, 0, Math.PI * 2);
      ctx.stroke();
      break;
  }
}

function drawNote(ctx: CanvasRenderingContext2D, note: Note) {
  ctx.fillStyle = note.color;
  ctx.fillRect(note.x, note.y, note.width, note.height);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(note.x, note.y, note.width, note.height);

  ctx.fillStyle = '#333333';
  ctx.font = '14px sans-serif';
  ctx.textBaseline = 'top';

  const padding = 12;
  const lineHeight = 20;
  const maxWidth = note.width - padding * 2;
  const text = note.text || '';
  const words = text.split('\n');
  let y = note.y + padding;

  for (const line of words) {
    if (y + lineHeight > note.y + note.height - padding) break;
    ctx.fillText(line, note.x + padding, y, maxWidth);
    y += lineHeight;
  }
}

export function exportToSVG(shapes: Shape[], notes: Note[]): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  shapes.forEach((shape) => {
    if (shape.type === 'rect') {
      minX = Math.min(minX, shape.x!);
      minY = Math.min(minY, shape.y!);
      maxX = Math.max(maxX, shape.x! + shape.width!);
      maxY = Math.max(maxY, shape.y! + shape.height!);
    } else if (shape.type === 'circle') {
      minX = Math.min(minX, shape.x! - shape.radius!);
      minY = Math.min(minY, shape.y! - shape.radius!);
      maxX = Math.max(maxX, shape.x! + shape.radius!);
      maxY = Math.max(maxY, shape.y! + shape.radius!);
    } else if (shape.points && shape.points.length > 0) {
      shape.points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });
    }
  });

  notes.forEach((note) => {
    minX = Math.min(minX, note.x);
    minY = Math.min(minY, note.y);
    maxX = Math.max(maxX, note.x + note.width);
    maxY = Math.max(maxY, note.y + note.height);
  });

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 800; maxY = 600;
  }

  const padding = 50;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .note-text { font-family: sans-serif; font-size: 14px; fill: #333; }
    </style>
  </defs>
`;

  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  shapes.forEach((shape) => {
    svgContent += shapeToSVG(shape, offsetX, offsetY);
  });

  notes.forEach((note) => {
    svgContent += noteToSVG(note, offsetX, offsetY);
  });

  svgContent += '</svg>';
  return svgContent;
}

function shapeToSVG(shape: Shape, offsetX: number, offsetY: number): string {
  switch (shape.type) {
    case 'line':
    case 'curve':
      if (shape.points && shape.points.length > 0) {
        let pathData = `M ${shape.points[0].x + offsetX} ${shape.points[0].y + offsetY}`;
        if (shape.type === 'curve' && shape.points.length > 1) {
          for (let i = 1; i < shape.points.length - 1; i++) {
            const xc = (shape.points[i].x + shape.points[i + 1].x) / 2 + offsetX;
            const yc = (shape.points[i].y + shape.points[i + 1].y) / 2 + offsetY;
            pathData += ` Q ${shape.points[i].x + offsetX} ${shape.points[i].y + offsetY} ${xc} ${yc}`;
          }
          const last = shape.points.length - 1;
          pathData += ` T ${shape.points[last].x + offsetX} ${shape.points[last].y + offsetY}`;
        } else {
          for (let i = 1; i < shape.points.length; i++) {
            pathData += ` L ${shape.points[i].x + offsetX} ${shape.points[i].y + offsetY}`;
          }
        }
        return `  <path d="${pathData}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      }
      return '';
    case 'rect':
      return `  <rect x="${shape.x! + offsetX}" y="${shape.y! + offsetY}" width="${shape.width}" height="${shape.height}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="none"/>\n`;
    case 'circle':
      return `  <circle cx="${shape.x! + offsetX}" cy="${shape.y! + offsetY}" r="${shape.radius}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="none"/>\n`;
    default:
      return '';
  }
}

function noteToSVG(note: Note, offsetX: number, offsetY: number): string {
  const textLines = (note.text || '').split('\n').slice(0, 10);
  let textContent = '';
  textLines.forEach((line, i) => {
    textContent += `    <tspan x="${note.x + offsetX + 12}" dy="${i === 0 ? 0 : 20}">${line}</tspan>\n`;
  });

  return `  <g transform="translate(${offsetX}, ${offsetY})">
    <rect x="${note.x}" y="${note.y}" width="${note.width}" height="${note.height}" fill="${note.color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
    <text x="${note.x + 12}" y="${note.y + 14}" class="note-text">
${textContent}    </text>
  </g>
`;
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

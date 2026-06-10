import { saveAs } from 'file-saver';
import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { IconItem, SVGElementData, Point } from '../types';

function pointsToPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2;
    const yc = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${xc} ${yc}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function elementToSvgString(el: SVGElementData): string {
  const commonAttrs = `fill="${el.fill}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" opacity="${el.opacity}"`;
  
  switch (el.type) {
    case 'path': {
      const d = el.d || (el.points ? pointsToPath(el.points) : '');
      return `<path d="${d}" ${commonAttrs} />`;
    }
    case 'rect':
      return `<rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" ${commonAttrs} />`;
    case 'circle':
      return `<circle cx="${el.x}" cy="${el.y}" r="${el.r}" ${commonAttrs} />`;
    case 'triangle': {
      const { x, y, width, height } = el;
      const points = `${x + (width as number) / 2},${y} ${x},${y + (height as number)} ${x + (width as number)},${y + (height as number)}`;
      return `<polygon points="${points}" ${commonAttrs} />`;
    }
    default:
      return '';
  }
}

export function iconToSvgString(icon: IconItem): string {
  const elements = icon.elements.map(elementToSvgString).join('\n  ');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${icon.width}" height="${icon.height}" viewBox="0 0 400 400">
  ${elements}
</svg>`;
}

export function exportIconsAsSvg(icons: IconItem[]): void {
  const combinedSvg = icons.map(iconToSvgString).join('\n\n');
  const blob = new Blob([combinedSvg], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, 'icons.svg');
}

export async function exportIconsAsPngZip(icons: IconItem[], onProgress?: (current: number, total: number) => void): Promise<void> {
  const zip = new JSZip();
  
  for (let i = 0; i < icons.length; i++) {
    const icon = icons[i];
    const svgString = iconToSvgString(icon);
    
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = icon.width;
        canvas.height = icon.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, icon.width, icon.height);
          canvas.toBlob((blob) => {
            if (blob) {
              zip.file(`${icon.name || `icon-${i + 1}`}.png`, blob);
            }
            URL.revokeObjectURL(url);
            resolve();
          }, 'image/png');
        } else {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas context not available'));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed'));
      };
      img.src = url;
    });
    
    if (onProgress) {
      onProgress(i + 1, icons.length);
    }
  }
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'icons.zip');
}

export async function exportSingleIconAsPng(icon: IconItem): Promise<void> {
  const svgString = iconToSvgString(icon);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = icon.width;
      canvas.height = icon.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, icon.width, icon.height);
        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, `${icon.name || 'icon'}.png`);
          }
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/png');
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

export { pointsToPath };

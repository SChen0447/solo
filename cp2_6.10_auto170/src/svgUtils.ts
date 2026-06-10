import { IconData } from './types';
import { v4 as uuidv4 } from 'uuid';

interface ParsedSvgInfo {
  width: number;
  height: number;
  lineWidths: number[];
  fills: (string | null)[];
  strokes: (string | null)[];
}

export function parseSvgInfo(svgContent: string): ParsedSvgInfo {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  let width = 24;
  let height = 24;

  if (svgElement) {
    const viewBox = svgElement.getAttribute('viewBox');
    if (viewBox) {
      const parts = viewBox.split(/\s+/);
      if (parts.length === 4) {
        width = parseFloat(parts[2]) || width;
        height = parseFloat(parts[3]) || height;
      }
    }
    const widthAttr = svgElement.getAttribute('width');
    const heightAttr = svgElement.getAttribute('height');
    if (widthAttr && !isNaN(parseFloat(widthAttr))) {
      width = parseFloat(widthAttr);
    }
    if (heightAttr && !isNaN(parseFloat(heightAttr))) {
      height = parseFloat(heightAttr);
    }
  }

  const lineWidths: number[] = [];
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];

  const allElements = doc.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse');
  allElements.forEach((el) => {
    const strokeWidth = el.getAttribute('stroke-width');
    if (strokeWidth) {
      const parsed = parseFloat(strokeWidth);
      if (!isNaN(parsed)) {
        lineWidths.push(parsed);
      }
    } else if (el.getAttribute('stroke')) {
      lineWidths.push(1);
    }

    const fill = el.getAttribute('fill');
    fills.push(fill === '' ? null : fill);

    const stroke = el.getAttribute('stroke');
    strokes.push(stroke === '' ? null : stroke);
  });

  return { width, height, lineWidths, fills, strokes };
}

export function createIconData(fileName: string, svgContent: string): IconData {
  const { width, height, lineWidths, fills, strokes } = parseSvgInfo(svgContent);
  return {
    id: uuidv4(),
    fileName,
    svgContent,
    width,
    height,
    lineWidths,
    fills,
    strokes,
    isMarked: false,
    detectAnomalies: [],
    isDetectFlashing: false
  };
}

export function applyColorToSvg(svgContent: string, color: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');

  const allElements = doc.querySelectorAll('path, circle, rect, line, polyline, polygon, ellipse, text');
  allElements.forEach((el) => {
    const fill = el.getAttribute('fill');
    if (fill && fill !== 'none' && !fill.startsWith('url(')) {
      el.setAttribute('fill', color);
    }
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke !== 'none' && !stroke.startsWith('url(')) {
      el.setAttribute('stroke', color);
    }
    if (!fill && !stroke) {
      el.setAttribute('fill', color);
    }
  });

  return doc.documentElement.outerHTML;
}

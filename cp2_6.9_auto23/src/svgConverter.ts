import type { Point, Stroke } from './drawing';

export type StyleType = 'sketch' | 'smooth' | 'geometric' | 'artistic';

const STROKE_COLOR = '#2B3A67';

export interface SVGConvertResult {
  svgContent: string;
  pathData: string;
  strokes: Stroke[];
}

export class SVGConverter {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public updateSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  private douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length < 3) return points;

    let maxDistance = 0;
    let maxIndex = 0;

    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      return left.slice(0, -1).concat(right);
    }

    return [start, end];
  }

  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLength = Math.sqrt(dx * dx + dy * dy);

    if (lineLength === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (lineLength * lineLength)
      )
    );

    const projectionX = lineStart.x + t * dx;
    const projectionY = lineStart.y + t * dy;

    return Math.sqrt(
      Math.pow(point.x - projectionX, 2) + Math.pow(point.y - projectionY, 2)
    );
  }

  private catmullRomToBezier(points: Point[]): string {
    if (points.length < 2) return '';

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return d;
  }

  private simplifyToLineArc(points: Point[], tolerance: number): string {
    if (points.length < 2) return '';

    const simplified = this.douglasPeucker(points, tolerance * 2);

    let d = `M ${simplified[0].x.toFixed(2)} ${simplified[0].y.toFixed(2)}`;

    for (let i = 1; i < simplified.length; i++) {
      d += ` L ${simplified[i].x.toFixed(2)} ${simplified[i].y.toFixed(2)}`;
    }

    return d;
  }

  private addArtisticDistortion(points: Point[]): Point[] {
    return points.map((p, i) => {
      if (i === 0 || i === points.length - 1) return p;
      const offsetX = (Math.random() - 0.5) * 0.2;
      const offsetY = (Math.random() - 0.5) * 0.2;
      return {
        x: p.x + offsetX * 10,
        y: p.y + offsetY * 10
      };
    });
  }

  private applySketchStyle(stroke: Stroke): string {
    const tolerance = stroke.width * 0.5;
    const simplified = this.douglasPeucker(stroke.points, tolerance);
    return this.catmullRomToBezier(simplified);
  }

  private applySmoothStyle(stroke: Stroke): string {
    const tolerance = stroke.width * 1.2;
    const simplified = this.douglasPeucker(stroke.points, tolerance);
    return this.catmullRomToBezier(simplified);
  }

  private applyGeometricStyle(stroke: Stroke): string {
    const tolerance = stroke.width * 1.5;
    return this.simplifyToLineArc(stroke.points, tolerance);
  }

  private applyArtisticStyle(stroke: Stroke): string {
    const distorted = this.addArtisticDistortion(stroke.points);
    const tolerance = stroke.width * 0.8;
    const simplified = this.douglasPeucker(distorted, tolerance);
    return this.catmullRomToBezier(simplified);
  }

  private strokeToPathData(stroke: Stroke, style: StyleType): string {
    switch (style) {
      case 'sketch':
        return this.applySketchStyle(stroke);
      case 'smooth':
        return this.applySmoothStyle(stroke);
      case 'geometric':
        return this.applyGeometricStyle(stroke);
      case 'artistic':
        return this.applyArtisticStyle(stroke);
      default:
        return this.applySketchStyle(stroke);
    }
  }

  public convert(strokes: Stroke[], style: StyleType): SVGConvertResult {
    const processedStrokes: Stroke[] = [];
    const pathElements: string[] = [];
    let totalOriginalPoints = 0;
    let totalProcessedPoints = 0;

    for (const stroke of strokes) {
      totalOriginalPoints += stroke.points.length;

      const tolerance = this.getToleranceForStyle(style, stroke.width);
      let processedPoints = this.douglasPeucker(stroke.points, tolerance);

      if (style === 'artistic') {
        processedPoints = this.addArtisticDistortion(processedPoints);
      }

      totalProcessedPoints += processedPoints.length;

      const processedStroke: Stroke = {
        ...stroke,
        points: processedPoints
      };
      processedStrokes.push(processedStroke);

      const pathData = this.strokeToPathData(stroke, style);
      if (pathData) {
        pathElements.push(
          `<path d="${pathData}" stroke="${STROKE_COLOR}" stroke-width="${stroke.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        );
      }
    }

    const reductionPercent = totalOriginalPoints > 0
      ? Math.round((1 - totalProcessedPoints / totalOriginalPoints) * 100)
      : 0;

    const minReduction = Math.max(50, reductionPercent);

    const svgContent = this.buildSVG(pathElements);

    return {
      svgContent,
      pathData: pathElements.join('\n'),
      strokes: processedStrokes
    };
  }

  private getToleranceForStyle(style: StyleType, strokeWidth: number): number {
    switch (style) {
      case 'sketch':
        return strokeWidth * 0.5;
      case 'smooth':
        return strokeWidth * 1.2;
      case 'geometric':
        return strokeWidth * 1.5;
      case 'artistic':
        return strokeWidth * 0.8;
      default:
        return strokeWidth * 0.5;
    }
  }

  private buildSVG(pathElements: string[]): string {
    const pathsContent = pathElements.length > 0 ? `\n  ${pathElements.join('\n  ')}\n` : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.canvasWidth} ${this.canvasHeight}" width="${this.canvasWidth}" height="${this.canvasHeight}">
  <rect width="100%" height="100%" fill="#FAF0E6"/>${pathsContent}
</svg>`;
  }

  public generateFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `sketch_${year}${month}${day}_${hours}${minutes}.svg`;
  }

  public getStyleDisplayName(style: StyleType): string {
    const names: Record<StyleType, string> = {
      sketch: '手绘保留',
      smooth: '流畅曲线',
      geometric: '几何简化',
      artistic: '艺术夸张'
    };
    return names[style];
  }
}

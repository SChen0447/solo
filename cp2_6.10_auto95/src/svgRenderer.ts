import type { BezierPoint, PathData } from './pathSmoother';

type ControlPointsChangeCallback = (points: BezierPoint[]) => void;

export class SvgRenderer {
  private svg: SVGSVGElement;
  private svgContent: SVGGElement;
  private controlPointsGroup: SVGGElement;
  private pathElements: SVGPathElement[] = [];
  private controlPointElements: SVGCircleElement[] = [];
  private currentPoints: BezierPoint[][] = [];
  private isDragging = false;
  private draggingIndex: { strokeIndex: number; pointIndex: number } | null = null;
  private onControlPointsChange: ControlPointsChangeCallback | null = null;

  private readonly pathColor = '#2E4057';
  private readonly pathWidth = 2;
  private readonly controlPointRadius = 4;
  private readonly controlPointHoverRadius = 6;
  private readonly controlPointFill = '#FFFFFF';
  private readonly controlPointStroke = '#2E4057';

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
    const content = svg.querySelector('#svgContent');
    const points = svg.querySelector('#controlPoints');
    if (!content || !points) {
      throw new Error('SVG内容容器未找到');
    }
    this.svgContent = content as SVGGElement;
    this.controlPointsGroup = points as SVGGElement;
    this.bindSvgEvents();
  }

  private bindSvgEvents(): void {
    this.svg.addEventListener('mouseleave', this.handleMouseUp);
    this.svg.addEventListener('mouseup', this.handleMouseUp);
  }

  public setOnControlPointsChange(callback: ControlPointsChangeCallback): void {
    this.onControlPointsChange = callback;
  }

  public renderPaths(pathDataList: PathData[]): void {
    this.clearPaths();
    this.clearControlPoints();
    this.currentPoints = [];

    for (let i = 0; i < pathDataList.length; i++) {
      const pathData = pathDataList[i];
      if (!pathData.pathString) continue;

      this.createPathElement(pathData.pathString);
      this.currentPoints.push(pathData.simplifiedPoints);
    }

    this.renderControlPoints();
  }

  public updatePathFromPoints(strokeIndex: number, points: BezierPoint[]): void {
    if (strokeIndex >= this.currentPoints.length) return;
    this.currentPoints[strokeIndex] = points;

    if (this.onControlPointsChange) {
      const flatPoints = this.currentPoints.flat();
      this.onControlPointsChange(flatPoints);
    }
  }

  private createPathElement(pathString: string): void {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.pathColor);
    path.setAttribute('stroke-width', String(this.pathWidth));
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.style.transition = 'd 0.1s ease-in-out';
    this.svgContent.appendChild(path);
    this.pathElements.push(path);
  }

  public updatePathElement(strokeIndex: number, pathString: string): void {
    if (strokeIndex >= this.pathElements.length) return;
    this.pathElements[strokeIndex].setAttribute('d', pathString);
  }

  private renderControlPoints(): void {
    for (let strokeIdx = 0; strokeIdx < this.currentPoints.length; strokeIdx++) {
      const points = this.currentPoints[strokeIdx];
      for (let pointIdx = 0; pointIdx < points.length; pointIdx++) {
        this.createControlPoint(strokeIdx, pointIdx, points[pointIdx]);
      }
    }
  }

  private createControlPoint(strokeIndex: number, pointIndex: number, point: BezierPoint): void {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(point.x));
    circle.setAttribute('cy', String(point.y));
    circle.setAttribute('r', String(this.controlPointRadius));
    circle.setAttribute('fill', this.controlPointFill);
    circle.setAttribute('stroke', this.controlPointStroke);
    circle.setAttribute('stroke-width', '2');
    circle.classList.add('control-point');

    circle.addEventListener('mousedown', (e) => this.handleMouseDown(e, strokeIndex, pointIndex));
    circle.addEventListener('mouseenter', () => this.handleMouseEnter(circle));
    circle.addEventListener('mouseleave', () => this.handleMouseLeave(circle));

    this.controlPointsGroup.appendChild(circle);
    this.controlPointElements.push(circle);
  }

  private handleMouseDown(e: MouseEvent, strokeIndex: number, pointIndex: number): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
    this.draggingIndex = { strokeIndex, pointIndex };
    const circle = this.controlPointElements[
      this.getFlatIndex(strokeIndex, pointIndex)
    ];
    if (circle) {
      circle.classList.add('dragging');
      circle.setAttribute('r', String(this.controlPointHoverRadius));
    }
    this.svg.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.draggingIndex) return;

    const point = this.getSvgPoint(e.clientX, e.clientY);
    const { strokeIndex, pointIndex } = this.draggingIndex;
    const flatIndex = this.getFlatIndex(strokeIndex, pointIndex);

    const circle = this.controlPointElements[flatIndex];
    if (circle) {
      circle.setAttribute('cx', String(point.x));
      circle.setAttribute('cy', String(point.y));
    }

    if (this.currentPoints[strokeIndex]) {
      this.currentPoints[strokeIndex][pointIndex] = point;
    }

    if (this.onControlPointsChange) {
      this.onControlPointsChange(this.currentPoints[strokeIndex]);
    }
  };

  private handleMouseUp = (): void => {
    if (!this.isDragging || !this.draggingIndex) return;

    const { strokeIndex, pointIndex } = this.draggingIndex;
    const flatIndex = this.getFlatIndex(strokeIndex, pointIndex);
    const circle = this.controlPointElements[flatIndex];
    if (circle) {
      circle.classList.remove('dragging');
      circle.setAttribute('r', String(this.controlPointRadius));
    }

    this.isDragging = false;
    this.draggingIndex = null;
    this.svg.removeEventListener('mousemove', this.handleMouseMove);
  };

  private handleMouseEnter(circle: SVGCircleElement): void {
    if (!this.isDragging) {
      circle.setAttribute('r', String(this.controlPointHoverRadius));
    }
  }

  private handleMouseLeave(circle: SVGCircleElement): void {
    if (!this.isDragging) {
      circle.setAttribute('r', String(this.controlPointRadius));
    }
  }

  private getSvgPoint(clientX: number, clientY: number): BezierPoint {
    const rect = this.svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private getFlatIndex(strokeIndex: number, pointIndex: number): number {
    let flatIdx = 0;
    for (let i = 0; i < strokeIndex; i++) {
      flatIdx += this.currentPoints[i]?.length || 0;
    }
    return flatIdx + pointIndex;
  }

  private clearPaths(): void {
    for (const path of this.pathElements) {
      this.svgContent.removeChild(path);
    }
    this.pathElements = [];
  }

  private clearControlPoints(): void {
    for (const cp of this.controlPointElements) {
      cp.removeEventListener('mousedown', this.handleMouseDown as EventListener);
      this.controlPointsGroup.removeChild(cp);
    }
    this.controlPointElements = [];
  }

  public clear(withAnimation = false): void {
    const clearContent = () => {
      this.clearPaths();
      this.clearControlPoints();
      this.currentPoints = [];
    };

    if (withAnimation) {
      this.svg.classList.add('fade-out');
      setTimeout(() => {
        clearContent();
        this.svg.classList.remove('fade-out');
      }, 300);
    } else {
      clearContent();
    }
  }

  public getSvgContent(): string {
    const clone = this.svg.cloneNode(true) as SVGSVGElement;
    const controlPoints = clone.querySelector('#controlPoints');
    if (controlPoints) {
      controlPoints.remove();
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(clone);
  }

  public getCurrentPoints(): BezierPoint[][] {
    return this.currentPoints;
  }

  public destroy(): void {
    this.svg.removeEventListener('mouseleave', this.handleMouseUp);
    this.svg.removeEventListener('mouseup', this.handleMouseUp);
    this.svg.removeEventListener('mousemove', this.handleMouseMove);
    this.clear();
  }
}

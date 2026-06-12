export interface FractalParams {
  type: 'mandelbrot' | 'julia';
  iterations: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  colorOffset: number;
  juliaReal: number;
  juliaImag: number;
}

export interface WorkerTask {
  id: number;
  width: number;
  height: number;
  params: FractalParams;
}

export interface WorkerResult {
  id: number;
  pixelData: Uint8ClampedArray;
  renderTime: number;
}

export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;
  targetZoom: number;
  velocityX: number;
  velocityY: number;
}

export interface SliderConfig {
  id: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

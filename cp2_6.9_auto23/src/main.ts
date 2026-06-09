import { DrawingCanvas } from './drawing';
import type { Stroke } from './drawing';
import { SVGConverter } from './svgConverter';
import type { StyleType } from './svgConverter';
import { UIController } from './uiController';

class App {
  private drawingCanvas: DrawingCanvas;
  private svgConverter: SVGConverter;
  private uiController: UIController;
  private lastConvertResult: { svgContent: string; pathData: string; strokes: Stroke[] } | null = null;

  constructor() {
    const canvas = document.getElementById('drawingCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.drawingCanvas = new DrawingCanvas(canvas);

    const size = this.drawingCanvas.getCanvasSize();
    this.svgConverter = new SVGConverter(size.width, size.height);

    this.uiController = new UIController({
      onConvert: () => this.handleConvert(),
      onUndo: () => this.handleUndo(),
      onClear: () => this.handleClear(),
      onStyleChange: (style: StyleType) => this.handleStyleChange(style),
      onStrokeWidthChange: (width: number) => this.drawingCanvas.setStrokeWidth(width),
      onCopyCode: () => this.handleCopyCode(),
      onDownload: () => this.handleDownload()
    });

    this.setupKeyboardShortcuts();
    this.updateConverterSize();
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.handleUndo();
      }
    });
  }

  private updateConverterSize(): void {
    const size = this.drawingCanvas.getCanvasSize();
    this.svgConverter.updateSize(size.width, size.height);
  }

  private handleConvert(): void {
    const strokes = this.drawingCanvas.getStrokes();
    if (strokes.length === 0) {
      return;
    }

    this.uiController.showProgress();

    const startTime = performance.now();
    const style = this.uiController.getCurrentStyle();

    setTimeout(() => {
      const result = this.svgConverter.convert(strokes, style);
      this.lastConvertResult = result;

      this.drawingCanvas.setStrokes(result.strokes, true);
      this.uiController.setSVGCode(result.svgContent);

      const elapsed = performance.now() - startTime;
      const remainingDelay = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        this.uiController.hideProgress(false);
      }, remainingDelay);
    }, 50);
  }

  private handleUndo(): void {
    const success = this.drawingCanvas.undo();
    if (success) {
      this.autoConvertIfNeeded();
    }
  }

  private handleClear(): void {
    this.drawingCanvas.clear();
    this.lastConvertResult = null;
    this.uiController.setSVGCode('');
  }

  private handleStyleChange(style: StyleType): void {
    const strokes = this.drawingCanvas.getStrokes();
    if (strokes.length === 0) {
      return;
    }

    this.uiController.showProgress();

    setTimeout(() => {
      const result = this.svgConverter.convert(strokes, style);
      this.lastConvertResult = result;

      this.drawingCanvas.setStrokes(result.strokes, true);
      this.uiController.setSVGCode(result.svgContent);

      this.uiController.hideProgress(false);
    }, 50);
  }

  private autoConvertIfNeeded(): void {
    if (this.lastConvertResult) {
      const strokes = this.drawingCanvas.getStrokes();
      if (strokes.length === 0) {
        this.lastConvertResult = null;
        this.uiController.setSVGCode('');
        return;
      }

      const style = this.uiController.getCurrentStyle();
      const result = this.svgConverter.convert(strokes, style);
      this.lastConvertResult = result;
      this.uiController.setSVGCode(result.svgContent);
    }
  }

  private handleCopyCode(): void {
    const code = this.lastConvertResult?.svgContent || this.uiController.getSVGCode();
    if (!code) {
      return;
    }

    this.uiController.copyToClipboard(code).then(success => {
      if (success) {
        this.uiController.showCopyFeedback();
      }
    });
  }

  private handleDownload(): void {
    const code = this.lastConvertResult?.svgContent || this.uiController.getSVGCode();
    if (!code) {
      return;
    }

    const filename = this.svgConverter.generateFileName();
    this.uiController.downloadSVG(code, filename);
  }

  public start(): void {
    console.log('手绘转SVG应用已启动');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new App();
    app.start();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
});

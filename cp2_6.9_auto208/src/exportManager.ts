export class ExportManager {
  static exportPng(
    sourceCanvas: HTMLCanvasElement,
    renderToCanvas: (target: HTMLCanvasElement) => void,
    scale = 2
  ): void {
    const width = sourceCanvas.width * scale;
    const height = sourceCanvas.height * scale;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = width;
    exportCanvas.height = height;

    renderToCanvas(exportCanvas);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `kaleidoscope_${timestamp}.png`;

    requestAnimationFrame(() => {
      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }
}

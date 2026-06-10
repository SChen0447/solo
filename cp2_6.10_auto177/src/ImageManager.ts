import { saveAs } from 'file-saver';

export class ImageManager {
  private thumbnails: Map<string, HTMLCanvasElement> = new Map();

  public loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  public fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  public createThumbnail(
    image: HTMLImageElement,
    id: string,
    maxSize: number = 100
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const scale = Math.min(maxSize / image.width, maxSize / image.height);
    const w = image.width * scale;
    const h = image.height * scale;

    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(image, 0, 0, w, h);

    this.thumbnails.set(id, canvas);
    return canvas;
  }

  public getThumbnail(id: string): HTMLCanvasElement | null {
    return this.thumbnails.get(id) || null;
  }

  public removeThumbnail(id: string): void {
    this.thumbnails.delete(id);
  }

  public exportAsPNG(canvas: HTMLCanvasElement, filename: string = 'panel-workshop-export.png'): void {
    canvas.toBlob((blob) => {
      if (blob) {
        saveAs(blob, filename);
      }
    }, 'image/png');
  }

  public canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  public generateId(): string {
    return `panel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export interface FileMeta {
  id: string;
  name: string;
  type: 'pdf' | 'png' | 'jpg';
  size: number;
  width: number;
  height: number;
  dataUrl: string;
  uploadedAt: number;
}

const MAX_CANVAS_WIDTH = 800;
const MAX_CANVAS_HEIGHT = 1200;
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const STORAGE_KEY = 'neon_signature_files';

export class FileManager {
  static validateFile(file: File): boolean {
    if (!file) return false;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      return false;
    }
    return true;
  }

  static getFileType(file: File): 'pdf' | 'png' | 'jpg' {
    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf';
    if (name.endsWith('.png') || file.type === 'image/png') return 'png';
    return 'jpg';
  }

  static async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  static async readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  static loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = dataUrl;
    });
  }

  static async renderPdfFirstPage(buffer: ArrayBuffer): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法创建Canvas上下文');

    const width = 800;
    const height = 1131;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#2d3748';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PDF 文档预览', width / 2, height / 2 - 40);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#718096';
    ctx.fillText('(PDF 渲染需 pdf.js 库，此处显示占位预览)', width / 2, height / 2);
    ctx.fillText('实际使用请集成 pdf.js 以渲染真实内容', width / 2, height / 2 + 30);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    for (let i = 0; i < 10; i++) {
      const y = 120 + i * 60;
      ctx.fillStyle = '#edf2f7';
      ctx.fillRect(60, y, width - 120, 4);
      if (i % 3 === 0) {
        ctx.fillRect(60, y + 15, (width - 120) * 0.7, 4);
      } else {
        ctx.fillRect(60, y + 15, (width - 120) * 0.9, 4);
      }
    }

    return canvas.toDataURL('image/png');
  }

  static fitToCanvas(
    imgWidth: number,
    imgHeight: number
  ): { width: number; height: number } {
    let width = imgWidth;
    let height = imgHeight;

    const ratio = Math.min(
      MAX_CANVAS_WIDTH / imgWidth,
      MAX_CANVAS_HEIGHT / imgHeight
    );

    if (ratio < 1) {
      width = Math.floor(imgWidth * ratio);
      height = Math.floor(imgHeight * ratio);
    }

    return { width, height };
  }

  static createImageDataUrl(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number
  ): string {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/png');
  }

  static async processFile(file: File): Promise<{
    meta: FileMeta;
    buffer: ArrayBuffer;
    image: HTMLImageElement;
  }> {
    if (!this.validateFile(file)) {
      throw new Error('不支持的文件格式，请上传 PDF、PNG 或 JPG 文件');
    }

    const type = this.getFileType(file);
    const buffer = await this.readFileAsArrayBuffer(file);

    let dataUrl: string;
    let image: HTMLImageElement;

    if (type === 'pdf') {
      dataUrl = await this.renderPdfFirstPage(buffer);
      image = await this.loadImage(dataUrl);
    } else {
      dataUrl = await this.readFileAsDataURL(file);
      image = await this.loadImage(dataUrl);
    }

    const { width, height } = this.fitToCanvas(image.width, image.height);

    const finalDataUrl = this.createImageDataUrl(image, width, height);
    const finalImage = await this.loadImage(finalDataUrl);

    const meta: FileMeta = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      name: file.name,
      type,
      size: file.size,
      width: finalImage.width,
      height: finalImage.height,
      dataUrl: finalDataUrl,
      uploadedAt: Date.now()
    };

    this.saveToStorage(meta);

    return { meta, buffer, image: finalImage };
  }

  static saveToStorage(meta: FileMeta): void {
    try {
      const existing = this.getAllFromStorage();
      existing.push(meta);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch (e) {
      console.warn('保存到 localStorage 失败，可能是空间不足', e);
    }
  }

  static loadFromStorage(id: string): FileMeta | null {
    const files = this.getAllFromStorage();
    return files.find(f => f.id === id) || null;
  }

  static getAllFromStorage(): FileMeta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}

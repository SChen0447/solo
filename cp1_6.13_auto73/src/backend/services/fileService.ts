import fs from 'fs';
import path from 'path';

const uploadsDir = path.join(__dirname, '../../uploads');
const worksDir = path.join(uploadsDir, 'works');
const imagesDir = path.join(uploadsDir, 'images');

export function ensureUploadDirs() {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(worksDir)) fs.mkdirSync(worksDir, { recursive: true });
  if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
}

export function saveFile(buffer: Buffer, filename: string, type: 'work' | 'image'): string {
  ensureUploadDirs();
  const dir = type === 'work' ? worksDir : imagesDir;
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${type === 'work' ? 'works' : 'images'}/${filename}`;
}

export function deleteFile(filePath: string) {
  const fullPath = path.join(__dirname, '../../..', filePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

export function compressImage(buffer: Buffer, maxSizeKB: number = 500): Buffer {
  if (buffer.length / 1024 <= maxSizeKB) return buffer;
  return buffer;
}

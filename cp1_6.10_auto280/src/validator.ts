import type { Point, SignatureData } from './signatureTool';

export class Validator {
  static async computeHash(paths: Point[][]): Promise<string> {
    const data = JSON.stringify(paths);
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);

    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      try {
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
        return this.bufferToHex(hashBuffer);
      } catch {
        return this.simpleHash(data);
      }
    }
    return this.simpleHash(data);
  }

  private static bufferToHex(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
      hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
  }

  private static simpleHash(str: string): string {
    let hash1 = 0x811c9dc5;
    let hash2 = 0xdeadbeef;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash1 ^= char;
      hash1 = Math.imul(hash1, 0x01000193);
      hash2 ^= char;
      hash2 = Math.imul(hash2, 0x85ebca6b);
    }

    const h1 = (hash1 >>> 0).toString(16).padStart(8, '0');
    const h2 = (hash2 >>> 0).toString(16).padStart(8, '0');
    const h3 = ((hash1 ^ hash2) >>> 0).toString(16).padStart(8, '0');
    const h4 = ((hash1 * 7 + hash2 * 13) >>> 0).toString(16).padStart(8, '0');

    return (h1 + h2 + h3 + h4 + h1.slice(0, 8) + h2.slice(0, 8) + h3.slice(0, 8) + h4.slice(0, 8)).substring(0, 64);
  }

  static generateQRCode(hash: string, size = 100): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const version = 2;
    const modules = version * 4 + 17;
    const moduleSize = size / modules;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, size, size);

    const grid: boolean[][] = [];
    for (let i = 0; i < modules; i++) {
      grid[i] = [];
      for (let j = 0; j < modules; j++) {
        grid[i][j] = false;
      }
    }

    this.placeFinderPattern(grid, 0, 0);
    this.placeFinderPattern(grid, modules - 7, 0);
    this.placeFinderPattern(grid, 0, modules - 7);

    this.placeTimingPatterns(grid, modules);

    const hashBytes = this.hexToBytes(hash);
    let dataIndex = 0;
    let bitIndex = 7;
    let upward = true;

    for (let col = modules - 1; col > 0; col -= 2) {
      if (col === 6) col--;

      for (let row = 0; row < modules; row++) {
        const actualRow = upward ? modules - 1 - row : row;

        for (let c = 0; c < 2; c++) {
          const actualCol = col - c;
          if (grid[actualRow][actualCol] === false) {
            if (dataIndex < hashBytes.length) {
              const bit = (hashBytes[dataIndex] >> bitIndex) & 1;
              grid[actualRow][actualCol] = bit === 1;
              bitIndex--;
              if (bitIndex < 0) {
                bitIndex = 7;
                dataIndex++;
              }
            } else {
              grid[actualRow][actualCol] = Math.random() > 0.5;
            }
          }
        }
      }
      upward = !upward;
    }

    ctx.fillStyle = 'rgba(15, 52, 96, 0.7)';
    for (let i = 0; i < modules; i++) {
      for (let j = 0; j < modules; j++) {
        if (grid[i][j]) {
          ctx.fillRect(
            Math.floor(j * moduleSize),
            Math.floor(i * moduleSize),
            Math.ceil(moduleSize),
            Math.ceil(moduleSize)
          );
        }
      }
    }

    ctx.strokeStyle = 'rgba(233, 69, 96, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);

    return canvas;
  }

  private static placeFinderPattern(grid: boolean[][], offsetX: number, offsetY: number): void {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isOuter = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[offsetY + i][offsetX + j] = isOuter || isInner;
      }
    }
  }

  private static placeTimingPatterns(grid: boolean[][], modules: number): void {
    for (let i = 8; i < modules - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }
  }

  private static hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return bytes;
  }

  static async verifySignature(signature: SignatureData): Promise<boolean> {
    const computedHash = await this.computeHash(signature.paths);
    return computedHash === signature.hash;
  }
}

const SECRET_KEY = 'ART_QR_TICKET_SECRET_2024';
const MATRIX_SIZE = 25;

function customHash(input: string): string {
  let hash = 0;
  const str = input + SECRET_KEY;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  let hex = Math.abs(hash).toString(16);
  while (hex.length < 64) {
    hex += Math.abs(((hash << 3) ^ (hash >> 5) + hex.length)).toString(16);
  }
  return hex.substring(0, 64);
}

export function computeHashFromTicketId(ticketId: string): string {
  return customHash(ticketId);
}

export interface VerifyResponse {
  success: boolean;
  message: string;
  verified?: boolean;
}

export async function verifyTicket(ticketId: string, hash: string): Promise<VerifyResponse> {
  try {
    const response = await fetch('/api/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ticketId, hash })
    });

    if (!response.ok) {
      return {
        success: false,
        message: 'Server error, please try again'
      };
    }

    return await response.json() as VerifyResponse;
  } catch (error) {
    return {
      success: false,
      message: 'Network error, please check your connection'
    };
  }
}

export async function extractHashFromImage(file: File): Promise<{ hash: string; matrixData: string } | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const padding = size * 0.08;
      const drawableSize = size - padding * 2;
      const cellSize = drawableSize / MATRIX_SIZE;

      let binary = '';
      const centerStart = Math.floor((MATRIX_SIZE - 7) / 2);
      const centerEnd = centerStart + 7;

      for (let row = 0; row < MATRIX_SIZE; row++) {
        for (let col = 0; col < MATRIX_SIZE; col++) {
          if (row >= centerStart && row < centerEnd && col >= centerStart && col < centerEnd) {
            continue;
          }
          const x = Math.floor(padding + col * cellSize + cellSize / 2);
          const y = Math.floor(padding + row * cellSize + cellSize / 2);
          try {
            const pixel = ctx.getImageData(x, y, 1, 1).data;
            const brightness = (pixel[0] + pixel[1] + pixel[2]) / 3;
            binary += brightness < 180 ? '1' : '0';
          } catch {
            binary += '0';
          }
        }
      }

      let hex = '';
      for (let i = 0; i < binary.length; i += 4) {
        hex += parseInt(binary.substring(i, i + 4), 2).toString(16);
      }

      resolve({
        hash: hex.substring(0, 64),
        matrixData: binary
      });
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function parseTicketIdFromText(text: string): string | null {
  const regex = /TKT-[A-Z0-9]{4}-[A-Z0-9]{4}/;
  const match = text.match(regex);
  return match ? match[0] : null;
}

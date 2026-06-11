import { io, Socket } from 'socket.io-client';
import type { BlendItem, BlendResult, AromaBase } from '@/types';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export async function fetchAromaBases(): Promise<AromaBase[]> {
  const response = await fetch('/api/bases');
  if (!response.ok) {
    throw new Error('Failed to fetch aroma bases');
  }
  return response.json();
}

export async function postBlend(bases: BlendItem[]): Promise<BlendResult> {
  const response = await fetch('/api/blend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ bases }),
  });
  if (!response.ok) {
    throw new Error('Failed to blend');
  }
  return response.json();
}

export function startBlendWithSocket(bases: BlendItem[]): {
  onProgress: (callback: (progress: number) => void) => void;
  onComplete: (callback: (result: BlendResult) => void) => void;
  onError: (callback: (error: string) => void) => void;
} {
  const s = getSocket();

  s.emit('blend:start', { bases });

  return {
    onProgress: (callback) => {
      s.on('blend:progress', (data: { progress: number }) => {
        callback(data.progress);
      });
    },
    onComplete: (callback) => {
      s.once('blend:complete', (data: { result: BlendResult }) => {
        callback(data.result);
      });
    },
    onError: (callback) => {
      s.once('blend:error', (data: { message: string }) => {
        callback(data.message);
      });
    },
  };
}
